# BRIEF DE IMPLEMENTACIÓN — 07d LEY 21.719 POR DISEÑO (Núcleo, paso 5)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07d-ley-21719` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **aprobado para ejecución** (Carlos, 26-oct-2026 13:40 CLT, t331u: «ok pero avancemos rapido», sobre la recomendación de las seis decisiones de §16 en t329s1698 y t330s1702; alcance de B4 ya decidido el 26-oct-2026 12:28 CLT, t320u, §16.7) · **Tarea de Linear:** por asignar en el equipo CAR; el PR la vincula con `Fixes CAR-n` (obligatorio, `AGENTS.md` «Tareas (Linear)») · **Fecha límite: 30-nov-2026** (la Ley 21.719 rige el 1-dic-2026; B4 tiene que estar en `main` antes de esa fecha, `ROADMAP.md` fase 1) · **Depende de:** Brief 02 A–C (documentos con bitácora y comprobante, Configuración por ámbitos, auditoría, outbox y trabajos, comunicaciones, `PerfilEmpresa`) integrados; **coordina con el Brief 07c** (acceso y permisos, PR #39, rama `docs/brief-07c-acceso-permisos`): el 07c deja el registro de intentos de login «con la retención que fije B4/B5» (07c §4.1 y §9), y este brief fija esa política; conviene ir **después del 07c** para apoyarse en sus capacidades de gobierno (`soloPersonas`) y en el alcance del supervisor (B3) · **Reglas:** ADR-029 §6 (datos personales) y §7 (respaldos y borrado con cuarentena), ADR-027 (secretos y cifrado por tenant), ADR-019 y ADR-039 (documentos, bitácora, comprobante de integridad), ADR-023 (hechos regulados inmutables), ADR-018 y ADR-038 (Configuración por ámbitos y ajustes declarativos), ADR-020 (comunicaciones), ADR-004 y ADR-034 (paridad UI↔MCP, gobierno de agentes), ADR-022 (permisos y alcance), ADR-028 (marca del tenant en toda salida) · **Diseño:** las pantallas de cumplimiento (DPA/DPO en Configuración, bandeja de solicitudes ARCO, consentimientos) son UI nueva y **pasan por Claude Design** antes de implementarse.

> **Encargo de Carlos.** «avanzamos con esto entonves? […] las brechas de paridad con 1.0 (Briefs 07c y 07d)» — Carlos, 26-oct-2026 11:36 CLT, chat con el bot OPAI 2.0 (t303u). La decisión de cubrir la Ley 21.719 siempre y por diseño es del 24-oct-2026: «Ley 21.719: 2.0 la cubre siempre y por diseño (DPA, consentimiento, ARCO y DPO). Es brecha Alta del Núcleo» (`ESTADO.md`, «Decisiones de Carlos sobre paridad (24-oct)», punto 2; `paridad/nucleo.md`, Decisiones de Carlos del 24-oct). Este documento es **solo el brief** (sin código). Lo aprueba Carlos; recién entonces Claude lo ejecuta en la rama `brief/07d-ley-21719`, con un commit por bloque, el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). **Trae migraciones:** quien abre el PR pone la etiqueta `migracion-pendiente`; Carlos la aplica en Neon `dev` y `main` y la quita.

> **Decisiones de producto y legales abiertas.** Varias piezas dependen de decisiones que **no toma Claude** y, en varios casos, de criterio legal (textos del DPA, bases de licitud, plazos y periodos de retención). Están reunidas en §16 «Decisiones para Carlos», cada una con opciones y una recomendación. Mientras no estén resueltas, el brief queda propuesto y los bloques que dependen de ellas no se ejecutan (se indica en §11). Claude no decide materia legal: la estructura y el mecanismo sí; los valores y los textos los fija Carlos, con revisión legal donde se señala.

---

## 1. Objetivo

Cerrar la brecha **Alta B4** de paridad con 1.0 (`docs/2.0/paridad/nucleo.md`), criterio de término de la fase 1 (`ROADMAP.md`) con **fecha límite 30-nov-2026**: la protección de datos personales de la **Ley 21.719** **por diseño** en el Núcleo, de modo que 2.0 la cubra siempre (no como añadido opcional). En concreto:

- **DPA y DPO en el perfil del tenant.** El tenant (responsable del tratamiento) acepta el acuerdo de tratamiento de datos con OPAI (encargado del tratamiento), con registro versionado de quién aceptó y cuándo, y declara el contacto de su delegado o encargado de protección de datos (DPO).
- **Registro de actividades de tratamiento (RAT) / inventario de datos personales.** Cada tabla que guarda datos personales queda declarada (qué campos son personales, cuáles sensibles, base de licitud y retención), y el Núcleo arma el inventario; es la pieza «por diseño».
- **Consentimiento donde aplique.** Registro de consentimientos del titular (otorgar y revocar), versionado y auditado, para los tratamientos cuya base de licitud sea el consentimiento (no para los que se amparan en la relación laboral o una obligación legal).
- **Atención de solicitudes del titular (ARCO y más).** Acceso, rectificación, cancelación (supresión), oposición, portabilidad y bloqueo: cada solicitud queda registrada, con plazo, responsable y evidencia de atención; el acceso y la portabilidad producen una exportación del titular.
- **Retención y borrado por política.** Periodos por categoría de dato, evaluados por un trabajo diario; los hechos regulados (marcas, firmas, bitácora; ADR-023) no se borran: se anonimizan o bloquean donde la ley lo permita.
- **Cifrado en reposo de los datos sensibles** apoyado en el almacén cifrado por tenant (ADR-027), además del cifrado de infraestructura de Neon.

Todo pasa por **capacidades** (ADR-004), con auditoría, `dryRun` e `idempotencyKey`, y lo que gobierna datos personales lleva `soloPersonas: true` (ADR-034). **Nunca** se copian datos personales a Linear ni a los PR (`AGENTS.md`, regla 6 de «Tareas (Linear)»).

Se nota que funciona cuando: un tenant registra la aceptación del DPA y su DPO; un titular puede pedir acceso, rectificación, cancelación u oposición y la solicitud queda registrada y atendida con plazo; todo por capacidad y con auditoría (criterio de aceptación de `ROADMAP.md`, fila 07d).

## 2. Estado actual del repo (verificado el 26-oct-2026 sobre `main` `c391de1`)

### 2.1 Lo que 1.0 tiene y 2.0 no (B4)

1. **1.0** registra la aceptación del DPA y el contacto del DPO en el `Tenant` (migración `20260408000000_add_dpa_fields_to_tenant`), un banner de consentimiento (`src/components/DpaConsentBanner.tsx`), la atención de solicitudes ARCO (`src/app/(app)/opai/compliance/arco/page.tsx`, `src/app/api/admin/arco/route.ts`) y una sección de configuración «cumplimiento» (`paridad/linea-base-1.0.md` l.79 y l.81). En `linea-base-1.0.md` el `Tenant` «incluye DPA/DPO Ley 21.719 y campos DT Res. Ex. 38».
2. **2.0** tiene la Ley 21.719 solo como **principio** (ADR-029 §6: inventario de campos personales por tabla, cifrado en reposo de los sensibles, retención y borrado por política, exportación y portabilidad por tenant, registro de consentimientos, DPO y DPA en el perfil del tenant) y como decisión de Carlos («siempre y por diseño»), pero **sin código**: no hay rutas `dpa` ni `arco`, ni campos DPA/DPO, ni tablas de consentimiento, solicitudes o retención (`paridad/nucleo.md` B4). La búsqueda en `packages/db/prisma/schema/` de `dpa`, `dpo`, `arco`, `consent`, `retenci`, `cuarentena`, `titular`, `anonim` o `olvido` no devuelve nada.

### 2.2 Infraestructura del Núcleo que este brief reutiliza (verificada en `main`)

