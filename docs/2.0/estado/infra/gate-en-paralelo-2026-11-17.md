# Gate del CI en paralelo y test:db en más PR (17-nov-2026)

**Sesión:** Destrabe cola · **Ticket:** sin ticket de Linear (no se pudo crear desde la sesión) · **Estado:** PR abierto, sin integrar hasta el OK de Carlos.

## Qué entra

- `ci.yml`: el gate pasa de un job en serie a tres en paralelo (`typecheck`, `lint · test`, `test:db`) más el job resumen `typecheck · lint · test · test:db`, que es el check obligatorio.
- `.github/actions/preparar`: pasos comunes (pnpm, Node, store, instalación, caché de Turborepo con el SHA en la clave).
- `test:db` corre en el PR cuando toca `packages/*` (salvo `ds`), `modules/*`, Prisma, migraciones, el lockfile o `ci.yml`.

## Pendiente

- Medir en el propio PR la duración de cada job y dejarla en la descripción.
- Runners de la cola (`opai2-runners-mq`, t3a.large): no alcanzan para el gate; pasarlos a 2xlarge antes de integrar #1073 (AWS, lo hace Carlos o el bot «OPAI 2.0»).

## Riesgo

- Cada PR ocupa tres runners a la vez: si el ASG Spot no escala, la espera por runner sube.
