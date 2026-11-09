import { Schema, model } from 'mongoose';

const routineConfigSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    config: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const RoutineConfig = model('RoutineConfig', routineConfigSchema);
