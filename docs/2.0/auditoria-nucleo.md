# Auditoría del Núcleo — OPAI 2.0

**Fecha:** 28-oct-2026 · **Base auditada:** `main` `f60a88d` (incluye #101, ADR-055) · **Encargo:** Carlos, CAR-34 · **Autor:** Claude (constructor), con cinco revisiones independientes en solo lectura (seguridad, datos, paridad y pruebas, robustez y diseño, seguimiento de la auditoría del 26-oct). Solo auditoría: este PR no corrige código.

**Alcance:** tenants, usuarios, roles y permisos, RLS, Better Auth, `platformRole`, API keys de agentes, MCP, auditoría, aprobaciones, configuración de IA y Plataforma. Quedan fuera las reglas de negocio de Comercial, Puestos y Anexos, salvo cuando revelan una falla del mecanismo del Núcleo.

---

## Veredicto

**Faltan estas 23 cosas** para cerrar el Núcleo: **4 bloqueantes** y **19 importantes**. Los bloqueantes son: uno de seguridad, que llega con #101, y tres de producto, porque B2, B3 y B4 están construidos en las capacidades pero nadie los puede operar.

El mecanismo de aislamiento entre empresas es sólido: RLS con FORCE en las 62 tablas con `tenant_id`, `forTenant` fijado por transacción y `executeCapability` con permisos, scopes, portal, idempotencia y aprobación. El barrido con dos empresas no encontró ninguna fuga (§Validaciones).

| Nivel | Cantidad | Issues |
|---|---|---|
| Bloqueante | 4 | [CAR-36](https://linear.app/carlos-irigoyen/issue/CAR-36) · [CAR-37](https://linear.app/carlos-irigoyen/issue/CAR-37) · [CAR-38](https://linear.app/carlos-irigoyen/issue/CAR-38) · [CAR-39](https://linear.app/carlos-irigoyen/issue/CAR-39) |
| Importante | 19 abiertos | [CAR-40](https://linear.app/carlos-irigoyen/issue/CAR-40) a [CAR-60](https://linear.app/carlos-irigoyen/issue/CAR-60), salvo CAR-44 (I-05, reclasificado a menor) y CAR-55 (I-16, cerrado durante la auditoría) |
| Menor | 36 | Sin issue propio (I-05 conserva CAR-44); van al PR de pendientes |

**Orden sugerido.** Primero B-01 (CAR-36), porque es seguridad y llega con #101. Después, I-17 (una verificación de minutos en Configuración → API keys) y el triage de I-21 (e2e en rojo en main, con pruebas de alcance y cambio de empresa). Luego B-02, B-03 y B-04, que tienen plazo legal el 30-nov; necesitan diseño en Claude Design y deben ir junto con I-13 para que el gate no deje pasar otra capacidad sin camino humano. Al final, el resto de los importantes, en un PR de pendientes del Núcleo.

---

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| CI de GitHub del PR (#103) y de main | Checks obligatorios en verde; e2e en rojo en main y en el PR por las mismas pruebas, no por este cambio (I-21) |
| `pnpm typecheck` · `pnpm lint` | Verde en `f60a88d` |
| `pnpm test` | 1.156 tests en verde (192 archivos en `75ffb7b`; repetido en `f60a88d`) |
| `pnpm test:db` (Postgres 16 local, mismas migraciones) | 179 (db) + 214 (capacidades) + 25 (auth) en verde |
| Barrido con dos empresas sobre **todas** las tablas con `tenant_id` (script fuera del repo, rol efímero miembro de `opai_app`, sin BYPASSRLS) | 62 tablas, 55 con datos: **0 fallas**. Sin tenant: 0 filas. Con tenant A: 0 filas ajenas visibles. UPDATE cruzado: 0 filas. INSERT y cambio de `tenant_id` hacia otra empresa: rechazados por WITH CHECK |
| Tablas sin `tenant_id` accesibles por `opai_app` | `tenants`, `users`, `sessions`, `accounts`, `two_factor` y `verifications` con CRUD completo; `ajustes_plataforma` y `precios_recursos` con SELECT, INSERT y UPDATE; `login_intentos` con SELECT e INSERT (ver I-04) |
| Catálogo: RLS, FORCE y política | 0 excepciones; toda tabla con `tenant_id` tiene un índice que empieza por `tenant_id`; los triggers `mismo_tenant` cubren las 43 FKs entre tablas con tenant |

No se verificó (fuera del repositorio): qué migraciones están aplicadas en Neon `dev` y `main`, si la key `*` de Gard fue revocada, el rol de mantenimiento de Neon ni la QA visual en `test.opai.cl`.

---

## Bloqueantes

### B-01 · Aprobaciones y auditoría de `platform.*` quedan en la empresa de la key y exponen datos de otras empresas — [CAR-36](https://linear.app/carlos-irigoyen/issue/CAR-36)
- **Archivo:** `packages/capabilities/src/agentes/control.ts:53-82`; `core/agentes/aprobaciones.ts` (`list`/`get` devuelven `input`); `core/plataforma/usuarios.ts:38-53`; `core/platform-escritura.ts:55`.
- **Qué pasa:** una key de scope `platform` vive en una empresa X. Al pedir una escritura `platform.*` irreversible con `tenantId` de otra empresa en el input (`admins.invite`, `tenants.create`, `tenants.set_estado`, `trabajos.cancelar`), la aprobación y su auditoría se crean con `tenantId: ctx.tenantId` (X). La aprobación guarda el `input` completo sin `sinSensibles` (`control.ts:61`): id de otra empresa Y, correo del admin invitado, slug y nombre; la auditoría guarda el input filtrado por `sinSensibles` (`control.ts:83`), que no cubre esos campos. `platform.users.set_role` también queda en esa cola, pero por diseño opera desde la empresa actual y su input (`email`, `platformRole`) no trae datos de otra empresa: igual es una aprobación de plataforma visible para quien no tiene `platformRole`.
- **Riesgo:** los owners y admins de X ven datos de Y en Configuración → Aprobaciones sin tener `platformRole`. Es mezcla de datos entre empresas, y llega con #101.
- **Arreglo:** cola y auditoría de plataforma propias (tabla sin `tenant_id`, operaciones con nombre), o aprobación y auditoría en el `tenantObjetivo` sin datos ajenos. Mientras tanto, ocultar las aprobaciones `platform.*` a quien no tiene `platformRole`, con un test `test:db`.

### B-02 · B2 sin camino humano: no se pueden crear ni asignar roles personalizados ni excepciones — [CAR-37](https://linear.app/carlos-irigoyen/issue/CAR-37)
- **Archivo:** `core/permisos/roles.ts`, `roles-edicion.ts`, `asignaciones.ts` y `excepciones.ts` (todas `soloPersonas: true`); `apps/web/app/(erp)/configuracion/usuarios/matriz-permisos.tsx:14` («Solo lectura»); `editar-usuario.tsx` (no envía `roleId`); `apps/web/lib/actor.ts:114` (`/api/v1` con sesión usa `portal: null`); `autorizacion.ts:57-66`.
- **Qué pasa:** ninguna pantalla invoca `core.roles.create/update/archive/assign` ni `core.excepciones.set` (grep = 0). El MCP las bloquea por `soloPersonas`, que es correcto. `/api/v1` con sesión las rechaza con «No tienes acceso a este portal».
- **Riesgo:** CA-B2 («un owner crea un rol y lo asigna») no se cumple en el producto. Solo se opera por seed o `dbAdmin`.
- **Arreglo:** bloque 6 del Brief 07c con diseño aprobado, junto con I-13.

### B-03 · B3 sin camino humano: no se pueden asignar instalaciones a un supervisor — [CAR-38](https://linear.app/carlos-irigoyen/issue/CAR-38)
- **Archivo:** `core/permisos/supervisores.ts:87` (`soloPersonas`); el filtro en `core/maestros/alcance.ts:11-41` está bien hecho y tiene e2e (`e2e/navegacion-permisos.spec.ts:60`).
- **Qué pasa:** `core.supervisores.asignar/quitar` no tiene pantalla, no sale por MCP y `/api/v1` con sesión lo rechaza.
- **Riesgo:** un supervisor sin asignaciones ve listas vacías, porque el alcance deniega por defecto. El portal Supervisor no sirve para Gard.
- **Arreglo:** bloque 9 del Brief 07c con diseño aprobado.

### B-04 · B4 Ley 21.719 sin pantallas — [CAR-39](https://linear.app/carlos-irigoyen/issue/CAR-39) (plazo 30-nov-2026)
- **Archivo:** `packages/capabilities/src/core/cumplimiento/*` (12 escrituras, todas `soloPersonas`); grep de `core.cumplimiento` en `apps/web/app` = 0; `core/config/nucleo-retencion.ts:39` (retención apagada); `packages/domain/src/retencion.ts:49-63` (7 categorías en `pendiente`); `BRIEF-07d-ley-21719.md:339` (CA-3 parcial).
- **Qué pasa:** el backend está integrado (#56, #61), pero no se puede aceptar el DPA, designar el DPO, registrar un consentimiento ni atender una solicitud ARCO desde el producto.
- **Riesgo:** incumplimiento legal desde el 1-dic-2026.
- **Arreglo:** bloques 7-UI y 8 del Brief 07d; plazos de retención con el abogado y activación; pendientes del §21 (orden y cursor, carreras en `exigirNoAnonimizado`, rotación de DEK).

---

## Importantes

| Id | Hallazgo | Archivo:línea | Riesgo | Arreglo | Issue |
|---|---|---|---|---|---|
| I-01 | Plataforma lee cada empresa con un delegado libre y sus lecturas no se auditan | `capabilities/src/contexto.ts:194` (`paraTenant: forTenant`); `execute-util.ts:107`; `core/plataforma/trabajos-lista.ts:37,74`; `tenant-panel.ts:55-110` | Desde #101 son alcanzables por MCP: una key `platform` filtrada lee los payloads de todas las empresas sin dejar rastro | Operaciones con nombre y `select` acotado; auditar las lecturas `platform.*`; expiración corta obligatoria para keys `platform` | [CAR-40](https://linear.app/carlos-irigoyen/issue/CAR-40) |
| I-02 | `platform.ajustes.set` y `platform.precios.set` no se auditan, o se auditan en la empresa del operador | `execute-util.ts:107-111`; `core/config/plataforma.ts:50-91`; `core/plataforma/precios.ts:36-70`; `execute.ts:56` | Cambios globales (precios, modelos de IA) sin rastro; ahora también por MCP sin aprobación | Auditoría de plataforma con antes y después; test por escritura `platform.*` | [CAR-41](https://linear.app/carlos-irigoyen/issue/CAR-41) |
| I-03 | Acciones de identidad sin rastro: contraseña, MFA, login | `apps/web/app/_acciones/auth.ts`, `_acciones/mfa.ts`; `packages/auth/src/acciones.ts:79`, `mfa.ts:146`; `core.prisma:117-147` (sin IP ni user agent) | Sin evidencia ante un incidente de cuenta (brecha B8 de 1.0) | `core.eventos_seguridad` global, append-only, con IP en HMAC | [CAR-42](https://linear.app/carlos-irigoyen/issue/CAR-42) |
| I-04 | Tablas de identidad sin RLS con CRUD para `opai_app` y expuestas en `ctx.db` | `migrations/20261023031142_init/migration.sql:59-61`; `20261023044757_identidad:218-221`; `20261028060000_mfa:39`; `db/src/for-tenant.ts:24-40`; `core/users-miembro.ts:62` (lee sesiones completas con token); `core/tenant.ts:41` | Un filtro olvidado expone sesiones, hashes o datos de otra empresa; la RLS no lo detiene | Rol propio para Better Auth; REVOKE a `opai_app`; delegados globales detrás de operaciones con nombre; `select` mínimo | [CAR-43](https://linear.app/carlos-irigoyen/issue/CAR-43) |
| ~~I-05~~ | **Reclasificado a menor (M-36) tras la revisión independiente.** El rate limit del MCP usa los 24 primeros caracteres de la key, antes de autenticar | `apps/web/lib/mcp.ts:24`; `core/apikey-formato.ts:28` | Solo con slugs de 18 caracteres o más el prefijo es todo público (con `gard` incluye 14 caracteres secretos) | Ver M-36 | [CAR-44](https://linear.app/carlos-irigoyen/issue/CAR-44) (prioridad baja) |
| I-06 | Borrar un usuario arrastra sus membresías, excepciones y alcance en todas las empresas | `migrations/20261023044757_identidad/migration.sql:198` (CASCADE); cascadas a `permiso_excepciones` y `supervisor_instalaciones` | Pérdida silenciosa de accesos en varias empresas, sin auditoría | RESTRICT y baja por estado; borrado solo por operación de plataforma auditada | [CAR-45](https://linear.app/carlos-irigoyen/issue/CAR-45) |
| I-07 | Referencias sin FK que quedan colgando y usuarios no miembros de la empresa | `aprobaciones.api_key_id`, `envios`/`notificaciones.evento_id`, `documentos.reemplaza_a_id`, `perfil_empresa.logo_*_id`, `solicitudes_arco.documento_evidencia_id`, `incidentes.evidencia_doc_id`, `retencion_ejecuciones.solicitud_id`; `personas.usuario_id`, `notificaciones.usuario_id`, `api_keys.user_id`, etc. | La evidencia ARCO o un logo se borran y la referencia queda rota; una persona de A puede quedar ligada a un usuario de B | FKs `NOT VALID` y luego `VALIDATE`; trigger `usuario_miembro` | [CAR-46](https://linear.app/carlos-irigoyen/issue/CAR-46) |
| I-08 | 29 de 34 migraciones sin `lock_timeout`; `20261028200000:5` lo fija con `SET` de sesión; `opai_app` sin `statement_timeout` ni `idle_in_transaction_session_timeout` | `migrations/20261028170000_force_rls`, `…120000`, `…130000`, `…140000` y otras; `db/src/for-tenant.ts:31-36` | Una migración con tráfico bloquea la app; transacciones colgadas retienen conexiones y locks | Aplicar con `PGOPTIONS=-c lock_timeout=5s`; `ALTER ROLE opai_app SET …`; plantilla de migración con `SET LOCAL` y reversión | [CAR-47](https://linear.app/carlos-irigoyen/issue/CAR-47) |
| I-09 | La prueba de dos tenants del CI casi no tiene datos, cubre solo `core` y no prueba UPDATE ni DELETE cruzados | `packages/db/test/rls-nucleo-politicas.test.ts:30-33,72-91`; `capabilities/test/aislamiento-lectura-db.test.ts:57-68` (solo personas) | El aislamiento funciona hoy (barrido en verde), pero el CI no lo garantiza para tablas nuevas | Test generado desde el catálogo con datos en A y B, en todos los schemas | [CAR-48](https://linear.app/carlos-irigoyen/issue/CAR-48) |
| I-10 | Los errores inesperados devuelven el mensaje interno y no se registran | `capabilities/src/execute.ts:143-147`; `_components/use-capacidad.ts:31`; `http.ts:28`; `lib/mcp.ts:64`; sin `instrumentation.ts` | Expone el esquema y valores de Prisma o pg, en inglés, a usuarios y agentes; los fallos de producción son invisibles | Mensaje genérico con id de correlación; log estructurado; `onRequestError` | [CAR-49](https://linear.app/carlos-irigoyen/issue/CAR-49) |
| I-11 | Sin `error.tsx` en ningún portal y 67 cargas que convierten un error en «vacío» | 0 `error.tsx`/`global-error.tsx`; `configuracion/empresa/page.tsx:24`, `modulos/page.tsx:32`, `integraciones/page.tsx:24`, `usuarios/page.tsx:51-57`, `platform/ajustes/page.tsx:28`, `supervisor/personas/[id]/page.tsx:40`, `(erp)/_componentes/inicio.tsx:72`; `mi-cuenta` sin patrón | El usuario actúa sobre datos que cree vacíos; la página de error de Next sale en inglés y fuera del shell | `error.tsx` por route group con `ErrorState`; `estadoPantalla(r)` en cada carga | [CAR-50](https://linear.app/carlos-irigoyen/issue/CAR-50) |
| I-12 | Sin `RESEND_API_KEY`, el correo cae a la consola con los enlaces de recuperación e invitación | `packages/integrations/src/email/index.ts:10-13`; `consola.ts:10`; `auth/src/auth.ts:78`; `capabilities/src/contexto.ts:149` | Tokens equivalentes a una credencial quedarían en los logs de Vercel si falta la variable | Fallar cerrado en producción | [CAR-51](https://linear.app/carlos-irigoyen/issue/CAR-51) |
| I-13 | El gate de paridad acepta `soloPersonas` sin ningún llamador humano | `capabilities/test/paridad.test.ts:36-46`; `paridad-inventario.test.ts:21` | Así pasaron B-02, B-03 y B-04 todos los gates | Exigir llamador en `apps/web` o lista «sin pantalla todavía» con fecha | [CAR-52](https://linear.app/carlos-irigoyen/issue/CAR-52) |
| I-14 | 12 capacidades del Núcleo sin test; sin e2e de invitación real ni de Mi cuenta; e2e no obligatorio | `core.cuentas.update`, `set_representantes`, `contactos.update/archive`, `instalaciones.update`, `puestos.get`, `documentos.archive/pedir_renovacion`, `documento_tipos.update`, `plantillas.enviar_prueba`, `invitations.revoke`, `platform.trabajos.reintentar`; `e2e/acceso-diseno.spec.ts` | Regresiones sin detectar en maestros y acceso | Test por capacidad (autorización, `dryRun`, auditoría, alcance); e2e de invitación y Mi cuenta | [CAR-53](https://linear.app/carlos-irigoyen/issue/CAR-53) |
| I-15 | MFA sin recuperación: sin restablecimiento por admin o Plataforma ni pantalla para regenerar códigos | `auth/src/mfa.ts:62-70,136`; `mfa-sesion.ts:21` (endpoint sin UI); `domain/src/mfa.ts:2-8` | Un owner que pierde el teléfono y los códigos queda fuera de su empresa | Regenerar códigos en Mi cuenta; capacidad de restablecimiento auditada | [CAR-54](https://linear.app/carlos-irigoyen/issue/CAR-54) |
| ~~I-16~~ | **Cerrado durante la auditoría.** #61, #65 y #70 se integraron con `migracion-pendiente` puesta y sin aviso de migración aplicada | Historial de etiquetas de esos PR | El operador verificó en `_prisma_migrations` de Neon `dev` y `main`, dejó el aviso «registro tardío, CAR-55» en los tres PR el 28-oct a las 16:23 CLT y quitó la etiqueta (verificado con la API de GitHub). Queda revisar por qué el bot integró con la etiqueta puesta | [CAR-55](https://linear.app/carlos-irigoyen/issue/CAR-55) |
| I-17 | Sin evidencia de que se revocó la key `*` de Gard ni de que se corrió `seed:staging` (NÚCLEO-C) | `briefs/NUCLEO-C-identidad-servicio.md:43-46` | Una sola key con permisos de owner opera todo el tenant | Revisar en Configuración → API keys y revocar; keys por agente | [CAR-56](https://linear.app/carlos-irigoyen/issue/CAR-56) |
| I-18 | CSP en Report-Only con `unsafe-inline` en `script-src` y `style-src` | `apps/web/lib/cabeceras-seguridad.ts:17,56` | No bloquea XSS, solo reporta | Resolver los scripts y estilos inline sin nonce o hash y pasar a enforcement | [CAR-57](https://linear.app/carlos-irigoyen/issue/CAR-57) |
| I-19 | La plantilla del anexo de contrato tiene texto legal de ejemplo (CAR-19) | `capabilities/src/core/anexos/plantilla.ts:21,43` | Un anexo aprobado no tiene validez laboral | Texto legal de Carlos y el abogado; bloquear la aprobación mientras sea ejemplo | [CAR-58](https://linear.app/carlos-irigoyen/issue/CAR-58) |
| I-20 | `ESTADO.md` tiene unas 20 entradas obsoletas o contradictorias | Ver la lista de I-20 más abajo | Los agentes leen como verdad que falta (o que existe) algo que no | PR de pendientes con una foto única verificada | [CAR-59](https://linear.app/carlos-irigoyen/issue/CAR-59) |
| I-21 | El e2e está en rojo en main desde hace al menos 8 commits (en `f60a88d`, shards 2 a 6), incluidas pruebas de alcance del supervisor y de cambio de empresa | `e2e/navegacion-permisos.spec.ts:42`; `e2e/cache-sesion.spec.ts:152`; `portales-riel.spec.ts:73`; `platform-superadmin.spec.ts:13`; `portal-inicio.spec.ts:44,90`; `maestros.spec.ts:45`; `maestros-ficha-lista.spec.ts:60` (timeouts de 3 min); otros de fichas y DS | No se sabe si son fallas reales o del entorno de CI; mientras sigan en rojo, una regresión de aislamiento en el navegador pasa sin aviso (el e2e no es obligatorio) | Triage inmediato de las dos de aislamiento; luego el resto; con main en verde, promover un subconjunto crítico a obligatorio | [CAR-60](https://linear.app/carlos-irigoyen/issue/CAR-60) |

**Entradas obsoletas de `ESTADO.md` (I-20, líneas en `f60a88d`):**
- :18 Brief 07b PR 1 «no listo» (#80 integrado).
- :20 cargos sensibles «pendiente» (#83, #84 y #86 integrados).
- :22 foto `3199b00`.
- :560 Brief 05 PR B «sin integrar» (#75 integrado).
- :577 NÚCLEO-F «no integrado» (#65).
- :578 CAR-16 «no integrado» (#57).
- :579 Brief 07c PR 1 «no está en main» (#46).
- :590 «falta el PR 2 del Brief 03» (#88).
- :596 «PR #38 pendiente de merge».
- :604 Brief 05 «pendiente de aprobación» (#37).
- :605 B2 «en revisión» (#47).
- :606 Brief 04 «en revisión» (#45).
- :686 capas de sueldo «brief en revisión».
- :700 «No están implementados» (B1 a B3 están en main).
- :702 B1 «en memoria por instancia».
- :704 B3, contradictoria consigo misma.
- :705 B4 PR 3 «sin integrar» (#61).
- :707 D2 «aplazar el positivo» (superado).
- :714 y :748 PR integrados.
- :828 pendientes de CAR-19 sin detalle.

Además, `REGLAS-codigo.md` («UI») dice «aviso hasta el Brief 02» para los elementos crudos, cuando ESLint ya los marca como error (`apps/web/eslint.config.mjs:17-25`).

---

## Menores (sin issue; van al PR de pendientes)

| Id | Hallazgo | Archivo:línea | Arreglo |
|---|---|---|---|
| M-01 | Un admin de la empresa puede quitar la expiración o el presupuesto de una key `platform` de otro responsable | `core/agentes/claves.ts:47-74` | Exigir `platform:*` si la key tiene scope `platform` |
| M-02 | Enumeración de cuentas entre empresas al invitar (también en `dryRun`) | `core/invitar.ts:33,46` (`usuarioExiste`) | No devolverlo, o devolverlo solo si ya es miembro |
| M-03 | `audit_events` permite INSERT directo y `auditoria_cabezas` permite UPDATE y DELETE a `opai_app` | `migrations/20261028130000_auditoria_encadenada/migration.sql:49,62` | Revocar; escribir solo por `auditoria_append` |
| M-04 | Sesión con la duración por defecto de Better Auth (7 días renovables), también para plataforma | `packages/auth/src/auth.ts:50-52` | Sesión más corta y `freshAge` para owner, admin y plataforma |
| M-05 | Función SECURITY DEFINER antigua `core.marcar_login_intento(text,text,boolean,text)` sigue ejecutable | `migrations/20261026140000_marcar_login_intento/migration.sql:13-35` | DROP en migración aditiva (lo prometía `…150000`) |
| M-06 | Secretos cifrados sin AAD (no quedan atados a la empresa y la integración) | `capabilities/src/integraciones/secretos.ts:47-50,71-77` | AAD `tenantId\|integracionId\|nombre` con recifrado |
| M-07 | `/api/marca/[slug]/[asset]` sin rate limit (hasta 4 consultas y una firma de R2 por petición) | `apps/web/app/api/marca/[slug]/[asset]/route.ts:22-50` | Límite por IP y caché |
| M-08 | Un agente con `core.config.set` puede apagar la exigencia de MFA para los demás roles | `core/config/nucleo.ts:125`; `core/config/set.ts:33` | `soloPersonas` en el `meta` del ajuste |
| M-09 | `/verificar/[token]` lee con `forTenant` sin capacidad (deuda declarada) | `apps/web/paridad-permitidos.json:17` | Capacidad pública `core.comprobantes.verificar` |
| M-10 | FKs sin índice; el trigger de puestos recorre la tabla completa | `puestos.cargo_id`, `vinculos_laborales.cargo_id/puesto_id`, `anexos_contrato.vinculo_id/documento_id`, `api_keys.user_id`; `migrations/20261028190000…:39-45` | `CREATE INDEX CONCURRENTLY (tenant_id, col)` |
| M-11 | Reversión documentada solo en 10 de 34 migraciones; difíciles de revertir: `20261026130000` (DROP), `20261023170000` (INT→BIGINT), `20261028130000/140000` (cadena) | `packages/db/prisma/migrations/*` | Sección de reversión obligatoria en la plantilla del PR |
| M-12 | IDs y `updated_at` sin default en la base (los genera Prisma) | Esquema completo | `DEFAULT now()` en `updated_at`; documentar uuid v7 |
| M-13 | `DATABASE_URL_MIGRATE` con `options=-c row_security=off` puede fallar con el pooler | `packages/db/src/client.ts:50` | Documentar el host directo |
| M-14 | El cron devuelve `e.message` en el cuerpo | `apps/web/lib/cron.ts:45` | Registrar en servidor, no responder |
| M-15 | Sin reintento ante 40001, 40P01 o P1017 en lecturas | `packages/db/src/pool.ts:22-28` | Reintento acotado solo para lecturas |
| M-16 | El outbox reintenta sin backoff y `tenantsOperables()` no tiene orden estable | `db/src/globales.ts:21`; despacho del outbox | `proximoIntento` y rotación de empresas |
| M-17 | `DATABASE_POOL_MAX` 10 en el código frente a 4 en `.env.example:3` | `db/src/config-pool.ts` | Alinear la documentación |
| M-18 | 4 hex fuera de `tokens.css` (`theme-color`) | `apps/web/app/manifest.ts:23-24`; `layout.tsx:27-28` | Constante exportada desde `@opai/ds` con test |
| M-19 | Tamaños tipográficos arbitrarios: 3 en apps, 15 en el DS | `personas/_componentes/lista-personas.tsx:112`; `cuentas/_componentes/lista-cuentas.tsx:69`; `platform/tenants-lista.tsx:99` | `text-sm`/`t-caption`; token `xxs` si el diseño lo pide |
| M-20 | Colores crudos en el DS | `packages/ds/src/shell/contador.tsx:3` (`text-white`); `acceso/codigo-qr.tsx:23` (`bg-white`, justificado) | Tokens `inverse-fg` y `paper` |
| M-21 | Textos técnicos visibles: «Error» por defecto, `code: "METHOD"` fuera de `CodigoError`, ids internos en mensajes | `tarjeta-integracion.tsx:30`; `capabilities/src/http.ts:76,90`; `execute.ts:130` | Mensajes de negocio |
| M-22 | `platform.ajustes.set` y `platform.precios.set` se prueban sin afirmar auditoría | `config.test.ts:126`; `plataforma-panel.test.ts:125` | Agregar la aserción al cerrar I-02 |
| M-23 | Las escrituras de plataforma no son atómicas con su auditoría (brecha declarada en ADR-052) | `capabilities/src/execute.ts:53-56` | Cerrar con la auditoría de plataforma de B-01 |
| M-24 | Sin protocolo para anonimizar payloads de auditoría sin romper la cadena | ADR-052 (corrección del 27-oct) | Definir antes de activar la retención |
| M-25 | No hay reserva previa del costo de IA (NÚCLEO-C) | `capabilities/src/integraciones/ia.ts` | Reserva antes de la llamada |
| M-26 | Rol de mantenimiento con BYPASSRLS en Neon sin verificar (NÚCLEO-G2) | `briefs/NUCLEO-G2-force-rls.md:89,126` | Carlos lo confirma en Neon |
| M-27 | Elección de modelo por usuario (E1) y UI del agente interno (E2) pendientes | `PLAN-desarrollo.md:52` | Con el diseño aprobado |
| M-28 | MFA: verificación por correo/OTP sin diseño; las 3 pantallas MFA sin diseño aprobado; SSO (P2) no existe | `01-decisiones.md:199`; `design/export-acceso/README.md:15` | Diseño en Claude Design |
| M-29 | Decisión S1/S2 de la QA de NÚCLEO-D1 pendiente de Carlos | `ESTADO.md`, nota D1 | Decisión de Carlos |
| M-30 | CAR-19: el motivo «rol» del anexo no tiene disparador (depende de Operaciones) | `core/anexos/consumidor.ts:139`; `comun.ts:20` | Con el módulo de Operaciones |
| M-31 | CAR-19: aprobador del anexo configurable por tenant (D13) pendiente; hoy solo owner y admin | `core/anexos/*` | Ajuste por tenant tras B-02 |
| M-32 | CAR-19: sin test de concurrencia en Postgres para versiones de cargos sensibles; QA a 375 y 1024 px sin evidencia | `cargo-sensible-pendientes.test.ts` (contexto falso) | Test `*-db` con llamadas en paralelo |
| M-33 | CAR-19: fichas de instalación y persona con 7 operaciones lógicas, pero vencimientos abarca todo el tenant (ADR-045) | `core.estructuras.panel`; ESTADO :716-725 | Medir SQL real y acotar |
| M-34 | CAR-19: Inicio y Vencimientos no cuentan documentos de otras entidades; badge del anexo en modo oscuro; script de archivado D10 sin evidencia de ejecución en `dev` | `briefs/fix-inicio-vencimientos.md`; #93; `packages/db/scripts/archivar-cargos*.ts` | PR de pendientes |
| M-35 | `core.users.ultimosAccesos` muestra el último acceso del usuario en cualquier empresa, no solo en la actual | `core/users-miembro.ts:55-70` | Acotar o aclarar en la UI (se combina con I-04) |
| M-36 | (antes I-05, CAR-44) El rate limit del MCP agrupa por los 24 primeros caracteres de la key antes de autenticar: con slugs de 18 o más caracteres, keys falsas agotan el cupo de la empresa; con slugs cortos, el cupo por key se evade variando caracteres (lo acota el límite por IP) | `apps/web/lib/mcp.ts:24` | Key completa (HMAC) o `apiKeyId` tras autenticar |

---

## Seguimiento de la auditoría del Núcleo del 26-oct-2026

El documento original (encargo t457u) no está en el repositorio. Su lista se reconstruyó desde ADR-049, ADR-051 y ADR-052, los briefs `NUCLEO-*` y los títulos de los PR. Cada punto se verificó en `f60a88d`.

| Punto | PR | En main | Lo que sigue abierto |
|---|---|---|---|
| NÚCLEO-A · auditoría atómica y encadenada (P1, ADR-052) | #71, #76 | Sí (`execute.ts:56-75`; migraciones `20261028130000…163000`) | Escrituras de plataforma no atómicas y sin destino propio (B-01, I-02, M-23); anonimización (M-24) |
| NÚCLEO-B · rate limit central (P0) | #64 | Sí (`lib/rate-limit.ts:58-64`; key en URL responde 410) | Prefijo de key en el MCP (M-36) |
| NÚCLEO-C · identidad de servicio y presupuesto (P0, ADR-051) | #70 | Sí (`autorizacion.ts`; migración `20261028030000`, aplicada según el registro del operador del 28-oct) | Revocar la key `*` y `seed:staging` sin evidencia (I-17); reserva de IA (M-25) |
| NÚCLEO-D1 · portal forzado en servidor | #68, #72 | Sí | Decisión de QA S1/S2 (M-29) |
| NÚCLEO-D2 · navegación por permisos efectivos | #78 | Sí, con e2e positivo del supervisor (`navegacion-permisos.spec.ts:60`) | Cerrado |
| NÚCLEO-E1 · proveedores de IA (P1) | #62 | Sí | Elección de modelo por usuario (M-27) |
| NÚCLEO-E2 · agente interno (servidor) | #73 | Sí (`/api/agente`) | UI pendiente de diseño (M-27) |
| NÚCLEO-F · MFA (P1) | #65, #74 | Sí (ver la tabla de abajo) | Recuperación (I-15); OTP por correo, diseño y SSO (M-28) |
| NÚCLEO-G2 · FORCE RLS (P1) | #79, #96 | Sí (`20261028170000_force_rls`) | Rol de mantenimiento en Neon (M-26) |
| CSP, HSTS y Permissions-Policy (P1) | #63 | Sí, en Report-Only | Enforcement (I-18) |
| NÚCLEO-H · lecturas auditadas (P2) | #76 | Sí (`briefs/NUCLEO-H-lecturas.md`) | Lecturas de plataforma sin auditar (I-01) |
| SSO (P2) | — | No | M-28 |

### Brechas B1–B4 y NÚCLEO-F, verificadas en main

| Brecha | PR | Estado real | Criterios no cumplidos |
|---|---|---|---|
| **B1** · bloqueo de login persistido | #46, #57 | **Cerrada.** `packages/auth/src/bloqueo-login.ts`; hooks en `auth.ts:118-145`; purga en el cron; `bloqueo-login-db.test.ts` y `e2e/bloqueo-login.spec.ts` | Ninguno. El riesgo residual por NAT y por rotar el secreto quedó declarado (07c §16.3) |
| **B2** · roles y permisos finos | #47, #60, #67 | **Parcial:** capacidades y seed listos; no operable | CA-B2 desde el producto → B-02 |
| **B3** · alcance del supervisor | #51, #89 | **Parcial:** filtro en consultas listo, con e2e; asignación no operable | Asignar supervisor ↔ instalación → B-03. Cliente y Trabajador en fase 3 (decisión de Carlos, t310u) |
| **B4** · Ley 21.719 | #56 (incluye #48), #61 | **Parcial:** backend completo; sin pantallas; retención apagada | CA-3 (PDF y pantallas), CA-4 (plazos), CA-5 (columnas de salud y biometría) → B-04 |
| **NÚCLEO-F** · MFA | #65, #74 | **Integrado.** Obligatorio y no desactivable para plataforma, owner y admin (`domain/src/mfa.ts:2-8`); opcional ampliable para el resto (`config/nucleo.ts:125`); exigido en portales, API con cookie y creación de API keys (`apikeys.ts:98`); códigos de respaldo; bloqueo de 5 intentos y 15 min; Google no salta el segundo factor | Recuperación sin dispositivo (I-15); un agente puede apagar la ampliación (M-08). Migraciones aplicadas en Neon según el registro del operador (CAR-55) |

### Pendientes de CAR-19 (Brief 07b: #80, #82 a #87, #89, #91, #93)

| Pendiente | Estado |
|---|---|
| Texto legal de la plantilla del anexo (§16.b) | **Abierto** → I-19 (CAR-58) |
| Validar que las estructuras de los snapshots sean de la misma persona (S1 del #91) | Cerrado (`core/anexos/validar-snapshots.ts`) |
| Bloqueos de la QA del #91 (B1, M1, M4) | Cerrados |
| Test del fallo de auditoría del rechazo (#84) | Cerrado (`capabilities/test/rechazo-auditoria.test.ts:8`, #86) |
| Motivo «rol» del anexo sin disparador | Abierto, depende de Operaciones (M-30) |
| Aprobador configurable (D13) y refinamiento por rol personalizado (D8) | Abierto; depende de B-02 (M-31) |
| Test de concurrencia de cargos sensibles; QA 375/1024 | Abierto (M-32) |
| ≤ 8 consultas en fichas (ADR-045) | Parcial (M-33) |
| Vencimientos de otras entidades, badge en modo oscuro, ejecución del archivado D10 | Abierto (M-34) |

---

## Piso de 1.0 (lo que el Núcleo de 1.0 hacía y 2.0 todavía no)

| # | En 1.0 | En 2.0 | Dónde se resuelve |
|---|---|---|---|
| B1 | Bloqueo de login en la base | Hecho | — |
| B2 | Roles personalizados y su pantalla | Backend sí; pantalla no | B-02 |
| B3 | Alcance del supervisor | Filtro sí; asignación no | B-03 |
| B4 | DPA, DPO, consentimiento y ARCO | Backend sí; pantallas no | B-04 |
| B5 | Política de seguridad por tenant (expiración e historial de contraseña, sesión ociosa, inactividad) | Solo MFA por rol | M-04; brief de seguridad de cuenta |
| B6 | Impersonación de soporte auditada | No existe | Pendiente de diseño (ESTADO) |
| B7 | Ciclo de vida del tenant (trial vencido, moroso, cancelado, solo lectura) | Solo `trial`, `activo` y `suspendido` (`core.prisma:25-26`) | Con planes y facturación (Opai SpA) |
| B8 | Auditoría con IP y user agent, de login y de plataforma con antes y después | Parcial | I-02, I-03 |
| B9–B12 | Grupos de usuarios, borrado y exportación del tenant, límites del plan, catálogos globales restringidos | No existen | Backlog (fase 3 o antes de Nómina) |
| B13 | Datos DT del empleador | Sin verificar | Fase 4 (Asistencia) |

---

## Paridad pantalla–MCP (después de #101)

- **Cerrado por #101:** Plataforma por MCP con una key de scope `platform` explícito; `preview_` en toda escritura de plataforma; inventario de entradas de servidor (`docs/2.0/paridad/mcp-inventario.md`: 214 pares, 197 con herramienta, 17 excepciones justificadas, 0 faltantes).
- **Solo por pantalla, con justificación:** identidad (login, Google, MFA, contraseña, recuperar, elegir empresa), invitar usuarios, crear y revocar API keys, configurar integraciones y secretos, aprobar o rechazar, aprobar anexos y el agente interno (`soloPersonas`, ADR-032).
- **Ni por pantalla ni por conector:** las escrituras de B-02, B-03 y B-04. El gate no lo detecta (I-13).

## Pruebas

- **Cubierto:** autorización, RLS y FORCE, auditoría encadenada, idempotencia, aprobaciones, API keys e identidad de servicio, MFA (unitario y e2e), rate limit, plataforma, configuración, documentos, comunicaciones, cumplimiento, alcance, y el escenario del manual MCP (`test/manuales/operar-el-nucleo.test.ts`).
- **Falta:** I-09 (dos tenants generalizado), I-13 (camino humano), I-14 (12 capacidades sin test y e2e de invitación y Mi cuenta), I-21 (e2e en rojo en main) y M-22.

## Diseño (DS 2.0)

- **Correcto:** 0 elementos interactivos crudos, 0 estilos inline y 0 colores crudos fuera del DS; `lang="es-CL"`; `Menu`, `Dialog`, `Switch` y `UserMenu` ya están sobre Radix (ESTADO todavía los llama provisionales, ver I-20); no hay restos de estilo 1.0.
- **Falta:** I-11 (estados de error y patrones) y M-18 a M-21.
