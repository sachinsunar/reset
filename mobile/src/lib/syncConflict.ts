export function isRemoteNewer(
  localUpdatedAt: string | null | undefined,
  remoteUpdatedAt: string,
): boolean {
  if (!localUpdatedAt) return true;
  const local = Date.parse(localUpdatedAt);
  const remote = Date.parse(remoteUpdatedAt);
  if (!Number.isFinite(local) || !Number.isFinite(remote)) {
    return localUpdatedAt <= remoteUpdatedAt;
  }
  return local <= remote;
}

export function shouldApplyRemote(
  entity: string,
  remoteUpdatedAt: string,
  localUpdatedAt: string | null | undefined,
): boolean {
  if (entity === 'achievement') return true;
  return isRemoteNewer(localUpdatedAt, remoteUpdatedAt);
}
