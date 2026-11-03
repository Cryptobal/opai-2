# ESTADO — OPAI 2.0

**Foto verificada contra el código de `main` en `fac5738` (#229), 3-nov-2026, más #230 integrado después (`8912c27`)**, por la [auditoría profunda](auditoria-2026-11.md) (CAR-151). Cada PR actualiza este archivo (ADR-054): lo que entra, lo que queda pendiente y lo que se decide. Una entrada «integrado» acredita el merge en `main`, no el despliegue ni la migración en Neon: eso va en la tabla de migraciones. El plan está en [ROADMAP](ROADMAP.md), las decisiones en [ADR](01-decisiones.md) y el flujo en [OPERACION-agentes](OPERACION-agentes.md). Lo anterior a esta foto está en [ESTADO-archivo](ESTADO-archivo.md).

## En curso

| PR | Qué | Estado | Migración |
|---|---|---|---|
| **CAR-154** (rama `fix/car-154-simpleapi-real-1f1d`, PR #234) | P3 auditoría: adaptador SimpleAPI v1 real, payload de emisión completo, preflight, pantalla Configuración DTE y NC con adaptador del tenant | En revisión | Sí, `20261103180000_finanzas_dte_emision_real` (**no aplicada**) |
| **CAR-152** (`fix/car-152-neon-sesion-b5fb`) | `cookieCache` 60 s, verificación de pooler y consultas pg serializadas | En revisión | No |
| **CAR-151** (rama `docs/car-151-auditoria-2026-11`) | Auditoría profunda, ESTADO limpio y plan. Además, tres arreglos triviales: gate de paridad y RAT en verde (5 tests rojos en `main` tras #223 y #224) y barra de Ventas › Nuevo visible en móvil (B1) | En revisión | No |
| #231 | Importación 1.0: programaciones recurrentes de Finanzas, destinatarios, correlativo CPQ y simulación de negocios (CAR-25) | Abierto. **No integrar sin corregir** la forma de las líneas, las frecuencias, la cuenta nula, las recurrentes inactivas hasta el corte y el correlativo dentro de la corrida ([auditoría §2.3](auditoria-2026-11.md#23-migración-desde-10-importador-packagesdbscriptsimportar-opai1-y-pr-231)); le falta la etiqueta `migracion-pendiente` | Sí, `20261103140000_finanzas_ventas_programacion` |
| #213 | Cargos y Remuneraciones (solo UI; rama `cursor/personas-pantallas-cargos-remuneraciones-65e7`): SplitScreen como Cuentas; catálogo sin montos; menú y ruta **Remuneraciones** (`/remuneraciones`, redirect `/nomina`); períodos lista+ficha; «Pasar a revisión» con R-REM-011 en UI y `nomina.periodos.cambiar_estado` (incl. dry_run). Sin migración ni cambios MCP/API `nomina.*` | En revisión (merge con `main` post #232). Pendiente: CI, Revisor y QA 375/1280 | — |
| #168 | Restablecer MFA y regenerar códigos de respaldo (CAR-54) | **En pausa**: en conflicto. Se retoma después de la migración | — |
| **CAR-162 · export** (`docs/car-162-export-cpq-v4`) | Export Claude Design **CPQ v4** aprobado por Carlos el 3-nov (prototipo navegable de 12 pasos a 375 px, `diseño/export-cpq-v4/`). Faltan escritorio, sueldos de referencia, requisitos de remuneraciones, lista con archivar, agente y modo oscuro (ver su README) | En revisión | No |

## Integrado en `main`, por módulo

Detalle, brechas y evidencia en la [auditoría §1.2](auditoria-2026-11.md#12-por-módulo). Cifras: 473 capacidades, 419 herramientas MCP, 0 faltantes de paridad pantalla → MCP, 89 capacidades sin pantalla, 140 páginas.

- **Núcleo:** maestros (cuentas con RUT único y datos tributarios #223, contactos N–N #196, instalaciones, personas, cargos), documentos y vencimientos, comunicaciones, auditoría encadenada (#71) y FORCE RLS (#79), identidad y MFA (#65, #74, #131), roles y alcance del supervisor (#46, #47, #51, #105, #106), Ley 21.719 (#56, #61, #107), plataforma (#109), calendario (#139, #143), capas de sueldo y anexo (#80–#93), Personas y Cargos PR 1 y PR 2 (#165, #214), motor de sueldos M1–M3 y captura SII de UF/UTM (#197, #210, #220, #227), firma N1 (#140, #153), ficha de cuenta post-QA (#226).
- **Configuración:** portada por grupos y v1.1 (#160, #202), acordeón del sidebar (#216), integraciones con certificado `.pfx` y tarjeta Octava (#222).
- **Comercial:** negocios y embudo (#97–#110, #194), solicitudes y canales (#184), contactos y actividad unificada (backend #190, pantallas #196), formulario web público (#224), canal agente GrowthBot (#225), importación 1.0 del núcleo (#223, solo simulación por CLI).
- **CPQ:** base y pantallas (#187, #195, #201), motor (#198), cotizar en serio con marca y plantillas (#203), cierre con aprobación por margen y PDF (#208), ficha visual (#215), propuesta técnica v2 (#218), ficha a 375 px (#228), PDF rediseñado (#229), bandeja y campana conectadas a las aprobaciones de CPQ (#230: consumidor `cpq.bandeja` y `cpq.aprobaciones.{list,get,contar}`, que delegan en las capacidades de aprobación y envío existentes).
- **Finanzas:** flujo de caja (#186, #205, #206, #207) y v2 sin cierre semanal (#219); compras, proveedores y plan de cuentas (#186); ventas DTE PR 1 y PR 2 (#204, #209); bancos y conciliación (#211, #212); CAF endurecido y pantalla de folios (#217, #221).
- **Operaciones:** Pauta mensual (#180) y diaria (#200).
- **Rondas:** configuración en el ERP y QR (#137, #141, #145).
- **Tickets:** PR 1 y PR 2 (#169, #188).
- **Nómina:** períodos, novedades, préstamos y calendario, sin cálculo (#183, #192).
- **Portales:** Trabajador PR 1 y PR 2 (#189, #199); Cliente PR 1 (#181).
- **Agente interno:** servidor y proveedores de IA (#62, #73). **No hay pantalla de chat** (CAR-120).
- **Infraestructura y rendimiento:** pool de Neon y lecturas de sesión (#100–#102, #134–#142, #193), CI sin corte por tiempo (#191), presupuesto de JS (#129).
- **Exports de diseño aprobados:** #148–#151, #154, #155, #157, #159, #161–#164, #166, #167, #170–#173, #175–#179, #185.

## Migraciones en Neon

Evidencia: retiro de `migracion-pendiente` por el operador (ADR-054). Ningún PR tiene el aviso escrito de «aplicada en dev y main». Hasta `20261028230000` están todas declaradas aplicadas (`migraciones.md`).

| Estado | Migraciones |
|---|---|
| Aplicadas (etiqueta retirada) | #200 `pauta_diaria_pr2` · #201 `cpq_lineas_montos` · #204 `finanzas_ventas_pr1` · #207 `finanzas_flujo_bigint` · #210 `nucleo_remuneraciones_m2m3` · #211 `finanzas_bancos_pr1` · #214 `personas_cargos_pr2` |
| **Sin evidencia: integradas con la etiqueta aún puesta** | #181 `portal_cliente_acceso` · #199 `solicitud_arco_detalle_portal` · #203 `cpq_pr103` y `cpq_marca_plantillas` · #205 `finanzas_flujo_pr2` · #217 `finanzas_caf_endurecido_pr3` · #218 `cpq_propuesta_tecnica` · #219 `finanzas_flujo_sin_cierre` · #223 `cuentas_datos_tributarios_dte` · #224 `comercial_leads_formulario_web` · #225 `comercial_solicitudes_canal_agente` |
| **Sin evidencia: nunca etiquetadas** | #209 `finanzas_ventas_pr2` · #220 `remuneraciones_sii_ventana_tz`, `remuneraciones_sii_rol_cron` y el seed SII |

**Acción O1 del ROADMAP:** el operador las verifica en Neon, aplica las que falten con respaldo, deja el aviso en cada PR y retira la etiqueta.

## Pendientes

**Bloqueantes para migrar Gard (plan P1–P10 del ROADMAP):**
- **Adaptadores SimpleAPI y Octava que no corresponden a la API real** (`packages/integrations/src/sii/simpleapi.ts`, `cesion/octava.ts`).
- Emisión sin CAF, detalle ni referencias.
- NC siempre simulada (`ventas-nc-escritura.ts:41`).
- SimpleAPI no activable desde la pantalla (`finanzas.dte_config.*` sin pantalla y dos fuentes de ambiente).
- Ficha de venta sin acciones.
- Sin envío del DTE al cliente.
- Consulta al SII por RUT inexistente.
- Importador sin origen (no hay exportador de 1.0) y que degrada datos: todo queda como prospecto, la razón social se rellena con el nombre y al actualizar escribe nulos.
- Recurrentes de #231 que no calzan con 1.0.
- Seguimiento de cotizaciones solo en especificación.
- **Infraestructura:**
  - Cortes de conexión con Neon en `test.opai.cl`: 1.585 errores de conexión en 7 días, que afectaron a 29 usuarios; siguen activos ([auditoría §4.1](auditoria-2026-11.md#41-errores-reales-en-testopaicl-vercel-27-oct--3-nov)).
  - GitHub Actions en `startup_failure` desde el 31-oct.
- **Diseño y QA:** bugs B2–B12 ([auditoría §4.2](auditoria-2026-11.md#42-bugs-de-pantalla-por-código-y-capturas-confirmar-en-vivo)); refresco visual C1–C5 como propuesta para Carlos.
- **Código:**
  - `typecheck` y `build` se quedan sin memoria en máquinas de 7–8 GB.
  - N+1 en las alertas de pauta y en la importación de flujo y de compras.
  - Formateadores repetidos.
  - Código muerto: `modules/*/ui`, `cpq/domain/motor/proveedor-stub.ts`, `finanzas/flujo/_componentes/cierre-ui.ts`, `personas/_componentes/{tabla-sueldo,selector-puesto,sueldo-comun}`.
- **Pantallas que faltan sobre capacidades existentes:**
  - Notas y tareas en las fichas (`core.actividades.*`), etiquetas y archivar contacto.
  - Revocar invitación.
  - Editar el catálogo de CPQ.
  - Editar la ficha laboral de Persona PR 2.
  - Firmante de empresa y política de firma.
  - Confirmar remuneraciones.
- **Deudas declaradas:**
  - `/verificar/[token]` lee la base sin capacidad.
  - Umbral de horas de Pauta fijo en el código.
  - Fuentes de seed M2 del motor de sueldos y la publicación humana de los 9 indicadores que no son UF/UTM (`motor-sueldos.md` R5).
  - Tope de JS de la ficha de cuenta en 166 KB (CAR-74).
- **Operación sin evidencia:** revocación de la key `*` de Gard (CAR-56).
- **Cerrados por esta auditoría:**
  - Los pendientes no bloqueantes del 29 y 30-oct ya están resueltos en el código: toast con `max-md:` y mapa «Sin ubicación».
  - El error de `/finanzas/flujo` (función pasada a un componente cliente) no aparece en Vercel desde el 2-nov 05:33; hay que confirmarlo en la QA en vivo.

## Decisiones y riesgos vigentes

- **Decisiones pendientes de Carlos:** D2–D8 del [ROADMAP §5](ROADMAP.md#5-decisiones-que-necesita-carlos) (migraciones, acceso de solo lectura a 1.0, fecha de corte, credenciales DTE, diseño, CAR-120 y orden de Linear). **D1 (`cookieCache` 60 s) aceptada el 3-nov-2026 (CAR-152).**
- **Regla de integración reafirmada:** no se integra con `migracion-pendiente` puesta (ADR-043 v3, ADR-054). Diez PR se integraron así (#181 y nueve entre el 1 y el 3-nov).
- **BYPASSRLS de `neondb_owner`:** el dueño de las tablas en Neon (rol de `prisma migrate deploy`) tiene BYPASSRLS, así que FORCE no le afecta. La garantía es `opai_app` sin BYPASSRLS con `tenant_isolation` (ADR-002, [NUCLEO-G2](briefs/NUCLEO-G2-force-rls.md)). Toda migración de datos posterior a `20261028170000` verifica las filas afectadas (`REGLAS-codigo.md`).
- **Inspector DT:** solo lectura; ve sueldos, auditoría y montos sensibles (`core:estructuras.read_sensible`, decisión t479u del 26-oct; `packages/db/scripts/roles-base-plantillas.ts`).
- **`IF NOT EXISTS` en migraciones:** no valida el esquema de lo que ya existe. Una migración nueva no depende de eso para reintentos si no tiene un test equivalente (`plataforma-migracion-reintento.test.ts`).
- **Ley 21.719:** integrada (#56, #61, #107), pero eso no acredita cumplimiento legal ni activación operativa. Confirmar el plazo de retención con el abogado antes de activarla. La marca «No recontratar» queda bloqueada en producción hasta el 1-dic-2026.
- **Prisma drift heredado** entre migraciones y schema (FK de Pauta, visto en el merge de CAR-81): sigue sin diff vacío acreditado.
