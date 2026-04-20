const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH_BITS = 256;
const OTP_DIGITS = 6;
const OTP_PERIOD_SECONDS = 30;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const generateSalt = (length = 16): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
};

export const hashPassword = async (password: string, saltBase64: string): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return bytesToBase64(new Uint8Array(bits));
};

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

export const verifyPassword = async (password: string, saltBase64: string, expectedHash: string): Promise<boolean> => {
  const computed = await hashPassword(password, saltBase64);
  return timingSafeEqual(computed, expectedHash);
};

export const deriveEncryptionKeyBytes = async (password: string, saltBase64: string): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return bytesToBase64(new Uint8Array(bits));
};

const importAesKey = async (keyBytesBase64: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey("raw", base64ToBytes(keyBytesBase64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const encryptJson = async <T>(data: T, keyBytesBase64: string): Promise<string> => {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await importAesKey(keyBytesBase64);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
};

export const decryptJson = async <T>(payload: string, keyBytesBase64: string): Promise<T> => {
  const [ivB64, cipherB64] = payload.split(".");
  if (!ivB64 || !cipherB64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(cipherB64);
  const key = await importAesKey(keyBytesBase64);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(decoder.decode(new Uint8Array(plaintext))) as T;
};

const base32Encode = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = "";

  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });

  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (value: string): Uint8Array => {
  const clean = value.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const output: number[] = [];

  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) continue;
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
};

export const generateTotpSecret = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
};

const hotp = async (secret: string, counter: number): Promise<string> => {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32), false);
  view.setUint32(4, counter >>> 0, false);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return (code % 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, "0");
};

export const generateTotpCode = async (secret: string, atMs = Date.now()): Promise<string> => {
  const counter = Math.floor(atMs / 1000 / OTP_PERIOD_SECONDS);
  return hotp(secret, counter);
};

export const verifyTotpCode = async (secret: string, code: string, atMs = Date.now(), window = 1): Promise<boolean> => {
  const normalized = code.trim();
  for (let i = -window; i <= window; i += 1) {
    const expected = await generateTotpCode(secret, atMs + i * OTP_PERIOD_SECONDS * 1000);
    if (timingSafeEqual(expected, normalized)) {
      return true;
    }
  }
  return false;
};
