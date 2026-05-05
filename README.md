<div align="center">

# 🔐 SecurePhoto Vault

**Zero-knowledge encrypted photo vault. Military-grade AES-256, 100% client-side.**

*Imagine taking an apple... baking it into an apple pie... and YOU are the only person with the password to turn that pie back into an apple. That's SecurePhoto.*

**Live App: [oifoghe-emmanuel.github.io/secure-photos-pwa](https://oifoghe-emmanuel.github.io/secure-photos-pwa/)**

<iframe src="https://github.com/sponsors/Oifoghe-Emmanuel/button" title="Sponsor Oifoghe-Emmanuel" height="32" width="114" style="border: 0; border-radius: 6px;"></iframe>

**[Install App](#install) • [Report Bug](https://github.com/Oifoghe-Emmanuel/secure-photos-pwa/issues) • [Sponsor v2.0](#support-this-project)**

</div>

---

### 🎯 **Current Goal: $100/month**
Funding 40+ hours/month for **SecurePhoto v2.0**

**v2.0 Roadmap:** Decoy vaults • Auto-wipe on failed attempts • Optional E2E cloud backup • Video encryption • Native Android/iOS apps

**First 10 sponsors get their name in the app credits forever.**

---

### 💖 **Support This Project**

**🌍 International - USD:**  
[GitHub Sponsors](https://github.com/sponsors/Oifoghe-Emmanuel) - Monthly USD, shows on your GitHub profile

**🇳🇬 Nigeria - Naira:**  
[Paystack - Pay in Naira](https://paystack.shop/pay/h9wvwzrcg3) - Cards, bank transfer, USSD, Opay

*Naira sponsors get same perks. DM @Oifoghe-Emmanuel proof of payment for your name in app credits.*

**Funds go to:** Security audits, new features, keeping it free + open source for everyone.

---

### 🔥 **Why SecurePhoto?**

Your private photos shouldn't live in someone else's cloud. Or your gallery. Or anywhere a thief, ex, or nosy friend can find them.

**SecurePhoto encrypts images on your device using AES-256** - same standard banks + militaries use. Once encrypted, your photo becomes digital gibberish. No biometrics/password = no photo. Period.

**100% Client-Side. Zero-Knowledge.** No accounts, no servers, no tracking. We literally cannot see your photos.

### ✨ **Features - v1.0**

- **🔒 AES-256-GCM Encryption**: NSA-approved. Brute force would take billions of years
- **👆 Biometric Unlock**: FaceID/TouchID via WebAuthn hardware keys
- **📱 PWA**: Install on iOS/Android. Works 100% offline
- **🗑️ Secure Import**: Shred originals from gallery after encrypting
- **🚫 No Backend**: Runs entirely in your browser. No data ever transmitted
- **🔓 Zero-Knowledge**: Your keys never leave your device

### 📲 **Install**

**iPhone**: Open [link](https://oifoghe-emmanuel.github.io/secure-photos-pwa/) in Safari → Share → Add to Home Screen  
**Android**: Open [link](https://oifoghe-emmanuel.github.io/secure-photos-pwa/) in Chrome → 3 dots → Install app

### ⚙️ **How It Works**

1. **Create vault** with biometrics - keys generated on your device
2. **Import photos** from gallery 
3. **Photos encrypted** with AES-256-GCM before storage
4. **Delete originals** from Gallery 
5. **Access vault** only with FaceID/TouchID

All encryption happens in your browser. Lose your device + biometrics = photos cannot be recovered. This is real zero-knowledge.

### 🛡️ **Security Details**

| Spec | Detail |
| --- | --- |
| **Encryption** | AES-256-GCM authenticated encryption |
| **Key Derivation** | PBKDF2, 100,000 iterations |
| **Biometrics** | WebAuthn hardware-backed keys |
| **Storage** | IndexedDB, encrypted at rest |
| **Network** | Zero requests after install. Works offline |
| **Dependencies** | Zero external scripts. CSP locked |

**Open source, audit yourself.** No backdoors. No telemetry.

### 🧰 **Tech Stack**

- Vanilla JS + Crypto Web API
- WebAuthn for biometrics  
- Service Workers for offline PWA
- IndexedDB for encrypted storage
- GitHub Pages hosting

### 🚀 **Roadmap - Sponsored by You**

**v1.0 - Shipped ✅**  
PWA, AES-256, WebAuthn, offline vault

**v2.0 - $100/mo Goal →**  
- **Decoy Vaults**: Fake password → fake photos. Real vault stays hidden
- **Auto-Wipe**: 5 failed attempts = encrypted data self-destructs  
- **E2E Cloud Backup**: Optional encrypted backup to YOUR Google Drive/iCloud
- **Video Support**: Encrypt videos, not just photos
- **Native Apps**: Proper Android/iOS builds for app stores

**v3.0 - Future**  
Desktop app, shared albums with zero-knowledge, breach alerts

### 🤝 **Contributing**

Building in public from Nigeria 🇳🇬 PRs welcome!

1. Fork repo → `git checkout -b feature/AmazingFeature`
2. Commit → `git commit -m 'Add AmazingFeature'`
3. Push → `git push origin feature/AmazingFeature`
4. Open Pull Request

Found a bug? [Open an issue](https://github.com/Oifoghe-Emmanuel/secure-photos-pwa/issues)

### ⚖️ **License**

MIT License - see [LICENSE](LICENSE)

### 📧 **Contact**

**Oifoghe Emmanuel** - [@Oifoghe-Emmanuel](https://github.com/Oifoghe-Emmanuel)

**Live App:** [https://oifoghe-emmanuel.github.io/secure-photos-pwa/](https://oifoghe-emmanuel.github.io/secure-photos-pwa/)

---

<div align="center">

**If SecurePhoto protects your privacy, star the repo ⭐ and sponsor v2.0**

*Built with ❤️ in  Nigeria*

**Warning**: No password reset exists. Lose your biometrics/device = lose photos forever. This is real zero-knowledge.

</div>
