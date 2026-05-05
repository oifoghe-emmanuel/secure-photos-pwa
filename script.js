if (window.SP_LOADED) {
  console.warn('SecurePhoto already loaded');
} else {
  window.SP_LOADED = true;

let masterKeyHex = null;
let currentEmailHash = null;
let currentUsername = '';
let selectedPhotos = new Set();
let unlockMethod = 'both';
let inactivityTimer = null;
let photoViewTimer = null;
let currentPhotoId = null;
let statusTimeout = null;
const FUNNY_EMOJIS = ['🤪','🎭','🎪','🎨','🎯','🤡','👾','🦄','🍕','🚀','🎸','🦖','🧸','🎲','🪩','🦜','🎮','🌮'];

const $ = (id) => document.getElementById(id);
const show = (el) => el && (el.style.display = 'block');
const hide = (el) => el && (el.style.display = 'none');
const B = h => new Uint8Array(h.match(/.{1,2}/g).map(b=>parseInt(b,16)));

const VaultTimer = {
  reset() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (currentEmailHash) logout(true);
    }, 5 * 60 * 1000);
  },
  startPhotoTimer() {
    clearTimeout(photoViewTimer);
    photoViewTimer = setTimeout(() => closePhotoModal(), 60 * 1000);
  },
  stopPhotoTimer() { clearTimeout(photoViewTimer); }
};

function initTheme() {
  const saved = localStorage.getItem('sp_theme') || 'dark';
  document.body.className = saved;
  const toggle = $('theme-toggle');
  if (toggle) toggle.checked = saved === 'light';
}

function toggleTheme() {
  const isLight = $('theme-toggle')?.checked;
  document.body.className = isLight? 'light' : 'dark';
  localStorage.setItem('sp_theme', isLight? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  $('signup-btn')?.addEventListener('click', handleSignup);
  $('login-btn')?.addEventListener('click', handleLogin);
  $('faceid-btn')?.addEventListener('click', handleFaceID);
  $('show-login-link')?.addEventListener('click', () => showLogin());
  $('show-signup-link')?.addEventListener('click', showSignup);
  $('password')?.addEventListener('input', validatePassword);
  $('email')?.addEventListener('blur', checkEmailExists);

  $('logout-btn')?.addEventListener('click', () => logout(false));
  $('fab-btn')?.addEventListener('click', () => $('camera')?.click());
  $('camera')?.addEventListener('change', handlePhotoAdd);
  $('move-select-btn')?.addEventListener('click', () => $('move-input')?.click());
  $('move-input')?.addEventListener('change', handleImport);

  $('theme-toggle')?.addEventListener('change', toggleTheme);
  $('auth-method')?.addEventListener('change', saveAuthMethod);
  $('sync-toggle')?.addEventListener('change', toggleSync);
  $('contact-item')?.addEventListener('click', toggleContact);
  $('about-item')?.addEventListener('click', toggleAbout);
  $('feedback-link')?.addEventListener('click', (e) => { e.preventDefault(); showFeedback(); });
  $('sponsor-link')?.addEventListener('click', (e) => { e.preventDefault(); showSponsor(); });

  $('modal-cancel')?.addEventListener('click', closeModal);
  $('modal-unlock')?.addEventListener('click', submitModalPassword);
  $('modal-faceid')?.addEventListener('click', submitModalFaceID);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  ['click', 'touchstart', 'mousemove', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => VaultTimer.reset());
  });

  if (typeof SecureVault === 'undefined') {
    showAuthStatus('Loading security module...', 'error');
    setTimeout(() => location.reload(), 1000);
    return;
  }

  // Biometric UI handling
  const available = await SecureVault.isBiometricAvailable();
  if (!available) {
    if ($('faceid-btn')) $('faceid-btn').style.display = 'none';
    if ($('modal-faceid')) $('modal-faceid').style.display = 'none';
    if ($('bio-unavailable-note')) $('bio-unavailable-note').style.display = 'block';
  } else {
    if ($('faceid-btn')) $('faceid-btn').style.display = 'block';
    if ($('modal-faceid')) $('modal-faceid').style.display = 'block';
  }

  unlockMethod = localStorage.getItem('sp_unlock_method') || 'both';
  const authSelect = $('auth-method');
  if (authSelect) authSelect.value = unlockMethod;

  if (localStorage.getItem('sv_current_user')) {
    showLogin();
  } else {
    showSignup();
  }

  VaultTimer.reset();
});

