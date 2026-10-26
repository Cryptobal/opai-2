# BRIEF DE IMPLEMENTACIÓN — 07c ACCESO Y PERMISOS (Núcleo, paso 4)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07c-acceso-y-permisos` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **propuesto, pendiente de la aprobación de Carlos** · **Tarea de Linear:** por asignar en el equipo CAR; el PR la vincula con `Fixes CAR-n` (obligatorio, `AGENTS.md` «Tareas (Linear)») · **Depende de:** Brief 01 (identidad, roles, `memberships`) y Brief 02 A–C (capacidades del núcleo, Configuración → Usuarios, auditoría, outbox) integrados; conviene ir **después del Brief 07b** (capas de sueldo y vínculo laboral con instalación), por orden del Núcleo (`ROADMAP.md`, fase 1) · **Reglas:** ADR-015 (Better Auth), ADR-016 (roles), ADR-022 (permisos, alcance y roles personalizados), ADR-033 (principal y portal de la key), ADR-034 (paridad UI↔MCP) · **Diseño:** la matriz de permisos y la ficha de usuario ya existen (Brief 02 C, `export-maestros` 48–54); los cambios de pantalla de este brief **pasan por Claude Design** antes de implementarse (roles personalizados, excepciones por usuario y asignación supervisor ↔ instalación son UI nueva).

> **Encargo de Carlos.** «avanzamos con esto entonves? […] las brechas de paridad con 1.0 (Briefs 07c y 07d)» — Carlos, 26-oct-2026 11:36 CLT, chat con el bot OPAI 2.0 (t303u). Este documento es **solo el brief** (sin código). Lo aprueba Carlos; recién entonces Claude lo ejecuta en la rama `brief/07c-acceso-y-permisos`, con un commit por bloque, el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). **Trae migraciones:** quien abre el PR pone la etiqueta `migracion-pendiente`; Carlos la aplica en Neon `dev` y `main` y la quita.

> **Decisiones de producto abiertas.** Varias piezas de este brief dependen de decisiones que **no toma Claude**: están reunidas en §16 «Decisiones para Carlos», cada una con opciones y una recomendación. Mientras no estén resueltas, el brief queda propuesto y los bloques que dependen de ellas no se ejecutan (se indica en §11). **Actualización: Carlos resolvió las decisiones de §16 el 26-oct-2026 11:57 CLT (chat del bot OPAI 2.0, turno t310u), con «ok a todo» a las recomendaciones; quedan marcadas DECIDIDAS allí.**

---

## 1. Objetivo

Cerrar las tres brechas **Altas** de paridad con 1.0 que faltan en el acceso y los permisos del Núcleo (`docs/2.0/paridad/nucleo.md`), que son criterio de término de la fase 1 (`ROADMAP.md`):

- **B1 · Bloqueo de login persistido.** El contador de intentos fallidos y el bloqueo por cuenta viven en la base, se comparten entre instancias y sobreviven a un reinicio, con registro de cada intento (hoy el límite está en memoria por instancia, se pierde en serverless y no se comparte).
- **B2 · Roles y permisos finos.** Roles personalizados por tenant y permisos finos por módulo y capacidad, al menos tan completos como en 1.0, con la tabla de equivalencia de roles 1.0 → 2.0 para que crear usuarios a mano no dé de más ni quite acceso.
- **B3 · Alcance por filas del supervisor y de los portales (ADR-022).** Asignaciones supervisor ↔ instalación y filtro en las consultas de las capacidades (UI, API y MCP), nunca en la UI; el supervisor solo ve las cuentas, instalaciones y personas de las instalaciones a su cargo.

Se nota que funciona cuando: el bloqueo de un intento de fuerza bruta sobrevive a un reinicio y se aplica igual en dos instancias; un owner crea un rol con permisos elegidos por módulo y capacidad, y cada rol de 1.0 tiene su equivalente sin dar más permisos ni quitar acceso; y un supervisor solo ve, por UI, API y MCP, las cuentas, instalaciones y personas de las instalaciones a su cargo (criterio de aceptación de `ROADMAP.md`, fila 07c).

## 2. Estado actual del repo (verificado el 26-oct-2026 sobre `main` `7e526eb`)

### 2.1 Login y límite de intentos (B1)

1. **Dos límites, ambos en memoria por instancia.**
   - El contador de **intentos fallidos** que hace cumplir «tras 5 intentos pausaremos el acceso 15 min» vive en la Server Action de login `apps/web/app/_acciones/auth.ts` (`accionEntrar`, líneas 19-21 y 55-62): solo cuenta fallos de credenciales (5 por correo, 30 por IP), limpia con un login correcto y se apoya en `apps/web/lib/rate-limit.ts` (un `Map` en memoria de la instancia). No persiste, no se comparte entre instancias y **solo corre cuando el login entra por la Server Action**: un POST directo a `/api/auth/[...all]/sign-in/email` no pasa por ese contador.
   - Además `packages/auth/src/auth.ts` configura el `rateLimit` de Better Auth (`enabled` solo en producción, ventana 60 s, `max` 100, y la regla `"/sign-in/email": { window: 15*60, max: 5 }`), que cuenta **todas** las peticiones (no solo los fallos) y es la única barrera del endpoint directo `/api/auth/[...all]`; también en memoria de la instancia.
   - Los dos se pierden en serverless entre invocaciones y no se comparten entre instancias (deuda registrada en `ESTADO.md`: «Rate limit de `/api/auth` y `/api/mcp` en memoria por instancia»). B1 engancha el bloqueo persistido por cuenta en la capa `@opai/auth` (§4.1), que cubre **ambos** caminos (Server Action y endpoint directo), y deja los dos límites de memoria como primera barrera barata.
