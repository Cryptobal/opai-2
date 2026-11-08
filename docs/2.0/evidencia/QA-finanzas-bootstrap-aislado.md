# Bootstrap del QA aislado de Finanzas — procedimiento y configuración propuesta (CAR-221)

Complementa [`QA-finanzas-caja-aislado.md`](QA-finanzas-caja-aislado.md). Este documento es el **bootstrap reproducible y revisable** del destino QA que OPAI 2.0 provisionó. No contiene URLs, claves ni contraseñas: todo secreto llega por entorno o por el canal seguro del equipo.

## 1. Destino (identificadores, no secretos; los entregó OPAI 2.0)

| Dato | Valor |
|---|---|
| Proyecto Neon | `opai2-qa-aislado` (ID `hidden-credit-29118258`) |
| Rama raíz | `qa-vacio` (`br-old-bread-b6jonp8f`), sin padre Gard |
| Base / propietario | `opai2_qa` / `opai2_qa_owner` |
| Región / versión | `aws-sa-east-1` / Postgres 18 |
| Estado inicial | 0 tablas, 0 relaciones, 0 esquemas de OPAI |

Otro proyecto, base o rama **no** sirve: los scripts lo rechazan (ver §3). Este PR no crea recursos, no toca Vercel, alias ni protecciones.

## 2. Qué entrega el bootstrap

- **Dos empresas ficticias** `qa-finanzas-a` y `qa-finanzas-b`, con el módulo `finanzas` activo (único módulo; Finanzas no declara dependencias).
- **Datos de Finanzas por empresa** (`seed:finanzas-qa`): cliente con datos tributarios, proveedor, cuenta bancaria con 3 movimientos, configuración DTE de **certificación** y CAF **sintéticos** de 33, 34, 56 y 61. La capacidad de carga rechaza CAF reales en un tenant QA.
- **Diez usuarios autenticables** (`seed:qa-finanzas-usuarios`): `owner`, `admin`, `gerente`, `supervisor` y `viewer` en cada empresa, con el mecanismo de credenciales existente (el mismo hash del login) y membresía al portal ERP. Correos `<rol>.<empresa>@qa.opai.test` (dominio `.test`: no existe ni recibe correo). Sin invitaciones.
- **Runtime real sin BYPASSRLS:** la aplicación se conecta como `opai_app`; el propietario solo se usa para migrar y sembrar.

Resultado esperado por rol (matriz vigente): `owner` y `admin` operan Finanzas; `gerente`, `supervisor` y `viewer` reciben «Sin permisos» al emitir y conciliar.

## 3. Controles que fallan cerrado

`exigirDestinoQa` (en `@opai/domain`, con pruebas) aborta **antes de cualquier escritura** salvo que se cumplan todas:

1. `OPAI_ENTORNO=qa-aislado` y `OPAI_QA_DESTINO=opai2-qa-aislado` (confirmación explícita del destino).
2. Ni `NODE_ENV` ni `VERCEL_ENV` en producción.
3. `DATABASE_URL` y `DATABASE_URL_MIGRATE` apuntan al mismo endpoint (se acepta el `-pooler` de Neon) y a una base llamada exactamente `opai2_qa`.
4. `DATABASE_URL` usa el rol `opai_app`; `DATABASE_URL_MIGRATE` es el propietario, no `opai_app`.
5. `SII_ADAPTADOR=simulado`, `CESION_ADAPTADOR=simulado` (Octava) y `RESEND_API_KEY` vacía: **sin salida al SII, a la factoring ni a correo real**.

Además, antes de escribir, ambos scripts leen las empresas de la base y **abortan si hay alguna que no sea `qa-*`** (por ejemplo `gard`): una base con datos reales no es el QA vacío. Solo aceptan los slugs `qa-finanzas-a` y `qa-finanzas-b`. Los mensajes de error nunca repiten una URL ni un secreto. Todo simula por defecto y escribe solo con `--confirmar`.

## 4. Procedimiento (lo ejecuta OPAI 2.0 o quien tenga las credenciales del QA)

Las variables se cargan en la sesión del operador desde el canal seguro; no se escriben en el repo, el chat ni un PR.

```bash
export OPAI_ENTORNO=qa-aislado OPAI_QA_DESTINO=opai2-qa-aislado SII_ADAPTADOR=simulado CESION_ADAPTADOR=simulado
# DATABASE_URL (opai_app), DATABASE_URL_MIGRATE (opai2_qa_owner), OPAI_APP_DB_PASSWORD y OPAI_SECRETS_KEY: del canal seguro
```

