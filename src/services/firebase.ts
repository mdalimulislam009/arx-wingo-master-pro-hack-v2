import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, child, remove, onValue } from 'firebase/database';
import { VIPKey, GlobalServerConfig } from '../types';

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
const GLOBAL_CONFIG_REF = 'global_app_config';
const LOCAL_STORAGE_GLOBAL_CONFIG = 'arx_global_config_cache';

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
  return DEFAULT_INITIAL_KEYS;
}

export function saveLocalKeys(keys: VIPKey[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS, JSON.stringify(keys));
  } catch {
    // ignore
  }
}

/**
 * Fetch all keys from Firebase Realtime Database
 */
export async function fetchAllKeys(): Promise<VIPKey[]> {
  if (!db) return getLocalKeys();

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'vip_keys'));
    if (snapshot.exists()) {
      const val = snapshot.val();
      const keysArray: VIPKey[] = Object.values(val);
      if (keysArray.length > 0) {
        saveLocalKeys(keysArray);
        return keysArray;
      }
    }
  } catch (err) {
    console.warn("Firebase fetch error, using local keys:", err);
  }

  return getLocalKeys();
}

/**
 * Save new or updated key
 */
export async function saveVIPKey(keyItem: VIPKey): Promise<boolean> {
  const current = getLocalKeys().filter(k => k.key !== keyItem.key);
  current.push(keyItem);
  saveLocalKeys(current);

  if (db) {
    try {
      const safeKeyId = keyItem.key.replace(/[.#$[\]]/g, '_');
      await set(ref(db, `vip_keys/${safeKeyId}`), keyItem);
      return true;
    } catch (err) {
      console.warn("Firebase write error, saved locally:", err);
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

/* ================================================================ */
/* LIVE 2-SECOND SERVER SYNC: NAME, PHOTO LOGO & ALL USER LOGIC ON/OFF */
/* ================================================================ */

export function getCachedGlobalConfig(): GlobalServerConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GLOBAL_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function cacheGlobalConfig(config: GlobalServerConfig) {
  try {
    localStorage.setItem(LOCAL_STORAGE_GLOBAL_CONFIG, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Save Name, Photo Logo, Logic ON/OFF to Firebase Server
 * Every connected client will receive this update live in real-time!
 */
export async function saveGlobalSettingsToServer(config: GlobalServerConfig): Promise<boolean> {
  const payload: GlobalServerConfig = {
    ...config,
    updatedAt: Date.now()
  };

  cacheGlobalConfig(payload);

  if (db) {
    try {
      await set(ref(db, GLOBAL_CONFIG_REF), payload);
      return true;
    } catch (err) {
      console.warn("Failed to write global config to Firebase, cached locally:", err);
    }
  }
  return true;
}

/**
 * Fetch global settings from server
 */
export async function fetchGlobalSettingsFromServer(): Promise<GlobalServerConfig | null> {
  if (!db) return getCachedGlobalConfig();

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, GLOBAL_CONFIG_REF));
    if (snapshot.exists()) {
      const data = snapshot.val() as GlobalServerConfig;
      if (data) {
        cacheGlobalConfig(data);
        return data;
      }
    }
  } catch (err) {
    console.warn("Fetch global config failed:", err);
  }
  return getCachedGlobalConfig();
}

/**
 * Subscribe to Realtime Database updates for global settings.
 * Pushes updates instantaneously to all users without page refresh!
 */
export function subscribeToGlobalSettings(callback: (config: GlobalServerConfig) => void): () => void {
  if (!db) {
    return () => {};
  }

  try {
    const configRef = ref(db, GLOBAL_CONFIG_REF);
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as GlobalServerConfig;
        if (val) {
          cacheGlobalConfig(val);
          callback(val);
        }
      }
    }, (err) => {
      console.warn("Global config onValue subscription error:", err);
    });

    return () => {
      unsubscribe();
    };
  } catch (err) {
    console.warn("Failed to subscribe to global config:", err);
    return () => {};
  }
}