2. **Bloqueo por cuenta.** `packages/auth/src/acceso.ts` (`bloqueoDeIngreso(userId)`), invocado en el hook `databaseHooks.session.create.before` de `auth.ts`, bloquea el ingreso si todas las membresías del usuario están `suspendida` o el tenant está `suspendido` (devuelve `{ tenant, administrador, tenantSuspendido }`); el motivo se muestra solo tras validar la contraseña. Esto es **suspensión administrativa**, no protección contra fuerza bruta.
3. **Sin persistencia ni auditoría de intentos.** No hay en Prisma (`packages/db/prisma/schema/`) ningún campo `failed_login_count` / `locked_until` ni tabla de intentos de login. `core.audit_events` registra escrituras de capacidades (actor, vía, entidad), no intentos de login fallidos. En 1.0 esto existe: `failedLoginCount`/`lockedUntil`, `LoginAttempt`, `src/lib/rate-limit.ts` y `src/lib/login-audit/policy.ts` (ver `paridad/nucleo.md` B1).

### 2.2 Roles y permisos (B2)

4. **Cinco roles fijos, cableados en el dominio.** `packages/domain/src/permisos.ts`: `ROLES = ["owner","admin","gerente","supervisor","viewer"]` y `PATRONES_POR_ROL` (permitir/denegar con comodín `*`, denegar siempre gana). Funciones puras `coincide`, `tienePermiso(rol, permiso)`, `tienePermisoPlataforma`, `permisosDe(rol, catalogo, modulosActivos)`, `puedeAsignarRol(asignador, rol)`. El bloqueo financiero (`FINANCIERO = ["finanzas:*","nomina:*"]`) se aplica a gerente, supervisor y viewer.
5. **Catálogo de permisos.** `packages/domain/src/permisos-catalogo.ts` (`PERMISOS_CORE`, `PERMISOS_PLATAFORMA`) con el formato `<modulo>:<accion>`. Cada módulo declara sus permisos en el manifest (`defineModule`).
6. **El rol vive en la membresía.** `packages/db/prisma/schema/tenancy.prisma` `Membership.rol` es un `String` con `owner|admin|gerente|supervisor|viewer` (ADR-016) y `Membership.portales String[]`. **No hay** modelo `Role`, `RoleTemplate`, `CustomRole` ni tabla de permisos por rol o excepciones por usuario. La autorización se resuelve solo desde el rol fijo (`contexto.ts` `autorizador`).
7. **Decidido pero sin construir.** ADR-022 ya describe el modelo objetivo (permisos vs. alcance, roles personalizados como conjunto de permisos sobre el catálogo, excepciones por usuario, matriz módulo × acción en Configuración → Usuarios y permisos) y su nota del 26-oct-2026 manda esto al Brief 07c. 1.0 tiene 7 roles activos, 9 legacy, `RoleTemplate` por tenant con niveles none/view/edit/full y ~70 capacidades finas (`paridad/nucleo.md` B2 y `linea-base-1.0.md`).

### 2.3 Alcance por filas (B3)

8. **El contexto ya distingue principal y portal.** `packages/capabilities/src/contexto.ts` (`ParametrosContexto` y `crearContexto`) lleva `portal`, `principal` (ADR-033) y `agente`; `autorizacion.ts` aplica `PORTAL_DEL_PRINCIPAL` para acotar por portal del principal de la key. **No hay** alcance por filas: una vez pasado el permiso, el supervisor lee todo el tenant.
9. **Sin asignaciones ni filtros de alcance.** No existe modelo supervisor ↔ instalación ni cliente ↔ instalación en el schema. El vínculo **trabajador ↔ persona sí existe**: `Persona.usuarioId` (`packages/db/prisma/schema/maestros.prisma:205-206`) y la capacidad `core.personas.vincular_usuario` (`packages/capabilities/src/core/maestros/personas-estado.ts:87`, valida que el usuario tenga membresía activa y 1:1 por persona). B3 **reutiliza ese vínculo** para derivar la persona propia de un usuario (alcance del portal Trabajador en su fase); no crea un modelo nuevo. Las capacidades de maestros (`packages/capabilities/src/core/maestros/*`: cuentas, instalaciones, personas, vínculos) no filtran por alcance. El Brief 02 lo dejó explícitamente fuera: «Alcance de datos por supervisor/cliente/trabajador (ADR-022): fase 3, con las asignaciones de Operaciones; aquí las capacidades declaran `portales` y el `Contexto` lleva `principal`» (`BRIEF-02` §3). El portal Supervisor existe como route group (`apps/web/app/(supervisor)`) y tiene pantallas (Brief 02 C, `export-maestros` 55/56), pero sin filtro de alcance.
10. **ADR-022** movió B3 del Brief 12 al 07c (nota del 26-oct-2026): «El alcance del supervisor por instalación y de los portales (brecha B3) también va en el Brief 07c […] y es condición para cerrar el Núcleo».

## 3. Alcance

### Incluido

- **B1:** bloqueo de login por cuenta persistido en la base (contador de fallidos y `locked_until`), compartido entre instancias, con registro de cada intento (éxito y fallo) sin datos personales; integrado con el login por Server Actions de `@opai/auth`.
- **B2:** modelo de roles personalizados por tenant y excepciones por usuario sobre el catálogo de permisos del Núcleo y de los módulos; resolución de permisos efectivos en `@opai/domain` (manteniendo denegar-gana y el bloqueo financiero salvo que §16 decida lo contrario); Configuración → Usuarios y permisos con la matriz módulo × acción; tabla de equivalencia de roles 1.0 → 2.0 documentada y, si Carlos lo aprueba, roles base sembrados.
- **B3:** modelo de asignación supervisor ↔ instalación en el Núcleo; resolución de alcance en el contexto y filtro obligatorio en las capacidades de cuentas, instalaciones y personas (y las que listan por esas entidades), aplicado por igual en UI, API y MCP; pantalla para asignar instalaciones a un supervisor.
- Capacidades nuevas con paridad MCP, auditoría, `dryRun` e `idempotencyKey`; tests de dominio, de capacidades (incl. `*-db.test.ts`) y de base (`pnpm test:db`) y gate de paridad en verde.

