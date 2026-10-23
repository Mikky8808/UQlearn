import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export interface ApiErrorLogInput {
  endpoint: string;
  url: string;
  originalUrl?: string;
  method?: string;
  status?: number;
  statusText?: string;
  errorMessage: string;
  responsePreview?: string;
  domain?: string;
  userId?: string;
}

export interface ApiErrorLogRecord extends Required<Omit<ApiErrorLogInput, 'originalUrl' | 'statusText' | 'responsePreview' | 'userId'>> {
  id?: string;
  originalUrl?: string;
  statusText?: string;
  responsePreview?: string;
  userId?: string;
  timestamp: string;
  createdAt?: unknown;
}

const ERROR_LOGS_COLLECTION = 'error_logs';
const LOCAL_STORAGE_LOGS_KEY = 'uqlearn_api_error_logs';

function resolveCurrentUserId(explicitUserId?: string): string {
  if (explicitUserId) return String(explicitUserId).slice(0, 128);
  if (auth.currentUser?.uid) return auth.currentUser.uid.slice(0, 128);

  if (typeof window !== 'undefined' && window.localStorage) {
    const keys = ['uqlearn_user', 'uqlearn_instructor', 'uqlearn_admin', 'uqlearn_reviewer'];
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) return String(parsed.id).slice(0, 128);
          if (parsed?.email) return String(parsed.email).slice(0, 128);
        }
      } catch {
        // Ignore storage read errors
      }
    }
  }
  return 'anonymous';
}

function saveLocalErrorLogFallback(record: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existingRaw = window.localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const list = Array.isArray(existing) ? existing : [];
    list.unshift(record);
    window.localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Ignore localStorage quota/access errors
  }
}

/**
 * Centralized logging utility to capture and store API error responses
 * from the 'uqlearn.org/api/v1/' domain into the 'error_logs' Firestore collection.
 */
export async function logApiError(input: ApiErrorLogInput): Promise<void> {
  const timestamp = new Date().toISOString();
  const endpoint = String(input.endpoint || 'unknown').slice(0, 500);
  const url = String(input.url || endpoint).slice(0, 1000);
  const originalUrl = String(
    input.originalUrl ||
      (url.startsWith('/api/proxy/v1')
        ? url.replace('/api/proxy/v1', 'https://uqlearn.org/api/v1')
        : url)
  ).slice(0, 1000);
  const method = String(input.method || 'GET').toUpperCase().slice(0, 20);
  const status = typeof input.status === 'number' && !Number.isNaN(input.status) ? input.status : 0;
  const statusText = String(input.statusText || (status === 0 ? 'Network/Parse Error' : '')).slice(0, 200);
  const errorMessage = String(input.errorMessage || 'Unknown API error').slice(0, 2000);
  const responsePreview = input.responsePreview
    ? String(input.responsePreview).slice(0, 2000)
    : '';
  const domain = String(input.domain || 'uqlearn.org/api/v1/').slice(0, 100);
  const userId = resolveCurrentUserId(input.userId);

  const firestorePayload: Record<string, unknown> = {
    endpoint,
    url,
    originalUrl,
    method,
    status,
    statusText,
    errorMessage,
    responsePreview,
    domain,
    userId,
    timestamp,
    createdAt: serverTimestamp(),
  };

  saveLocalErrorLogFallback({
    ...firestorePayload,
    createdAt: timestamp,
  });

  try {
    await addDoc(collection(db, ERROR_LOGS_COLLECTION), firestorePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, ERROR_LOGS_COLLECTION);
  }
}

/**
 * Fetches recent API error logs from the 'error_logs' Firestore collection,
 * falling back to local diagnostic logs if Firestore read is restricted.
 */
export async function getRecentApiErrorLogs(maxCount = 50): Promise<ApiErrorLogRecord[]> {
  try {
    const q = query(
      collection(db, ERROR_LOGS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ApiErrorLogRecord, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ERROR_LOGS_COLLECTION);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
