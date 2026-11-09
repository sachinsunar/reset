import { Schema, model } from 'mongoose';

const backupSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    version: { type: Number, required: true },
    exportedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    sizeBytes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Backup = model('Backup', backupSchema);