### Excluido (otros briefs o backlog)

- **Ley 21.719 (B4):** Brief 07d (DPA, DPO, consentimiento, ARCO), con fecha límite 30-nov-2026.
- **B5 · política de seguridad configurable por tenant** (MFA, expiración e historial de contraseñas, inactividad, PIN del guardia): prioridad Media, no entra aquí. Este brief fija el bloqueo de login con valores por defecto sensatos (§16.3); hacerlos configurables por tenant queda para B5.
- **B6 impersonación de soporte, B7 ciclo de vida comercial, B8 contexto de red en la auditoría, B9 grupos de usuarios**: prioridad Media, fuera de la fase 1 (B8 solo se roza: el registro de intentos de login sí guarda IP y user agent del intento, ver §9).
- **Alcance de los portales Cliente, Trabajador y Terreno** más allá de lo que el Núcleo puede expresar hoy: se construye con su fase (3). Este brief deja el **mecanismo** de alcance y lo aplica al **supervisor**; para cliente y trabajador deja el criterio preparado en el contexto (ya hay `principal` por ADR-033) y se completa cuando existan esos portales y sus datos (ver §16.4).
- Roles legacy y permisos deprecados de 1.0 (`paridad/nucleo.md` N1): no se recrean; se resuelven con la tabla de equivalencia (§16.1).

## 4. Arquitectura

### 4.1 B1 · Bloqueo de login persistido

- **Fuente de verdad en la base.** Una tabla del núcleo (`core`) guarda, por identidad, el contador de fallidos consecutivos y la marca `locked_until`; y una tabla append-only registra cada intento (resultado, motivo, correo en hash, IP y user agent). El rate limit por memoria de Better Auth se mantiene como primera barrera barata; el bloqueo **efectivo** lo decide la base, así que es igual en dos instancias y sobrevive a un reinicio.
- **Punto de enganche.** El login pasa por Server Actions de `@opai/auth` (ADR-037; sin cliente de auth en el navegador). Antes de validar la credencial se consulta el estado de bloqueo; el resultado (éxito o fallo, con su motivo) actualiza el contador y escribe el intento. Un login correcto limpia el contador. El enganche va en la capa `@opai/auth` (hook de Better Auth sobre `sign-in`, no solo en la Server Action `accionEntrar`), para que el bloqueo persistido cubra también un POST directo a `/api/auth/[...all]` y no sea evitable saltándose la UI (ver §2.1). El bloqueo convive con `bloqueoDeIngreso` (suspensión administrativa) sin reemplazarlo.
- **Sin RLS por tenant.** La identidad (`users`) es global y sin `tenant_id` (ADR-015); el estado de bloqueo y los intentos cuelgan de la identidad, no del tenant, igual que `users`/`sessions`. Van en `core` sin RLS (como `users`), y el acceso queda acotado a `@opai/auth` (como `clienteAuth()`), nunca a módulos ni a `apps/web`.
- **Sin datos personales en claro** (Ley 21.719, `AGENTS.md`): el correo del intento se guarda en hash (igual que 1.0); nunca RUT ni PIN. IP y user agent se guardan para la auditoría de acceso (B8), con la retención que fije B4/B5.

### 4.2 B2 · Roles personalizados y permisos finos

- **El catálogo manda.** El conjunto de permisos asignables es el que ya generan el Núcleo y los manifests (`PERMISOS_CORE`, `PERMISOS_PLATAFORMA` y los permisos `<id>:<accion>` de cada módulo). Un rol personalizado es un **subconjunto de ese catálogo**; no inventa permisos nuevos.
- **Modelo por tenant.** Un rol personalizado vive en el tenant (RLS) y agrupa permisos del catálogo. La membresía referencia un rol: hoy `Membership.rol` es un `String` con uno de los cinco roles base; pasa a poder referenciar también un rol del tenant (ver §6, con dos opciones en §16.2 sobre cómo se guarda). Los **cinco roles base se mantienen** (ADR-016) como roles del sistema, no editables; los personalizados los crea el owner (o quien §16.2 decida).
- **Excepciones por usuario.** Además del rol, un usuario puede tener permisos concedidos o denegados puntualmente (ADR-022). Denegar siempre gana (como hoy en `tienePermiso`).
- **Resolución pura en el dominio.** `@opai/domain` gana una función que calcula los permisos efectivos a partir de: patrones del rol base **o** conjunto de permisos del rol personalizado, más las excepciones del usuario, acotado a módulos activos. `tienePermiso`/`permisosDe` se amplían o se envuelven sin romper las firmas actuales; el bloqueo financiero sigue aplicándose a menos que §16.2 lo abra. El `autorizador` de `contexto.ts` pasa a usar la resolución efectiva (rol del sistema o del tenant + excepciones) en vez de solo el rol fijo.
- **`platform:*` no cambia.** Los permisos de plataforma siguen saliendo solo de `platformRole` (`contexto.ts` `autorizador`), nunca de un rol del tenant, ni siquiera personalizado.
- **Equivalencia 1.0 → 2.0.** Como los usuarios no se migran (Carlos los crea a mano, `ESTADO.md` decisión 1), la tabla de equivalencia es la **guía de alta**: a qué rol de 2.0 (base o personalizado por sembrar) corresponde cada rol de 1.0, sin dar de más ni quitar acceso. La define Carlos (§16.1); el brief la deja documentada y, si se aprueba, siembra los roles base del catálogo (solo `dev` como los demás seeds; en los tenants reales los crea quien corresponda).

