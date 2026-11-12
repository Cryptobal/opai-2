# Módulo Desempeño (`desempeno`)

Mide la gestión de cada cargo con indicadores que OPAI calcula solo (ADR-094). Se vende aparte.

- `manifest.ts`: permisos, eventos y capacidades. Sin navegación hasta que existan las pantallas (CAR-307).
- Capacidades: `packages/capabilities/src/desempeno` (`desempeno.scorecards.*`, `desempeno.resultados.*`).
- Dominio puro: `packages/domain/src/desempeno` (validación, versiones por mes y puntaje de 0 a 120).
- Tablas: schema `desempeno` (`packages/db/prisma/schema/desempeno.prisma`).
- Depende de dos servicios del Núcleo: el catálogo de indicadores (CAR-305) y la jefatura por cargo (CAR-314).
