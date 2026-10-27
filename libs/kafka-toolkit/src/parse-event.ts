import { Envelope } from '@activation-poc/contracts';

export function parseEvent(payload: unknown): Envelope {
  const raw = unwrap(payload);
  if (typeof raw === 'string') {
    return JSON.parse(raw) as Envelope;
  }
  if (raw && typeof raw === 'object' && 'eventType' in (raw as object) && 'eventId' in (raw as object)) {
    return raw as Envelope;
  }
  throw new Error('Invalid event envelope');
}

function unwrap(payload: unknown): unknown {
  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf8');
  }
  if (payload && typeof payload === 'object' && 'value' in (payload as Record<string, unknown>)) {
    return unwrap((payload as { value: unknown }).value);
  }
  return payload;
}
