import { describe, expect, it } from 'vitest';
import { isRemoteNewer, shouldApplyRemote } from '../syncConflict';

describe('sync conflict preference', () => {
  it('applies a remote change when the device has no local copy', () => {
    expect(isRemoteNewer(null, '2026-11-01T10:00:00.000Z')).toBe(true);
  });

  it('applies when remote is newer', () => {
    expect(
      isRemoteNewer('2026-11-01T09:00:00.000Z', '2026-11-01T10:00:00.000Z'),
    ).toBe(true);
  });

  it('keeps the local copy when local is newer', () => {
    expect(
      isRemoteNewer('2026-11-01T11:00:00.000Z', '2026-11-01T10:00:00.000Z'),
    ).toBe(false);
  });

  it('treats equal timestamps as idempotent and applies', () => {
    const stamp = '2026-11-01T10:00:00.000Z';
    expect(isRemoteNewer(stamp, stamp)).toBe(true);
  });

  it('falls back to lexical comparison for malformed timestamps', () => {
    expect(isRemoteNewer('yesterday', '2026-11-01T10:00:00.000Z')).toBe(false);
    expect(isRemoteNewer('2026-11-02T10:00:00.000Z', 'not-a-date')).toBe(true);
  });

  it('always refreshes milestone metadata from remote', () => {
    expect(
      shouldApplyRemote('achievement', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'),
    ).toBe(true);
  });

  it('uses normal conflict rules for journal entries', () => {
    expect(
      shouldApplyRemote('journal', '2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
    ).toBe(false);
  });
});
