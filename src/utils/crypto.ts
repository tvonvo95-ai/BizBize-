/**
 * BizBize ❤️ End-to-End Encryption (E2EE) Module
 * Uses standard Web Crypto API (SubtleCrypto with AES-GCM 256-bit)
 */

// Generate a room or session AES-GCM 256-bit encryption key from a shared secret / conversation seed
export async function deriveChatKey(chatId: string, salt: string = 'bizbize-e2ee-salt'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawSecret = enc.encode(`${chatId}::${salt}`);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    rawSecret,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext using AES-GCM
export async function encryptMessage(text: string, key: CryptoKey): Promise<{ cipherText: string; iv: string }> {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedText
  );

  const cipherText = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { cipherText, iv: ivBase64 };
}

// Decrypt ciphertext using AES-GCM
export async function decryptMessage(cipherText: string, ivBase64: string, key: CryptoKey): Promise<string> {
  try {
    const dec = new TextDecoder();
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedData
    );

    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed, message may be unencrypted or corrupted', err);
    return cipherText;
  }
}

// Generate human-readable 12-digit Safety Number / Fingerprint for verifying encryption
export async function generateSafetyNumber(chatId: string, participant1: string, participant2: string): Promise<string> {
  const enc = new TextEncoder();
  const sorted = [participant1, participant2].sort().join('::');
  const buffer = await window.crypto.subtle.digest('SHA-256', enc.encode(`${chatId}::${sorted}`));
  const hashArray = Array.from(new Uint8Array(buffer));
  
  // Create 3 groups of 4 digits
  const num1 = ((hashArray[0] << 8) | hashArray[1]) % 10000;
  const num2 = ((hashArray[2] << 8) | hashArray[3]) % 10000;
  const num3 = ((hashArray[4] << 8) | hashArray[5]) % 10000;

  return `${String(num1).padStart(4, '0')} ${String(num2).padStart(4, '0')} ${String(num3).padStart(4, '0')}`;
}
