# Guion de demo

## Preparación

1. Desde la raíz del repositorio, ejecutar `docker compose up --build`.
2. Esperar a que terminen de iniciar los servicios.
3. Abrir la UI en `http://localhost:5173` y, opcionalmente, Kafka UI en `http://localhost:8080`.

## Recorrido

1. En la UI, crear una activación con un ID de cliente y un ID de plan, dejando **Forzar fallo** en **Ninguno**.
2. Mostrar que la solicitud se registra como pendiente y luego avanza hasta `ACTIVE`.
3. Revisar los pasos de billing y provisioning, el historial de eventos y las actualizaciones en tiempo real.
4. Crear otra activación con **Forzar fallo** en **Billing** y mostrar el estado `FAILED` junto con el paso fallido.
5. Repetir el caso con **Provisioning** para mostrar el manejo de ese fallo.
6. En Kafka UI, observar los topics `activation.requested`, `billing.events`, `provisioning.events` y `activation.events`, además de sus topics de DLQ.

## Cierre

Detener los contenedores con `Ctrl+C`. Para eliminarlos después de la demo, ejecutar `docker compose down`.
