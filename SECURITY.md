# Security Features

## End-to-End Encryption
- User passwords are encrypted using AES before storage.
- Decryption occurs only during login for verification.
- Encryption key is user's email (for demo; use a stronger key in production).

## Two-Factor Authentication (2FA)
- 2FA secret is generated and stored for each user at registration.
- Login requires a valid 2FA token (OTP).
- 2FA token input is available on login page.

## How to Use
- Register: Account is protected with encrypted password and 2FA.
- Login: Enter email, password, and 2FA code.

## Libraries Used
- Frontend: crypto-js, otplib
- Backend: pycryptodome, pyotp (for Python model)

## Note
- For production, use secure key management and server-side validation.
- Demo uses localStorage for simplicity.
