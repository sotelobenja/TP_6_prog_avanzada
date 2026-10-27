import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { SimulateFailure, TOPICS } from '@activation-poc/contracts';
import { KafkaPublisher } from '@activation-poc/kafka-toolkit';
import { ActivationService } from './activation.service';

class CreateActivationDto {
  @IsString()
  @MinLength(1)
  customerId!: string;

  @IsString()
  @MinLength(1)
  planId!: string;

  @IsOptional()
  @IsIn(['none', 'billing', 'provisioning'])
  simulateFailure?: SimulateFailure;
}

@Controller('activations')
export class ActivationController {
  constructor(
    private readonly service: ActivationService,
    private readonly publisher: KafkaPublisher,
  ) {}

  @Post()
  @HttpCode(202)
  create(@Body() body: CreateActivationDto) {
    return this.service.create(body);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('debug/poison')
  @HttpCode(202)
  async poison() {
    await this.publisher.sendRaw(TOPICS.ACTIVATION_REQUESTED, 'C-POISON', '{not-a-valid-event');
    return { ok: true, topic: TOPICS.ACTIVATION_REQUESTED };
  }
}
