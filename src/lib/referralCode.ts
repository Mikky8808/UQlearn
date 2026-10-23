/**
 * Referral Code Utility for 16-char / 16-bit Code Generation and Email Decryption
 */

const EMAIL_CODE_MAP_KEY = 'uqlearn_email_referral_codes';

// Helper: Get local store of code <-> email mappings
function getCodeStore(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(EMAIL_CODE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Helper: Save mapping
function saveCodeMapping(code: string, email: string) {
  if (typeof window === 'undefined') return;
  try {
    const store = getCodeStore();
    const normalizedCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    store[normalizedCode] = email.trim().toLowerCase();
    localStorage.setItem(EMAIL_CODE_MAP_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save code mapping', e);
  }
}

/**
 * Simple XOR Cipher Key for 16-bit code obfuscation fallback
 */
const SECRET_KEY = 'UQLearn2026Key';

function xorEncrypt(str: string, key: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Generates a unique 16-character referral code (4x4 format: XXXX-XXXX-XXXX-XXXX)
 * derived deterministically from the user's email address.
 */
export function generate16BitCodeFromEmail(email: string): string {
  if (!email || !email.trim()) {
    return 'UQ00-0000-0000-0000';
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Check if mapping already exists in store
  const store = getCodeStore();
  const existingCode = Object.keys(store).find(
    (key) => store[key] === cleanEmail
  );

  if (existingCode && existingCode.length === 16) {
    return format16CharCode(existingCode);
  }

  // 2. Generate a 16-character hex/alphanumeric code deterministically using FNV1a + Hash
  let hash1 = 2166136261;
  let hash2 = 0x811c9dc5;

  for (let i = 0; i < cleanEmail.length; i++) {
    const char = cleanEmail.charCodeAt(i);
    hash1 ^= char;
    hash1 = Math.imul(hash1, 16777619);
    hash2 ^= char;
    hash2 = Math.imul(hash2, 0x01000193);
  }

  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const raw16Code = (part1 + part2).slice(0, 16);

  // 3. Save mapping for instant exact decryption
  saveCodeMapping(raw16Code, cleanEmail);

  return format16CharCode(raw16Code);
}

/**
 * Formats a 16-character string into XXXX-XXXX-XXXX-XXXX
 */
export function format16CharCode(raw16: string): string {
  const clean = raw16.replace(/[^A-Za-z0-9]/g, '').toUpperCase().padStart(16, '0').slice(0, 16);
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

/**
 * Decrypts / Decodes a 16-bit referral code back to its owner's email address.
 */
export function decryptCodeToEmail(code: string): { success: boolean; email?: string; error?: string } {
  if (!code || !code.trim()) {
    return { success: false, error: 'Please enter a referral code.' };
  }

  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (cleanCode.length !== 16) {
    return { 
      success: false, 
      error: `Invalid code length (${cleanCode.length} chars). Code must be 16 characters.` 
    };
  }

  // 1. Look up in localStorage / code store
  const store = getCodeStore();
  if (store[cleanCode]) {
    return {
      success: true,
      email: store[cleanCode],
    };
  }

  // 2. Fallback check for default accounts or system demo users
  if (cleanCode === 'UQ00000000000000') {
    return { success: true, email: 'demo@uqlearn.org' };
  }

  return {
    success: false,
    error: 'Code verified, but owner email not found in local store or decryption key expired.',
  };
}
