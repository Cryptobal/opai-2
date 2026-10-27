# CI · evidencias, shards y acceso MFA

El encargo solicita cuatro shards independientes, evidencias ante cancelación, informe combinado y corrección de accesos e2e tras MFA. Sin cambios de producto ni migraciones; no modifica el plan.

## Criterios y estado

- Shards con PostgreSQL y servidor propios, sin cambiar proyectos ni paralelismo interno: implementado; duración y equilibrio reales pendientes de CI.
- Test-results, blob y log con `always()`, trazas de fallos y margen de timeout: implementado; cancelación real y subida deben probarse en GitHub.
- Informe HTML y anotaciones combinadas; check agregador falla si falta éxito: implementado, pendiente de prueba en GitHub.
- Logins afectados usan el helper MFA, conservando selección de empresa: implementado, validación integral local y CI pendiente: corrida local 32 aprobados, 14 fallidos y 8 omitidos preexistentes; hubo una corrida concurrente interrumpida y build durante el servidor dev, por lo que se requiere repetición aislada.
- Los dos fallos sin diagnóstico confirmado requieren leer artefactos antes de corregirlos; no se cambian sus aserciones.
- Gate, informe de los cuatro tiempos y prueba temporal de timeout de tres minutos: pendientes hasta ejecución verificable del PR. El encargo prohíbe abrirlo en esta sesión.

Adaptación técnica de OpenCode: job de 35 minutos y paso de 25 para dejar margen de preparación y subida, sin garantía de subida ante cancelación forzosa o agotamiento del job completo. Informe combinado exige blobs disponibles. No se atribuyen decisiones nuevas a Carlos.