### 4.3 B3 · Alcance por filas (ADR-022)

- **Dos dimensiones separadas.** Permiso = qué acción (`<modulo>:<accion>`); alcance = sobre qué filas. El alcance se aplica **en la consulta de la capacidad**, nunca en la UI (ADR-022, regla de `REGLAS-codigo.md`).
- **Asignación supervisor ↔ instalación en el Núcleo.** Una tabla del tenant vincula una persona/usuario supervisor con las instalaciones a su cargo. Se construye en el Núcleo (no espera a Operaciones) porque B3 es criterio de cierre de la fase 1; la ubicación exacta (schema `core` vs. futuro `ops`) se decide en §16.4. El alcance se resuelve desde el contexto: para un usuario cuyo rol tiene alcance acotado (supervisor), el conjunto de instalaciones a su cargo entra al contexto y las capacidades lo usan como filtro obligatorio.
- **Capacidades afectadas.** Las de maestros que listan o leen cuentas, instalaciones y personas (`core.cuentas.*`, `core.instalaciones.*`, `core.personas.*`, `core.buscar`, `core.actividad.list`, `core.resumen.contadores`, `core.inicio.pendientes`, `core.documentos.*` por entidad) aplican el filtro cuando el actor tiene alcance acotado. Owner, admin y gerente ven todo el tenant (no tienen alcance acotado); supervisor ve solo lo suyo. El filtro es el mismo por UI, API y MCP, porque es una sola capacidad (ADR-004, ADR-034).
- **Agentes.** Una key hereda permisos y alcance del usuario responsable (ADR-033): una key cuyo principal es un supervisor ve lo mismo que el supervisor. El contexto ya lleva `principal` y `portal`; aquí se suma el alcance.
- **Preparado para cliente y trabajador.** El mecanismo es general (un criterio de alcance por actor); este brief solo implementa el del supervisor. Cliente ↔ instalación y trabajador ↔ persona se completan con sus portales (fase 3), reusando el mismo mecanismo. El vínculo trabajador ↔ persona **ya existe** (`Persona.usuarioId`, `core.personas.vincular_usuario`): el alcance del portal Trabajador lo reutilizará en su fase, sin modelo nuevo.

## 5. Archivos (previstos)

- `packages/db/prisma/schema/` → B1: estado de bloqueo e intentos de login (en `core`, sin RLS, como `users`). B2: roles del tenant, permisos por rol y excepciones por usuario (con RLS `tenant_isolation`). B3: asignación supervisor ↔ instalación (con RLS). Migración(es) aditiva(s) con RLS y grants donde corresponda.
- `packages/auth/src/` → B1: lectura y actualización del bloqueo y escritura del intento en el flujo de login (Server Actions); `acceso.ts` sin cambiar su contrato de suspensión.
- `packages/domain/src/permisos.ts` (y auxiliares nuevos ≤ 150 líneas) → B2: resolución de permisos efectivos (rol base o personalizado + excepciones), sin romper `tienePermiso`/`permisosDe`/`puedeAsignarRol`.
- `packages/capabilities/src/contexto.ts` y `autorizacion.ts` → B2: autorizador con permisos efectivos. B3: alcance en el contexto y helper de filtro por alcance.
- `packages/capabilities/src/core/` → B2: capacidades de roles y excepciones (`core.roles.*`, `core.usuarios.permisos.*` o el nombre que fije el registro). B3: filtro de alcance en las capacidades de maestros y agregados.
- `apps/web/app/(erp)/configuracion/usuarios/*` → B2: matriz módulo × acción, crear/editar roles, excepciones por usuario. B3: asignar instalaciones a un supervisor (en Usuarios o en la ficha de la instalación, según diseño).
- `apps/web/app/(supervisor)/*` → B3: usa las capacidades con alcance; sin lógica de filtro en la UI.
- Tests: `packages/domain/test/*`, `packages/capabilities/test/*` (incl. `*-db.test.ts`), `packages/db/test/*` (RLS de las tablas nuevas), Playwright del portal supervisor y de Configuración.
- `docs/2.0/paridad/nucleo.md` (B1–B3 marcadas en progreso o cerradas al integrar), `docs/2.0/ESTADO.md`, `docs/2.0/ROADMAP.md`, `docs/2.0/agentes/operar-el-nucleo.md` si cambian las herramientas.

## 6. Modelo de datos y migraciones

**Trae migraciones (aditivas).** Resumen de lo que se agrega; el detalle fino (nombres de columnas, índices, la decisión de `Membership.rol` string vs. FK) se fija al implementar y según §16.

- **B1 (en `core`, sin RLS, acceso solo desde `@opai/auth`):**
  - Estado de bloqueo por identidad: contador de fallidos consecutivos, marca `locked_until`, último intento. Puede ir como columnas en una tabla ligada a `users` o como tabla aparte (1:1 con la identidad).
  - Intentos de login (append-only): resultado, motivo, correo en hash, IP, user agent, timestamp. Sin RLS (la identidad es global); sin datos personales en claro.
- **B2 (en el tenant, con RLS `tenant_isolation` y las columnas obligatorias `tenant_id`, `created_at`, `updated_at`, uuid v7, `@@schema`):**
  - Rol del tenant (nombre, descripción, si es de sistema o personalizado) y sus permisos (lista de patrones/permisos del catálogo).
  - Excepciones por usuario (permisos concedidos o denegados puntuales) ligadas a la membresía.
  - `Membership.rol`: se mantiene o se complementa con una referencia al rol del tenant (§16.2).
- **B3 (en el tenant, con RLS):**
  - Asignación supervisor ↔ instalación (membresía/persona supervisor × instalación). Ubicación de schema en §16.4.