3. **Auditoría.** `core.audit_events` (`packages/db/prisma/schema/core.prisma` l.75; `model AuditEvent`) guarda actor (`actor_type`/`actor_id`), `via_user_id` («agente vía usuario»), `capability`, entidad y `payload` por cada capacidad con efecto. **Sin IP ni user agent** (es la brecha B8, Media, fuera de este brief). Toda escritura de cumplimiento escribe aquí. **Corrección (verificada el 26-oct-2026):** hoy la tabla **no es append-only a nivel de base**: el rol `opai_app` tiene `UPDATE` y `DELETE` sobre todo `core` por el grant de la migración inicial (`packages/db/prisma/migrations/20261023031142_init/migration.sql` l.59, `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "core"`; igual por `ALTER DEFAULT PRIVILEGES` l.61, que alcanza a las tablas nuevas de este brief). El carácter inmutable es hoy solo convención de la aplicación. Este brief lo corrige en §6 y §11 (bloque 1): hace efectivamente append-only `audit_events` y las tablas de este brief que se declaran append-only (DPA, consentimientos) con un `REVOKE UPDATE, DELETE` para `opai_app` o un trigger `BEFORE UPDATE OR DELETE` que lo rechace, con su test:db (§12).
4. **Perfil de empresa.** `core.perfil_empresa` (`servicios.prisma`, `model PerfilEmpresa`, 1:1 con el tenant) tiene razón social, RUT, representante legal, correos, marca y colores. **No tiene** campos de DPA ni DPO: es donde viven (o cuelgan) el DPA/DPO de este brief (§6).
5. **Documentos con huella y bitácora.** `packages/capabilities/src/core/documentos/*` y ADR-039: subida directa a R2 con URL firmada, confirmación con SHA-256, versiones encadenadas, descarga con URL firmada GET de 5 min, bitácora encadenada y comprobante público `/verificar/<token>` «sin exponer datos personales». La **exportación** del titular (acceso y portabilidad) se materializa como documento del Núcleo.
6. **Configuración por ámbitos y ajustes declarativos.** ADR-018 y ADR-038: `defineAjustes(modulo, z.object({...}))` con `.meta({ etiqueta, ambito })`, leídos por `ajuste(ctx, …)` y cambiados solo por `core.config.set`. El centro de Configuración renderiza el esquema del manifest; **no** hay página de configuración por módulo. DPA/DPO y la política de retención encajan como ajustes de ámbito `tenant` y como una sección de Configuración → Empresa/Cumplimiento.
7. **Outbox, trabajos y crons.** ADR-029 §1–2: toda escritura emite un evento por outbox en la misma transacción; `defineTrabajo` con `periodicidad: "diaria"` y los crons (`/api/cron/*`, `CRON_SECRET`) solo despachan. La **purga por retención** es un trabajo diario (como la purga de subidas no confirmadas de ADR-039).
8. **Comunicaciones.** ADR-020: eventos comunicables con plantilla por defecto, editables en Configuración → Comunicaciones, silencio por defecto. El acuse y los avisos de una solicitud ARCO se declaran como eventos comunicables.
9. **Secretos y cifrado por tenant.** ADR-027 y `packages/capabilities/src/integraciones/secretos.ts` (l.16-40) con `rotar-kek`: **una DEK por tenant** (fila en `claveTenant`, creada la primera vez) cifrada con una KEK de plataforma versionada (`OPAI_SECRETS_KEY`); esa DEK del tenant cifra los valores (envelope encryption). No es una DEK por dato. Es el mecanismo para el cifrado de campos sensibles a nivel de aplicación, además del cifrado en reposo de Neon.
10. **Bitácora encadenada y hechos regulados.** ADR-023 y `packages/db/src/bitacora.ts`: marcas, firmas y rondas son inmutables, con hash y bitácora append-only; las correcciones son hechos nuevos. Esto **limita** la «cancelación» de un titular: lo regulado no se borra (§4.5, §10).

## 3. Alcance

### Incluido

- **DPA/DPO:** modelo para registrar la aceptación del DPA (versionada, append-only, con quién y cuándo) y el contacto del DPO del tenant; pantalla en Configuración → Empresa/Cumplimiento; capacidades de lectura y escritura con auditoría y `soloPersonas`.
- **RAT / inventario «por diseño»:** declaración de datos personales en el manifest de cada módulo y en el Núcleo (qué campos son personales o sensibles, categoría, base de licitud, retención); capacidad y pantalla que arman el registro de actividades de tratamiento a partir de lo declarado. Gate de test que verifica que no queda una tabla con datos personales sin declarar (alcance del gate en §16.6).
- **Consentimientos:** tabla append-only de consentimientos por titular, propósito y versión (otorgado/revocado), con capacidades para registrarlos y consultarlos; se aplica donde la base de licitud sea el consentimiento (§16.2).
- **Solicitudes del titular (ARCO+):** modelo de solicitud (acceso, rectificación, cancelación, oposición, portabilidad, bloqueo) con estado, plazo, responsable y evidencia; capacidades para crear, avanzar y resolver, con auditoría; acuse por comunicaciones; la de acceso y portabilidad producen una **exportación** del titular como documento del Núcleo.
- **Retención y borrado:** política de retención por categoría de dato (ajuste de tenant), trabajo diario que anonimiza o bloquea lo vencido respetando los hechos regulados (ADR-023); registro de lo anonimizado/bloqueado.
- **Cifrado de sensibles:** definir qué campos personales sensibles se cifran a nivel de aplicación con el almacén del tenant (ADR-027), además del cifrado de infraestructura.
- **Paridad MCP** de las capacidades no internas ni solo-personas, auditoría, `dryRun` e `idempotencyKey`; tests de dominio, de capacidades (incl. `*-db.test.ts`), de base (`pnpm test:db`) y gate de paridad en verde.

### Excluido (otros briefs, backlog o fuera de alcance)

- **B1, B2 y B3 (Brief 07c):** bloqueo de login persistido, roles y permisos finos, y alcance del supervisor por instalación. 07d **usa** sus capacidades de gobierno (`soloPersonas`) y su alcance (B3) para acotar quién ve los datos de una solicitud ARCO, pero no los construye. La **retención del registro de intentos de login** que 07c deja pendiente «a B4/B5» la fija 07d como una categoría más de la política de retención (§4.5); no se recrea la tabla de intentos.
- **B10 · Borrado y exportación del *tenant* completo** (cuarentena de 30 días, exportación a R2; ADR-029 §7): prioridad Baja, es el borrado de la empresa entera, distinto del derecho de un **titular**. Fuera de alcance; 07d deja el mecanismo de exportación por titular, que B10 podrá reutilizar.
- **B5 · Política de seguridad configurable por tenant** (MFA, expiración e historial de contraseñas, inactividad): Media, fuera de la fase 1. 07d solo define la retención; hacerla configurable con el resto de la política de seguridad es de B5.
- **Biometría (Face ID) y asistencia:** el dato biométrico es sensible y llega con Asistencia (fase 4, Briefs 18–19). 07d deja el mecanismo de inventario, consentimiento y cifrado listo; no modela biometría.
- ~~**Notificación de brechas a la Agencia y a los titulares:**~~ **Entra en 07d (PR 2), decisión del 26-oct-2026 (§16.5):** registro de incidentes y aviso de brechas a la Agencia y a los titulares, **manual y con plazo** (el plazo lo confirma el abogado). No es un detector automático de brechas.
- **Textos legales del DPA, bases de licitud y periodos de retención concretos:** los fija Carlos con criterio legal (§16); el brief deja el mecanismo y valores por defecto propuestos.

## 4. Arquitectura

### 4.1 Responsable, encargado y titular

- **Responsable del tratamiento:** el tenant (p. ej. Gard). Decide los fines y medios; atiende a sus titulares; declara su DPO.
- **Encargado del tratamiento:** OPAI (la plataforma), que trata los datos por cuenta del tenant. El **DPA** es el acuerdo entre ambos; su aceptación la hace el owner del tenant y queda registrada y versionada.
- **Titulares:** las personas cuyos datos trata el tenant en OPAI: sobre todo **personas/trabajadores** (`core.personas`, con RUT, contacto, vínculo laboral, sueldos) y **contactos** de cuentas (`core.contactos`). El mecanismo es general por tipo de titular; este brief cubre persona y contacto, y deja preparado el resto (cliente, usuario) para sus portales.

