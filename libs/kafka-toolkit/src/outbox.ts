import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Types } from 'mongoose';
import { Envelope } from '@activation-poc/contracts';
import { KafkaPublisher } from './publisher';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer?: NodeJS.Timeout;
  private flushing = false;

  @InjectConnection()
  private readonly connection!: Connection;

  constructor(private readonly publisher: KafkaPublisher) {}

  async onModuleInit(): Promise<void> {
    await this.connection.collection('outbox').createIndex({ status: 1, createdAt: 1 });
    this.timer = setInterval(() => {
      void this.flush();
    }, 500);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async enqueue(session: ClientSession, topic: string, event: Envelope): Promise<void> {
    await this.connection.collection('outbox').insertOne(
      {
        topic,
        key: event.customerId,
        event,
        status: 'PENDING',
        createdAt: new Date(),
        attempts: 0,
      },
      { session },
    );
  }

  private async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    this.flushing = true;
    try {
      for (let i = 0; i < 50; i++) {
        const claimed = await this.connection.collection('outbox').findOneAndUpdate(
          { status: 'PENDING' },
          { $set: { status: 'SENDING' }, $inc: { attempts: 1 } },
          { sort: { createdAt: 1 }, returnDocument: 'after' },
        );
        const doc = claimed as unknown as {
          _id: Types.ObjectId;
          topic: string;
          event: Envelope;
        } | null;
        if (!doc) {
          return;
        }
        try {
          await this.publisher.publish(doc.topic, doc.event);
          await this.connection
            .collection('outbox')
            .updateOne({ _id: doc._id }, { $set: { status: 'SENT', sentAt: new Date() } });
        } catch (error) {
          this.logger.warn(`Outbox publish failed: ${(error as Error).message}`);
          await this.connection
            .collection('outbox')
            .updateOne({ _id: doc._id }, { $set: { status: 'PENDING' } });
          return;
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}
