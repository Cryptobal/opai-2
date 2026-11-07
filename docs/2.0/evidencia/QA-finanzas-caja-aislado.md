# QA aislado de Finanzas y caja — manifiesto (CAR-221)

Alcance pedido por Carlos (7-nov-2026): QA sintético y aislado del circuito de Finanzas y caja, con **dos empresas ficticias y roles reales**, **sin copia de Gard, sin rostros reales, sin DTE de producción y sin correos**. La validación la hace OPAI 2.0 (OPAI2), no Carlos. `test.opai.cl` queda apuntando a `main`; este documento no cambia ningún alias.

## 1. Responsables

| Rol | Quién | Qué hace |
|---|---|---|
| Construcción y prueba automática | Finanzas · Code (sesión de Claude) | Escribió y mantiene la prueba `finanzas-circuito-caja-db` y este manifiesto. No opera ni toca Neon, Vercel ni alias. |
| Validación | OPAI 2.0 (OPAI2) | Recorre el circuito en preview y reporta. |
| Datos, usuarios y alias | Quien tenga las credenciales de `dev` y de Vercel (bot «OPAI 2.0» o Carlos) | Siembra el entorno de QA, entrega los accesos por canal seguro y decide cualquier alias. |

## 2. Qué existe hoy y qué no

**Existe y está verificado (automático, en CI):** la prueba `packages/capabilities/test/finanzas-circuito-caja-db.test.ts`, que corre en `test:db` contra Postgres real con un rol sin BYPASSRLS y el adaptador SII simulado. Crea sus propias empresas ficticias, no usa datos de Gard y no envía correos.

Cubre, de punta a punta:

1. Factura con IVA exacto (100.000 + 19.000 = 119.000) → queda como cobro pendiente en la proyección de caja.
2. Conciliación bancaria del pago → sale de la proyección; deshacer → vuelve.
3. Nota de crédito parcial (19.000) → el pendiente baja a 100.000.
4. Roles: `owner` y `admin` operan; `gerente`, `supervisor` y `viewer` reciben FORBIDDEN al emitir y conciliar.
5. Aislamiento: la empresa B no ve la factura de A, su proyección está vacía y no puede conciliar el movimiento de A.

**No existe todavía (límites que hay que tener claros):**

- **No hay un entorno desplegado con estas empresas sembradas.** La prueba crea y descarta sus datos dentro de CI; no deja nada navegable.
- **No hay usuarios ni contraseñas de QA creados.** Ningún script del repo crea hoy usuarios con los cinco roles para un tenant `qa-*`. `core.users.invite` envía correo (no se usa en QA) y `seed:multiempresa-e2e` solo corre contra una base local y crea un usuario `admin`, no los cinco roles.
- **No se probó la interfaz con estas empresas.** La prueba cubre capacidades (lo que invocan pantalla, API y MCP), no el recorrido visual.
- **No se probó emisión en certificación con proveedor real.** Siguen faltando los insumos externos: API key de SimpleAPI, certificado `.pfx` con su clave, CAF 33/34/56/61 reales y la resolución. Nada de lo anterior se pidió ni se leyó por chat.

## 3. Siembra de las dos empresas (la ejecuta quien tiene las credenciales de `dev`)

El script `seed:finanzas-qa` crea una empresa de QA con proveedor, cuenta Santander con 3 movimientos, CAF sintético de certificación y un cliente con datos tributarios ficticios. Tiene guardas (`seed-finanzas-qa-guardas.ts`): exige `OPAI_ENTORNO=dev`, un slug que empiece con `qa-`, ambas URLs a la misma base y simula por defecto (solo escribe con `--confirmar`). Rechaza `gard` y cualquier slug sin prefijo `qa-`; no pisa una configuración DTE existente.

Se corre dos veces, una por empresa:

```bash
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-a
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-b
```

Primero sin `--confirmar` (simulación); después con `--confirmar`. Variables (`OPAI_ENTORNO=dev`, `DATABASE_URL`, `DATABASE_URL_MIGRATE`, `OPAI_SECRETS_KEY`) las aporta quien opera `dev`; no se escriben aquí ni en el chat.

## 4. Usuarios y roles (pendiente de crear)

Para que OPAI2 valide, hace falta un usuario por rol en cada empresa: `owner`, `admin`, `gerente`, `supervisor`, `viewer` (10 en total, o los que decida OPAI2). Lo que se espera en cada uno, según la matriz vigente:

| Rol | Debe poder | No debe poder |
|---|---|---|
| owner, admin | emitir, conciliar, ver la proyección de caja | — |
| gerente, supervisor, viewer | — | emitir ni conciliar (FORBIDDEN) |

Reglas de acceso seguro:

- Las contraseñas se generan al crear la cuenta y se entregan por el gestor de contraseñas del equipo o la bóveda que use el responsable. **Nunca** en el chat, en un PR, en un comentario ni en el repo.
- Cuentas con correo ficticio de un dominio controlado por el equipo; sin invitaciones por correo real.
- Las dos empresas son `qa-*`; ninguna usa datos ni slug de Gard. Al terminar la validación, las cuentas se desactivan.

Este paso **requiere un script o procedimiento de provisión que aún no existe**: es el siguiente trabajo concreto si se quiere el recorrido visual (ver §6).

## 5. Evidencia y rutas

- **Código del circuito:** integrado en `main` hasta `3dba9f1c` (A1 `af60a9da`, A2 `3dba9f1c`). Pendientes de integrar y con revisión final «sin bloqueos»: #391 (Emitir, head `d8828307c36b9a131c2af87b29ca7305c6f1eb81`) y #392 (programación, head `84ac2ac3eee7ff99502c184b9150a6a9827c452a`).
- **Rutas del circuito de Finanzas:** `/finanzas/ventas`, `/finanzas/ventas/nuevo` (Emitir), `/finanzas/ventas/programacion`, `/finanzas/ventas/programacion/nueva`, `/finanzas/ventas/programacion/cierre`, `/finanzas/cobranza`, `/finanzas/bancos`, `/finanzas/flujo`.
- **Previews por rama (Vercel):** #391 `https://opai-2-git-brief-car-221-emision-ui-gard-security.vercel.app`, #392 `https://opai-2-git-brief-car-221-programacion-gard-security.vercel.app`. Que un preview use la base de QA y no otra es una decisión del responsable de Vercel/Neon; este documento no la asume.
- **Alias:** `preview.opai.cl` lo coordina OPAI2; `test.opai.cl` sigue en `main`. Ningún cambio de alias se hace desde esta sesión.

## 6. Qué decide o hace el responsable

1. Sembrar `qa-finanzas-a` y `qa-finanzas-b` en `dev` (§3) y confirmar que el preview que usará OPAI2 apunta a esa base.
2. Pedir (o aprobar) el script de provisión de usuarios por rol del §4 como PR aparte, sin correos y con contraseñas fuera del repositorio.
3. Entregar los accesos a OPAI2 por el canal seguro del equipo.
4. Mantener `test.opai.cl` en `main` y coordinar cualquier cambio de alias de `preview.opai.cl`.
