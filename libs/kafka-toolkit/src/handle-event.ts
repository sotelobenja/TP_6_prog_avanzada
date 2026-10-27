import { Logger } from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { ClientSession } from 'mongoose';
import { Envelope } from '@activation-poc/contracts';
import { IdempotencyService } from './idempotency';
import { KafkaPublisher } from './publisher';
import { commitOffset } from './offset';
import { parseEvent } from './parse-event';
import { withRetry } from './retry';

const logger = new Logger('handleKafkaEvent');

export async function handleKafkaEvent(params: {
  payload: unknown;
  context: KafkaContext;
  idempotency: IdempotencyService;
  publisher: KafkaPublisher;
  handler: (event: Envelope, session: ClientSession) => Promise<void>;
}): Promise<void> {
  const { payload, context, idempotency, publisher, handler } = params;
  let event: Envelope;
  try {
    event = parseEvent(payload);
  } catch (error) {
    await publisher.sendToDlq(context.getTopic(), context.getMessage(), error as Error);
    await commitOffset(context);
    return;
  }

  try {
    await withRetry(async () => {
      await idempotency.runOnce(event.eventId, (session) => handler(event, session));
    });
  } catch (error) {
    logger.error(`Handler failed after retries: ${(error as Error).message}`);
    await publisher.sendToDlq(context.getTopic(), context.getMessage(), error as Error);
  } finally {
    await commitOffset(context);
  }
}
