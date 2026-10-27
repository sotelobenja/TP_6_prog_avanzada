import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BillingAccountDocument = HydratedDocument<BillingAccount>;

@Schema({ collection: 'billing_accounts', timestamps: true })
export class BillingAccount {
  @Prop({ required: true, unique: true })
  activationId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  status: 'CREATED' | 'CANCELLED';
}

export const BillingAccountSchema = SchemaFactory.createForClass(BillingAccount);
