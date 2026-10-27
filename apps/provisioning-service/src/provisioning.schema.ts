import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProvisioningOrderDocument = HydratedDocument<ProvisioningOrder>;

@Schema({ collection: 'provisioning_orders', timestamps: true })
export class ProvisioningOrder {
  @Prop({ required: true, unique: true })
  activationId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  status: 'CREATED' | 'COMPLETED' | 'CANCELLED';

  @Prop()
  reason?: string;
}

export const ProvisioningOrderSchema = SchemaFactory.createForClass(ProvisioningOrder);