function showSignup() {
  $('email').value = '';
  $('username').value = '';
  $('password').value = '';
  validatePassword();
  hide($('login-form'));
  show($('signup-form'));
  clearStatus();
}

function showLogin(prefillEmail = '') {
  if (prefillEmail) $('login-email').value = prefillEmail;
  else $('login-email').value = '';
  $('login-password').value = '';
  hide($('signup-form'));
  show($('login-form'));
  clearStatus();
}

async function checkEmailExists() {
  const email = $('email')?.value;
  if (!email) return;
  const exists = await SecureVault.emailExists(email);
  if (exists) {
    showAuthStatus('Email already registered. Redirecting to login...', 'info');
    setTimeout(() => showLogin(email), 1500);
  }
}

function validatePassword() {
  const pwd = $('password')?.value || '';
  const hasLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);

  $('rule-length')?.classList.toggle('valid', hasLength);
  $('rule-letter')?.classList.toggle('valid', hasLetter);
  $('rule-number')?.classList.toggle('valid', hasNumber);
  $('rule-symbol')?.classList.toggle('valid', hasSymbol);

  const btn = $('signup-btn');
  if (btn) btn.disabled =!(hasLength && hasLetter && hasNumber && hasSymbol);
}

function showAuthStatus(msg, type = '') {
  clearTimeout(statusTimeout);
  const el = $('auth-status');
  if (el) {
    el.textContent = msg;
    el.className = 'status ' + (type && type!== 'info'? type : '');

    if (type === 'error') {
      statusTimeout = setTimeout(() => {
        el.textContent = '';
        el.className = 'status';
      }, 3000);
    }
  }
}

function clearStatus() {
  clearTimeout(statusTimeout);
  showAuthStatus('');
}

function showApp() {
  $('auth-screen')?.classList.remove('active');
  $('app-screen')?.classList.add('active');
  const headerUser = $('header-username');
  if (headerUser) headerUser.textContent = '@' + currentUsername;
  loadPhotos();
}

function logout(auto = false) {
  masterKeyHex = null;
  currentEmailHash = null;
  currentUsername = '';
  $('app-screen')?.classList.remove('active');
  $('auth-screen')?.classList.add('active');
  const pwdInput = $('login-password');
  if (pwdInput) pwdInput.value = '';
  showLogin();
  if (!auto) showAuthStatus('Vault locked', 'success');
  else showAuthStatus('Session expired - please unlock', 'error');
  clearTimeout(inactivityTimer);
  clearTimeout(photoViewTimer);
}

