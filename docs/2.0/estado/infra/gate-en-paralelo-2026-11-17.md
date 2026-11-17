# Gate del CI en paralelo y test:db en más PR (17-nov-2026)

**Sesión:** Destrabe cola · **Ticket:** sin ticket de Linear (no se pudo crear desde la sesión) · **Estado:** encargo de Carlos del 17-nov-2026 («que los tests pasen lo más rápido posible»).

## Qué entra

- `ci.yml`: el gate pasa de un job en serie a jobs paralelos (`typecheck · lint`, `test` en 2 partes, `test:db` en 3) más el job resumen `typecheck · lint · test · test:db`, que es el check obligatorio.
- En la cola de merge los checks obligatorios corren en runners de GitHub, no en Spot.
- `package.json`: `test:db` se divide en `test:db:base` y `test:db:capacidades` (el comando completo sigue igual).
- `.github/actions/preparar`: pasos comunes (pnpm, Node, store, instalación, caché de Turborepo con el SHA en la clave).
- `test:db` corre en el PR cuando toca `packages/*` (salvo `ds`), `modules/*`, Prisma, migraciones, `package.json`, el lockfile o `ci.yml`.

## Pendiente

- Medir en el propio PR la duración de cada job y dejarla en la descripción.
- Runners de la cola (`opai2-runners-mq`, t3a.large): no alcanzan para el gate; pasarlos a 2xlarge antes de integrar #1073 (AWS, lo hace Carlos o el bot «OPAI 2.0»).

## Riesgo

- Cada PR ocupa hasta 7 runners a la vez: si el ASG Spot no escala, la espera por runner sube.
- La cola depende de los runners de GitHub; si el repositorio vuelve a ser privado, tienen costo y conviene volver a runners propios on-demand de 8 CPU.