Toda tabla con `tenant_id` lleva `ENABLE ROW LEVEL SECURITY` y la política `tenant_isolation` para `opai_app` (plantilla de `REGLAS-codigo.md`); CI falla si falta (`packages/db/test/rls-nucleo*.test.ts`). Las referencias entre tablas se validan del mismo tenant (trigger `core.verificar_mismo_tenant`, como en el Brief 02).

## 7. Capacidades

- **B2:** capacidades para listar el catálogo de permisos (agrupado por módulo y acción), crear/editar/archivar roles del tenant, asignar un rol a una membresía y fijar excepciones por usuario. Toda escritura es capacidad con `dryRun`, `idempotencyKey` y auditoría; lo que gobierna permisos y accesos lleva `soloPersonas: true` (ADR-034: un agente no se concede permisos). Un rol personalizado no puede otorgar más que lo que el actor que lo crea ya puede otorgar (análogo a `puedeAsignarRol`: nadie eleva permisos por encima de los suyos).
- **B3:** capacidades para asignar y quitar instalaciones a un supervisor (con `dryRun`, idempotencia, auditoría; `soloPersonas` por ser gobierno de acceso). Las capacidades de lectura existentes **no** agregan herramientas nuevas: solo cambian su consulta interna para respetar el alcance.
- **B1:** no expone capacidades de negocio nuevas; es parte del flujo de `@opai/auth`. El estado de bloqueo de una cuenta puede consultarse desde Plataforma/soporte si Carlos lo pide (fuera de alcance salvo decisión).
- **Paridad (ADR-034, `REGLAS-codigo.md`):** toda capacidad `core.*` nueva no interna ni solo-personas produce herramienta MCP; las `soloPersonas` se declaran en `paridad-excepciones.ts` con motivo. El brief cierra con `tools/list` en `main`, el snapshot `herramientas-mcp.txt` actualizado y el gate de paridad en verde. Tras desplegar, `OPAI_MCP_KEY=<key> pnpm mcp:verificar` (Carlos).

## 8. Interfaz y responsive

- **Configuración → Usuarios y permisos** (ADR-018, ADR-022): la matriz módulo × acción ya existe (Brief 02 C); se amplía a crear/editar roles del tenant, ver «qué puede hacer este usuario» y fijar excepciones. Las pantallas nuevas pasan por Claude Design antes de implementarse.
- **Asignar instalaciones a un supervisor:** en Usuarios y permisos o en la ficha de la instalación (a definir en el diseño); con buscador de instalaciones y estado vacío.
- **Portal Supervisor:** sin cambios de lógica en la UI; solo consume capacidades ya filtradas por alcance (la UI nunca filtra, ADR-022).
- **Login:** cuando el bloqueo por fuerza bruta está activo, el mensaje es genérico y no revela si el correo existe (como hoy el motivo de suspensión solo se muestra tras validar la contraseña). Respeta el diseño de acceso aprobado (`export-acceso`).
- Reglas de UI de `REGLAS-codigo.md`: solo tokens y componentes de `@opai/ds`, foco visible, estados loading/vacío/error/sin permisos, 375/1024/1280, contraste AA, touch ≥ 44 px, presupuesto de JS por ruta (ADR-037).

## 9. Seguridad y tenant

- **Multi-tenant (no negociable, `AGENTS.md`):** las tablas B2 y B3 llevan `tenant_id`, RLS y política `tenant_isolation`; el tenant sale de la sesión o la key, nunca del body; las referencias se validan del mismo tenant. B1 cuelga de la identidad global (`users`), sin RLS, con acceso acotado a `@opai/auth`.
- **La navegación y la UI nunca son la barrera:** el permiso y el alcance se verifican siempre en la capacidad (ADR-022). El menú solo oculta; la consulta filtra.
- **Alcance aplicado en UI, API y MCP** por ser la misma capacidad (ADR-004, ADR-034). Una key de supervisor no puede leer, por MCP ni API, instalaciones fuera de su cargo.
- **Sin escalada de permisos:** un rol personalizado o una excepción no puede conceder más de lo que el actor que la crea puede conceder; `platform:*` jamás por rol de tenant.
- **Datos personales (Ley 21.719):** el registro de intentos de login no guarda correo en claro (hash), ni RUT ni PIN; IP y user agent con la retención que fije B4/B5. No se copian datos personales a Linear ni a los PR (`AGENTS.md`).
- **Auditoría:** las escrituras de roles, excepciones y asignaciones quedan en `core.audit_events` con actor y vía (incluido `via_user_id` de la key). El bloqueo/limpieza de login queda en la tabla de intentos.

## 10. Casos límite

- **B1:** reinicio de la instancia o cambio de instancia en mitad de un ataque: el bloqueo persiste porque vive en la base. Login correcto antes de alcanzar el umbral: limpia el contador. Usuario sin membresías o de plataforma: el flujo de bloqueo por fuerza bruta aplica igual; la suspensión administrativa (`bloqueoDeIngreso`) es independiente. Recuperación de contraseña y Google: definir si cuentan para el contador (recomendado: el contador es por intento de contraseña fallido, como 1.0).
- **B2:** rol personalizado que queda sin permisos (vacío): válido, no da acceso. Rol asignado a una membresía y luego archivado: la membresía cae al comportamiento que defina §16.2 (recomendado: no se puede archivar un rol en uso; primero se reasigna). Excepción que deniega un permiso que el rol concede: denegar gana. Módulo apagado: sus permisos no aplican aunque el rol los liste (`permisosDe` ya acota por módulos activos). Último owner: protegido como hoy (`quedanOtrosOwners`); no se le puede quitar el rol owner ni cambiarlo por uno sin ese alcance.
- **B3:** supervisor sin instalaciones asignadas: ve una lista vacía, no todo el tenant (el filtro por defecto es «ninguna», no «todas»). Instalación reasignada: el supervisor anterior deja de verla al instante (filtro en la consulta). Owner/admin/gerente: sin alcance acotado, ven todo. Agente con key de supervisor: mismo alcance que el supervisor. Una persona que está en varias instalaciones a cargo de distintos supervisores: cada supervisor la ve por la instalación que le corresponde (el alcance de personas se deriva del alcance de instalaciones, a precisar en §16.4).

