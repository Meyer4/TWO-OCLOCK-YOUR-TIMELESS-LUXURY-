import { Counter } from '../models/index.js';

/** Atomically increments and returns a named sequence (used for human-friendly order numbers). */
export async function nextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, lean: true },
  );
  if (!counter) throw new Error(`Counter ${name} could not be initialised`);
  return counter.seq;
}
