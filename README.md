# SecurePhoto Vault 🔒

**Live App: https://oifoghe-emmanuel.github.io/secure-photos-pwa/**

Zero-knowledge encrypted photo vault. Military-grade AES-256 encryption, 100% client-side. No servers, no tracking, no backdoors.

### **Features**

- **AES-256 Encryption**: Photos encrypted locally before storage
- **Biometric Unlock**: FaceID/TouchID via WebAuthn 
- **Zero-Knowledge**: Your keys never leave your device
- **PWA**: Install on iOS/Android. Works offline
- **Secure Import**: Delete originals after encrypting
- **No Backend**: Runs entirely in your browser

### **Install**

**iPhone**: Open link in Safari → Share → Add to Home Screen  
**Android**: Open link in Chrome → 3 dots → Install app

### **How It Works**

1. Create account with biometrics
2. Import photos from gallery 
3. Photos are encrypted with AES-256-GCM
4. Delete originals from Gallery
5. Access vault only with FaceID/TouchID

All encryption happens in your browser. We literally cannot see your photos.

### **Tech Stack**

- Vanilla JS + Crypto Web API
- WebAuthn for biometrics  
- Service Workers for offline PWA
- IndexedDB for encrypted storage
- GitHub Pages hosting

### **Security**

- PBKDF2 key derivation, 100k iterations
- AES-256-GCM authenticated encryption
- WebAuthn hardware-backed keys
- CSP + no external dependencies
- Open source, audit yourself

### **Support This Project**

If SecurePhoto Vault helps you keep your photos safe, consider sponsoring development:

**[💳 Donate via Paystack](https://paystack.shop/pay/h9wvwzrcg3)**

Funds go to: security audits, new features, keeping it free + open source.

### **License**

MIT

---

**Warning**: If you lose your device + biometric, photos cannot be recovered. No password reset exists. This is real zero-knowledge.
