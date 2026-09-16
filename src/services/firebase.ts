import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, child, remove } from 'firebase/database';
import { VIPKey } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyBrNaFnXfhl1PUENlDxt7IpZo855slqymU",
  authDomain: "abirhackadmin.firebaseapp.com",
  databaseURL: "https://abirhackadmin-default-rtdb.firebaseio.com",
  projectId: "abirhackadmin",
  storageBucket: "abirhackadmin.appspot.com",
  messagingSenderId: "73986520865",
  appId: "1:73986520865:web:0e115f5ca06c2a32d93060"
};

let db: ReturnType<typeof getDatabase> | null = null;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getDatabase(app);
} catch (e) {
  console.warn("Firebase initialization notice (falling back to local cache):", e);
}

const LOCAL_STORAGE_KEYS = 'arx_vip_keys_vault';
const LOCAL_STORAGE_AUTH = 'arx_authenticated_session';

// Pre-seeded master keys for instantaneous VIP access & fallback
const DEFAULT_INITIAL_KEYS: VIPKey[] = [
  {
    key: "ARX-VIP-2026-TITAN",
    label: "Master VIP Apex",
    createdAt: Date.now(),
    expiresAt: -1, // Lifetime
    isRevoked: false
  },
  {
    key: "QUANTUM-999-LIFETIME",
    label: "Quantum Rise Lifetime",
    createdAt: Date.now(),
    expiresAt: -1,
    isRevoked: false
  },
  {
    key: "SHADOW-FIX-LEVEL",
    label: "Shadow Reversal Pass",
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    isRevoked: false
  }
];

export function getLocalKeys(): VIPKey[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS, JSON.stringify(DEFAULT_INITIAL_KEYS));
  return DEFAULT_INITIAL_KEYS;
}

export function saveLocalKeys(keys: VIPKey[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS, JSON.stringify(keys));
  } catch (e) {
    console.error("Local save error:", e);
  }
}

/**
 * Fetch all keys from Firebase RTDB with fallback to localStorage
 */
export async function fetchAllKeys(): Promise<VIPKey[]> {
  const local = getLocalKeys();
  if (!db) return local;

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'vip_keys'));
    if (snapshot.exists()) {
      const val = snapshot.val();
      const list: VIPKey[] = Object.values(val);
      if (list.length > 0) {
        saveLocalKeys(list);
        return list;
      }
    }
  } catch (err) {
    console.warn("Firebase fetch error, utilizing local key vault:", err);
  }
  return local;
}

/**
 * Add or update key in Firebase & localStorage
 */
export async function saveVIPKey(keyData: VIPKey): Promise<boolean> {
  const keys = getLocalKeys();
  const existingIdx = keys.findIndex(k => k.key.trim().toUpperCase() === keyData.key.trim().toUpperCase());
  if (existingIdx >= 0) {
    keys[existingIdx] = keyData;
  } else {
    keys.unshift(keyData);
  }
  saveLocalKeys(keys);

  if (db) {
    try {
      const safeKeyId = keyData.key.replace(/[.#$[\]]/g, '_');
      await set(ref(db, `vip_keys/${safeKeyId}`), keyData);
    } catch (err) {
      console.warn("Firebase write failed, saved locally:", err);
    }
  }
  return true;
}

/**
 * Revoke/delete key
 */
export async function deleteVIPKey(keyString: string): Promise<boolean> {
  const keys = getLocalKeys().filter(k => k.key !== keyString);
  saveLocalKeys(keys);

  if (db) {
    try {
      const safeKeyId = keyString.replace(/[.#$[\]]/g, '_');
      await remove(ref(db, `vip_keys/${safeKeyId}`));
    } catch (err) {
      console.warn("Firebase delete failed, removed locally:", err);
    }
  }
  return true;
}

/**
 * Validate given key for unlocking predictor
 */
export async function validateKey(enteredKey: string): Promise<{ valid: boolean; message: string; keyInfo?: VIPKey }> {
  const clean = enteredKey.trim().toUpperCase();
  if (!clean) {
    return { valid: false, message: "KEY CANNOT BE EMPTY" };
  }

  const allKeys = await fetchAllKeys();
  const match = allKeys.find(k => k.key.trim().toUpperCase() === clean);

  if (!match) {
    return { valid: false, message: "INVALID VIP ACCESS KEY. CONTACT ADMIN FOR ACCESS." };
  }

  if (match.isRevoked) {
    return { valid: false, message: "THIS VIP KEY HAS BEEN SUSPENDED OR REVOKED." };
  }

  if (match.expiresAt !== -1 && match.expiresAt < Date.now()) {
    return { valid: false, message: "KEY EXPIRED. RENEW WITH ADMIN." };
  }

  // Set session authenticated
  try {
    sessionStorage.setItem(LOCAL_STORAGE_AUTH, JSON.stringify({
      key: match.key,
      label: match.label,
      authTime: Date.now()
    }));
  } catch {
    // fallback
  }

  return { valid: true, message: "SECURITY AUTHORIZED. VIP ACCESS GRANTED.", keyInfo: match };
}

export function isSessionAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(LOCAL_STORAGE_AUTH);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.key);
  } catch {
    return false;
  }
}

export function clearSessionAuth() {
  try {
    sessionStorage.removeItem(LOCAL_STORAGE_AUTH);
  } catch {
    // ignore
  }
}