## 11. Plan por bloques (un commit por bloque)

Conviene **tres PR**, uno por brecha, para revisar y mergear por partes (cada PR lleva su encargo y su tarea de Linear, `AGENTS.md`). Orden sugerido: B1 (independiente) → B2 (base de permisos) → B3 (usa el contexto y reusa la matriz). Si Carlos prefiere un solo PR, se hace en bloques dentro de uno.

**PR 1 — B1 · Bloqueo de login persistido** *(no depende de §16.1/§16.2/§16.4; depende de §16.3).*
- Bloque 1 · `core:` migración del estado de bloqueo e intentos de login (en `core`, sin RLS); RLS de CI no aplica (tabla sin `tenant_id`, como `users`) pero el test de RLS comprueba que no quede una tabla con `tenant_id` sin política.
- Bloque 2 · `core:` lectura/actualización del bloqueo y registro del intento en las Server Actions de `@opai/auth`; límite compartido; tests de base (dos «instancias» contra la misma base) y de dominio del cálculo de umbral/espera.

**PR 2 — B2 · Roles personalizados y permisos finos** *(depende de §16.1 y §16.2).*
- Bloque 3 · `core:` migración de roles del tenant, permisos por rol y excepciones por usuario (RLS).
- Bloque 4 · `domain:` resolución de permisos efectivos (rol base o personalizado + excepciones, denegar-gana, módulos activos), sin romper las firmas actuales; tests.
- Bloque 5 · `core:` `autorizador` con permisos efectivos; capacidades `core.roles.*` y de excepciones (`soloPersonas`), con paridad MCP, auditoría, `dryRun` e idempotencia; snapshot y gate de paridad.
- Bloque 6 · `core:`/`ds:` Configuración → Usuarios y permisos (matriz, crear/editar roles, excepciones), tras diseño aprobado; equivalencia 1.0 → 2.0 documentada y seed de roles base si Carlos lo aprueba.

**PR 3 — B3 · Alcance del supervisor** *(depende de §16.4; conviene después del 07b por el vínculo laboral con instalación).*
- Bloque 7 · `core:` migración de la asignación supervisor ↔ instalación (RLS).
- Bloque 8 · `core:` alcance en el contexto y filtro obligatorio en las capacidades de cuentas, instalaciones, personas y agregados; capacidades de asignación (`soloPersonas`); paridad.
- Bloque 9 · `core:`/`ds:` pantalla de asignación (tras diseño) y verificación del portal Supervisor con alcance.
- Bloque 10 · `docs:` `paridad/nucleo.md`, `ESTADO.md`, `ROADMAP.md`, manual de agentes si cambió, y reporte.

## 12. Tests

