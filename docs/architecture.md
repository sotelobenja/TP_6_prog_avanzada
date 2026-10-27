# Arquitectura

El repositorio es un monorepo administrado con pnpm. Contiene cinco servicios NestJS, una interfaz React con Vite y dos librerías compartidas.

## Componentes

- `apps/activation-api`: API REST y WebSocket. Crea activaciones, guarda el estado en MongoDB y publica los eventos iniciales mediante el patrón outbox.
- `apps/billing-service`: procesa la etapa de facturación y publica el resultado.
- `apps/provisioning-service`: procesa la etapa de aprovisionamiento y publica el resultado.
- `apps/notification-service`: consume los eventos de activación para enviar notificaciones.
- `apps/crm-analytics-service`: consume eventos para mantener información analítica de clientes.
- `apps/demo-ui`: interfaz React/Vite para solicitar activaciones y ver cambios en tiempo real.
- `libs/contracts`: tipos, envoltorio de eventos y nombres de topics compartidos.
- `libs/kafka-toolkit`: utilidades Kafka para publicación, idempotencia, reintentos, DLQ y outbox.
- `docker/create-topics.sh`: crea los topics de la aplicación y sus DLQ con tres particiones.
- `docker-compose.yml`: levanta Kafka, Kafka UI, MongoDB, MailHog, las cinco apps y la UI.

## Flujo de activación

1. La UI envía una solicitud a `POST /activations`.
2. La API guarda la activación y un evento `ActivationRequested` en una transacción MongoDB.
3. El consumidor de billing y el de provisioning procesan la solicitud y publican sus resultados.
4. La API actualiza los pasos de la activación al recibir resultados. Si ambos tienen éxito, publica `ActivationCompleted`; si uno falla, publica `ActivationFailed`.
5. La UI recibe las actualizaciones por WebSocket y muestra el estado y el historial.

Los eventos incluyen identificador, tipo, versión, fecha, identificador de correlación, cliente, origen y payload. Los topics se centralizan en `libs/contracts`.

## Entorno local

Desde la raíz del repositorio, ejecutar:

```sh
docker compose up --build
```

La UI queda disponible en `http://localhost:5173`, Kafka UI en `http://localhost:8080` y la API en `http://localhost:3000`.