1. **Migraciones** al QA vacío (con el propietario): `pnpm db:deploy`. Crea el esquema completo y el rol `opai_app`.
2. **Clave del rol de aplicación:** `pnpm --filter @opai/db role:password` (usa `OPAI_APP_DB_PASSWORD`, mínimo 16 caracteres).
3. **Datos de Finanzas**, una vez por empresa; primero simulación y luego escritura:

```bash
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-a
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-a --confirmar
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-b
pnpm --filter @opai/capabilities seed:finanzas-qa --tenant qa-finanzas-b --confirmar
```

4. **Usuarios y membresías**; el archivo de credenciales debe estar **fuera del repositorio** (el script lo rechaza si no) y queda con permisos `0600`:

```bash
pnpm --filter @opai/auth seed:qa-finanzas-usuarios
pnpm --filter @opai/auth seed:qa-finanzas-usuarios --confirmar --salida /ruta/segura/credenciales-qa.json
```

5. Entregar el archivo por el canal seguro a quien valida y **borrarlo**. Las contraseñas no se imprimen nunca. Repetir el paso 4 es idempotente: no toca las claves existentes; `--rotar-claves` genera claves nuevas.

Precondición: el propietario del QA debe poder saltarse la RLS (BYPASSRLS), porque las tablas tienen RLS forzada; el script de usuarios lo verifica y aborta con un mensaje claro si no.

## 5. Configuración propuesta del despliegue de QA (la aplica OPAI 2.0; no se aplicó desde aquí)

Para un preview que lea esta base. Solo nombres de variables; los valores son secretos del QA y viajan por el canal seguro.

| Variable | Valor propuesto |
|---|---|
| `DATABASE_URL` | rol `opai_app` sobre `opai2_qa` (runtime real) |
| `DATABASE_URL_MIGRATE` | **no** se define en el runtime del preview |
| `SII_ADAPTADOR`, `CESION_ADAPTADOR` | `simulado` |
| `RESEND_API_KEY` | ausente (los correos solo se registran en el log) |
| `BETTER_AUTH_SECRET`, `OPAI_SECRETS_KEY`, `CRON_SECRET` | secretos **propios del QA**, distintos de los de Gard |
| `BETTER_AUTH_URL` | la URL del propio preview de QA |
| `GOOGLE_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_MAPS_SERVER_KEY` | ausentes |

Alias, dominios y protección del despliegue son decisión de OPAI 2.0; `test.opai.cl` sigue en `main`.

## 6. Evidencia del ensayo (base local `opai2_qa` con el mismo flujo; no es el proyecto de Neon)

Ensayado en un Postgres local con las migraciones reales y el rol `opai_app` real, no en el proyecto de QA:

- Migraciones aplicadas completas sobre una base `opai2_qa` vacía.
- Sin `OPAI_QA_DESTINO`, o con un slug que no es de QA (`gard`): el script aborta antes de escribir.
- Simulación sin escritura; siembra real de las dos empresas con 4 CAF cada una.
- Usuarios: 10 cuentas creadas, archivo `0600` fuera del repo; con `--salida` dentro del repo el script aborta; segunda corrida: 0 claves nuevas, 10 existentes sin tocar.
- Las 10 contraseñas verifican contra el hash guardado con el mecanismo de Better Auth (10/10; ninguna con la clave alterada) y las 10 membresías tienen el rol y estado correctos.
- Con una empresa `gard` presente en la base, tanto `seed:finanzas-qa` como `seed:qa-finanzas-usuarios` abortan.
- Pruebas automáticas: `qa-aislado.test.ts` (8) y `seed-finanzas-qa-guardas.test.ts` (5).

## 7. Lo que se descubrió al usar la base (ensayo local)

- **Solo `owner` y `admin` ven Finanzas** (`finanzas:*` está vedado a gerente, supervisor y viewer: verificado en `permisos.test.ts`), y **owner y admin tienen segundo factor obligatorio**. Entrar a Finanzas en el QA web exige enrolar TOTP la primera vez (`/activar-mfa`: contraseña, clave manual, código de 6 dígitos). Gerente, supervisor y viewer sirven para comprobar que **no** ven Finanzas.
- **Sin `seed:finanzas-qa` el QA no tiene clientes facturables** y Emitir mostraba «No hay clientes para facturar». El paso 3 del procedimiento es obligatorio por empresa.
- La revisión con esta base destapó un error real, corregido en #397: Emitir y Programación pedían `limite: 200` a `core.cuentas.list` (tope 100) y la pantalla quedaba sin clientes.

## 8. Qué no cubre

- No prueba el despliegue web contra el QA (la configuración del §5 la aplica OPAI 2.0) ni el recorrido visual; eso lo valida OPAI 2.0 en el preview.
- No hay emisión real: el SII, la factoring y el correo quedan simulados por diseño.
- No migra ni copia datos de Gard o de `main`.
