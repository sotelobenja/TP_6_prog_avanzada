import { KafkaContext } from '@nestjs/microservices';

export async function commitOffset(context: KafkaContext): Promise<void> {
  const { offset } = context.getMessage();
  const partition = context.getPartition();
  const topic = context.getTopic();
  const consumer = context.getConsumer();
  await consumer.commitOffsets([
    {
      topic,
      partition,
      offset: (Number(offset) + 1).toString(),
    },
  ]);
}
