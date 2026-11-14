# CAR-432 · Informe general de simplificación

- **Sesión:** Sesión Estándares
- **PR:** rama `docs/car-432-informe-simplificacion`
- **Estado:** En PR
- **Migración:** No (solo documentos)

## Qué entra

- `docs/2.0/simplificacion/README.md`: informe con cinco grupos ordenados por beneficio y riesgo.
- `docs/2.0/simplificacion/detalle-2026-11-14.md`: todos los hallazgos.

## Qué queda pendiente

- Los cinco grupos, cada uno con su ticket: CAR-436 (archivos sin uso), CAR-437 (dependencias), CAR-438 (exportaciones), CAR-439 (duplicados) y CAR-440 (funciones y archivos largos).

## Qué se decidió

- Orden de trabajo: de menor a mayor riesgo. El importador de OPAI 1.0 no se simplifica: se elimina al terminar la migración de Gard.
