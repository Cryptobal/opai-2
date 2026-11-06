# Auditoría de salud del Núcleo — 6-nov-2026

**Encargo:** Carlos, sesión «Núcleo · Code» · **Issue:** [CAR-225](https://linear.app/carlos-irigoyen/issue/CAR-225) · **Base:** `main` en `d4fc6ac` (#364) · **Alcance:** solo auditoría; este PR no corrige código.

**Método.** El código de `main` manda sobre los documentos. Cuatro revisiones independientes en solo lectura (seguridad y datos; permisos y lecturas auditadas; paridad y núcleo vs módulo; pendientes, tests y rendimiento). Los hallazgos que pesan en el veredicto los verifiqué yo contra el código (marcados **✔**); el resto viene del informe del revisor y se marca como tal.

**Qué no se pudo comprobar (fuera del repositorio o del entorno):** el estado real de las migraciones en Neon `dev` y `main`; si la key `*` de Gard fue revocada (CAR-56); el rol de mantenimiento con BYPASSRLS en Neon (M-26); el historial de CI de GitHub (sin token en la sesión); `pnpm test:db` y los e2e (necesitan Postgres); las subidas de topes de JS (el clon es superficial).

---

## Veredicto

**El aislamiento entre empresas está sano; hay 1 bloqueante por criterio de permisos y 23 hallazgos no bloqueantes del Núcleo.**

| Eje | Resultado | Bloqueantes |
|---|---|---|
| Seguridad y datos | 194 tablas con `tenant_id`: las 194 con RLS, FORCE y una sola política `tenant_isolation`; `opai_app` sin BYPASSRLS; sin secretos en el código; frontera de datos limpia | 0 |
| Permisos, alcance y lecturas auditadas | Todas las capacidades declaran permiso; el alcance se aplica en la consulta; las lecturas sensibles están auditadas y fallan cerradas | **1** (C-01) |
| Paridad agent-first | 0 acciones de pantalla sin capacidad; 12 escrituras del Núcleo sin pantalla; el gate tiene huecos de detección | 0 |
| Núcleo vs módulo | Ningún módulo importa a otro; hay un import cruzado sin dependencia declarada y un ciclo núcleo↔pauta | 0 |
| Pendientes, tests y rendimiento | `pnpm test` en verde (2.974 pasan, 0 fallan); topes de JS dentro de límites; un N+1 y lecturas auditadas duplicadas en fichas | 0 |

**Orden recomendado de PR (por riesgo):** PR-1 (C-01) primero; luego PR-2 a PR-5 de seguridad; después paridad, rendimiento y el PR de pendientes. Detalle en «PR propuestos».

---

## 1. Seguridad y datos

**Verificado (revisor; conteos por cruce de schema Prisma con las 111 migraciones):**
- 194 modelos con `tenant_id` en 13 schemas: 194 con `ENABLE` y `FORCE ROW LEVEL SECURITY` y 194 con exactamente una política `tenant_isolation` (`AS PERMISSIVE FOR ALL TO opai_app`, `USING` y `WITH CHECK`). Variantes legítimas: `audit_events` (también `opai_cron_sii`), `memberships` (+`user_self`) y `dias_calendario` (+`plataforma_lectura`, solo lectura de filas globales).
- El test `packages/db/test/rls-nucleo.test.ts` descubre las tablas por catálogo, en todos los schemas; `rls-dos-empresas.test.ts` siembra dos empresas y prueba SELECT, UPDATE, DELETE e INSERT cruzados. *No se ejecutó aquí* (necesita Postgres): depende del job `test:db` de CI.
- Ningún `GRANT`/`ALTER ROLE` da BYPASSRLS ni superusuario a `opai_app`. Las 18 funciones `SECURITY DEFINER` fijan `search_path`, revocan `EXECUTE` a `PUBLIC` y validan sus parámetros.
- Frontera de datos: sin `dbAdmin()` fuera de scripts, `packages/db` y tests; sin `$queryRaw`/`$executeRaw` en `apps/web`; ninguna capacidad no-`platform` recibe `tenantId` por input.
- Secretos: sin `.env*` versionado ni credenciales reales en el código; el webhook de Resend falla cerrado sin secreto.
- Cerrados desde la auditoría del 28-oct (verificados en código): B-01/CAR-36, I-01/CAR-40, I-02/CAR-41, I-03/CAR-42, I-04/CAR-43, I-06/CAR-45, I-08/CAR-47 (parcial: las 29 migraciones antiguas no se editan), I-09/CAR-48, I-10/CAR-49, I-12/CAR-51, M-36/CAR-44.

### Hallazgos

| Id | Sev. | Hallazgo | Archivo | Propuesta | Issue |
|---|---|---|---|---|---|
| S-03 ✔ | No bloq. (alto) | La sal del HMAC de PINs cae a una constante pública si falta `BETTER_AUTH_SECRET`; esa variable se reutiliza para sesión, firma de planes, rate limit y bloqueo de login | `packages/capabilities/src/idempotencia-sensibles.ts:11` | Fallar cerrado en producción; derivar una clave por propósito (HKDF) | **Propuesto** (Núcleo) |
| S-07 ✔ | No bloq. | El job `secretos` (gitleaks) se omite en PR de solo `*.md`/`docs/**`, justo lo que escriben los agentes; la allowlist de `.gitleaks.toml` es global, sin ámbito de ruta | `.github/workflows/ci.yml:268-273`; `.github/scripts/ci-solo-documentacion.sh` | Correr gitleaks siempre; acotar la allowlist por `paths`. Es un cambio de `.github/workflows`: va como **PR de operación** pedido por Carlos o el bot | **Propuesto** (Plataforma/operación) |
| S-06 | No bloq. (inferido) | Cuatro funciones DEFINER (`seguimiento_resolver_token`, `credenciales_terreno_por_rut`, `dispositivo_emparejar`, `dispositivo_por_token`) leen tablas FORCE sin `row_security=off`: solo funcionan si el dueño tiene BYPASSRLS (M-26, sin verificar). Si no, devuelven 0 filas (falla cerrado, no fuga) | migraciones de terreno/seguimiento; `packages/db/src/client.ts:46` | `SET row_security = off` en esas funciones + test con dueño sin BYPASSRLS. Migración aditiva | **Propuesto** (Núcleo); relacionado M-26 |
| S-09 | No bloq. | `opai_app` conserva INSERT directo en `audit_events` y UPDATE/DELETE en `auditoria_cabezas`; solo el trabajo diario `core.auditoria.verificar` lo detecta (no lo impide) | `migrations/20261028130000_auditoria_encadenada:49,62` | Revocar y escribir solo por `auditoria_append`. Migración aditiva | M-03 de CAR-34 (sin issue) → **Propuesto** |
| S-04 | No bloq. | Huecos del lint de frontera (hoy 0 violaciones reales): `dbAdmin` permitido en cualquier ruta con `/scripts/`; sin regla contra `$queryRaw`/`SET ROLE` fuera de `packages/db`; `no-restricted-imports` solo bloquea `@prisma/client` exacto. `opai_app` es miembro de `opai_auth` (NOINHERIT) y usa `SET LOCAL ROLE`: desde SQL crudo alcanzaría sesiones y hashes | `scripts/lint-acceso-db.mjs:42` | Acotar por workspace; reglas contra raw SQL y `SET ROLE` | **Propuesto** |
| S-05 | No bloq. | Pisos de los tests de catálogo (`>= 38` frente a 194 tablas); NOBYPASSRLS solo verificado en `opai_app`; sin test de catálogo para `SECURITY DEFINER` | `rls-nucleo.test.ts:48`; `force-rls.test.ts:164` | Subir el piso a ~190; test de roles y de funciones por `pg_proc` | **Propuesto** |
| S-01 ✔ | No bloq. | La sobrecarga antigua `core.marcar_login_intento(text,text,boolean,text)` sigue ejecutable; ninguna migración la elimina (solo hay un `DROP` comentado) | `migrations/20261026140000_marcar_login_intento:13-35` | `DROP FUNCTION` en migración aditiva | M-05 de CAR-34 → **Propuesto** |
| S-02 | No bloq. | Secretos de integración cifrados sin AAD (no quedan atados a empresa/integración) | `packages/capabilities/src/integraciones/secretos.ts:61,84,105` | AAD `tenantId\|integracionId\|nombre` con recifrado | M-06 de CAR-34 → **Propuesto** |
| S-10 | No bloq. | `/api/marca/[slug]/[asset]` solo limita con `vistaPrevia=1`; el camino normal hace 3 consultas y una firma de R2 por petición | `apps/web/app/api/marca/[slug]/[asset]/route.ts:22-23` | `permitir` por IP también en el camino normal | M-07 de CAR-34 → **Propuesto** |
| S-08 ✔ | No bloq. (docs) | `REGLAS-codigo.md` dice «CSP sigue Report-Only»; el código la envía como `Content-Security-Policy` (enforcement) con `unsafe-inline`. `AGENTS.md` aún cita `globales()` como excepción, que ya no se exporta | `apps/web/lib/cabeceras-seguridad.ts:57`; `proxy.ts:83` | Corregir ambos textos. I-18/CAR-57 queda parcial: se aplica, pero protege poco contra XSS | CAR-57 (Done, parcial) |

---

## 2. Permisos, alcance y lecturas auditadas

**Verificado:** todas las capacidades `core.*` (249) y `platform.*` (40) declaran `permiso` (las 32 con `permiso: null` son identidad propia, flujos con token, catálogos o geo); sin comodines `*`; `tenantId` por input solo en `platform.*`; alcance aplicado en la consulta (`dondeCuenta`, `dondeInstalacion`, `dondePuesto`, `dondePersona`). Lecturas sensibles (NÚCLEO-H): la validación de salida y el append de auditoría comparten transacción y fallan cerrados; el inventario del brief está cubierto, incluidas las lecturas añadidas después (documentos, firmas, anexos, terreno, turnos esperados, pago/previsión/laboral). Plataforma: aprobaciones y auditoría separadas de la empresa de la key; lecturas `platform.*` auditadas; keys `platform` con tope de 7 días.

### Hallazgos

| Id | Sev. | Hallazgo | Archivo | Propuesta | Issue |
|---|---|---|---|---|---|
| **C-01** ✔ | **BLOQUEANTE (permisos)** | `core.personas.pago_aprobar_cambio` y `pago_rechazar_cambio` aprueban o rechazan el cambio de la **cuenta bancaria de pago** de una persona y no son `soloPersonas`, a diferencia de `core.aprobaciones.*`, `core.anexos.aprobar/rechazar`. Su única barrera es que quien aprueba no sea quien pidió (`solicitadoPorId`): la key de otro admin con `personas.pago.aprobar` puede aprobar lo que pidió un humano, sin intervención humana. La explotación es inferida (exige esa key) | `packages/capabilities/src/core/maestros/personas-pago-aprobacion.ts:18-24, 96-112` | `soloPersonas: true` en ambas + test de que un actor `agent` recibe FORBIDDEN. Sin migración | **Propuesto** (Núcleo; avisar a «Personas · Code» por la pestaña Pago) |
| C-02 ✔ | No bloq. (alto) | `core.firmas.recordar` busca la solicitud solo por id: no aplica la visibilidad del documento (alcance y documento sensible) que sí aplican `firmas.estado/list`, ni `puedeGestionar` como `cancelar`. Un supervisor o gerente con `firmas.enviar` dispara recordatorios y ve estado/conteo (en `dryRun`) de solicitudes ajenas o de anexos de sueldo. Exige conocer el uuid | `packages/capabilities/src/core/firmas/recordar-cancelar.ts:23-50` | Reusar `documentosVisibles` y `puedeGestionar` | **Propuesto** (Núcleo) |
| C-07 | No bloq. | Cualquier admin con `apikeys.manage` sin `platformRole` puede renovar +7 días, repetidamente, una key `platform` de otro responsable (`keyDe` solo comprueba que exista) | `core/agentes/claves.ts:47-74` | Exigir `platformRole` para tocar keys con ese scope | M-01 de CAR-34 → **Propuesto** |
| C-06 | No bloq. | `platform.users.set_role` (cambio de privilegio) y `platform.tenants.update/set_estado` no declaran `cambio`: el rol anterior no queda en la auditoría global | `core/plataforma/usuarios.ts:51`; `platform-estado.ts:12,37` | Declarar `cambio` | **Propuesto** (Plataforma) |
| C-05 | No bloq. | Las escrituras `platform.*` ignoran `idempotencyKey` y las que tienen `tenantObjetivo` auditan después y en otra transacción (M-23 de CAR-34) | `capabilities/src/execute.ts`; `execute-plataforma.ts:17-35` | Idempotencia en la tabla global de plataforma; auditoría atómica | M-23 → **Propuesto** (Plataforma) |
| C-03 | No bloq. | `panel/indicadores.ts`, `indicadores-uf-utm.ts` y `remuneraciones/listar.ts`/`historial.ts` usan `auditarLectura: () => []`: cada llamada toma el lock de auditoría del tenant, incluida la carga del Inicio (impacto inferido, no medido) | `core/panel/indicadores.ts:10` | `sinDb`/`false`/excepción según corresponda | **Propuesto** |
| C-04 | No bloq. | Código muerto: `core.cuentas.contactos` se define dos veces; solo se registra la de `contactos-cuentas.ts` | `core/crm/contactos-desvincular.ts:75` | Borrar la copia | PR de pendientes |
| M-24 (vigente) | No bloq. | `audit_events` guarda el `input` completo salvo los `sensibles` declarados: `core.personas.create/update` y `contactos.*` no declaran `sensibles`, así que RUT y domicilio quedan en la cadena inmutable; sin protocolo de anonimización (Ley 21.719) | `execute-util.ts` (`eventoAuditoria`) | Declarar `sensibles` y definir el protocolo antes de activar la retención | M-24 de CAR-34 → **Propuesto** |

**Tests.** I-14/CAR-53 está cerrado para las 12 capacidades que listaba. Quedan **20 capacidades sin ninguna mención en tests** (7 de `core`: `invitations.request_new`, `firmas.list`, `cuentas.facturable`, `cargos.get`, `marca.get`, `documento_tipos.list`, `usage.summary`; 5 más de `core`: `comunicaciones.eventos`, `notificacion_reglas.list`, `geo.detalle`, `inicio.indicadores`, `remuneraciones.historial`; 8 de `platform`). Una puede estar cubierta por un test genérico del registro (no comprobado). No bloqueante.

---

## 3. Paridad agent-first

**Cifras (estáticas, coinciden con la instantánea y con `mcp-inventario.md`):** 248 capacidades `core.*` y 40 `platform.*`; 200 herramientas MCP `core_*` (93 con `preview_`); 73 excepciones (57 `soloPersonas`, 20 `interna`), todas con motivo. Los 4 archivos de paridad y `paridad-registro.test.ts` pasan (26 tests).

**Lista 1 — se hace en pantalla y no por MCP:** ninguna acción de pantalla del Núcleo carece de capacidad. Las que van solo por pantalla (identidad, invitar, API keys, integraciones y secretos, aprobar/rechazar, anexos, agente interno, Ley 21.719) son `soloPersonas`/`interna` con motivo válido.

**Lista 2 — existe por MCP y no tiene pantalla hoy** (verificado por grep de la id en `apps/web`; corrige la lista de la auditoría del 3-nov, porque etiquetas, actividades y archivar contacto ya tienen pantalla):

| Escritura del Núcleo sin pantalla | Nota |
|---|---|
| `core.invitations.revoke` | No es `soloPersonas`, por eso el gate no la exige. Hay `reenviar.tsx` en Usuarios: falta el botón |
| `core.personas.laboral_actualizar`, `prevision_actualizar`, `pago_solicitar_cambio` | Las pestañas solo llaman a las lecturas `*_ver`. Pantalla de «Personas · Code» |
| `core.etiquetas.update/delete`, `core.actividades.delete` | Menores |
| `core.documentos.vincular/desvincular`, `core.anexos.generar`, `core.firmas.politica_set`, `core.turnos_esperados.regenerar` | |
| Con `soloPersonas` y registradas en `SOLO_PERSONAS_SIN_PANTALLA` | `core.firmas.firmante_empresa_set`, `firma_automatica_autorizar/revocar` (CAR-82), `core.users.restablecer_mfa` y `platform.usuarios.restablecer_mfa` (CAR-54, sin diseño MFA), `platform.usuarios.borrar` (CAR-45), `core.remuneraciones.confirmar` (CAR-142) |

Más 19 lecturas `core.*` solo para agentes (bien así) y 8 de `platform.*` sin pantalla (2 son falso positivo, ver P-01). *Para su sesión:* Asistencia (`marcas.registrar`, `contingencias.responder`, `correcciones.responder`, CAR-89), Finanzas (`apertura.importar/revertir`, CAR-168) y 63 ids de otros módulos «solo MCP» listados en `mcp-inventario.md`.

### Hallazgos

| Id | Sev. | Hallazgo | Archivo | Propuesta | Issue |
|---|---|---|---|---|---|
| P-01 | No bloq. | El detector no ve `platform.trabajos.reintentar/cancelar`, que sí se usan en pantalla (`hoja-trabajo.tsx` llama a un ayudante local `correr(id, …)`); están en `conocidas` (`paridad.test.ts:88`), así que tampoco se verifica que existan. `mcp-inventario.md` las lista falsamente como «solo API y MCP» | `apps/web/app/(platform)/platform/_componentes/hoja-trabajo.tsx` | Pasar el id literal a `ejecutar(...)`; sacar el archivo de `conocidas` | Mencionado en CAR-34; **Propuesto** |
| P-02 | No bloq. | El gate (`paridad-camino-humano.test.ts:21`) define «pantalla» como cualquier fila del inventario (incluye `api/*`, `lib/*`, componentes quizá no montados). La protección real es en ejecución (`autorizacion.ts:59`). Las 45 `soloPersonas` con referencia literal están hoy en componentes de sesión o en `/api/agente` | `packages/capabilities/test/paridad-camino-humano.test.ts` | Exigir referencia bajo `app/**/page\|acciones`, o un test con actor `user` por portal | I-13/CAR-52 (Done, parcial) |
| P-03 | No bloq. | `SOLO_PERSONAS_SIN_PANTALLA` no vence: `desde` no se compara con nada (tres entradas CAR-89 tienen `desde: 2026-11-10`, posterior a hoy) | `packages/capabilities/test/paridad-sin-pantalla.ts` | Test que falle si `desde` es futura o supera N días | **Propuesto** |
| P-05 | No bloq. | Las 12 escrituras de la tabla son el trabajo de pantallas pendiente del Núcleo | — | Prioridad: `invitations.revoke`, edición de Laboral/Previsión, `restablecer_mfa` | **Propuesto** (requiere diseño) |
| P-06 | No bloq. | Motivos débiles: `core.users.invite` cita «encargo PR #70» en lugar de la razón (asigna rol); `cpq.cotizaciones.enviar`: «para tests y compatibilidad» (CPQ) | `paridad-excepciones.ts` | Reescribir motivos | PR de pendientes; CPQ → su sesión |

---

## 4. Regla núcleo vs módulo

**Limpio (verificado con un script de imports sobre `.ts/.tsx/.mjs`):** ningún `modules/<a>` importa a `modules/<b>`; la única dependencia declarada (`cpq` → `comercial`) se cumple; ningún `packages/*` ni `apps/web` importa `@opai/mod-*` ni `modules/*` fuera del registro. Los tests de `packages/capabilities/test` importan `modules/*` (invierte la capa; aceptable).

| Id | Sev. | Hallazgo | Archivo | Propuesta | Dueño |
|---|---|---|---|---|---|
| M-01 ✔ | No bloq. | Finanzas importa `ambitoHabil` y `zonaDe` de `../comercial/seguimiento-comun` con `dependencias: []` en su manifest. Son calendario y zona del tenant: Núcleo | `packages/capabilities/src/finanzas/cobranza-datos.ts:5` | Mover ambas al Núcleo (`core/calendario`) | Núcleo (avisar a Finanzas y Comercial) |
| M-02 ✔ | No bloq. | «Hoy» y zona horaria duplicados en 5 sitios; dos `hoyChile` ignoran `tenant.timezone` y fijan `America/Santiago` | `finanzas/cobro-esperado-datos.ts:19-20`; `modules/rendiciones/capabilities/util.ts:20-21`; `core/turnos/comun.ts`; `comercial/seguimiento-comun.ts:48`; `pauta/comun.ts:15` | Un solo helper en el Núcleo (corrige comportamiento en tenants con otra zona) | Núcleo; avisos a Finanzas y Rendiciones |
| M-03 ✔ | No bloq. | El Núcleo depende de módulos: ciclo `core/turnos` ↔ `pauta` (`regenerar-pauta.ts` importa `pauta/cargar`; `pauta/comun.ts` importa `core/turnos/comun`); `core/index.ts` registra consumidores de Comercial y `cpq.ganar.aceptar`; el panel Hoy importa pauta y finanzas; `core/turnos/comun.ts:15` hardcodea el id `"pauta"`. Ninguna regla de lint lo cubre | `core/turnos/*`, `core/index.ts:32-38,135-143`, `core/panel/indicadores/*` | Declarar indicadores y consumidores en el manifest del módulo; mover expansión de patrones y feriados al Núcleo (`turnos_esperados` es Núcleo, ADR-078) | Núcleo + Pauta/Comercial |
| M-04 | No bloq. | `COMUNICABLES_NUCLEO` incluye eventos de Comercial, CPQ, Finanzas y Asistencia; `ModuleManifest` no tiene campo `comunicables`. Contradice `REGLAS-codigo.md` | `packages/domain/src/comunicaciones/index.ts:19-28` | Campo `comunicables` en el manifest | Núcleo con trabajo en cada módulo |
| M-07 | No bloq. (inferido) | `core.agente_conversaciones` solo la consume `modules/agente`. Puede ser intencional si el agente interno (ADR-049) es Núcleo | `agentes.prisma:378-400` | Decidir y documentar | Núcleo |
| M-08 | Informativo | Tablas del Núcleo bien ubicadas por tener varios consumidores (`turnos_esperados`, `PatronTurno`, `FuncionPuesto`, `IndicadorLegal`); `core.Importacion` la usan solo Finanzas y Asistencia, sin dueño en el Núcleo | — | — | — |

**Para su sesión (no son del Núcleo):**
- **M-05 · Finanzas, Comercial, Pauta, Nómina, Rondas, Portal Cliente:** la mitad del módulo vive en `packages/capabilities/src/<m>` y `packages/domain/src` (finanzas 92 archivos frente a 34 en `modules/finanzas`; comercial 60 frente a 5; pauta 34 frente a 2; nómina 19 frente a 3; rondas 16 frente a 4). Siguen completos en `modules/` solo cpq, asistencia, rendiciones, tickets, portal_trabajador y agente. `packages/capabilities/src/index.ts:7-19` exporta internos de finanzas y comercial como API pública.
- **M-06 · Comercial/CPQ:** `comercial/consumidor-ganado-cpq.ts` cambia el estado de cotizaciones CPQ y se registra desde el Núcleo; debería vivir en `modules/cpq`.
- Sin conflicto: los editores `configuracion/_{comercial,cpq,finanzas,…}` se registran en el centro de configuración único (cumple la regla de no tener «Configuración» por módulo).

---

## 5. Pendientes, código muerto y tests

### Pendientes del Núcleo que siguen abiertos (confirmados en el código)

| Pendiente | Evidencia | Issue |
|---|---|---|
| Revocar invitación sin pantalla | `core.invitations.revoke`, grep en `apps/web` = 0 | **Propuesto** (ver P-05) |
| MFA sin recuperación en pantalla | `core.users.restablecer_mfa` en `SOLO_PERSONAS_SIN_PANTALLA`; sin diseño MFA | CAR-54 (In Progress) |
| Firmante de empresa, política y firma automática; confirmar remuneraciones | `paridad-sin-pantalla.ts` | CAR-82, CAR-142 |
| `/verificar/[token]` lee sin capacidad | `apps/web/paridad-permitidos.json` | M-09 de CAR-34; **Propuesto** `core.comprobantes.verificar` |
| Texto legal del anexo sigue siendo de ejemplo (`version: "ejemplo-d15"`); la aprobación ya se bloquea | `core/anexos/plantilla.ts` | CAR-58 (In Progress) |
| Revocar la key `*` de Gard | Sin evidencia en el repo; es acción de Carlos | CAR-56 (Backlog) |
| CSP con `unsafe-inline` | `cabeceras-seguridad.ts:24-36` | CAR-57 (Done, parcial) |
| **Sin `error.tsx` ni `global-error.tsx` en `apps/web`** ✔ (hay `instrumentation.ts` con `onRequestError` y `CargaFallida` en 84 archivos, pero ningún boundary por route group) | `find apps/web -name error.tsx` = 0 | CAR-50 figura **Done** sin que el hallazgo esté resuelto → **reabrir o crear issue** |
| Explorador de Documentos: pestañas Vencimientos/Plantillas/Firmas pendientes, columna «Subido por», índice único parcial del propietario | ESTADO (CAR-182 PR 4) | CAR-182 |

### Código muerto

- **Ya no existe** (borrado por #238/CAR-161): `tabla-sueldo.tsx`, `selector-puesto.tsx`, `sueldo-comun.ts`, `proveedor-stub.ts`, `cierre-ui.ts`, `modules/*/ui`, `finanzas.cierres.listar`. `ESTADO.md` todavía los lista como pendientes.
- **Núcleo:** 0 archivos huérfanos en `core`, `configuracion` y `packages/ds/src` (script de grafo de 3.570 archivos / 11.795 aristas). Exportaciones sin uso (solo la declaración): `docsDeCumplimiento` y `esDocCumplimiento` (`core/documentos/sensibles.ts:32,45`; son filtros de documentos sensibles: si se pensaban usar, falta el filtro), `PERMISO_FINIQUITOS`, `evidenciaVistaSchema`, `solicitudPendienteDe`, `resumenInstalaciones`, `publicarValorPlataforma`, `VARIACION_MAX_UF/UTM`. `variacionPermitida` y `bloquearCargo` solo los usan tests.
- **Para su sesión (CPQ/Comercial/Pauta):** `modules/cpq/persistencia/pdf-propuesta.ts`, `mock-motor-legal.ts` (helper de prueba en código de producción), `cpq.cotizaciones.enviar` legacy, `semaforo-margen-cpq.tsx`, `comercial/importar-1-0-esquemas.ts`, `pauta/marcas-proveedor.ts`.

### Tests (ejecutados en esta auditoría)

| Comando | Resultado |
|---|---|
| `pnpm test` (raíz, 261 s) | 464 archivos pasan, 2 omitidos; **2.974 tests pasan, 5 omitidos, 0 fallan** |
| `pnpm --filter @opai/auth test` | 3 pasan, 41 omitidos (8 suites `*-db` con `skipIf` sin URL) |
| Paridad (4 archivos de capabilities + `paridad-registro`) | 26 tests pasan |
| `pnpm --filter @opai/web typecheck` / `build` / `pnpm presupuesto` | OK con `--max-old-space-size=4096` y las variables ficticias del CI; presupuesto «dentro de los límites» |
| `pnpm --filter @opai/capabilities test` | 16 archivos fallan, **todos** por «Falta DATABASE_URL_TEST: RLS requiere Postgres real» (entorno, no regresión) |

No se ejecutó `pnpm test:db` ni e2e: **la suite que garantiza el aislamiento (`rls-dos-empresas`, `rls-nucleo-politicas`, `aislamiento-lectura-db`) no se corrió aquí**; depende del job de CI. No hay `.only/.skip/.todo` duros en unitarios. E2E: muchos `test.skip` condicionales, `retries: 1` en CI y timeouts de 180–300 s; `OPERACION-agentes.md` §D.17 lista flakes conocidos (configuracion-plataforma, retiro-cargo, navegacion-permisos, capas-sueldo, vinculo-jornada, cache-sesion). El `startup_failure` de Actions desde el 31-oct figura abierto en ESTADO; no pude confirmar si sigue.

| Id | Sev. | Hallazgo | Propuesta |
|---|---|---|---|
| R-19 | No bloq. | El filtro de `@opai/capabilities` incluye los `*-db` y da rojo sin base | Mismo `exclude: **/*-db.test.ts` que el proyecto raíz |
| R-15 | No bloq. | CAR-199/#331 (e2e en rojo, CAR-60) figura «En revisión»; no se pudo comprobar su resultado | Confirmar en CI |

### `ESTADO.md` desactualizado (a corregir en el PR de pendientes)

- Cabecera con foto `fac5738` (#229); `main` es `d4fc6ac` (#364). «En curso» repite filas (CAR-192 ×3; CAR-181 F0 como integrado y en revisión; CAR-162 aviso de sueldo en dos estados).
- Filas «En PR/En desarrollo local» ya en `main`: CAR-78 B1–B3, CAR-89 A1–A3, CAR-188, Rendiciones R2a/R2b (las migraciones existen en `main`; no pude confirmar los PR contra GitHub).
- «Migraciones en Neon»: dice «las 76 de `main`» y una sola pendiente; hay **111 carpetas** y al menos 18 posteriores a `20261106123000`. *El estado real en Neon no se verificó.* Observación: varios prefijos (`20261108…` a `20261110…`) llevan fecha posterior a hoy; conviene confirmar la convención de prefijos para que una migración futura con fecha anterior no ordene antes de las ya aplicadas.
- Pendientes ya resueltos que siguen listados: CAR-182 PR 3 (Inicio con indicadores) y PR 4 (Explorador); notas y tareas en fichas, etiquetas, archivar contacto; código muerto (arriba).
- Topes de JS citados distintos del JSON: `cuentas/[id]` (ESTADO 166, hoy 171; `porDefecto` 168), `configuracion/modulo/[id]` (185 frente a 186), programación de ventas (175 frente a 177/178).

---

## 6. Rendimiento

**Presupuesto de JS (medido en este build local, `pnpm presupuesto` exit 0):** framework 130,3/132 KB; 191 rutas, todas dentro de su tope; 62 por sobre el defecto (168 KB) con tope propio; **92 con margen < 2 KB**. Núcleo, medido/tope (KB): Inicio `/(erp)` 173,0/174; `configuracion/modulo/[id]` 184,5/186; `integraciones/[proveedor]` 179,1/181; `mi-cuenta/preferencias` 177,6/178 (margen 0,4); `contactos/[id]` 176,3/178; `cuentas/[id]` 169,8/171; `instalaciones/nueva` 177,3/179; `personas/vencimientos` 172,7/175; `/(auth)/invitacion` 152,8/153 (margen 0,2).

| Id | Sev. | Hallazgo | Archivo | Propuesta |
|---|---|---|---|---|
| R-22 ✔ | No bloq. | **N+1 en la ficha de cuenta:** por cada negocio (hasta 50) se ejecuta `cpq.cotizaciones.list`; pasa de 8 capacidades desde el primer negocio | `apps/web/app/(erp)/cuentas/_componentes/vinculos-comercial-cuenta.tsx:33-43` | `cpq.cotizaciones.list` con `negocioIds[]`/`cuentaId` agrupado (Núcleo con CPQ) |
| R-23 ✔ | No bloq. | **Lecturas auditadas duplicadas:** `laboral_ver` (sensible, con `auditarLectura`) se invoca 5 veces en la pestaña Laboral (`seccion-contacto-laboral.tsx` ×2, `seccion-jornada-dt.tsx`, `seccion-uniforme.tsx`, `seccion-os10.tsx`); estimado ≥ 15 capacidades en la página y ≥ 4 filas idénticas en la cadena de auditoría | `apps/web/app/(erp)/personas/_componentes/seccion-*.tsx` | Una sola carga con `React.cache` y repartir por props. Pantalla de «Personas · Code»: anotarle |
| R-21 | No bloq. | El gate de consultas (`e2e/rendimiento.spec.ts`) solo mide 6 listas; ninguna ficha, Usuarios, Vencimientos ni Explorador tiene gate | — | Ampliar el gate |
| R-24 | No bloq. (estimado) | Inicio carga 5 capacidades en Suspense (`indicadores` ≈ 7 lecturas, `pendientes` ≈ 4): > 8 estimado con todos los módulos activos, sin N+1; ficha de instalación › puestos 8–10; Usuarios ≈ 6–8 | `(erp)/_componentes/inicio.tsx` | Medir con el gate real antes de actuar. *Estimación estática; no incluye sesión ni alcance* |
| R-20 | No bloq. | Sin justificación escrita los topes de `/(erp)` 174, `vencimientos` 175, `actividad` 179, `instalaciones/nueva` 179, `preferencias` 178, `contactos/[id]` 178, `integraciones/[proveedor]` 181, `historial` 173, `tareas` 172; el comodín `/(erp)/configuracion*` = 177 deja ~16 KB de holgura a rutas que miden 160–163 (ADR-037: los topes solo bajan) | `apps/web/presupuesto-js.json` | Tope por ruta; justificar o bajar |

---

## PR propuestos, en orden de riesgo

Un PR por tema. Ninguno se abre desde esta sesión hasta que el bot «OPAI 2.0» los ordene con Linear. «Issue» = existente, o **propuesto** con el módulo dueño.

| # | Tema | Contenido | Migración | Issue |
|---|---|---|---|---|
| **1** | **Pago de personas solo por humanos (bloqueante)** | C-01 + test | No | **Propuesto** · Núcleo (avisar a Personas · Code) |
| 2 | Firmas: visibilidad y gestión al recordar | C-02 | No | **Propuesto** · Núcleo |
| 3 | Claves y sal | S-03 (fallar cerrado + HKDF por propósito), C-07 (keys `platform`) | No | **Propuesto** · Núcleo |
| 4 | Auditoría de plataforma | C-06 (`cambio`), C-05 (idempotencia y atomicidad) | Posible | **Propuesto** · Plataforma (no se toca desde Núcleo) |
| 5 | Endurecimiento de base | S-01 (`DROP` de la función antigua), S-09 (revocar INSERT/UPDATE/DELETE), S-06 (`row_security=off`), S-02 (AAD) | **Sí** (aditiva, `migracion-pendiente`, la aplica el bot) | **Propuesto** · Núcleo |
| 6 | CI y lint de frontera | S-04, S-05; S-07 va como **PR de operación** (toca `.github/workflows`) | No | **Propuesto** · Núcleo / operación |
| 7 | Paridad y gate | P-01, P-02, P-03 | No | CAR-52 (reabrir) / **Propuesto** |
| 8 | Pantalla: revocar invitación; luego Laboral/Previsión y restablecer MFA | P-05 | No | **Propuesto** · Núcleo (diseño); MFA = CAR-54 |
| 9 | Rendimiento de fichas | R-22 (N+1), R-23 (laboral duplicado), R-21 (gate) | No | **Propuesto** · Núcleo con CPQ y Personas |
| 10 | Frontera núcleo/módulo | M-01, M-02 (helper único de «hoy»), M-03, M-04 | No | **Propuesto** · Núcleo (con Pauta, Comercial, Finanzas, Rendiciones) |
| 11 | `error.tsx` por route group | I-11 | No | CAR-50 (Done sin resolver) → reabrir |
| 12 | **PR de pendientes (trivial, sin riesgo)** | `ESTADO.md` (cabecera, filas repetidas, migraciones, topes de JS, código muerto ya borrado); `REGLAS-codigo.md` (CSP, `globales()`), `AGENTS.md`; motivos de excepciones (P-06); exportaciones sin uso (R-18); código muerto C-04; `exclude` de `*-db` (R-19); justificar topes de JS (R-20) | No | CAR-59 (Done) → **Propuesto** nuevo |

**Para otras sesiones (anotado, no se tocó):** M-05 y M-06 (Finanzas, Comercial, Pauta, Nómina, Rondas, Portal Cliente, CPQ); código muerto de CPQ/Comercial/Pauta; pantallas de Laboral/Previsión/Pago (Personas); `cpq.cotizaciones.enviar` legacy (CPQ); Asistencia (CAR-89) y Finanzas (CAR-168) con escrituras sin pantalla.

**Decisión que necesita Carlos:** ninguna de negocio. Acciones suyas ya conocidas: revocar la key `*` de Gard (CAR-56), confirmar BYPASSRLS de `neondb_owner` (M-26), definir la fecha de corte y las credenciales DTE (ROADMAP §5).
