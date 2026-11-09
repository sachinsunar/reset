import { Schema, model, Types } from 'mongoose';

const syncRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entity: { type: String, required: true, maxlength: 60 },
    recordId: { type: String, required: true, maxlength: 120 },
    day: { type: String, default: null },
    deleted: { type: Boolean, default: false },
    payload: { type: Schema.Types.Mixed, default: null },
    clientUpdatedAt: { type: Date, required: true },
    serverUpdatedAt: { type: Date, default: Date.now },
    deviceId: { type: String, default: null, maxlength: 80 },
  },
  { timestamps: false },
);

syncRecordSchema.index({ userId: 1, entity: 1, recordId: 1 }, { unique: true });
syncRecordSchema.index({ userId: 1, clientUpdatedAt: 1 });
syncRecordSchema.index({ userId: 1, day: 1 });

export const SyncRecord = model('SyncRecord', syncRecordSchema);

export interface SyncRecordInput {
  entity: string;
  id: string;
  day: string | null;
  updatedAt: string;
  deleted: boolean;
  payload: Record<string, unknown> | null;
  deviceId?: string | null;
}

export const ENTITIES = [
  'profile',
  'settings',
  'routine_phase',
  'schedule_block',
  'goal',
  'day_log',
  'subject',
  'topic',
  'study_session',
  'workout_log',
  'learning_topic',
  'learning_session',
  'focus_session',
  'journal',
  'checkin',
  'achievement',
  'xp_award',
] as const;

export type SyncEntity = (typeof ENTITIES)[number];

export const userIdOf = (value: string) => new Types.ObjectId(value);
