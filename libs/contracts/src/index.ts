export const TOPICS = {
  ACTIVATION_REQUESTED: 'activation.requested',
  BILLING_EVENTS: 'billing.events',
  PROVISIONING_EVENTS: 'provisioning.events',
  ACTIVATION_EVENTS: 'activation.events',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export type EventType =
  | 'ActivationRequested'
  | 'BillingAccountCreated'
  | 'BillingFailed'
  | 'BillingAccountCancelled'
  | 'ProvisioningCompleted'
  | 'ProvisioningFailed'
  | 'ActivationCompleted'
  | 'ActivationFailed';

export type SimulateFailure = 'none' | 'billing' | 'provisioning';

export type ActivationStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVE' | 'FAILED';

export interface Envelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  version: number;
  occurredAt: string;
  correlationId: string;
  customerId: string;
  source: string;
  payload: T;
}

export interface ActivationRequestedPayload {
  planId: string;
  channel: string;
  simulateFailure: SimulateFailure;
}

export interface BillingResultPayload {
  planId?: string;
  reason?: string;
}

export interface ProvisioningResultPayload {
  planId?: string;
  reason?: string;
}

export interface ActivationTerminalPayload {
  planId: string;
  reason?: string;
  failedStep?: 'billing' | 'provisioning';
}

export function makeEvent<T>(params: {
  eventType: EventType;
  correlationId: string;
  customerId: string;
  source: string;
  payload: T;
}): Envelope<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType: params.eventType,
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: params.correlationId,
    customerId: params.customerId,
    source: params.source,
    payload: params.payload,
  };
}

export function dlqTopic(topic: string): string {
  return `${topic}.dlq`;
}
