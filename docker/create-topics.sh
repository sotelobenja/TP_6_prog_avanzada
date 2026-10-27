#!/bin/bash
set -euo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka:9092}"
TOPICS_BIN="/opt/kafka/bin/kafka-topics.sh"

echo "Waiting for Kafka at ${BOOTSTRAP}..."
for i in $(seq 1 60); do
  if "${TOPICS_BIN}" --bootstrap-server "${BOOTSTRAP}" --list >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

TOPICS=(
  activation.requested
  billing.events
  provisioning.events
  activation.events
  activation.requested.dlq
  billing.events.dlq
  provisioning.events.dlq
  activation.events.dlq
)

for topic in "${TOPICS[@]}"; do
  "${TOPICS_BIN}" --bootstrap-server "${BOOTSTRAP}" \
    --create --if-not-exists \
    --topic "${topic}" \
    --partitions 3 \
    --replication-factor 1 \
    --config retention.ms=604800000
  echo "Topic ready: ${topic}"
done

echo "All topics created."
