import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'reset.sync.token';
const USER_KEY = 'reset.sync.user';
const URL_KEY = 'reset.sync.url';

export interface SyncUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string | null;
}

export interface AuthSession {
  token: string;
  user: SyncUser;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_URL = (
  (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SYNC_URL : undefined) ??
  'http://localhost:4000'
).replace(/\/+$/, '');

const secure = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      return;
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      return;
    }
  },
};

export async function getServerUrl(): Promise<string> {
  return (await secure.get(URL_KEY)) ?? DEFAULT_URL;
}

export async function setServerUrl(url: string): Promise<string> {
  const normalized = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s]+$/i.test(normalized)) {
    throw new ApiError('Enter a server URL starting with http:// or https://');
  }
  await secure.set(URL_KEY, normalized);
  return normalized;
}

export async function getSession(): Promise<AuthSession | null> {
  const [token, rawUser] = await Promise.all([secure.get(TOKEN_KEY), secure.get(USER_KEY)]);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as SyncUser };
  } catch {
    return null;
  }
}

async function saveSession(session: AuthSession): Promise<void> {
  await Promise.all([
    secure.set(TOKEN_KEY, session.token),
    secure.set(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([secure.remove(TOKEN_KEY), secure.remove(USER_KEY)]);
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    token?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const base = await getServerUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const payload = data as { error?: string; code?: string } | null;
      throw new ApiError(
        payload?.error ?? `Server responded with ${response.status}.`,
        response.status,
        payload?.code,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('The server took too long to respond.', 0, 'timeout');
    }
    throw new ApiError(
      'Could not reach your sync server. Check the URL and your connection.',
      0,
      'network',
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  await saveSession(session);
  return session;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const session = await request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: { name: name.trim(), email: email.trim(), password },
  });
  await saveSession(session);
  return session;
}

export async function fetchMe(token: string): Promise<SyncUser> {
  const data = await request<{ user: SyncUser }>('/api/auth/me', { token });
  return data.user;
}

export async function deleteAccount(token: string): Promise<void> {
  await request<void>('/api/auth/account', { method: 'DELETE', token });
  await clearSession();
}

export const api = { request };
