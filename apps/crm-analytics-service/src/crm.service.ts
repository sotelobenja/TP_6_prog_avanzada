import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Envelope } from '@activation-poc/contracts';
import { CrmContact, CrmContactDocument } from './crm.schema';

@Injectable()
export class CrmAnalyticsService {
  constructor(
    @InjectModel(CrmContact.name) private readonly records: Model<CrmContactDocument>,
  ) {}

  async handle(event: Envelope, session: ClientSession): Promise<void> {
    const activationId = event.correlationId;
    const planId = (event.payload as { planId?: string })?.planId ?? 'unknown';
    const customerId = event.customerId;

    if (event.eventType === 'ActivationRequested') {
      await this.records.updateOne(
        { activationId },
        {
          $setOnInsert: {
            activationId,
            customerId,
            planId,
            status: 'PENDING',
            history: [event.eventType],
          },
        },
        { upsert: true, session },
      );
      return;
    }

    const status =
      event.eventType === 'ActivationCompleted'
        ? 'ACTIVE'
        : event.eventType === 'ActivationFailed'
          ? 'FAILED'
          : 'PENDING';

    if (status === 'PENDING') {
      await this.records.updateOne(
        { activationId },
        {
          $set: { lastUpdatedAt: new Date() },
          $push: { history: event.eventType },
        },
        { session },
      );
      return;
    }

    await this.records.updateOne(
      { activationId },
      {
        $set: {
          customerId,
          planId,
          status,
          reason: (event.payload as { reason?: string })?.reason,
        },
        $addToSet: { history: event.eventType },
      },
      { upsert: true, session },
    );
  }
}
