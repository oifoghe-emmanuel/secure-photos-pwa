// === SECURE-VAULT.JS V9.1.2 - FIXED SYNTAX ERRORS ===
if (window.SecureVault) {
  console.warn('SecureVault already loaded');
} else {
window.SecureVault = (function () {
  const H = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const B = h => new Uint8Array(h.match(/.{1,2}/g).map(b=>parseInt(b,16)));

  function concatUint8(...arrays) {
    let totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    let result = new Uint8Array(totalLength);
    let offset = 0;
    for (let arr of arrays) { result.set(arr, offset); offset += arr.length; }
    return result;
  }

  async function hashIdentity(str) {
    const data = new TextEncoder().encode(str.toLowerCase().trim());
    const hash = await crypto.subtle.digest("SHA-256", data);
    return H(hash).slice(0, 32);
  }

  async function wipeAllVaultData() {
    const keys = Object.keys(localStorage);
    let count = 0;
    keys.forEach(k => {
      if (k.startsWith('sv_') || k.startsWith('sp_')) {
        localStorage.removeItem(k);
        count++;
      }
    });
    console.log(`WIPED ${count} VAULT KEYS`);
    return count;
  }

  async function emailExists(email) {
    const emailHash = await hashIdentity(email);
    const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
    return!!users[emailHash];
  }

  async function getUserByEmail(email) {
    const emailHash = await hashIdentity(email);
    const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
    return users[emailHash] || null;
  }

  let StorageAdapter = {
    get: async (key) => localStorage.getItem(key),
    set: async (key, val) => localStorage.setItem(key, val),
    remove: async (key) => localStorage.removeItem(key)
  };

  const SecureStore = {
    async isAvailable() {
      try {
        if (!window.PublicKeyCredential) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    },

    async saveMasterKey(userId, masterKeyHex) {
      const biometricAvailable = await this.isAvailable();

      if (!biometricAvailable) {
        console.log('Biometrics not available - using password fallback');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await crypto.subtle.importKey("raw", B(await hashIdentity(userId + "fallback")), "AES-GCM", false, ["encrypt"]);
        const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, B(masterKeyHex));
        await StorageAdapter.set(`sv_fallback_${userId}`, H(concatUint8(iv, new Uint8Array(enc))));
        return { success: true, secure: false, reason: 'no_biometric' };
      }

      try {
        const masterKey = B(masterKeyHex);
        const prfSalt = crypto.getRandomValues(new Uint8Array(32));

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "SecurePhoto", id: window.location.hostname },
            user: { id: B(await hashIdentity(userId)), name: userId, displayName: userId },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "required"
            },
            extensions: { prf: { eval: { first: prfSalt } }}
          }
        });

        const extResults = cred.getClientExtensionResults();
        const prfSecret = extResults.prf?.results?.first;
        if (!prfSecret) {
          throw new Error("PRF_not_supported");
        }

        const prfKey = await crypto.subtle.importKey("raw", prfSecret, "AES-GCM", false, ["encrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedMaster = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          prfKey,
          masterKey
        );

        await StorageAdapter.set(`sv_cred_${userId}`, H(cred.rawId));
        await StorageAdapter.set(`sv_prf_salt_${userId}`, H(prfSalt));
        await StorageAdapter.set(`sv_enc_master_${userId}`, H(concatUint8(iv, new Uint8Array(encryptedMaster))));

        return { success: true, secure: true };
      } catch (e) {
        console.log('Biometric setup failed, using fallback:', e.message);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await crypto.subtle.importKey("raw", B(await hashIdentity(userId + "fallback")), "AES-GCM", false, ["encrypt"]);
        const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, B(masterKeyHex));
        await StorageAdapter.set(`sv_fallback_${userId}`, H(concatUint8(iv, new Uint8Array(enc))));
        return { success: true, secure: false, reason: e.message };
      }
    },

    async getMasterKey(userId) {
      try {
        const credId = await StorageAdapter.get(`sv_cred_${userId}`);
        const prfSalt = await StorageAdapter.get(`sv_prf_salt_${userId}`);
        const encMaster = await StorageAdapter.get(`sv_enc_master_${userId}`);

        if (credId && prfSalt && encMaster && await this.isAvailable()) {
          const challenge = crypto.getRandomValues(new Uint8Array(32));
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              allowCredentials: [{ type: "public-key", id: B(credId) }],
              userVerification: "required",
              extensions: { prf: { eval: { first: B(prfSalt) } } }
            }
          });

          const extResults = assertion.getClientExtensionResults();
          const prfSecret = extResults.prf?.results?.first;
          if (!prfSecret) throw new Error("PRF authentication failed");

          const prfKey = await crypto.subtle.importKey("raw", prfSecret, "AES-GCM", false, ["decrypt"]);
          const combined = B(encMaster);
          const iv = combined.slice(0, 12);
          const ct = combined.slice(12);
          const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, prfKey, ct);

          return { success: true, masterKey: H(new Uint8Array(decrypted)), secure: true };
        }

        const enc = await StorageAdapter.get(`sv_fallback_${userId}`);
        if (enc) {
          const blob = B(enc);
          const iv = blob.slice(0, 12);
          const ct = blob.slice(12);
          const key = await crypto.subtle.importKey("raw", B(await hashIdentity(userId + "fallback")), "AES-GCM", false, ["decrypt"]);
          const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
          return { success: true, masterKey: H(new Uint8Array(dec)), secure: false };
        }
        throw new Error("No biometric or fallback key found");
      } catch (e) {
        console.error('getMasterKey failed:', e);
        return { success: false, error: e.message };
      }
    }
  };

  async function deriveMasterKey(password, userData) {
    try {
      const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
      );
      const derivedKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: B(userData.salt), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      const decryptedKey = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: B(userData.iv) },
        derivedKey,
        B(userData.encryptedKey)
      );

      return { success: true, masterKey: H(new Uint8Array(decryptedKey)) };
    } catch (e) {
      return { success: false, error: "Wrong password" };
    }
  }

  async function signup(email, username, password) {
    try {
      const emailHash = await hashIdentity(email);
      const usernameHash = await hashIdentity(username);

      if (await emailExists(email)) {
        return { success: false, error: "Email already registered. Please login.", exists: true };
      }

      const masterKey = crypto.getRandomValues(new Uint8Array(32));
      const masterKeyHex = H(masterKey);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
      );
      const derivedKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      const encryptedKey = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        masterKey
      );

      const userKey = await crypto.subtle.importKey("raw", masterKey, "AES-GCM", false, ["encrypt"]);
      const usernameIv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedUsername = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: usernameIv },
        userKey,
        new TextEncoder().encode(username)
      );

      const userData = {
        emailHash,
        usernameHash,
        encryptedUsername: H(concatUint8(usernameIv, new Uint8Array(encryptedUsername))),
        salt: H(salt),
        iv: H(iv),
        encryptedKey: H(new Uint8Array(encryptedKey))
      };

      const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
      users[emailHash] = userData;
      localStorage.setItem('sv_users', JSON.stringify(users));
      localStorage.setItem('sv_current_user', emailHash);

      return { success: true, user: userData, masterKey: masterKeyHex, emailHash };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function login(email, password) {
    try {
      const userData = await getUserByEmail(email);
      if (!userData) throw new Error("Email not found");

      const result = await deriveMasterKey(password, userData);
      if (!result.success) throw new Error(result.error);

      localStorage.setItem('sv_current_user', userData.emailHash);

      const userKey = await crypto.subtle.importKey("raw", B(result.masterKey), "AES-GCM", false, ["decrypt"]);
      const encUsername = B(userData.encryptedUsername);
      const usernameIv = encUsername.slice(0, 12);
      const usernameCt = encUsername.slice(12);
      const decUsername = await crypto.subtle.decrypt({ name: "AES-GCM", iv: usernameIv }, userKey, usernameCt);
      const username = new TextDecoder().decode(decUsername);

      return { success: true, masterKey: result.masterKey, username, emailHash: userData.emailHash };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function verifyPassword(password, userData) {
    return await deriveMasterKey(password, userData);
  }

  async function savePhoto(emailHash, masterKeyHex, file) {
    try {
      const existing = await getAllPhotos(emailHash);

      let photoId;
      do {
        photoId = crypto.randomUUID? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9);
      } while (existing.some(p => p.id === photoId));

      const arrayBuffer = await file.arrayBuffer();
      const key = await crypto.subtle.importKey("raw", B(masterKeyHex), "AES-GCM", false, ["encrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, arrayBuffer);

      const combined = concatUint8(iv, new Uint8Array(encrypted));
      const photoData = {
        id: photoId,
        encrypted: H(combined),
        timestamp: Date.now()
      };

      existing.push(photoData);
      await StorageAdapter.set(`sv_photos_${emailHash}`, JSON.stringify(existing));

      return { success: true, photoId };
    } catch (e) {
      console.error('savePhoto error:', e);
      return { success: false, error: e.message };
    }
  }

  async function getAllPhotos(emailHash) {
    try {
      const raw = await StorageAdapter.get(`sv_photos_${emailHash}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)? parsed : [];
    } catch (e) {
      console.error('getAllPhotos error:', e);
      return [];
    }
  }

  async function saveAllPhotos(emailHash, photosArray) {
    await StorageAdapter.set(`sv_photos_${emailHash}`, JSON.stringify(photosArray));
  }

  async function decryptBytes(masterKeyHex, encryptedHex) {
    const combined = B(encryptedHex);
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);

    const key = await crypto.subtle.importKey("raw", B(masterKeyHex), "AES-GCM", false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new Uint8Array(decrypted);
  }

  async function isBiometricAvailable() {
    return await SecureStore.isAvailable();
  }

  return {
    wipeAllVaultData,
    emailExists,
    getUserByEmail,
    signup,
    login,
    verifyPassword,
    saveMasterKey: SecureStore.saveMasterKey.bind(SecureStore),
    getMasterKey: SecureStore.getMasterKey.bind(SecureStore),
    savePhoto,
    getAllPhotos,
    saveAllPhotos,
    decryptBytes,
    isBiometricAvailable
  };
})();
}
