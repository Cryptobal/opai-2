# Estado por ticket

Desde el 12-nov-2026 (ADR-108, `OPERACION-agentes.md` A2.5.4), cada PR de construcción escribe su avance aquí, en un archivo propio, y **no edita `docs/2.0/ESTADO.md`**. Así dos PR abiertos nunca chocan por el estado.

## Dónde

`docs/2.0/estado/<modulo>/CAR-<n>.md`

- `<modulo>`: `nucleo`, `plataforma`, `comercial`, `cpq`, `finanzas`, `personas`, `documentos`, `nomina`, `operaciones`, `desempeno`, `hilo`, `diseno` u otro módulo en minúsculas y sin tildes.
- Un archivo por ticket. Si un ticket tiene varios PR, todos escriben en el mismo archivo (van apilados, así que no chocan).

## Plantilla

```markdown
# CAR-123 · Título corto

- **Sesión:** Sesión Núcleo
- **PR:** #000 · rama `brief/car-123-slug`
- **Estado:** En PR | Integrado (#000, fecha)
- **Migración:** No | `20261212100000_nombre` (aplicada en dev y main el dd-mmm, con respaldo)
- **Apilado sobre / espera:** #000 (si aplica)

## Qué entra

## Qué queda pendiente

## Qué se decidió
```

## Qué pasa con `ESTADO.md`

Queda como índice y foto histórica. De vez en cuando, un PR solo de documentación pasa a `ESTADO.md` los archivos de tickets ya integrados y los borra de esta carpeta.

Los PR abiertos antes del 12-nov conservan su fila en `ESTADO.md`. Si al traer `main` tienen conflicto en ese archivo, mueven su fila a su archivo de esta carpeta y dejan `ESTADO.md` como está en `main`.
