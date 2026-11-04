# ESTADO — OPAI 2.0

**Foto verificada contra el código de `main` en `fac5738` (#229), 3-nov-2026, más #230 integrado después (`8912c27`)**, por la [auditoría profunda](auditoria-2026-11.md) (CAR-151). Cada PR actualiza este archivo (ADR-054): lo que entra, lo que queda pendiente y lo que se decide. Una entrada «integrado» acredita el merge en `main`, no el despliegue ni la migración en Neon: eso va en la tabla de migraciones. El plan está en [ROADMAP](ROADMAP.md), las decisiones en [ADR](01-decisiones.md) y el flujo en [OPERACION-agentes](OPERACION-agentes.md). Lo anterior a esta foto está en [ESTADO-archivo](ESTADO-archivo.md).

## En curso

| PR | Qué | Estado | Migración |
|---|---|---|---|
| **CAR-183 · PR B indicadores legales** (rama `brief/car-183-indicadores-legales-previred`, [brief](briefs/BRIEF-indicadores-legales-previred.md)) | Captura mensual de ingreso mínimo, topes, AFP, SIS y cesantía desde Previred: renueva si coincide, propone si cambió (la aprueba una persona de plataforma en Plataforma → Valores legales) y, si la fuente falla, conserva el último valor con aviso sin bloquear. Reforma, mutual, jornada e impuesto no salen de Previred y quedan sin lector. **Falta validar la primera lectura contra la página real** | En revisión | Sí, `20261105100000_remuneraciones_previsional_propuestas` (aditiva; etiqueta `migracion-pendiente`) |
| **CAR-182 · Orden del menú** (rama `brief/car-182-menu-orden`, [brief](briefs/BRIEF-CAR-182-menu-orden.md), PR 1 de 2) | Menú por uso: Comercial (con Cuentas y Contactos; el área Clientes desaparece), Operaciones, Personas, Finanzas y Documentos. Bandeja una sola vez, con número (cambia D5, decisión de Carlos del 3-nov); Inicio ya no monta la bandeja completa y «Ver todo» de la campana va a `/bandeja`. Salen del menú Cargos (a Configuración › Operación), Configuración DTE y Folios (a Configuración › Empresa, solo con Finanzas activo, campo `modulo` nuevo en `Seccion`) y Plan de cuentas (ya estaba en Configuración › Módulos › Finanzas). Remuneraciones queda en Personas con ese nombre y Firmas en Documentos, rotulada «Documentos». Ninguna URL cambia | En revisión | No |
| **CAR-162 · aviso sueldo CPQ** (rama `fix/cpq-aviso-sueldo-unico`) | Ficha de cotización: el aviso «Ingresar sueldo» solo en la línea del puesto; encabezado y resumen muestran «Costo pendiente»; sin repetición en la barra fija móvil | En revisión | No |
| **CAR-162** (rama `brief/car-162-actividad-tareas`, [brief](briefs/BRIEF-comercial-actividad-tareas.md)) | Comercial · Actividad y tareas: compositor (nota, llamada, reunión, tarea) y línea de tiempo mixta en negocio, cuenta e instalación; Mis tareas (`/tareas` y panel en Inicio); aviso diario de tareas vencidas (evento comunicable, silencio por defecto); `TareaFila` y `CompositorActividad` en el DS | En revisión | Sí, `20261103200000_core_actividades_aviso_vencida` (aditiva) |
| **CAR-162 · Cuenta con datos del SII** (rama `brief/car-162-cuenta-sii`, [brief](briefs/BRIEF-comercial-ganar-sii.md) PR 2, apilado sobre el PR 1) | Consulta de contribuyente por RUT detrás de la interfaz `ConsultaContribuyente` (`@opai/integrations`), con el proveedor SimpleAPI RUT (`rut.simpleapi.cl/v2`) y uno «no configurado» que lo dice. Integración nueva `sii_contribuyente`, con la key cifrada del tenant. Capacidades `core.cuentas.consultar_sii` (lectura auditada, datos del SII marcados como externos), `core.cuentas.aplicar_sii` (escritura con vista previa, campo por campo, que vuelve a consultar al SII y nunca toma valores del input) y `core.cuentas.facturable`, todas con MCP. Dominio «Lista para facturar» en `@opai/domain`; componente `DatosSII` en el DS con sus estados en `/ds/qa`, y en la ficha de cuenta el bloque «Datos tributarios» con «Consultar SII». **Necesita la API key de SimpleAPI RUT** | En revisión | No |
| **CAR-162 · Ganar con efectos** (rama `brief/car-162-ganar-efectos`, [brief](briefs/BRIEF-comercial-ganar-sii.md) PR 1) | R18 y R45: al ganar, el consumidor `comercial.ganar.activar` pasa la cuenta a cliente activo y activa las instalaciones del negocio (prospecto o inactivas), y `cpq.ganar.aceptar` deja aceptada la versión enviada de la cotización vigente, rechaza las demás abiertas y emite `cpq.cotizacion.aceptada` con los puestos por ofrecer. Idempotentes, en transacción y con evento por cambio. `comercial.negocios.ganar` devuelve `efectos` también en la vista previa, y la hoja ganar muestra «Qué va a pasar», confirmando, éxito con enlaces y error del servidor. La oferta de puestos (R2) y el SII (PR 2) quedan pendientes | En revisión | No |
| **CAR-153** (`claude/new-session-gpqpn4`, PR A1 del [brief A](briefs/brief-A-comercial-finanzas.md)) | Textos y estilos: clases `t-*` vigiladas por test (B2), formateador único con espacio duro en `@opai/domain` (B3, R4), estados de venta en español (B4), sin referencias internas ni jerga (B5, B6), errores del servidor en español (B7, B8), calendario de pagos sin JSON (B10), un solo título en Bancos y Venta (B11) y Bandeja de Inicio con error visible (B12). Quedan en A5: refresco visual C1–C5 | En revisión | No |
| **CAR-67** (rama `brief/car-67-seguimiento-comercial`) | Seguimiento comercial automático, PR 1: planes versionados por empresa con plan base por vertical, pasos en días hábiles (correo, WhatsApp, llamada, interno), trabajo horario y consumidor de cierre, 11 capacidades con MCP, pestaña Seguimiento del negocio, pendientes, configuración de planes y receptor firmado del correo entrante `@respuestas.opai.cl` ([brief](briefs/BRIEF-seguimiento-comercial.md)) | En revisión | Sí, `20261103200000_comercial_seguimiento` (**no aplicada**) |
| **CAR-154** (rama `fix/car-154-simpleapi-real-1f1d`, PR #234) | P3 auditoría: adaptador SimpleAPI v1 real, payload de emisión completo, preflight, pantalla Configuración DTE y NC con adaptador del tenant | En revisión | Sí, `20261103180000_finanzas_dte_emision_real` (**no aplicada**) |
| **CAR-152** (`fix/car-152-neon-sesion-b5fb`) | `cookieCache` 60 s, verificación de pooler y consultas pg serializadas | En revisión | No |
| **CAR-151** (rama `docs/car-151-auditoria-2026-11`) | Auditoría profunda, ESTADO limpio y plan. Además, tres arreglos triviales: gate de paridad y RAT en verde (5 tests rojos en `main` tras #223 y #224) y barra de Ventas › Nuevo visible en móvil (B1) | En revisión | No |
| **CAR-25 · B1** (rama `claude/new-session-bgvb4t`, continúa #231) | Recurrentes con la forma real de 1.0 (`FinanceDteRecurringTemplate`): líneas con cantidad, precio CLP o UF, descuento y exento; frecuencias mensual/quincenal/semanal/anual; día -1; tipos 33/34/56/61; receptor congelado cuando 1.0 no tiene cuenta en 2.0; destinatarios por correo; importadas **pausadas y sin próxima ejecución** (no se copia `nextRunAt`) con `ultimo_periodo_1_0`; informe con `omitidas[]`. Tabla `ventas_programaciones_corridas` (UNIQUE programación + período) para el brief A4. Reemplaza a #231, que el operador cierra | En revisión | **Sí**: `20261103160000_finanzas_programacion_forma_1_0` (aditiva; etiqueta `migracion-pendiente`) |
| **CAR-161 · B5** (rama `fix/car-161-salud-codigo`) | Salud del código. **R5** borra `modules/*/ui` sin consumidores, `proveedor-stub`, `cierre-ui`, `tabla-sueldo`, `selector-puesto`, `sueldo-comun` y la capacidad `finanzas.cierres.listar` (el histórico de cierres ya no tiene lectura por MCP; los datos siguen en la tabla). **R6** quita `zod` sin uso de cuatro módulos. **R7** `pnpm.overrides` deja una sola versión de `react`, `react-dom` y `zod`. **R3** alertas de pauta (93 → 12 consultas con 30 puestos, iguales con 3) e importación CSV del flujo (consultas constantes con 10 o 500 filas; ahora aplica todo o nada). **R2 parcial**: `TenantTx` se deriva del `tx` exacto de Prisma y el chequeo de tipos baja de 54 s a 37 s, pero el typecheck de la web sigue necesitando más de los 2 GB por defecto (ver Pendientes) | En revisión | No |
| **CAR-162 parte 1** (rama `brief/car-162-cpq-v4-puesto`, [brief](briefs/BRIEF-CPQ-v4-puesto-margen.md), apilada sobre el PR #242) | CPQ v4: sueldo de referencia por cargo (supuesto de venta, versionado por vigencia), hoja de puesto completa (cargo, patrón, horas, bruto o líquido objetivo, colación y movilización por persona, AFP, salud y contrato por línea con defecto del tenant), `liquidoABruto` en dominio, parámetros financieros y meses de contrato por versión pasan al motor, capacidades con dryRun y MCP, «Sueldos de referencia para cotizar» en el catálogo | En revisión | Sí: `20261103200000_cpq_puesto_referencia` (pendiente) |
| **CAR-162** (rama `fix/car-162-cpq-desbloqueo`, PR A de la [auditoría CPQ](auditoria-cpq-2026-11.md), [brief](briefs/BRIEF-CPQ-desbloqueo-CAR-162.md)) | Desbloqueo de la primera cotización: mutual adicional sin confirmar se calcula con 0 % con aviso y **bloquea el envío al cliente** (pantalla, API y MCP); avisos tipados `mutual_sin_confirmar`, `sueldo_faltante` y `juego_legal_faltante` sin montos; enlaces a `/configuracion/remuneraciones` (sin 404) y `?mutual=1` abre la confirmación; el aviso de sueldo abre la hoja del puesto (se retira «Ver cargos»); `use-capacidad` estable (arregla el «Generando PDF…» infinito y el mismo bucle en 7 pantallas); vista previa con error, «Reintentar» y 20 s máximo; resumen sin cálculo con «—»; Recalcular informativo; plurales; e2e `cpq-tenant-vacio.spec.ts` | En revisión | No |
| #213 | Cargos y Remuneraciones (solo UI; rama `cursor/personas-pantallas-cargos-remuneraciones-65e7`): SplitScreen como Cuentas; catálogo sin montos; menú y ruta **Remuneraciones** (`/remuneraciones`, redirect `/nomina`); períodos lista+ficha; «Pasar a revisión» con R-REM-011 en UI y `nomina.periodos.cambiar_estado` (incl. dry_run). Sin migración ni cambios MCP/API `nomina.*` | En revisión (merge con `main` post #232). Pendiente: CI, Revisor y QA 375/1280 | — |
| #168 | Restablecer MFA y regenerar códigos de respaldo (CAR-54) | **En pausa**: en conflicto. Se retoma después de la migración | — |

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

Al 3-nov-2026 todas las migraciones integradas en `main` están aplicadas en Neon `dev` y `main`, incluida `20261103140000_finanzas_ventas_programacion` (#231, instrucción de Carlos en el brief B). Esa migración no se edita: las correcciones van en migraciones aditivas nuevas.

| Estado | Migraciones |
|---|---|
| Aplicadas en `dev` y `main` | Las 76 de `main` y `20261103140000_finanzas_ventas_programacion` |
| **Pendiente de aplicar (etiqueta `migracion-pendiente`)** | `20261103160000_finanzas_programacion_forma_1_0` (CAR-25 · B1); `20261103200000_comercial_seguimiento` (CAR-67) |

Los avisos escritos de «aplicada con respaldo» siguen siendo el requisito de ADR-054 para cada PR nuevo con migración: el operador respalda, aplica `dev` → `main`, deja el aviso en el PR y retira la etiqueta.

## Pendientes

**CAR-182 (menú e Inicio):**
- **PR 2 · Inicio y menú visual:** indicadores por módulo en Inicio (cobertura de hoy, negocios abiertos, facturado del mes, tickets), «Requiere tu decisión», operación de la noche, embudo y vencimientos, con capacidades `core.inicio.*` y paridad MCP; sidebar con áreas con icono, área abierta destacada e hijos indentados. Espera la aprobación de Carlos del [diseño v2](https://claude.ai/artifact/9h3Et9xT5rosuksxapP8Hb).
- **PR 3 · Explorador de Documentos:** la pantalla central que falta (las capacidades `core.documentos.*` existen). Necesita Design Prompt y diseño aprobado. Hasta entonces el área Documentos solo tiene Firmas.
- Al abrir Cargos, Folios o Facturación electrónica desde Configuración, el menú no marca Configuración como activa: lo resuelve el PR 2.
- Plan de cuentas: sin la entrada del menú, se llega por Configuración › Módulos › Finanzas, que pide `core:config.read` y, para la pestaña, `finanzas:plan.manage`. Un usuario con solo `finanzas:read` conserva la URL pero pierde el camino; si hace falta, el PR 2 agrega un acceso desde Finanzas.

**CAR-67 (seguimiento comercial), para el PR 2:** variantes y etiquetas del plan; tarjeta en Inicio; hoja de CPQ al enviar la cotización (hoy se inicia a mano o por MCP); cierre aplicado automático y mover etapa al responder; aviso comunicable al vendedor cuando el cliente responde; mostrar en pantalla el texto de los correos entrantes (hoy se guarda como dato externo); entrada de menú para Pendientes (hoy hay enlace en el tablero). **Necesita de Carlos:** aplicar la migración con respaldo, y que `RESEND_INBOUND_WEBHOOK_SECRET` y `RESEND_API_KEY` estén en Vercel con el webhook de Resend apuntando a `/api/webhooks/resend/entrante`. Sin e2e ni capturas a 375/1024/1280: el entorno del constructor no tiene sesión contra `dev`.

**R2 (CAR-161): typecheck de la web sin la bandera de memoria.** Medido el 3-nov-2026: `tsc` sobre `packages/capabilities` genera 1,2 millones de tipos y usa ~2,8 GB (la web, que importa las capacidades como fuente, ~2,5 GB); el tope por defecto de Node es 2,1 GB. Cerca de un tercio de los tipos viene del cliente de Prisma (~300 modelos), y el resto son los esquemas zod y los tipos inferidos de las capacidades. Lo que se arregló: una comparación estructural entre dos `Omit<ClienteApp, …>` que costaba ~17 s. Lo que falta: **referencias de proyecto** (`composite`, `declaration` y `references` por paquete, con `tsc -b`), para que la web lea `.d.ts` y no vuelva a chequear las capacidades. Es un cambio de configuración de todos los paquetes (tests y scripts que cruzan paquetes por rutas relativas hay que separarlos) y va en su propio PR.

**Comercial · Actividad y tareas (CAR-162), segundo PR:** ChipsEtiquetas y filtro por etiqueta en listas, archivar/restaurar contacto, tarjetas «Próxima tarea» y «Último contacto real» en el Resumen del negocio y la actividad en la ficha de contacto (hoy sin pestañas). El aviso de tareas vencidas no envía nada hasta que el tenant crea una regla en Comunicaciones (ADR-020); el ajuste `actividades_aviso_responsables` agrega la campana a los responsables.

**Bloqueantes para migrar Gard (plan P1–P10 del ROADMAP):**
- **Adaptadores SimpleAPI y Octava que no corresponden a la API real** (`packages/integrations/src/sii/simpleapi.ts`, `cesion/octava.ts`).
- Emisión sin CAF, detalle ni referencias.
- NC siempre simulada (`ventas-nc-escritura.ts:41`).
- SimpleAPI no activable desde la pantalla (`finanzas.dte_config.*` sin pantalla y dos fuentes de ambiente).
- Ficha de venta sin acciones.
- Sin envío del DTE al cliente.
- Consulta al SII por RUT: hecha en el PR 2 de CAR-162, pero **no funciona en vivo hasta que Carlos cargue la API key de SimpleAPI RUT** en Configuración › Integraciones › «Datos del SII por RUT» (suscripción distinta de la emisión DTE). Quedan pendientes la caché por (empresa, RUT), la consulta en lote del importador, la consulta al crear la cuenta y el indicador en la lista de cuentas (P5 del brief A).
- Ganar un negocio no activaba cuenta ni instalaciones (R18): resuelto en el PR 1 de CAR-162. Falta la **oferta de puestos al ganar** (R2 de CPQ): el evento `cpq.cotizacion.aceptada` ya trae `puestosPorOfrecer`, y la hoja «Crear puestos» (CPQ v4) y la confirmación de RRHH van en su propio PR.
- Importador sin origen (no hay exportador de 1.0) y que degrada datos: todo queda como prospecto, la razón social se rellena con el nombre y al actualizar escribe nulos.
- Recurrentes con la forma de 1.0: corregido en B1 (CAR-25); falta la generación de borradores (brief A4) y el exportador de 1.0 (B2).
- Seguimiento de cotizaciones solo en especificación.
- **Infraestructura:**
  - Cortes de conexión con Neon en `test.opai.cl`: 1.585 errores de conexión en 7 días, que afectaron a 29 usuarios; siguen activos ([auditoría §4.1](auditoria-2026-11.md#41-errores-reales-en-testopaicl-vercel-27-oct--3-nov)).
  - GitHub Actions en `startup_failure` desde el 31-oct.
- **CPQ después de CAR-162 (plan de la [auditoría CPQ §5](auditoria-cpq-2026-11.md#5-plan)):**
  - **PR B** (CAR-183, en revisión): automatiza 5 de los 9 indicadores legales que no son UF/UTM (ingreso mínimo, topes, AFP, SIS, cesantía) desde Previred, con cambio propuesto y aprobación humana. Pendiente: lector para reforma, mutual, jornada e impuesto (no salen de Previred; impuesto puede leerse del SII).
  - **PR C (entregado en CAR-162 parte 1, falta la pantalla «Margen y finanzas»: editar margen, modo y parámetros financieros por versión; la capacidad `cpq.versiones.parametros` ya existe):** sueldo de referencia por cargo con autocompletado en la línea y hoja de puesto completa (cargo, patrón, días, tramos, colación, movilización, AFP y salud, líquido → bruto). Depende del diseño v4.
  - **PR D:** parámetros financieros por versión, margen y finanzas en pantalla, catálogo editable y drawer de envío fiel al v3. Depende del diseño v4.
  - **PR E:** compartir y WhatsApp, crear puestos al ganar y archivar. Depende del diseño v4.
  - **Design Prompt v4** ([`design/DESIGN-PROMPT-cpq-v4-modulo-completo.md`](design/DESIGN-PROMPT-cpq-v4-modulo-completo.md)): pendiente de pasar por Claude Design y de la aprobación de Carlos.
  - Riesgo aceptado (decisión de Carlos, 3-nov): cotizar con la mutual al 0 % subestima el costo si la tasa real es mayor; lo mitigan el aviso y el bloqueo de envío.
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
