import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, IHeaders } from 'kafkajs';
import { dlqTopic, Envelope } from '@activation-poc/contracts';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { sleep } from './retry';

@Injectable()
export class KafkaPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaPublisher.name);
  private producer!: Producer;

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'activation-poc',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  async publish(topic: string, event: Envelope): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.customerId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            correlationId: event.correlationId,
            eventId: event.eventId,
          },
        },
      ],
    });
  }

  async sendRaw(topic: string, key: string, value: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value }],
    });
  }

  async sendToDlq(topic: string, message: KafkaMessage, error: Error): Promise<void> {
    const headers: IHeaders = {
      ...(message.headers as IHeaders | undefined),
      'x-error-message': error.message.slice(0, 500),
      'x-original-topic': topic,
    };
    await this.producer.send({
      topic: dlqTopic(topic),
      messages: [
        {
          key: message.key,
          value: message.value,
          headers,
        },
      ],
    });
    this.logger.warn(`Message sent to ${dlqTopic(topic)}: ${error.message}`);
  }

  private async connectWithRetry(): Promise<void> {
    let lastError: unknown;
    for (let i = 0; i < 30; i++) {
      try {
        await this.producer.connect();
        this.logger.log('Kafka producer connected');
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Kafka producer connect retry ${i + 1}/30`);
        await sleep(2000);
      }
    }
    throw lastError;
  }
}