Esta separación evita confundir B4 con B10: B4 son los derechos del **titular** dentro de un tenant; B10 es el borrado del **tenant** entero.

### 4.2 DPA y DPO

- **DPA:** un registro **append-only** de aceptaciones (versión del acuerdo, quién —membresía/usuario—, cuándo, texto o referencia del documento de esa versión). Guardar el historial, no solo el último, para probar qué versión aceptó el tenant y cuándo. La versión vigente del texto del DPA vive como documento del Núcleo o como contenido versionado de plataforma (§16.1).
- **DPO del tenant:** contacto (nombre, correo, teléfono) en `PerfilEmpresa` o en una sección de cumplimiento, editable solo por owner/admin (ADR-016) por `core.config.set` o una capacidad dedicada. **DPO de OPAI** (plataforma): dato de plataforma, se muestra en el pie legal y en el DPA; no es por tenant.
- **Dónde se ve:** Configuración → Empresa/Cumplimiento (ADR-018). La aceptación del DPA, por diseño, se pide al owner al entrar si aún no está aceptada la versión vigente (equivalente al banner de 1.0, pero como acción de owner, no de cada usuario; §16.1).

### 4.3 RAT / inventario de datos personales (la pieza «por diseño»)

- **Declarativo, como permisos y ajustes.** Cada módulo declara en su manifest (`defineModule`) qué tablas y campos guardan datos personales: categoría (identificación, contacto, laboral, económica, sensible…), base de licitud propuesta y retención. El Núcleo declara los suyos (personas, contactos, vínculos, documentos). Un helper del dominio (p. ej. `defineDatosPersonales(modulo, …)`, análogo a `defineAjustes`) recoge la declaración.
- **El Núcleo arma el RAT.** Una capacidad de lectura (`core.cumplimiento.rat` o similar) devuelve el registro de actividades de tratamiento consolidado: por categoría, finalidad, base, retención y destinatarios (encargados ulteriores: R2, Resend, proveedores de IA por ADR-031/027). Pantalla de solo lectura en Configuración → Cumplimiento.
- **Gate por diseño (recomendado, §16.6).** Un test (estilo el gate de RLS) que falla si una tabla con datos personales no está declarada en el inventario, para que el inventario no se desactualice. El alcance del gate (duro desde ya o informe primero) lo decide Carlos.
- **Base del cifrado y de la retención.** La categoría declarada alimenta qué se cifra a nivel de aplicación (§4.6) y qué retención aplica (§4.5), sin repetir la regla en cada módulo.
- **Capa de negocio del RAT (PR 1, corrección QA 26-oct, C10/C11).** Sobre el inventario por tabla (que no se borra) va un catálogo de **actividades de tratamiento** en `@opai/domain` (`actividades-tratamiento.ts`): una fila por actividad en lenguaje de negocio, con datos legibles (sin nombres de columna), una categoría principal y el conjunto para el filtro, base legible, retención y destinatarios. Un test exige que cada tabla del inventario quede cubierta por una actividad. **Decisiones de implementación de Claude** (no son materia legal; el resto sigue §16.2/§16.4): (1) el mapa de categorías técnico→negocio muestra `credenciales` bajo «Identificación» (las 5 categorías visibles de la sábana son Identificación, Contacto, Laboral, Económica, Sensible); (2) se inventaría la tabla `login_intentos` (entró con el #47; su retención la fija el PR 3, coordina con 07c, §4.5); (3) la retención se mantiene **pendiente** (null → `retencionPendiente`) hasta el PR 3: no se adoptan como dato los plazos de muestra de la sábana; (4) se completan los destinatarios del inventario con Resend (correo) e IA (lectura de documentos), marcados «a confirmar por legal» (§4.4, QA 3.2).

### 4.4 Consentimientos y solicitudes del titular (ARCO+)

- **Consentimiento** (`core.consentimientos`, append-only, con RLS): tenant, titular (tipo + id: persona/contacto), propósito, versión del aviso, estado (otorgado/revocado), origen y marca de tiempo. Otorgar y revocar son hechos nuevos (no se edita el anterior). Se registra **solo** donde la base de licitud sea el consentimiento. **Qué base aplica a cada tratamiento es la decisión legal abierta de §16.2 y no la decide Claude:** la recomendación propuesta (a confirmar con asesoría legal) es que el tratamiento de datos del trabajador para la relación laboral y las obligaciones DT **no** se apoye en consentimiento, sino en la relación laboral u obligación legal; mientras §16.2 no se resuelva, el mecanismo queda listo y la base por tratamiento se marca como propuesta en el inventario (§4.3), sin darla por decidida.
- **Solicitud** (`core.solicitudes_arco` o `core.cumplimiento.solicitudes`, con RLS): tenant, titular (tipo + id, o correo si aún no es titular interno), tipo (`acceso` | `rectificacion` | `cancelacion` | `oposicion` | `portabilidad` | `bloqueo`), estado (`recibida` | `en_proceso` | `resuelta` | `rechazada`), plazo legal calculado al recibir (§16.3), responsable, resultado y referencia al documento de evidencia. Append-only en sus transiciones (bitácora), para probar la atención.
- **Flujo:** se crea (por el equipo del tenant, o desde un canal del titular; §16.3) → se asigna y procesa → se resuelve con evidencia. El **acuse** y los avisos se declaran como eventos comunicables (ADR-020), con plantilla editable y marca del tenant (ADR-028).
- **Acceso y portabilidad = exportación.** Una capacidad arma la exportación de los datos del titular (identificación, contacto, laboral, documentos vinculados) en formato legible por máquina (JSON o CSV; §16.3) y la guarda como **documento del Núcleo** (ADR-039: huella SHA-256, descarga con URL firmada, bitácora). Reúne lo que hoy ya existe por entidad (`core.personas.*`, `core.contactos.*`, `core.documentos.*`), sin crear un almacén paralelo.
- **Alcance (B3, del 07c).** Quién puede ver y resolver una solicitud respeta permiso y alcance: un supervisor no ve solicitudes de titulares fuera de su alcance (ADR-022). Este brief **usa** el alcance del 07c; no lo define.

### 4.5 Retención y borrado

- **Política por categoría** como ajuste de tenant (ADR-038): a cada categoría del inventario (§4.3) le corresponde un periodo. Valores por defecto propuestos por Claude al implementar, confirmados por Carlos con criterio legal (§16.3). La retención del **registro de intentos de login** del 07c es una categoría más aquí (coordina 07c §9).
- **Trabajo diario** (`defineTrabajo`, `periodicidad: "diaria"`, ADR-029 §2): recorre lo vencido y lo **anonimiza o bloquea** según la categoría; registra qué hizo (contador y referencia, sin volcar datos personales). No elimina en caliente desde una petición de usuario.
- **Hechos regulados (ADR-023).** Marcas de asistencia, firmas, rondas y la bitácora encadenada **no se borran**: una «cancelación» que los toque se traduce en **anonimización o bloqueo** del titular donde la ley lo permita, conservando el hecho regulado íntegro. La cancelación total solo procede cuando no hay obligación legal de conservar (criterio legal, §16.4).
- **Convive con B10.** El borrado del tenant entero (cuarentena de 30 días, ADR-029 §7) es otro flujo (Baja, fuera de alcance); la retención por titular de 07d no lo reemplaza.

### 4.6 Cifrado en reposo de los sensibles

- **Dos capas.** Neon cifra en reposo a nivel de infraestructura (ya vigente). Para los campos marcados **sensibles** en el inventario, cifrado a nivel de aplicación con el mecanismo de ADR-027 (una DEK por tenant cifrada con la KEK versionada; envelope, `rotar-kek`; `secretos.ts` l.16-40), de modo que un volcado de la base no los exponga en claro.
- **Qué se cifra.** Lo decide el inventario (§4.3). Candidatos: datos de salud o biometría (fase 4), y lo que §16.4 determine. Identificadores como el RUT se mantienen como hoy (son necesarios para operar y buscar); marcarlos sensibles a nivel de aplicación rompería búsquedas y se evalúa aparte.
- **Sin datos en claro fuera de la base.** Nada de esto cambia la regla: los correos de los intentos de login van en hash (07c), y ni RUT ni PIN ni sueldos se copian a logs, PRs o Linear (`AGENTS.md`).

## 5. Archivos (previstos)

- `packages/db/prisma/schema/` → B4: DPA (aceptaciones append-only), DPO (en `perfil_empresa` o tabla de cumplimiento), consentimientos (append-only, RLS), solicitudes del titular (RLS), registro de retención/anonimización. Migración(es) aditiva(s) con RLS, política `tenant_isolation` y grants donde corresponda.
- `packages/capabilities/src/core/cumplimiento/*` (nuevo) → capacidades de DPA/DPO, RAT, consentimientos, solicitudes y exportación; ≤ 150 líneas por archivo.
- `packages/capabilities/src/core/documentos/*` → reusado para la exportación del titular (sin tabla nueva de adjuntos; ADR-019).
- `packages/domain/src/` → helpers puros: declaración de datos personales (`defineDatosPersonales` o equivalente), cálculo de plazo de la solicitud y evaluación de retención por categoría; tests.
- `apps/web/lib/registro.ts` → registra el trabajo diario de retención y los consumidores de eventos de cumplimiento (acuses).
- `apps/web/app/(erp)/configuracion/cumplimiento/*` (o dentro de `empresa/`) → DPA/DPO, RAT (solo lectura), bandeja de solicitudes y consentimientos; tras diseño aprobado.
- `apps/web/app/api/cron/*` → el cron diario solo despacha la cola (ADR-029); no hace el trabajo.
- Tests: `packages/domain/test/*`, `packages/capabilities/test/*` (incl. `*-db.test.ts`), `packages/db/test/*` (RLS de las tablas nuevas y gate del inventario), Playwright de Configuración → Cumplimiento.
- `docs/2.0/paridad/nucleo.md` (B4 marcada en progreso o cerrada al integrar), `docs/2.0/ESTADO.md`, `docs/2.0/ROADMAP.md`, `docs/2.0/agentes/operar-el-nucleo.md` si cambian las herramientas, y, si Carlos lo pide, un `docs/2.0/cumplimiento/ley-21719.md` con el RAT y las políticas.

## 6. Modelo de datos y migraciones

**Trae migraciones (aditivas).** Resumen; el detalle fino (nombres de columnas, índices, si DPO va en `perfil_empresa` o en tabla aparte) se fija al implementar y según §16.

- **DPA (en `core`, con RLS `tenant_isolation`):** aceptaciones del acuerdo, append-only: `tenant_id`, versión del acuerdo, aceptado_por (membresía/usuario), aceptado_en, referencia al documento de esa versión. El estado «vigente aceptado» se deriva de la última fila.
- **DPO:** contacto del delegado del tenant. Recomendado en `perfil_empresa` (columnas `dpo_nombre`, `dpo_correo`, `dpo_telefono`) por ser 1:1 con el tenant, o tabla de cumplimiento si crece (§16.1).
- **Consentimientos (en `core`, RLS):** append-only; `tenant_id`, tipo+id de titular, propósito, versión del aviso, estado (otorgado/revocado), origen, timestamp.
- **Solicitudes del titular (en `core`, RLS):** `tenant_id`, tipo+id de titular (o correo), tipo, estado, plazo, responsable, resultado, documento de evidencia; las transiciones quedan en bitácora/auditoría.
- **Registro de retención/anonimización (en `core`, RLS o append-only):** qué categoría, cuántas filas, cuándo, sin datos personales en claro.

Toda tabla con `tenant_id` lleva `ENABLE ROW LEVEL SECURITY` y la política `tenant_isolation` para `opai_app` (plantilla de `REGLAS-codigo.md`); CI falla si falta (`packages/db/test/rls-nucleo*.test.ts`). Columnas obligatorias (`created_at`, `updated_at` salvo tablas append-only que no lo llevan, uuid v7, `snake_case` por `@map`, `@@schema`). Las referencias entre tablas se validan del mismo tenant (trigger `core.verificar_mismo_tenant`). El DPA y el DPO cuelgan del tenant, que tiene RLS por `tenant_id`.

- **Append-only de verdad (corrige §2.2 punto 3).** Por el grant de la migración inicial (`…/20261023031142_init/migration.sql` l.59 y l.61), `opai_app` tiene `UPDATE` y `DELETE` sobre todo `core`, así que una tabla declarada «append-only» no lo es a nivel de base. Para las tablas inmutables de este brief (DPA de aceptaciones, consentimientos) y para `core.audit_events`, la migración agrega una de estas dos protecciones (se fija cuál al implementar; recomendado el trigger por ser explícito y no depender del orden de los grants): (a) `REVOKE UPDATE, DELETE ON <tabla> FROM opai_app;` tras el `GRANT`, o (b) un trigger `BEFORE UPDATE OR DELETE … FOR EACH ROW EXECUTE FUNCTION core.rechazar_mutacion()` que lanza excepción. Las correcciones son hechos nuevos (otra fila), nunca `UPDATE`/`DELETE`. Lleva su test:db (§12): como `opai_app`, un `UPDATE` o `DELETE` sobre una fila existente de esas tablas falla.

## 7. Capacidades

- **DPA/DPO:** leer el estado del DPA y el DPO; aceptar la versión vigente del DPA (registro append-only); fijar el contacto del DPO. Escritura con `dryRun`, `idempotencyKey`, auditoría y `soloPersonas: true` (gobierna cumplimiento; un agente no acepta el DPA ni fija el DPO).
- **RAT:** leer el registro de actividades de tratamiento consolidado (solo lectura; no interna si Carlos quiere que un agente de auditoría lo consulte, o interna si no).
- **Consentimientos:** registrar un consentimiento (otorgar/revocar) y listar los de un titular. Registrar/revocar es escritura auditada; `soloPersonas` según §16.2 (si el propio titular lo otorga desde su portal, no sería solo-personas, pero eso llega con los portales de fase 3).
- **Solicitudes del titular:** crear, listar, obtener, avanzar y resolver una solicitud; generar la **exportación** (acceso/portabilidad) como documento. Toda escritura con `dryRun`, idempotencia, auditoría; `soloPersonas: true` en las de gobierno (crear, avanzar, resolver), porque resolver una solicitud ARCO es un acto humano responsable. La exportación respeta permiso y alcance (B3).
- **Retención:** no expone una capacidad de negocio nueva de borrado manual; el trabajo diario la aplica. Si Carlos quiere forzar la purga de un titular desde soporte, es una capacidad `soloPersonas` aparte (§16.4).
- **Paridad (ADR-034, `REGLAS-codigo.md`):** toda capacidad `core.*` nueva no interna ni solo-personas produce herramienta MCP; las `soloPersonas` y las `interna` se declaran en `paridad-excepciones.ts` con motivo. Descripción en lenguaje de negocio ≥ 40 caracteres. El brief cierra con `tools/list` en `main`, el snapshot `herramientas-mcp.txt` actualizado y el gate de paridad en verde. Tras desplegar, `OPAI_MCP_KEY=<key> pnpm mcp:verificar` (Carlos).

## 8. Interfaz y responsive

- **Configuración → Empresa/Cumplimiento** (ADR-018): aceptación del DPA (con la versión vigente y su historial), contacto del DPO, y el RAT en solo lectura. Editable por owner/admin (ADR-016).
- **Aceptación del DPA por diseño:** si el tenant no tiene aceptada la versión vigente, al owner se le pide aceptarla (acción, no banner por usuario; respeta el diseño de acceso aprobado, `export-acceso`, sin inventar pantallas). §16.1 decide la forma exacta.
- **Bandeja de solicitudes del titular:** lista con estado, tipo y plazo (semáforo por vencimiento), ficha con el detalle y el botón de resolver con evidencia; estado vacío con acción. Patrón `ListScreen`/`DetailScreen` del DS.
- **Consentimientos:** vista por titular dentro de su ficha (persona/contacto) con el historial; no una pantalla suelta nueva si cabe como pestaña (ADR-041).
- Reglas de UI de `REGLAS-codigo.md`: solo tokens y componentes de `@opai/ds`, foco visible, estados loading/vacío/error/sin permisos, 375/1024/1280, contraste AA, touch ≥ 44 px, presupuesto de JS por ruta (ADR-037). Las pantallas nuevas **pasan por Claude Design** antes de implementarse.

## 9. Seguridad y tenant

- **Multi-tenant (no negociable, `AGENTS.md`):** las tablas de consentimientos, solicitudes, retención y DPA llevan `tenant_id`, RLS y política `tenant_isolation`; el tenant sale de la sesión o la key, nunca del body; las referencias se validan del mismo tenant.
- **Alcance aplicado en UI, API y MCP** por ser la misma capacidad (ADR-004, ADR-034): una key de supervisor no ve, por MCP ni API, solicitudes ni consentimientos de titulares fuera de su alcance (B3, del 07c).
- **Gobierno con `soloPersonas`:** aceptar el DPA, fijar el DPO, crear/avanzar/resolver solicitudes y forzar una purga son actos humanos; un agente no los ejecuta (ADR-034).
- **Datos personales (Ley 21.719):** la exportación del titular sale por URL firmada de corta vida (ADR-039), no por un enlace público; el comprobante de integridad público no expone datos personales. Nada de RUT, sueldos, PIN ni datos de guardias en logs, PRs ni Linear (`AGENTS.md`); se enlaza la pantalla.
- **Auditoría:** toda escritura de cumplimiento queda en `core.audit_events` con actor y vía; las transiciones de una solicitud quedan trazadas para probar la atención dentro de plazo.
- **Cifrado:** los campos sensibles del inventario se cifran con el almacén del tenant (ADR-027), además del cifrado de infraestructura.

## 10. Casos límite

- **DPA no aceptado:** el tenant opera con un aviso persistente al owner; §16.1 decide si algo se bloquea hasta aceptar (recomendación: avisar, no bloquear la operación, para no dejar a Gard sin sistema).
- **Nueva versión del DPA:** se pide aceptar la nueva; el historial conserva la anterior.
- **Solicitud de un titular que no existe como registro interno** (llega por correo): se crea con el correo como identificador y se vincula a la persona/contacto si aparece.
- **Cancelación que choca con un hecho regulado** (marca, firma, bitácora; ADR-023): no se borra el hecho; se anonimiza o bloquea al titular donde la ley lo permita, y se registra el motivo de la conservación. La cancelación total solo cuando no hay obligación legal (§16.4).
- **Rectificación:** es una escritura normal sobre la entidad (persona/contacto) por su capacidad, enlazada a la solicitud como evidencia; no un mecanismo paralelo.
- **Oposición/bloqueo:** marca al titular para no tratarlo con cierto fin (p. ej. comunicaciones comerciales), sin borrarlo; las capacidades que envían a ese fin respetan la marca.
- **Portabilidad vs. acceso:** mismo motor de exportación; la portabilidad exige formato legible por máquina (§16.3).
- **Retención vencida de un dato que un hecho regulado obliga a conservar:** gana la obligación legal de conservar; no se anonimiza hasta que venza también esa obligación.
- **Agente con key de supervisor:** ve y opera solicitudes solo dentro de su alcance (B3); nunca acepta el DPA ni resuelve por sí mismo (`soloPersonas`).
- **Consentimiento revocado:** los tratamientos cuya única base era ese consentimiento cesan; los que tienen otra base (relación laboral) siguen.

## 11. Plan por bloques (un commit por bloque)

Conviene **tres PR** por tema, para revisar y mergear por partes (cada PR lleva su encargo y su tarea de Linear, `AGENTS.md`). Orden de ejecución, revisión y merge: PR 1 (DPA/DPO + RAT, independiente de las decisiones legales de fondo) → PR 2 (consentimientos + solicitudes + exportación) → PR 3 (retención + cifrado). Si Carlos prefiere un solo PR, se hace en bloques dentro de uno. **Los tres PR —incluido PR 3— entran a `main` antes del 30-nov-2026** (la ley rige el 1-dic-2026); el orden es solo de secuencia de revisión y merge, no una postergación de PR 3 para después del plazo. PR 3 no depende de los textos legales finos para su mecanismo: Claude propone los periodos de retención y el conjunto de campos sensibles por defecto (§16.3, §16.4) y Carlos los confirma, sin que eso retrase la implementación. **Carlos decidió el 26-oct-2026 (12:28 CLT, t320u: «ok a las dos», en respuesta a la recomendación del bot en t319s1656) que B4 entra completo —los tres PR, incluido PR 3 de retención y cifrado— en `main` antes del 30-nov-2026; no se deja ninguna parte de B4 para después del plazo (§16.7).**

**PR 1 — DPA, DPO e inventario (RAT)** *(no depende de §16.2/§16.3/§16.4; depende de §16.1 y §16.6, ambas DECIDIDAS el 26-oct-2026, t331u).*
- Bloque 1 · `core:` migración de DPA (append-only) y DPO; RLS; **append-only de verdad** (`REVOKE UPDATE, DELETE` para `opai_app` o trigger que rechaza la mutación) sobre el DPA y sobre `core.audit_events` —hoy mutable por el grant inicial (§2.2 punto 3, §6)—, con su test:db; capacidades de leer/aceptar DPA y fijar DPO (`soloPersonas`), con auditoría; paridad.
- Bloque 2 · `core:`/`domain:` declaración de datos personales en el manifest y en el Núcleo; capacidad y vista del RAT; gate del inventario (alcance según §16.6); tests.
- Bloque 3 · `core:`/`ds:` Configuración → Empresa/Cumplimiento (DPA/DPO y RAT en solo lectura), tras diseño aprobado.

**PR 2 — Consentimientos, solicitudes del titular (ARCO+) e incidentes/brechas** *(depende de §16.2, §16.3 y §16.5).*
- Bloque 4 · `core:` migración de consentimientos y solicitudes (RLS); los consentimientos son append-only de verdad (`REVOKE UPDATE, DELETE` o trigger, §6), con su test:db.
- Bloque 5 · `domain:` cálculo del plazo de la solicitud y reglas de estado; tests.
- Bloque 6 · `core:` capacidades de consentimientos y de solicitudes (crear, avanzar, resolver; `soloPersonas`), exportación del titular como documento (ADR-039), eventos comunicables del acuse (ADR-020); paridad, snapshot y gate.
- Bloque 7 · `core:` **registro de incidentes y aviso de brechas** a la Agencia y a los titulares, **manual y con plazo** (§16.5, decisión del 26-oct-2026): migración del registro de incidentes (RLS), capacidades para registrar un incidente y para dejar constancia del aviso con su destinatario, plazo (ajuste sin valor por defecto legal, confirma el abogado) y evidencia; eventos comunicables; `soloPersonas`; paridad, snapshot y gate. Es un flujo manual, no un detector automático.
- Bloque 8 · `core:`/`ds:` bandeja de solicitudes y consentimientos en la ficha, tras diseño aprobado.

**PR 3 — Retención y cifrado** *(depende de §16.3 y §16.4; coordina con 07c la categoría de intentos de login).*
- El mecanismo de PR 3 no depende de los textos legales finos: Claude propone los periodos de retención y el conjunto de campos sensibles por defecto (§16.3, §16.4) y Carlos los confirma, sin que eso retrase la implementación.
- Bloque 9 · `core:`/`domain:` política de retención por categoría (ajuste de tenant) y evaluación pura; tests.
- Bloque 10 · `core:` trabajo diario de anonimización/bloqueo respetando hechos regulados (ADR-023), registro de lo hecho; cron que solo despacha.
- Bloque 11 · `core:` cifrado de aplicación de los campos sensibles del inventario con el almacén del tenant (ADR-027).
- Bloque 12 · `docs:` `paridad/nucleo.md`, `ESTADO.md`, `ROADMAP.md`, manual de agentes si cambió, y reporte.

## 12. Tests

- **Dominio:** cálculo del plazo de una solicitud; evaluación de retención por categoría (vencido vs. vigente, hecho regulado que obliga a conservar); reglas de estado de la solicitud.
- **Capacidades (contexto falso y `*-db.test.ts` con `opai_app` sin BYPASSRLS):** `soloPersonas` rechaza a agentes en aceptar DPA, fijar DPO y resolver solicitudes; el alcance (B3) acota qué solicitudes y consentimientos ve un supervisor; la exportación incluye solo lo del titular pedido; auditoría de las escrituras; `dryRun` no persiste; idempotencia no duplica.
- **Base (`pnpm test:db`):** RLS de las tablas nuevas (aislamiento por tenant; un tenant no lee ni escribe las del otro); append-only de verdad: como `opai_app`, un `UPDATE` o `DELETE` sobre una fila existente de DPA, consentimientos y `core.audit_events` falla (por el `REVOKE` o el trigger de §6), de modo que la inmutabilidad no dependa solo de la aplicación.
- **Inventario / por diseño:** el gate del RAT falla si una tabla con datos personales no está declarada (según el alcance de §16.6); los hechos regulados quedan marcados como no borrables.
- **Retención:** el trabajo diario anonimiza/bloquea lo vencido y **conserva** los hechos regulados (ADR-023); registra sin datos personales en claro.
- **Paridad (ADR-034):** toda capacidad nueva no interna ni solo-personas produce herramienta; snapshot `herramientas-mcp.txt` actualizado; `apps/web` sin imports de `@opai/db` salvo `paridad-permitidos.json`.
- **e2e (375, 1024, 1280):** aceptar el DPA, ver el RAT, crear y resolver una solicitud de acceso con su exportación, registrar y revocar un consentimiento.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` antes de cada commit; `pnpm test:db` por tocar base, RLS y capacidades con base; `pnpm --filter @opai/web build` + `pnpm presupuesto` por tocar la web; Playwright local a 375/1024/1280; capturas a 375 y 1280 de las pantallas nuevas; `docs/2.0/checklists/revision.md`, `qa.md` y `paridad.md`. `tools/list` en `main` y, tras desplegar, `pnpm mcp:verificar` (Carlos). Medición de ADR-045 (≤ 8 consultas por navegación) en las pantallas de Cumplimiento.

## 14. Criterios de aceptación

- **CA-1 (DPA/DPO).** Un tenant registra la aceptación del DPA (con versión, quién y cuándo, y su historial) y el contacto de su DPO; un agente no puede aceptar el DPA ni fijar el DPO (`soloPersonas`). *(Criterio de `ROADMAP.md` 07d.)*
- **CA-2 (RAT por diseño).** El inventario de datos personales se arma de lo declarado en el Núcleo y los módulos; el gate detecta una tabla con datos personales sin declarar (según §16.6). *(ADR-029 §6.)*
- **CA-3 (solicitudes del titular).** Un titular puede pedir acceso, rectificación, cancelación, oposición, portabilidad o bloqueo; la solicitud queda registrada, con plazo, responsable y evidencia, y atendida; el acceso y la portabilidad producen una exportación legible por máquina como documento del Núcleo. *(Criterio de `ROADMAP.md` 07d.)*
- **CA-4 (retención y hechos regulados).** Un trabajo diario anonimiza o bloquea los datos vencidos según la política y **conserva** los hechos regulados (ADR-023); queda registro sin datos personales en claro.
- **CA-5 (cifrado y aislamiento).** Los campos sensibles del inventario se cifran a nivel de aplicación (ADR-027); todas las tablas nuevas con `tenant_id` tienen RLS; una key de supervisor solo ve lo de su alcance (B3).
- **CA-paridad.** Gate de paridad y presupuesto de JS en verde; `tools/list` en `main` sin capacidades de pantalla sin herramienta; todo por capacidad con `dryRun`, `idempotencyKey` y auditoría. *(Criterio de `ROADMAP.md` 07d: «todo por capacidad, con auditoría».)*

## 15. Riesgos y rollback

- **Plazo legal duro:** la ley rige el 1-dic-2026 y **B4 completo debe estar en `main` antes del 30-nov-2026**. Riesgo: que las decisiones legales de §16 lleguen tarde. Mitigación: el plan base cubre los tres PR dentro del plazo; PR 1 (DPA/DPO/RAT) y PR 2 (solicitudes/exportación) no dependen de los textos legales finos, y PR 3 (retención/cifrado) tampoco para su mecanismo (Claude propone retención y campos sensibles por defecto; Carlos confirma los valores). El orden es de secuencia, no una postergación de PR 3 para después del plazo. **Si §16 no se resuelve a tiempo, Claude se detiene, commitea lo hecho y lo reporta** (no inventa plazos ni textos legales). El alcance de B4 ante el plazo ya está **DECIDIDO** por Carlos (26-oct-2026 12:28 CLT, t320u): B4 entra completo —los tres PR, incluido PR 3— en `main` antes del 30-nov-2026 (§16.7); no se recorta ni se escalona.
- **Materia legal fuera del alcance de Claude:** el texto del DPA, las bases de licitud, los plazos de atención y los periodos de retención son criterio legal. Mitigación: el brief deja el mecanismo y valores por defecto propuestos; Carlos los confirma con revisión legal (§16). Claude no decide materia legal.
- **Hechos regulados vs. derecho de supresión (ADR-023):** borrar por una «cancelación» podría romper la inmutabilidad de marcas/firmas. Mitigación: la cancelación se traduce en anonimización/bloqueo donde la ley lo permita y conserva el hecho regulado; la supresión total solo sin obligación de conservar.
- **Rendimiento:** la exportación de un titular agrega consultas; se arma bajo demanda, no en cada navegación, y se mide contra ADR-045 en las pantallas de Cumplimiento.
- **Cifrado y búsqueda:** cifrar a nivel de aplicación campos que se usan para buscar (p. ej. RUT) rompería la búsqueda; por eso §4.6 lo limita a los sensibles que no se consultan así. Riesgo de rotación de KEK: ya cubierto por `rotar-kek` (ADR-027).
- **Migraciones:** las aplica Carlos en Neon `dev` y `main`; el PR lleva `migracion-pendiente`.
- **Rollback:** las tablas son nuevas y aditivas; al revertir el PR quedan huérfanas sin efecto. El cifrado de aplicación es más delicado: revertirlo exige descifrar primero los datos ya cifrados; por eso va en su propio PR y con prueba en `dev` antes de `main`.
- **Coordinación con 07c:** si el 07c aún no está en `main`, las capacidades de gobierno (`soloPersonas`) y el alcance (B3) de los que depende 07d no existen; por eso 07d va **después** del 07c. La retención del registro de intentos de login se agrega como categoría cuando ambas estén.

## 16. Decisiones para Carlos

Ninguna la decide Claude. Las de fondo son **legales** y conviene revisarlas con asesoría; el brief deja el mecanismo y una recomendación. Cada una trae opciones.

> **DECIDIDO (26-oct-2026 13:40 CLT, t331u).** Carlos respondió «ok pero avancemos rapido» a la recomendación de las seis decisiones de esta sección (presentada por el bot OPAI 2.0 en t329s1698 y t330s1702). Se adopta la recomendación de cada punto con las precisiones que siguen; **la única que cambia respecto del texto propuesto es §16.5** (la notificación de brechas entra en 07d, antes del 30-nov-2026). Los valores que son materia legal (plazos de atención, periodos de retención, textos del DPA, bases de licitud) **los confirma Carlos con el abogado**; Claude no los inventa (deja el mecanismo, el ajuste sin valor por defecto legal o la nota de pendiente). El alcance de B4 frente al plazo estaba decidido desde las 12:28 CLT (t320u, §16.7).

### 16.1 DPA: texto, versión y forma de aceptación

- **¿Dónde vive el texto del DPA y quién lo versiona?** Opción A: documento de plataforma (uno para todos los tenants), versionado por OPAI. Opción B: documento del Núcleo por tenant (permite ajustes por cliente). **Recomendación: A** (el DPA OPAI↔tenant es el mismo contrato base; un anexo por tenant si hace falta), con revisión legal del texto.
- **¿La aceptación bloquea algo?** Opción A: avisar al owner de forma persistente pero no bloquear la operación. Opción B: bloquear ciertas acciones hasta aceptar. **Recomendación: A** (no dejar a Gard sin sistema; la aceptación es acción de owner, no banner por usuario como en 1.0).
- **¿Dónde vive el DPO?** Recomendación: contacto en `perfil_empresa` (`dpo_nombre`, `dpo_correo`, `dpo_telefono`), editable por owner/admin. El DPO de **OPAI** es dato de plataforma para el pie legal.
- **DECIDIDO (t331u).** Un **solo DPA de plataforma, versionado por OPAI** (opción A); la **aceptación avisa al owner pero no bloquea** la operación (opción A); el **DPO va en `perfil_empresa`**. La versión vigente del DPA es un dato de plataforma (ajuste de ámbito `plataforma`); el texto legal lo fija Carlos con el abogado.
- **Aceptar el DPA es acto exclusivo del owner del tenant** (el responsable del tratamiento frente a OPAI, el encargado). **Un admin no puede aceptar el DPA aunque tenga `core:cumplimiento.manage`**: la aceptación usa un permiso propio, `core:cumplimiento.dpa_aceptar`, que solo tiene el rol `owner` (ni admin, ni gerente, ni supervisor, ni viewer). En cambio, **fijar el DPO sí es de owner/admin** (`core:cumplimiento.manage`), porque es un dato de contacto de la empresa, no el acto de obligarse por el acuerdo. La aceptación guarda, además de quién y cuándo, la **versión y el hash SHA-256 del texto aceptado** (ajuste de plataforma `cumplimiento_dpa_texto`), como prueba de a qué texto exacto se aceptó.

### 16.2 Bases de licitud y consentimiento

- **¿Qué tratamientos se apoyan en consentimiento y cuáles en otra base** (relación laboral, obligación legal, interés legítimo)? Esto define **dónde** se pide y registra consentimiento. **Recomendación (a confirmar con asesoría legal):** el tratamiento de datos del trabajador para la relación laboral y las obligaciones DT **no** se apoya en consentimiento; el consentimiento se reserva para fines accesorios (p. ej. comunicaciones comerciales a contactos). Claude deja el mecanismo general y marca por categoría la base propuesta en el inventario; Carlos/legal confirman.
- **¿El consentimiento se otorga también desde el portal del titular?** Recomendación: en 07d solo el registro interno; la captura desde el portal del trabajador/cliente llega con esos portales (fase 3), reusando el mismo modelo.
- **DECIDIDO (t331u).** **No** se pide consentimiento para la relación laboral ni las obligaciones con la DT; el consentimiento se reserva para **fines accesorios** (p. ej. comunicaciones comerciales a contactos). La **base de licitud de cada caso se confirma con asesoría legal**; en el inventario queda marcada como propuesta. En el 07d se hace **solo el registro interno** (la captura desde el portal del titular llega en fase 3).

### 16.3 Solicitudes del titular: canal, plazo y formato

- **¿Por dónde entra una solicitud?** Opción A: solo interna (el equipo del tenant la registra al recibirla por correo/papel). Opción B: además un canal del titular (formulario/portal). **Recomendación: A** en 07d (cubre el criterio de aceptación); el canal del titular con los portales de fase 3.
- **¿Plazo legal de atención?** Lo fija la ley/su reglamento; **Carlos/legal confirman los días** y 07d los calcula al recibir. Claude no inventa el número.
- **¿Formato de exportación (acceso/portabilidad)?** Recomendación: JSON legible por máquina más un PDF legible por persona (reusando documentos y marca del tenant, ADR-028). Confirmar si basta JSON/CSV.
- **DECIDIDO (t331u).** Las solicitudes se **registran internamente** (opción A). La **exportación sale en JSON y PDF**. Los **días de plazo los confirma Carlos con el abogado**: Claude no inventa el número; lo deja como un **ajuste de tenant sin valor por defecto legal** (o marcado pendiente) y lo calcula al recibir una vez fijado.

### 16.4 Retención, anonimización y supresión

- **¿Periodos de retención por categoría?** Los fija Carlos con criterio legal (p. ej. datos laborales mientras dure el vínculo + el plazo legal de conservación; intentos de login, pocos meses). Claude propone valores por defecto al implementar para que Carlos los confirme.
- **¿Qué se cifra a nivel de aplicación (sensibles)?** Recomendación: datos de salud y biometría (cuando lleguen en fase 4); evaluar caso a caso en el inventario. El RUT se mantiene como hoy (necesario para operar y buscar).
- **¿Existe una purga forzada por soporte?** Recomendación: no por defecto; si se necesita, una capacidad `soloPersonas` separada, auditada, que respete los hechos regulados.
- **DECIDIDO (t331u).** **Claude propone los periodos de retención por defecto y Carlos los confirma** con criterio legal. Se **cifran salud y biometría** (a nivel de aplicación, ADR-027). El **RUT queda como está** (necesario para operar y buscar). **No hay purga forzada** salvo una **capacidad `soloPersonas` auditada aparte**.

### 16.5 Notificación de brechas

- **¿Entra en 07d un registro de incidentes/brechas y el flujo de notificación a la Agencia y a los titulares, o se difiere a un brief operativo?** La recomendación propuesta era incluir solo un registro mínimo y diferir el flujo de notificación.
- **DECIDIDO (t331u) — CAMBIA respecto del brief propuesto.** Entran en el 07d, **antes del 30-nov-2026**, el **registro de incidentes** y el **aviso de brechas a la Agencia y a los titulares**, **manual y con plazo** (fecha, alcance, datos afectados, estado, destinatarios y evidencia del aviso). El **plazo también lo confirma el abogado** (Claude no lo inventa: ajuste sin valor por defecto legal o pendiente). Es un flujo manual por capacidad con auditoría, no un detector automático de brechas. Por secuencia de revisión y merge va en el **PR 2** (§11), sin postergarse del plazo.

### 16.6 Alcance del gate del inventario (por diseño)

- **¿El gate que exige declarar los datos personales de cada tabla es duro desde ya o informe primero?** Opción A: duro (CI falla si falta una declaración), como el gate de RLS. Opción B: informe en 07d y duro en el siguiente brief, para no frenar la fecha límite. **Recomendación: A** para las tablas que ya existen en el Núcleo (acotado y conocido) y **B** para los módulos futuros hasta que cada uno declare lo suyo. Confirmar.
- **DECIDIDO (t331u).** El gate del inventario es **duro para las tablas actuales del Núcleo** (CI falla si falta una declaración) e **informativo para los módulos futuros** hasta que cada uno declare lo suyo.

### 16.7 Alcance de B4 frente al plazo del 30-nov-2026 — **DECIDIDO**

- **DECIDIDO por Carlos (26-oct-2026 12:28 CLT, t320u).** La recomendación (t319s1656) fue, literal: «El plan de Claude dejaba la retención y el cifrado de los datos para después del 30 de noviembre. Te recomiendo hacer todo antes del 30 de noviembre, porque la ley rige completa desde el 1 de diciembre y esas dos partes también son obligatorias.» La respuesta de Carlos fue, literal: «ok a las dos» (Carlos, 26-oct-2026 12:28 CLT, t320u). Es decir, **B4 entra completo —los tres PR, incluido el PR 3 de retención y cifrado— en `main` antes del 30-nov-2026**. No se escalona ni se deja ninguna parte de B4 para después del plazo. El orden PR 1 → PR 2 → PR 3 (§11) es solo de secuencia de revisión y merge; los tres cierran antes del 30-nov-2026.

## 17. Reporte de ejecución

Al cerrar: commits integrados por PR, capturas a 375 y 1280 de las pantallas nuevas (DPA/DPO, RAT, bandeja de solicitudes, consentimientos), resultado de los tests y de `pnpm test:db`, estado del gate de paridad y del presupuesto de JS, `tools/list` en `main`, brecha B4 marcada en `paridad/nucleo.md` y `ESTADO.md`, y resumen ejecutivo para Carlos: qué se hizo, qué cambia para Gard (cumplimiento de la Ley 21.719 por diseño), qué decide él (las de §16, con criterio legal) y qué sigue (con B1–B4 en `main`, el Núcleo cierra; sigue Puestos y guardias, Brief 11).

## 18. Correcciones del PR 1 tras revisión

**Revisión 5658417110 (PEDIR CAMBIOS).** Resuelta en los commits previos del PR (resumen en `PR-BODY.md`).

**Revisión 5659458420 (PEDIR CAMBIOS, sobre `d6c2778`).** Sin decisiones de negocio nuevas; implementa lo que ya manda el brief (§6 append-only, §7.1 «texto o referencia del documento», §16.1 owner). Bloqueantes:

1. **Texto del DPA aceptado recuperable e inmutable (§7.1).** El texto vivía solo en el ajuste de plataforma `cumplimiento_dpa_texto` (mutable). Ahora, además del `documento_ref` (`<version>:sha256:<hash>`), la aceptación guarda el texto exacto en `dpa_aceptaciones.documento_texto`, en una tabla que ya es append-only (sin UPDATE/DELETE para `opai_app`): recuperable e inmutable por fila. La aceptación **rechaza si el texto está vacío** y **lee versión y texto dentro de la misma transacción** del INSERT (sin TOCTOU). `packages/capabilities/src/core/cumplimiento/dpa.ts` y migración `20261027010000_dpa_texto_aceptado`.
2. **Test de escritura cruzada del DPO.** Test negativo: un tenant no puede crear (WITH CHECK) ni modificar (USING) el DPO de otro tenant. `packages/capabilities/test/cumplimiento-db.test.ts`.
3. **El e2e del lock de `audit_events` corre en CI.** El paso e2e de `.github/workflows/ci.yml` ahora recibe `DATABASE_URL_MIGRATE` (rol propietario, mismo valor efímero del paso de migrar) y `maestros-ficha-lista.spec.ts` deja de saltarse en silencio cuando falta en CI (falla explícito).

**Recomendado.** `dpa_aceptar` exige `ctx.rol === "owner"` además del permiso propio (defensa frente a roles personalizados del #47 que pudieran otorgar el permiso sin ser owner).

## 19. Notas de ejecución (PR 2 — bloques 4, 5, 6 y 7; Claude, 26-oct-2026)

Decisiones de **implementación** (mecanismo, no materia legal; las tomó Claude como constructor, no Carlos) que no estaban explícitas en el brief y quedan registradas aquí y en `ESTADO.md`:

- **Incidentes append-only event-sourced.** El encargo pide incidentes «append-only de verdad», pero el flujo necesita avanzar el estado y marcar notificado. Se modela como un registro de hechos inmutables en `core.incidentes` agrupados por `caso_id` (registro → avances → avisos); el estado vigente es el último hecho. Así la tabla es realmente inmutable (`REVOKE UPDATE, DELETE`) sin perder las transiciones. Las solicitudes ARCO sí son mutables (su estado avanza y la auditoría prueba cada transición, §6).
- **Exportación del titular (§16.3).** En este PR se materializa el **JSON legible por máquina** como documento del Núcleo (ADR-039: huella SHA-256, bitácora encadenada, descarga por URL firmada). La versión **PDF legible por persona** se genera desde los mismos datos en la pantalla de cumplimiento (bloque 8, pendiente de Claude Design): no hay un renderizador de PDF en 2.0 y añadir una dependencia tocaría el presupuesto de JS. CA-3 queda cubierto en su parte legible por máquina; el PDF es presentación y va con la pantalla. Para materializar el archivo desde el servidor se agregó el primitivo `Almacenamiento.subir` (PUT firmado con la huella declarada, ADR-039).
- **Permiso y alcance (ADR-022).** Las capacidades de cumplimiento se autorizan con `core:cumplimiento.manage` (owner/admin) para escribir y `core:cumplimiento.read` para leer; un supervisor no las tiene (recibe `FORBIDDEN`). El alcance por instalación del supervisor (B3, Brief 07c) aún no está en `main`; cuando lo esté y se amplíe quién atiende solicitudes, el filtro por alcance se aplica en la consulta (no en la UI), como el resto del Núcleo. Hoy el aislamiento efectivo es por tenant (RLS) y por rol.
- **Bloques 6 y 7 en un commit.** Comparten el registro de capacidades (índice, catálogo de eventos, excepciones de paridad y snapshot de `tools/list`); separarlos dejaría commits intermedios que no compilan o que rompen el gate de paridad. Se integran en un commit verde, como permite `AGENTS.md` («conserva el objetivo, adapta y reporta»).
- **Plazos sin valor legal por defecto (§16.3, §16.5).** El plazo de atención de solicitudes y el de aviso de brechas son ajustes de tenant con valor por defecto `0` = «sin plazo definido»; el dominio no calcula plazo hasta que el abogado fije los días. Claude no inventa el número.
- **Las pantallas (bloques 7-UI y 8) no van en este PR:** bandeja de solicitudes, ficha y vista de consentimientos necesitan diseño en Claude Design con el Design System de OPAI 2.0 antes de construirse (regla fija de Carlos). Quedan como pendiente de diseño.

## 20. Correcciones del PR 2 tras revisión 5660172876 (BLOQUEANTE, sobre `2354e00`; Claude, 26-oct-2026)

Decisiones de implementación (mecanismo, no materia legal; las tomó Claude como constructor, citando la revisión 5660172876 del Revisor y CAR-17, que cubre los tres PR del 07d):

1. **BLOQUEANTE — la exportación del titular solo con `cumplimiento.read`.** Antes el JSON (RUT, domicilio, correos, teléfono) se vinculaba al tenant y se listaba/descargaba con `documentos.read` (lo tienen supervisor y viewer). Ahora **se vincula a su solicitud ARCO** (`documento_vinculos.entidad_tipo = "solicitud_arco"`) y las capacidades `core.documentos.list/get/url_descarga` ocultan los documentos de cumplimiento a quien no tiene `cumplimiento.read` (lista: no aparecen; obtener/descargar: «no encontrado», sin enumeración). Para que el gate sea real, **`viewer` deja de tener `core:cumplimiento.read`** (lo adquiría por el comodín `*:*.read`): los datos de la Ley 21.719 (consentimientos, solicitudes, incidentes y la exportación) son sensibles y los leen owner/admin/gerente, no el rol de solo lectura más amplio ni el supervisor. `packages/domain/src/permisos.ts`, `packages/capabilities/src/core/documentos/sensibles.ts` y `cumplimiento/solicitudes-exportar.ts`.
2. **Aviso de brecha por destinatario; «notificado» solo con todos.** El aviso es por destinatario (`agencia` y `titulares`, `DESTINATARIOS_BRECHA` en `@opai/domain`). Cada aviso es un hecho append-only; el caso pasa a **«notificado» solo cuando constan los avisos a todos los que corresponden**. Para que dos avisos concurrentes no dejen la brecha sin marcar notificada, la notificación toma un **advisory lock por caso** (`pg_advisory_xact_lock`) dentro de la transacción (sin TOCTOU). No hizo falta tocar la migración: el modelo append-only ya guarda un hecho por aviso con su destinatario.
3. **El plazo de la brecha corre desde la detección o el registro, no desde el aviso.** `incidente_notificar` calcula el plazo desde `ocurrido_en` (detección) o, si no se conoce, desde el `created_at` del registro, con los días que configure el tenant (§16.5). Antes se contaba desde el momento del aviso.
4. **`responsable_id` de una solicitud se valida como miembro activo del tenant.** `solicitud_avanzar` comprueba, por `forTenant` (solo ve membresías de este tenant), que el responsable tenga una membresía activa; si no, rechaza (no se confía en el id, ADR-022). Test negativo en memoria y en base real (un usuario de otro tenant se rechaza).
5. **Tests de escritura cruzada entre tenants.** INSERT y UPDATE de solicitudes de otro tenant, INSERT de incidente ajeno y `mismo_tenant` con un **documento real de otro tenant** (antes se probaba con un UUID inexistente). `packages/db/test/rls-cumplimiento-pr2.test.ts`.
6. **Merge de `main`.** Trajo la tabla `login_intentos` (B1, bloqueo de login): se declara en el inventario del Núcleo para no romper el gate duro del RAT (§16.6). Sin otras consecuencias.