- **Dominio:** resolución de permisos efectivos (rol base, rol personalizado, excepción que concede, excepción que deniega con denegar-gana, módulo apagado, bloqueo financiero); cálculo del umbral y la espera del bloqueo de login.
- **Capacidades (contexto falso y `*-db.test.ts` con `opai_app` sin BYPASSRLS):** autorización por rol personalizado y excepciones; `soloPersonas` rechaza a agentes en roles/excepciones/asignaciones; el filtro de alcance del supervisor en cuentas/instalaciones/personas (ve solo lo asignado; owner/admin ven todo); auditoría de las escrituras; `dryRun` no persiste; idempotencia no duplica.
- **Base (`pnpm test:db`):** RLS de las tablas nuevas de B2 y B3 (aislamiento por tenant; un usuario/tenant no lee ni escribe las del otro); persistencia del bloqueo B1 compartido entre dos conexiones.
- **Acceso directo (B1):** una prueba que ejerce el endpoint `/api/auth/[...all]/sign-in/email` **directamente** (sin pasar por la Server Action `accionEntrar` ni por su contador en memoria de `lib/rate-limit.ts`) y comprueba que el bloqueo persistido por cuenta igual aplica y registra el intento; así el límite no se evita saltándose la UI (ver §2.1 y §4.1).
- **Paridad (ADR-034):** toda capacidad nueva no interna ni solo-personas produce herramienta; snapshot `herramientas-mcp.txt` actualizado; `apps/web` sin imports de `@opai/db` salvo `paridad-permitidos.json`.
- **e2e (375, 1024, 1280):** matriz de permisos y creación de un rol; un supervisor ve solo sus instalaciones en el portal; bloqueo de login tras N fallos.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` antes de cada commit; `pnpm test:db` por tocar base, RLS y capacidades con base; `pnpm --filter @opai/web build` + `pnpm presupuesto` por tocar la web; Playwright local a 375/1024/1280; capturas a 375 y 1280 de las pantallas nuevas; `docs/2.0/checklists/revision.md`, `qa.md` y `paridad.md`. `tools/list` en `main` y, tras desplegar, `pnpm mcp:verificar` (Carlos).

## 14. Criterios de aceptación

- **CA-B1.** El bloqueo por fuerza bruta sobrevive a un reinicio y se aplica igual en dos instancias; cada intento (éxito y fallo) queda registrado sin datos personales en claro; un login correcto limpia el contador. *(Criterio de `ROADMAP.md` 07c.)*
- **CA-B2.** Un owner crea un rol con permisos elegidos por módulo y capacidad y lo asigna a un usuario; las excepciones por usuario funcionan con denegar-gana; `platform:*` nunca se obtiene por un rol de tenant; nadie concede más permisos de los que tiene; y cada rol de 1.0 tiene su equivalente documentado sin dar de más ni quitar acceso. *(Criterio de `ROADMAP.md` 07c.)*
- **CA-B3.** Un supervisor solo ve, por UI, API y MCP, las cuentas, instalaciones y personas de las instalaciones a su cargo; owner, admin y gerente ven todo el tenant; una key de supervisor hereda ese alcance; el filtro está en la consulta, nunca en la UI. *(Criterio de `ROADMAP.md` 07c.)*
- **CA-paridad.** Gate de paridad y presupuesto de JS en verde; `tools/list` en `main` sin capacidades de pantalla sin herramienta.

## 15. Riesgos y rollback

- **Better Auth y el límite en memoria:** Better Auth trae su propio `rateLimit` en memoria. B1 no lo quita; agrega la barrera persistente por cuenta por encima. Riesgo: duplicar lógica; mitigación: el bloqueo efectivo lo decide la base y el de memoria queda como defensa barata de primer nivel.
- **Cambio en la autorización (B2):** tocar el `autorizador` afecta a todas las capacidades. Mitigación: la resolución efectiva se comporta igual que hoy para los cinco roles base sin roles personalizados ni excepciones (tests que lo fijan); los roles personalizados solo amplían.
- **Alcance (B3) y rendimiento:** el filtro por instalaciones a cargo agrega una condición (y quizás una consulta de asignaciones) a varias lecturas; medir contra ADR-045 (≤ 8 consultas por navegación) y resolver las instalaciones a cargo una vez por contexto.
- **Dependencia de decisiones:** sin §16 resuelto, PR 2 y PR 3 no se ejecutan; PR 1 puede avanzar salvo los umbrales (§16.3).
- **Migraciones:** las aplica Carlos en Neon `dev` y `main`; el PR lleva `migracion-pendiente`.
- **Rollback:** B1 y B3 se revierten con el PR y la migración inversa (las tablas nuevas quedan huérfanas sin efecto si se deja la reversión de código). B2 es más delicado: al revertir, las membresías con rol personalizado deben volver a un rol base; por eso el seed de equivalencia y mantener los cinco roles base siempre disponibles.

## 16. Decisiones para Carlos

Ninguna la decide Claude. Cada una trae opciones y una recomendación. **Todas quedaron DECIDIDAS por Carlos: casi todas el 26-oct-2026 11:57 CLT (chat del bot OPAI 2.0, turno t310u), que respondió «ok a todo» a las recomendaciones, y la de §16.2 sobre conceder finanzas y nómina a otros roles el 26-oct-2026 12:28 CLT (t320u), que respondió «ok a las dos»; cada decisión se marca abajo.**

### 16.1 Equivalencia de roles 1.0 → 2.0 (B2)

1.0 tiene 7 roles activos (owner, admin, editor, jefe_operaciones, central_monitoreo, supervisor, viewer) y 9 legacy (rrhh, operaciones, finanzas, reclutamiento, solo_ops/crm/documentos/payroll, inspector_dt) (`paridad/nucleo.md` B2, pregunta abierta 1). 2.0 tiene 5 roles base. Como los usuarios no se migran (los crea Carlos a mano), la equivalencia es la guía de alta.
- **Opción A — mapear cada rol 1.0 a un rol base de 2.0** (p. ej. jefe_operaciones → gerente, central_monitoreo → supervisor o viewer, editor → gerente o admin, inspector_dt → un viewer con acceso DT). Simple, pero puede dar de más o de menos en casos como central_monitoreo.
- **Opción B — definir 2–3 roles personalizados base** (p. ej. «Central de monitoreo», «Inspector DT») sobre el catálogo, además de los cinco base, y mapear ahí los roles 1.0 que no calzan.
- **Recomendación:** **B**. Mapear lo que calza a los roles base y crear los pocos roles personalizados que 1.0 tenía y 2.0 no cubre, para no dar de más (criterio de aceptación «sin dar más permisos ni quitar acceso»). Claude propone la tabla concreta cuando Carlos confirme el enfoque. Los legacy (N1) no se recrean.
- **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** Opción B. Los roles de 1.0 se mapean a los cinco roles base; se crean 2 o 3 roles personalizados (Central de monitoreo, Inspector DT) para lo que no calza; los legacy no se recrean. Claude propone la tabla concreta 1.0 → 2.0 al implementar.

### 16.2 Alcance y gobierno de los roles personalizados (B2)

- **¿Quién crea y edita roles del tenant?** Opción A: solo owner. Opción B: owner y admin. **Recomendación: B** (admin «hace todo salvo borrar el tenant y gestionar owners», ADR-016), con la regla de que nadie concede permisos por encima de los suyos.
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** Opción B. Solo owner y admin crean y editan roles del tenant; nadie concede un permiso que no tiene.
- **¿Un rol personalizado puede incluir permisos financieros (`finanzas:*`, `nomina:*`)?** Hoy el bloqueo financiero (ADR-016) deja finanzas y nómina solo a owner y admin. Opción A: mantener el bloqueo también para roles personalizados (nadie salvo owner/admin ve finanzas, aunque el rol lo liste). Opción B: permitir que un rol personalizado incluya finanzas si lo concede un owner/admin. **Recomendación: A** por defecto (conserva el principio de 1.0 `applyFinancialRoleLock`), y pasar a B solo si Carlos lo pide explícitamente para un tenant.
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u; confirmado 26-oct-2026 12:28 CLT, t320u):** finanzas y nómina **nacen bloqueadas** en los roles personalizados (se conserva el principio de 1.0 `applyFinancialRoleLock`), y el **owner o el admin pueden concederlas explícitamente a cualquier rol**, siempre dentro de la regla de no conceder más permisos de los propios. En t310u Carlos dejó abierta la pregunta; cita literal y completa: «ok a todo pero lo de finanzas igual se le puede dar permisos a otros roles o no?» (t310u). El bot la reformuló (t319s1656): «¿Confirmas que el owner o el admin pueden dar finanzas y nómina a cualquier rol, aunque nazcan bloqueadas?», y Carlos la cerró con «ok a las dos» (t320u).
- **¿Cómo se guarda el rol en la membresía?** Opción A: `Membership.rol` sigue siendo string y se agrega una referencia opcional a un rol del tenant (null = rol base). Opción B: un solo campo que apunta siempre a una fila de roles (los cinco base viven como filas de sistema por tenant, sembradas). **Recomendación: A** (aditiva, menos riesgo, no reescribe las membresías existentes).
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** Opción A. `Membership.rol` sigue como string, con una referencia opcional al rol del tenant (null = rol base); no se reescriben los usuarios existentes.

### 16.3 Umbrales del bloqueo de login (B1)

1.0 usa bloqueo por cuenta con `failedLoginCount`/`lockedUntil` y rate limit por IP+correo. 2.0 hoy: 5 intentos / 15 min en memoria.
- **Opción A — fijos en código** con valores sensatos (p. ej. bloqueo de la cuenta tras N fallos consecutivos durante M minutos, más el rate limit por IP+correo), iguales para todos los tenants.
- **Opción B — configurables por tenant** desde ya (adelantando parte de B5).
- **Recomendación: A**, con los mismos valores que 1.0 para no cambiar el comportamiento percibido; dejar configurables por tenant cuando se haga B5 (política de seguridad), que es prioridad Media y está fuera de este brief. Claude propone los números exactos al implementar, para que Carlos los confirme.
- **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** Opción A. Umbrales del bloqueo **fijos en código**, iguales a los de 1.0; configurables por tenant más adelante (B5). Claude propone los números exactos al implementar.

### 16.4 Dónde viven las asignaciones de alcance y qué portales cubre ahora (B3)

- **¿En qué schema vive la asignación supervisor ↔ instalación?** Opción A: en `core` (el Núcleo), porque B3 cierra la fase 1 y no debe esperar a Operaciones. Opción B: en el futuro schema `ops`, cuando exista (Brief 11), y mientras tanto no cerrar B3. **Recomendación: A** (el ROADMAP puso B3 como criterio de cierre del Núcleo, así que no puede depender de Operaciones).
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** Opción A. La asignación supervisor ↔ instalación vive en `core` (el Núcleo); no espera a Operaciones.
- **¿El supervisor se vincula por su persona o por su membresía/usuario?** Recomendación: por la **membresía/usuario** (el alcance es de acceso, no de recurso humano), reutilizable para agentes con key de ese usuario (ADR-033).
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** El supervisor **se vincula por su usuario**, reutilizando `Persona.usuarioId` y la membresía; no por su persona. Texto del bot (t309s1625) que Carlos aprobó con «ok a todo» (t310u): «Por ahora solo al supervisor, que se vincula por su usuario y ve a las personas con contrato vigente en sus instalaciones.»
- **¿El alcance de este brief cubre solo al supervisor, o también cliente y trabajador?** **Recomendación:** solo supervisor en 07c (es la brecha Alta y el criterio de cierre); cliente ↔ instalación y trabajador ↔ persona se implementan con sus portales en la fase 3, reusando el mismo mecanismo. Confirmar que basta con el supervisor para cerrar el Núcleo.
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** B3 cubre ahora **solo al supervisor**. Los portales Cliente y Trabajador se suman **cuando se construyan sus portales** (fase 3), reusando el mismo mecanismo; su alcance queda **pendiente para sus briefs**. Por eso **B3 no se cierra entero con este brief**: 07c entrega el mecanismo de alcance y lo aplica al supervisor, que es el criterio Alto de cierre del Núcleo.
- **¿Cómo se deriva el alcance de personas?** Recomendación: una persona es visible para el supervisor si tiene un vínculo laboral vigente con alguna instalación a su cargo (apóyate en el vínculo con instalación del Brief 07b).
  - **DECIDIDO (Carlos, 26-oct-2026 11:57 CLT, t310u):** El alcance son las **personas con vínculo laboral vigente en las instalaciones asignadas** al supervisor (apoyado en el vínculo con instalación del Brief 07b). Texto del bot (t309s1625) que Carlos aprobó con «ok a todo» (t310u): «Por ahora solo al supervisor, que se vincula por su usuario y ve a las personas con contrato vigente en sus instalaciones.»
  - **CA-B3 PARCIAL en el PR 3 (decisión del bot OPAI 2.0, mandato de Carlos t365u y t366u):** el modelo actual **no liga persona con instalación** —`core.vinculos_laborales` es persona↔cargo y la instalación del vínculo la agrega el **Brief 07b**, que va después—, así que el alcance de personas **no se puede derivar todavía**. El bot OPAI 2.0 decide dejar la **negación total**: `dondePersona` y `entidadEnAlcance("persona", …)` deniegan por defecto; el supervisor **no ve ninguna persona** (lista vacía, ficha `NOT_FOUND`, actividad vacía). **Falta** para CA-B3 completo que el Brief 07b agregue `instalacion_id` (o `puesto_id`) al vínculo vigente; recién entonces el helper acota la persona a la instalación de su vínculo. Es una decisión de OPAI 2.0 (bot delegado de Carlos), bajo su mandato t365u/t366u del 26-oct-2026.

## 17. Reporte de ejecución

Al cerrar: commits integrados por PR, capturas a 375 y 1280 de las pantallas nuevas, resultado de los tests y de `pnpm test:db`, estado del gate de paridad y del presupuesto de JS, `tools/list` en `main`, brechas B1–B3 marcadas en `paridad/nucleo.md` y `ESTADO.md`, y resumen ejecutivo para Carlos: qué se hizo, qué cambia para Gard, qué decide él y qué sigue (Brief 07d para cerrar el Núcleo).
