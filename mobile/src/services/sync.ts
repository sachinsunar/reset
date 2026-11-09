import { getDb, nowIso } from '@/db/database';
import { getSetting, setSetting } from '@/db/repositories/settings';
import {
  getOutbox,
  markOutboxFailure,
  outboxCount,
  removeOutbox,
} from '@/db/repositories/outbox';
import {
  applyRemoteChange,
  exportSnapshot,
  restoreSnapshot,
  type BackupSnapshot,
  type RemoteChange,
} from '@/db/syncData';
import { useAppStore } from '@/store/useAppStore';
import { ApiError, api, getSession, type AuthSession } from './api';

export interface SyncResult {
  pushed: number;
  pulled: number;
  applied: number;
  skippedConflicts: number;
  serverTime: string;
  finishedAt: string;
}

interface PullResponse {
  records: (RemoteChange & { cursor?: string })[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
  serverTime: string;
}

interface PushResponse {
  accepted: number;
  skipped: number;
  serverTime: string;
}

const requireSession = async (): Promise<AuthSession> => {
  const session = await getSession();
  if (!session) throw new ApiError('Sign in to enable sync.', 401, 'not_signed_in');
  return session;
};

const requireOnline = () => {
  if (!useAppStore.getState().isOnline) {
    throw new ApiError('You are offline. Reset will sync when you reconnect.', 0, 'offline');
  }
};

const parseOutboxPayload = (raw: string): { deleted: boolean; data: Record<string, unknown> | null } => {
  try {
    const parsed = JSON.parse(raw) as { deleted?: boolean; data?: Record<string, unknown> | null };
    return { deleted: Boolean(parsed.deleted), data: parsed.data ?? null };
  } catch {
    return { deleted: false, data: null };
  }
};

async function pushOutbox(session: AuthSession): Promise<{ pushed: number; skipped: number; serverTime: string }> {
  let pushed = 0;
  let skipped = 0;
  let serverTime = nowIso();

  for (let page = 0; page < 20; page++) {
    const items = await getOutbox(200);
    if (!items.length) break;

    const records = items.map((item) => {
      const parsed = parseOutboxPayload(item.payload);
      return {
        entity: item.entity,
        id: item.entityId,
        day: item.day,
        updatedAt: item.createdAt,
        deleted: parsed.deleted,
        payload: parsed.deleted ? null : parsed.data,
      };
    });

    try {
      const result = await api.request<PushResponse>('/api/sync/push', {
        method: 'POST',
        token: session.token,
        body: { records },
      });
      pushed += result.accepted;
      skipped += result.skipped;
      serverTime = result.serverTime;
      await removeOutbox(items.map((item) => item.id));
    } catch (error) {
      await markOutboxFailure(
        items.map((item) => item.id),
        error instanceof Error ? error.message : 'Push failed',
      );
      throw error;
    }

    if (items.length < 200) break;
  }

  return { pushed, skipped, serverTime };
}

async function pullChanges(
  session: AuthSession,
  full: boolean,
): Promise<{ pulled: number; applied: number; conflicts: number; serverTime: string }> {
  const db = await getDb();
  const since = full ? '' : await getSetting('lastSyncAt');
  let cursor: string | null = null;
  let pulled = 0;
  let applied = 0;
  let conflicts = 0;
  let serverTime = nowIso();
  let newest = since;

  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    else if (since) params.set('since', since);
    params.set('limit', '500');

    const result = await api.request<PullResponse>(`/api/sync/pull?${params.toString()}`, {
      token: session.token,
    });
    serverTime = result.serverTime;
    pulled += result.count;

    for (const record of result.records) {
      if (record.updatedAt > newest) newest = record.updatedAt;
      const changed = await applyRemoteChange(db, record);
      if (changed) applied += 1;
      else conflicts += 1;
    }

    if (!result.hasMore) break;
    if (!result.nextCursor || result.nextCursor === cursor) break;
    cursor = result.nextCursor;
  }

  const stamp = newest || serverTime;
  await setSetting('lastSyncAt', stamp);
  useAppStore.getState().setLastSyncedAt(stamp);
  return { pulled, applied, conflicts, serverTime };
}

export async function syncNow(options: { full?: boolean } = {}): Promise<SyncResult> {
  requireOnline();
  const session = await requireSession();
  const push = await pushOutbox(session);
  const pull = await pullChanges(session, Boolean(options.full));

  if (pull.applied > 0) {
    await useAppStore.getState().refresh();
  }

  return {
    pushed: push.pushed,
    pulled: pull.pulled,
    applied: pull.applied,
    skippedConflicts: push.skipped + pull.conflicts,
    serverTime: pull.serverTime,
    finishedAt: nowIso(),
  };
}

export async function autoSync(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!useAppStore.getState().isOnline) return;
  try {
    await syncNow();
  } catch {
    return;
  }
}

export interface BackupInfo {
  version: number;
  exportedAt: string;
  sizeBytes: number;
  updatedAt?: string;
}

export async function uploadBackup(): Promise<BackupInfo> {
  requireOnline();
  const session = await requireSession();
  const db = await getDb();
  const snapshot = await exportSnapshot(db);
  const result = await api.request<{ backup: BackupInfo }>('/api/backup', {
    method: 'POST',
    token: session.token,
    body: snapshot,
  });
  await setSetting('lastBackupAt', snapshot.exportedAt);
  return result.backup;
}

export async function downloadLatestBackup(): Promise<{
  restoredRows: number;
  tables: number;
  exportedAt: string;
}> {
  requireOnline();
  const session = await requireSession();
  const result = await api.request<{
    version: number;
    exportedAt: string;
    snapshot: BackupSnapshot;
  }>('/api/backup/latest', { token: session.token });

  const db = await getDb();
  const restored = await restoreSnapshot(db, result.snapshot);
  useAppStore.getState().setLastSyncedAt(result.exportedAt);
  await useAppStore.getState().refresh();
  return { ...restored, exportedAt: result.exportedAt };
}

export async function syncStatus(): Promise<{
  signedIn: boolean;
  email: string | null;
  pending: number;
  lastSyncAt: string;
  lastBackupAt: string;
}> {
  const [session, pending, lastSyncAt, lastBackupAt] = await Promise.all([
    getSession(),
    outboxCount(),
    getSetting('lastSyncAt'),
    getSetting('lastBackupAt'),
  ]);
  return {
    signedIn: Boolean(session),
    email: session?.user.email ?? null,
    pending,
    lastSyncAt,
    lastBackupAt,
  };
}
