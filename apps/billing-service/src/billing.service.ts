import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  ActivationRequestedPayload,
  Envelope,
  makeEvent,
  TOPICS,
} from '@activation-poc/contracts';
import { OutboxService } from '@activation-poc/kafka-toolkit';
import { BillingAccount } from './billing.schema';
import { CompensationFlag } from './flag.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(BillingAccount.name) private readonly accounts: Model<BillingAccount>,
    @InjectModel(CompensationFlag.name) private readonly flags: Model<CompensationFlag>,
    private readonly outbox: OutboxService,
  ) {}

  async handle(event: Envelope, session: ClientSession): Promise<void> {
    if (event.eventType === 'ActivationRequested') {
      const activationEvent = event as unknown as Envelope<ActivationRequestedPayload>;
      await this.onRequested(activationEvent, session);
    }
    if (event.eventType === 'ActivationFailed') {
      await this.onFailed(event, session);
    }
  }

  private async onRequested(event: Envelope<ActivationRequestedPayload>, session: ClientSession) {
    if (event.payload.simulateFailure === 'billing') {
      const failed = makeEvent({
        eventType: 'BillingFailed',
        correlationId: event.correlationId,
        customerId: event.customerId,
        source: 'billing-service',
        payload: { planId: event.payload.planId, reason: 'Forced billing failure' },
      });
      await this.outbox.enqueue(session, TOPICS.BILLING_EVENTS, failed);
      return;
    }

    const pendingCancel = await this.flags.findOne({ activationId: event.correlationId }).session(session);
    const status = pendingCancel ? 'CANCELLED' : 'CREATED';
    await this.accounts.create(
      [
        {
          activationId: event.correlationId,
          customerId: event.customerId,
          planId: event.payload.planId,
          status,
        },
      ],
      { session },
    );

    const created = makeEvent({
      eventType: 'BillingAccountCreated',
      correlationId: event.correlationId,
      customerId: event.customerId,
      source: 'billing-service',
      payload: { planId: event.payload.planId },
    });
    await this.outbox.enqueue(session, TOPICS.BILLING_EVENTS, created);

    if (pendingCancel) {
      const cancelled = makeEvent({
        eventType: 'BillingAccountCancelled',
        correlationId: event.correlationId,
        customerId: event.customerId,
        source: 'billing-service',
        payload: { planId: event.payload.planId, reason: 'Compensated after ActivationFailed' },
      });
      await this.outbox.enqueue(session, TOPICS.BILLING_EVENTS, cancelled);
    }
  }

  private async onFailed(event: Envelope, session: ClientSession) {
    const account = await this.accounts.findOne({ activationId: event.correlationId }).session(session);
    if (!account) {
      await this.flags.updateOne(
        { activationId: event.correlationId },
        { $setOnInsert: { activationId: event.correlationId } },
        { upsert: true, session },
      );
      return;
    }
    if (account.status === 'CANCELLED') {
      return;
    }
    account.status = 'CANCELLED';
    await account.save({ session });
    const cancelled = makeEvent({
      eventType: 'BillingAccountCancelled',
      correlationId: event.correlationId,
      customerId: event.customerId,
      source: 'billing-service',
      payload: { reason: 'Compensated after ActivationFailed' },
    });
    await this.outbox.enqueue(session, TOPICS.BILLING_EVENTS, cancelled);
  }
}
