import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

@Injectable()
export class IdempotencyService implements OnModuleInit {
  private readonly logger = new Logger(IdempotencyService.name);

  @InjectConnection()
  private readonly connection!: Connection;

  async onModuleInit(): Promise<void> {
    await this.connection.collection('processed_events').createIndex({ eventId: 1 }, { unique: true });
    await this.connection
      .collection('processed_events')
      .createIndex({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
  }

  async runOnce(eventId: string, work: (session: ClientSession) => Promise<void>): Promise<'applied' | 'duplicate'> {
    const session = await this.connection.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          await this.connection.collection('processed_events').insertOne({ eventId, processedAt: new Date() }, { session });
          await work(session);
        });
        return 'applied';
      } catch (error: unknown) {
        if (isDuplicateKey(error)) {
          this.logger.debug(`Duplicate event ${eventId}, skipping`);
          return 'duplicate';
        }
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }
}

function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { code?: number; message?: string; cause?: unknown };
  if (candidate.code === 11000) {
    return true;
  }
  if (typeof candidate.message === 'string' && candidate.message.includes('E11000')) {
    return true;
  }
  return isDuplicateKey(candidate.cause);
}
