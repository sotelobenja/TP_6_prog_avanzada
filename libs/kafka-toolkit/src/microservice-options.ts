import { KafkaOptions, Transport } from '@nestjs/microservices';

export function kafkaMicroserviceOptions(params: {
  clientId: string;
  groupId: string;
  fromBeginning?: boolean;
}): KafkaOptions {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: params.clientId,
        brokers,
      },
      consumer: {
        groupId: params.groupId,
        allowAutoTopicCreation: false,
        sessionTimeout: 15000,
        heartbeatInterval: 5000,
      },
      subscribe: {
        fromBeginning: params.fromBeginning ?? false,
      },
      run: {
        autoCommit: false,
      },
    },
  };
}