async function handleSignup() {
  await SecureVault.wipeAllVaultData();

  const email = $('email')?.value;
  const username = $('username')?.value;
  const password = $('password')?.value;

  if (!email ||!username ||!password) {
    showAuthStatus('Fill all fields', 'error');
    return;
  }

  if (password.length < 8 ||!/[a-zA-Z]/.test(password) ||!/[0-9]/.test(password) ||!/[^a-zA-Z0-9]/.test(password)) {
    showAuthStatus('Password must have 8+ chars, 1 letter, 1 number, 1 symbol', 'error');
    return;
  }

  const btn = $('signup-btn');
  if (btn) btn.disabled = true;
  showAuthStatus('Creating secure account...', 'info');

  try {
    const result = await SecureVault.signup(email, username, password);
    if (!result.success) {
      if (result.exists) {
        showAuthStatus('Email already exists. Redirecting to login...', 'error');
        setTimeout(() => showLogin(email), 1500);
        return;
      }
      throw new Error(result.error);
    }

    currentUsername = username;
    masterKeyHex = result.masterKey;
    currentEmailHash = result.emailHash;

    showAuthStatus('Setting up security...', 'info');
    const bioResult = await SecureVault.saveMasterKey(currentEmailHash, masterKeyHex);

    if (bioResult.secure) {
      showAuthStatus('✅ Account created with biometric security!', 'success');
    } else {
      showAuthStatus('✅ Account created! Biometric unavailable.', 'success');
    }
    setTimeout(showApp, 1000);
  } catch (err) {
    showAuthStatus('Signup failed: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleLogin() {
  const email = $('login-email')?.value;
  const password = $('login-password')?.value;

  if (!email ||!password) {
    showAuthStatus('Enter email and password', 'error');
    return;
  }

  showAuthStatus('Checking credentials...', 'info');

  try {
    const result = await SecureVault.login(email, password);
    if (!result.success) throw new Error(result.error);

    showAuthStatus('✅ Vault unlocked', 'success');
    masterKeyHex = result.masterKey;
    currentEmailHash = result.emailHash;
    currentUsername = result.username;
    console.log('Logged in as:', currentEmailHash);
    setTimeout(showApp, 500);
  } catch (err) {
    const msg = err.message.replace('Login: ', '');
    showAuthStatus(msg.includes('Email not found')? 'Email not found' : msg, 'error');
  }
}

async function handleFaceID() {
  const emailHash = localStorage.getItem('sv_current_user');
  if (!emailHash) {
    showAuthStatus('No account found. Please login with password first.', 'error');
    return;
  }

  showAuthStatus('Use biometric security...', 'info');

  try {
    const result = await SecureVault.getMasterKey(emailHash);
    if (result.success) {
      showAuthStatus('✅ Vault unlocked', 'success');
      masterKeyHex = result.masterKey;
      currentEmailHash = emailHash;
      const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
      const userData = users[emailHash];
      const userKey = await crypto.subtle.importKey("raw", B(masterKeyHex), "AES-GCM", false, ["decrypt"]);
      const encUsername = B(userData.encryptedUsername);
      const usernameIv = encUsername.slice(0, 12);
      const usernameCt = encUsername.slice(12);
      const decUsername = await crypto.subtle.decrypt({ name: "AES-GCM", iv: usernameIv }, userKey, usernameCt);
      currentUsername = new TextDecoder().decode(decUsername);
      setTimeout(showApp, 500);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    showAuthStatus('Biometric failed: ' + err.message, 'error');
  }
}

function saveAuthMethod() {
  unlockMethod = $('auth-method')?.value || 'both';
  localStorage.setItem('sp_unlock_method', unlockMethod);
}

function toggleContact() {
  const dd = $('contact-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none'? 'block' : 'none';
}

function toggleAbout() {
  const dd = $('about-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none'? 'block' : 'none';
}

function toggleSync() {
  alert('Cloud Sync coming in v2.0 with Firebase.\n\nFor now, all photos stay encrypted on your device only.');
  const toggle = $('sync-toggle');
  if (toggle) toggle.checked = false;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const targetTab = $(tabName + '-tab');
  const targetNav = document.querySelector(`[data-tab="${tabName}"]`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

async function loadPhotos() {
  console.log('Loading photos for user:', currentEmailHash);
  let photos = await SecureVault.getAllPhotos(currentEmailHash);
  console.log('Found photos:', photos);
  const gallery = $('gallery');
  if (!gallery) return;

  let needsSave = false;
  photos = photos.map(p => {
    if (!p.id && p.encrypted) {
      p.id = p.timestamp? p.timestamp.toString() + Math.random().toString(36).substr(2, 9) : Date.now().toString() + Math.random().toString(36).substr(2, 9);
      needsSave = true;
      console.log('Migrated old photo, gave it ID:', p.id);
    }
    return p;
  });

  if (needsSave) {
    await SecureVault.saveAllPhotos(currentEmailHash, photos);
    console.log('Saved migrated photos');
  }

  if (!photos || photos.length === 0) {
    gallery.innerHTML = `<div class="empty-state-home">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <h3>No Photos Yet</h3>
      <p>Press the + button to add your first encrypted photo</p>
    </div>`;
    return;
  }

  gallery.innerHTML = '';
  photos.forEach(photo => {
    if (!photo.id) return;
    const item = document.createElement('div');
    item.className = 'photo-thumb';
    item.dataset.id = photo.id;
    const emoji = FUNNY_EMOJIS[Math.floor(Math.random() * FUNNY_EMOJIS.length)];
    item.innerHTML = `<div style="font-size:48px">${emoji}</div>`;
    item.onclick = (e) => requestPhotoUnlock(photo.id, e.currentTarget);
    gallery.appendChild(item);
  });
}

async function handlePhotoAdd(e) {
  const files = Array.from(e.target.files);
  const status = $('app-status');
  for (let i = 0; i < files.length; i++) {
    try {
      if (status) status.textContent = `Encrypting ${i+1}/${files.length}...`;
      await SecureVault.savePhoto(currentEmailHash, masterKeyHex, files[i]);
    } catch (err) {
      console.error('Photo error:', err);
      if (status) {
        status.className = 'status error';
        status.textContent = `Failed: ${err.message}`;
      }
      e.target.value = '';
      return;
    }
  }
  if (status) {
    status.className = 'status success';
    status.textContent = `✅ Added ${files.length} encrypted photos`;
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
  }
  loadPhotos();
  e.target.value = '';
}

async function handleImport(e) {
  const files = Array.from(e.target.files);
  const status = $('move-status');

  for (let i = 0; i < files.length; i++) {
    try {
      if (status) status.textContent = `Encrypting ${i+1}/${files.length}...`;
      await SecureVault.savePhoto(currentEmailHash, masterKeyHex, files[i]);
    } catch (err) {
      console.error('Import error:', err);
      if (status) {
        status.className = 'status error';
        status.textContent = `Failed: ${err.message}`;
      }
      e.target.value = '';
      return;
    }
  }

  if (status) {
    status.className = 'status success';
    status.textContent = `✅ Imported ${files.length} photos to vault`;
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
  }

  loadPhotos();
  e.target.value = '';
}

async function requestPhotoUnlock(photoId, thumbElement) {
  console.log('Requesting unlock for:', photoId);
  currentPhotoId = photoId;

  const tempKey = masterKeyHex;
  masterKeyHex = null;

  if (unlockMethod === 'password') {
    showPasswordModal();
  } else if (unlockMethod === 'biometric') {
    const result = await SecureVault.getMasterKey(currentEmailHash);
    if (result.success) {
      masterKeyHex = result.masterKey;
      openPhotoViewer(photoId, thumbElement);
    } else {
      alert('Biometric authentication failed: ' + result.error + '\n\nPhoto will not open.');
      masterKeyHex = tempKey;
    }
  } else {
    masterKeyHex = tempKey;
    showPasswordModal();
  }
}

function showPasswordModal() {
  const modal = $('password-modal');
  const pwdInput = $('modal-password');
  const status = $('modal-status');
  if (modal) modal.style.display = 'flex';
  if (pwdInput) {
    pwdInput.value = '';
    pwdInput.focus();
  }
  if (status) status.textContent = '';
}

function closeModal() {
  const modal = $('password-modal');
  if (modal) modal.style.display = 'none';
  currentPhotoId = null;
}

async function submitModalPassword() {
  const pwd = $('modal-password')?.value;
  if (!pwd) return;

  const status = $('modal-status');
  if (status) {
    status.textContent = 'Verifying...';
    status.className = 'status';
  }

  const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
  const userData = users[currentEmailHash];

  const result = await SecureVault.verifyPassword(pwd, userData);

  if (result.success) {
    masterKeyHex = result.masterKey;
    const photoIdToOpen = currentPhotoId;
    const thumbEl = document.querySelector(`[data-id="${photoIdToOpen}"]`);
    closeModal();
    openPhotoViewer(photoIdToOpen, thumbEl);
  } else {
    if (status) {
      status.className = 'status error';
      status.textContent = 'Wrong password';
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);
    }
  }
}

async function submitModalFaceID() {
  const status = $('modal-status');
  if (status) {
    status.textContent = 'Use biometric...';
    status.className = 'status';
  }

  const result = await SecureVault.getMasterKey(currentEmailHash);
  if (result.success) {
    masterKeyHex = result.masterKey;
    const photoIdToOpen = currentPhotoId;
    const thumbEl = document.querySelector(`[data-id="${photoIdToOpen}"]`);
    closeModal();
    openPhotoViewer(photoIdToOpen, thumbEl);
  } else {
    if (status) {
      status.className = 'status error';
      status.textContent = 'Biometric failed';
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);
    }
  }
}

async function openPhotoViewer(photoId, thumbElement) {
  console.log('Opening viewer for:', photoId, 'User:', currentEmailHash);
  if (!masterKeyHex) {
    alert('Error: Authentication required. No master key.');
    return;
  }

  const photos = await SecureVault.getAllPhotos(currentEmailHash);
  const photo = photos.find(p => p.id === photoId);

  if (!photo) {
    console.error('Photo not found. ID:', photoId, 'Available:', photos.map(p => p.id));
    alert(`Photo not found.\n\nDebug:\nUser: ${currentEmailHash}\nLooking for: ${photoId}\nAvailable: ${photos.map(p=>p.id).join(', ') || 'none'}`);
    return;
  }

  try {
    console.log('Decrypting photo:', photoId);
    const decrypted = await SecureVault.decryptBytes(masterKeyHex, photo.encrypted);
    console.log('Decrypted bytes:', decrypted.byteLength);

    const blob = new Blob([decrypted], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    console.log('Blob URL:', url);

    const viewer = $('viewer');
    if (viewer) {
      const rect = thumbElement? thumbElement.getBoundingClientRect() : null;

      viewer.innerHTML = `
        <div id="viewer-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0);transition:background 0.3s ease;z-index:9998;"></div>
        <div id="viewer-img-wrap" style="position:fixed;z-index:9999;transition:all 0.4s cubic-bezier(0.2,0,0,1);">
          <img src="${url}" id="viewer-img" style="width:100%;height:100%;object-fit:contain;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
          <button onclick="closePhotoModal()" style="position:absolute;top:20px;right:20px;background:rgba(0,0,0,0.6);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;opacity:0;transition:opacity 0.3s ease 0.2s;" id="viewer-close">×</button>
        </div>
      `;

      const wrap = $('viewer-img-wrap');
      const backdrop = $('viewer-backdrop');
      const closeBtn = $('viewer-close');

      if (rect) {
        wrap.style.left = rect.left + 'px';
        wrap.style.top = rect.top + 'px';
        wrap.style.width = rect.width + 'px';
        wrap.style.height = rect.height + 'px';
        wrap.style.borderRadius = '8px';
      } else {
        wrap.style.left = '50%';
        wrap.style.top = '50%';
        wrap.style.width = '0px';
        wrap.style.height = '0px';
        wrap.style.transform = 'translate(-50%, -50%)';
      }

      viewer.classList.add('active');

      requestAnimationFrame(() => {
        backdrop.style.background = 'rgba(0,0,0,0.95)';
        wrap.style.left = '50%';
        wrap.style.top = '50%';
        wrap.style.width = '95vw';
        wrap.style.height = '95vh';
        wrap.style.transform = 'translate(-50%, -50%)';
        wrap.style.borderRadius = '0px';
        closeBtn.style.opacity = '1';
      });

      VaultTimer.startPhotoTimer();
      console.log('Viewer activated');
    }
  } catch (err) {
    console.error('Decrypt error:', err);
    alert('Failed to decrypt photo: ' + err.message);
  }
}

function closePhotoModal() {
  const viewer = $('viewer');
  const wrap = $('viewer-img-wrap');
  const backdrop = $('viewer-backdrop');

  if (viewer && wrap) {
    backdrop.style.background = 'rgba(0,0,0,0)';
    wrap.style.opacity = '0';
    wrap.style.transform = 'translate(-50%, -50%) scale(0.8)';

    setTimeout(() => {
      const img = viewer.querySelector('img');
      if (img && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      viewer.classList.remove('active');
      viewer.innerHTML = '';
    }, 300);
  }
  VaultTimer.stopPhotoTimer();
  currentPhotoId = null;
}

// Expose for inline onclick fallback
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleFaceID = handleFaceID;
window.showSignup = showSignup;
window.showLogin = showLogin;
window.logout = logout;
window.switchTab = switchTab;
window.toggleTheme = toggleTheme;
window.saveAuthMethod = saveAuthMethod;
window.toggleContact = toggleContact;
window.toggleAbout = toggleAbout;
window.showFeedback = showFeedback;
window.showSponsor = showSponsor;
window.toggleSync = toggleSync;
window.closeModal = closeModal;
window.submitModalPassword = submitModalPassword;
window.submitModalFaceID = submitModalFaceID;
window.closePhotoModal = closePhotoModal;

} // End window.SP_LOADED check
