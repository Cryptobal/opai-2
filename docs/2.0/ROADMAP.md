# ROADMAP — OPAI 2.0 hasta terminar

**Actualizado:** 26-oct-2026 (CAR-11; antes 25-oct, CAR-10) · **Orden:** ADR-030 (nota del 25-oct: Núcleo primero, luego Puestos → Comercial → CPQ) y ADR-048 (módulos vendibles por separado) · **Vista por módulo y etapa:** [`PLAN-desarrollo.md`](PLAN-desarrollo.md) · **Estado real:** desde el 24-oct-2026 el estado de las tareas vive en Linear (`AGENTS.md`, «Tareas (Linear)») y `ESTADO.md` es la foto técnica; este archivo planifica y se actualiza si cambia el plan.

> **Las semanas son estimaciones** (25-oct: la fase 1 suma el 07b y el Brief 11 va antes de la fase 2, así que las fases 2 a 6 se corren unas 4 semanas; la fase 2 ya está ajustada y las fechas de las fases 3 a 6 se recalculan al cerrar el Núcleo), contadas desde el viernes 23-oct-2026 ( semana 1 = lunes 26-oct), para un constructor (Claude) con revisión y QA por bots y decisiones de Carlos a tiempo. Sirven para ordenar y detectar atrasos, no son compromisos. Las fases 1 y 2 se estiman con el ritmo real observado (Briefs 00 a 02 en dos días); de la fase 3 en adelante, con el juicio del documento de arranque, porque dependen de extracciones que aún no existen.

## 1. Ciclo de cada módulo (ADR-047 y ADR-043)

En qué etapa está cada módulo (reglas, diseño, aprobación, brief, en `main`) se sigue en [`PLAN-desarrollo.md`](PLAN-desarrollo.md).

1. **Extracción de 1.0** → `docs/2.0/extraccion/<modulo>.md` (si el módulo existe en 1.0).
2. **Especificación funcional** → `docs/2.0/modulos/<modulo>.md` con `_plantilla.md`, en lenguaje de negocio.
3. **Aprobación de Carlos** de la especificación.
4. **Design Prompt** → Claude Design → **diseño aprobado** por Carlos (export en `docs/2.0/design/`).
5. **Brief** → `docs/2.0/briefs/BRIEF-NN-<nombre>.md`.
6. **PR** (Claude construye; nunca integra).
7. **Revisión** (bot «Revisor OPAI 2.0», modelo contrario: APROBAR o PEDIR CAMBIOS sobre el head actual) e **integración con squash por el bot «OPAI 2.0»** cuando se cumplen las tres condiciones de ADR-043 v3 (APROBAR sin condiciones citando el SHA del head actual, checks obligatorios en verde sobre ese SHA, rama no «behind» y, si toca pantallas, nada con la etiqueta `qa-bloqueante`; sin «VETO» ni etiqueta `veto` de Carlos). Carlos puede vetar cualquier PR y recibe aviso después de cada merge. Si hay migración de Neon, Carlos la aplica antes de integrar.
8. **QA** de pantallas en celular y escritorio después del merge (bot «Diseño y QA OPAI 2.0»); un BLOQUEANTE abierto frena los merges siguientes que toquen pantallas.
9. **Resumen ejecutivo** para Carlos al cerrar (qué se hizo, qué cambia para Gard, qué decide él, qué sigue).

Las **bases transversales** (rendimiento, PWA, navegación) aplican a todo brief con pantallas: `NAVEGACION.md`, ADR-044 y ADR-045.

## 2. Fases

### Fase 1 — Núcleo · **en curso (cierre)** · semanas 1–3 (26-oct → 13-nov; estimación ajustada el 25-oct por el 07b) más los Briefs 07c y 07d (26-oct: semanas por recalcular; el 07d tiene fecha límite 30-nov-2026)

| Brief | Nombre | Estado |
|---|---|---|
| 00 · 00b · 00-infra | Fundación, DS 2.0 definitivo, infraestructura | Hecho |
| 01 · 01c | Identidad y plataforma · principios agénticos | Hecho |
| 02 (A, B, C) | Maestros y servicios del núcleo: outbox, trabajos, consumos, secretos, integraciones, maestros, documentos, configuración, comunicaciones, gobierno de agentes, pantallas | Hecho (PR #2, #5; docs #6) |
| 02 D | Infraestructura y verificación guiada (bloques 13–15) | En curso: seeds, secretos de previews y verificación guiada pendientes (ver `ESTADO.md`) |
| — | Paridad MCP del núcleo | En curso (otro chat) |
| — | Arreglos de QA del núcleo | En curso (otro chat) |
| **05** | **Paso 1 · Navegación por áreas** (ADR-046, `NAVEGACION.md`): áreas, fijados, ⌘K con acciones y recientes, barra inferior por rol, nombres únicos | Pendiente: Design Prompt → diseño con el DS V2 cargado en Claude Design → aprobación y prueba de Carlos → brief |
| **04** | **Paso 2 · Base PWA** (ADR-044): un solo manifest de OPAI con entrada al portal de cada persona, íconos, service worker, página sin conexión, actualización controlada, prueba en CI | Pendiente: brief (no necesita diseño propio) |
| **07b** | **Paso 3 · Capas de sueldo** (corrección del núcleo, ADR-036 actualizado el 25-oct): capa `instalacion`, resolución sin herencia entre capas, retiro del nivel `cargo` sin borrar datos, vínculo laboral con instalación y jornada pactada (ADR-048), anexo de contrato en borrador con plantilla base del sistema y la marca del tenant (la plantilla editable llega con el Brief 09); migración aditiva. **Va antes del brief de Puestos (Operaciones I)**, porque el puesto usa la capa «sueldo propio del puesto» | Pendiente: diseño de capas de sueldo y anexo → aprobación → brief. Movido desde la fase 2 (25-oct) |
| **07c** | **Paso 4 · Acceso y permisos** (brechas B1, B2 y B3 de `paridad/nucleo.md`): bloqueo de login persistido en la base, compartido entre instancias y con registro de cada intento (B1); roles personalizados por tenant y permisos finos por módulo y capacidad, al menos tan completos como en 1.0, con la tabla de equivalencia de roles 1.0 → 2.0 (B2); alcance del supervisor por instalación y de los portales (ADR-022): asignaciones supervisor ↔ instalación y filtro en las consultas de las capacidades, también en los portales, nunca en la UI (B3; movido desde el Brief 12, Decisión de Carlos, 26-oct-2026 9:36 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)). **Criterio de aceptación:** el bloqueo sobrevive a un reinicio y se aplica igual en dos instancias; un owner crea un rol con permisos por módulo y capacidad, y cada rol de 1.0 tiene su equivalente sin dar más permisos ni quitar acceso; un supervisor solo ve, por UI, API y MCP, las cuentas, instalaciones y personas de las instalaciones a su cargo | Pendiente: brief por escribir, lo aprueba Carlos. Numeración 07c «Acceso y permisos» y 07d «Ley 21.719» confirmada por Carlos el 26-oct-2026 a las 9:48 CLT (chat con OPAI 2.0); la propuso el bot OPAI 2.0 a recomendación de Claude (~9:23 CLT), porque el 13 y el 14 estaban ocupados. Va después del 07b (Decisión de Carlos, 26-oct-2026 9:20 CLT (transmitida por el bot Paridad, registrada por el bot OPAI 2.0)) |
| **07d** | **Paso 5 · Ley 21.719 (protección de datos)** (brecha B4): DPA aceptado y contacto del DPO en el perfil del tenant, consentimiento, atención de solicitudes ARCO, retención y exportación, por diseño. **Fecha límite: 30-nov-2026** (la ley rige el 1-dic-2026). **Criterio de aceptación:** un tenant registra la aceptación del DPA y su DPO; un titular puede pedir acceso, rectificación, cancelación u oposición y la solicitud queda registrada y atendida con plazo; todo por capacidad, con auditoría | Pendiente: brief por escribir, lo aprueba Carlos (Decisión de Carlos, 26-oct-2026 9:20 CLT (transmitida por el bot Paridad, registrada por el bot OPAI 2.0)) |
| **03** | **En paralelo · Rendimiento de navegación** (ADR-045): instrumentación, shell en el layout, caché de identidad, `forTenant` por capacidad, prefetch y caché del router, gate en CI | PR 1 integrado (#33: medición, `Server-Timing`, contador de consultas y gate como informe). **PR 2 pendiente** (arreglos y gate obligatorio). El texto del brief no está en `docs/2.0/briefs/` |

- **Orden (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 19:09–22:10 CLT):** el Núcleo se cierra antes de abrir los módulos: 05 → 04 → 07b → 07c → 07d *(07c y 07d agregados el 26-oct-2026: Decisión de Carlos 9:20 CLT, transmitida por el bot Paridad; B3 al 07c 9:36 CLT; numeración confirmada 9:48 CLT, chat con OPAI 2.0)*, con el PR 2 del 03 y la sesión D del 02 en paralelo. Al cerrar el Núcleo se abre **Puestos y guardias (Brief 11)**, adelantado desde la fase 3, y después Comercial y luego CPQ (Decisión de Carlos, 25-oct-2026 23:29, t267u–t268u).
- **Criterio de término:** **las 4 brechas Altas de paridad con 1.0 en `main`** (`paridad/nucleo.md`; Decisión de Carlos, 26-oct-2026 9:20 CLT (transmitida por el bot Paridad, registrada por el bot OPAI 2.0)): **B1** bloqueo de login persistido en la base, **B2** roles y permisos finos al nivel de 1.0 y **B3** alcance del supervisor por instalación y de los portales (ADR-022), los tres en el Brief 07c (Decisión de Carlos, 26-oct-2026 9:36 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)), y **B4** Ley 21.719 por diseño (Brief 07d, en `main` antes del 30-nov-2026). El Núcleo no se cierra hasta que las cuatro estén en `main`; el Brief 07b integrado (capas de sueldo y anexo en borrador); Carlos completa la verificación guiada del Brief 02 en `test.opai.cl` sin bloqueantes; toda capacidad que la UI usa existe en MCP; QA sin hallazgos críticos; la navegación entre Cuentas, Instalaciones, Personas, Cargos y Configuración cumple las metas de ADR-045 medidas antes y después; la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión; ADR-044 y 046 aprobados (cumplido el 24-oct).
- **Dependencias:** seeds y secretos (Carlos desde el Mac); DS 2.0 cargado en Claude Design y diseño de navegación aprobado (para el 05); diseño de capas de sueldo y anexo aprobado (las 4 preguntas de ADR-048 ya están respondidas: Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)).
- **Riesgo de plazo:** (26-oct) con el 07c (B1, B2 y B3) y el 07d en el criterio, la fase 1 ya no cabe en tres semanas; el 07d no se mueve de su fecha límite (30-nov-2026). Además, cerrar la sesión D, cinco briefs (05, 04, 07b, 07c y 07d) y sus diseños es optimista; si el diseño de navegación se atrasa, se adelantan el Brief 04 (no necesita diseño) y el 07b, y el 05 se integra cuando su diseño esté aprobado; Puestos (Brief 11) empieza cuando cierre el Núcleo (orden del 25-oct).
- **Deja de usarse en 1.0:** nada (2.0 todavía no opera para Gard).

> **Puestos y guardias (Brief 11), adelantado:** semanas 4–6 (16-nov → 4-dic), estimación del 25-oct. Su detalle sigue en la tabla de la fase 3.

### Fase 2 — Comercial, CPQ y Documentos · pendiente · semanas 7–12 (7-dic → 15-ene, con fiestas de fin de año; corrida unas 4 semanas por el 07b y el Brief 11)

> **Orden de trabajo:** esta fase empieza después de Puestos y guardias (Brief 11; Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 12:42 CLT). Después va **Comercial (CRM) y luego CPQ**, en reglas, diseño y construcción (Decisión de Carlos, 25-oct-2026 23:29 (t267u–t268u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)), porque la cotización cuelga del negocio y al ganarlo se ofrecen los puestos y RRHH los confirma (ADR-040, ADR-048 y su respuesta 3 de las 23:10). **Requisito de construcción:** los negocios (Briefs 06 y 07) existen antes del cotizador (Brief 10), porque CPQ depende de Comercial (ADR-040, ADR-048). El 07b pasó a la fase 1.

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/comercial-y-cpq.md` | Hecho |
| ADR | 040, 041 y 042 | Vigentes (041 y 042 aprobados el 23 y 24-oct) |
| Especificación | `modulos/comercial.md` | Borrador para aprobación de Carlos (24-oct) |
| Especificación | `modulos/cpq.md` | Borrador: regla de puestos y sueldos al ganar (respuesta 3 de ADR-048, 25-oct 23:10); el resto espera las 8 preguntas de la Page de CPQ |
| Especificación | `modulos/documentos.md` (explorador, editor, plantillas, firma simple) | Pendiente |
| Design Prompt | Comercial y CPQ; Documentos | Pendiente |
| **06** | **Núcleo comercial**: contactos por persona con vínculos a N cuentas (migración aditiva), etiquetas (incluye migrar `documentos.etiquetas`), actividades, ficha declarativa (ADR-041), catálogos declarativos en Configuración, fusión y transferencia | Pendiente |
| **07** | **Comercial**: bandeja de solicitudes, negocios, embudo configurable, negocio ↔ instalaciones, importación desde 1.0, sincronización 2.0 → 1.0 y conciliación diaria | Pendiente |
| **08** | **Motor CPQ** (sin pantallas): lenguaje de fórmulas, modelo de costeo versionado, costo laboral desde estructuras, margen financiero con casos dorados CD-1, CD-2 y cotizaciones reales de Gard | Pendiente |
| **09** | **Documentos**: explorador, editor de plantillas con marca, PDF, firma simple | Pendiente |
| **10** | **Cotizador CPQ y propuesta**: planilla viva, versiones, aprobación por margen, envío con plantilla de Documentos, cotización rápida | Pendiente |

- **Criterio de término:** «Gard recibe solicitudes, gestiona negocios, cotiza y envía propuestas solo en 2.0 durante dos semanas seguidas, y **1.0 deja de usarse para leads, cuentas, contactos, negocios y cotizaciones**»; la conciliación diaria 1.0 ↔ 2.0 no reporta diferencias en cuentas, contactos e instalaciones; las cotizaciones reales de Gard elegidas por Carlos dan el mismo precio al peso que en 1.0.
- **Dependencias:** fase 1 cerrada; ADR-041 y 042 aprobados; key dedicada para la API de 1.0 (sincronización); plantillas de propuesta aprobadas.
- **Deja de usarse en 1.0:** CRM (leads, cuentas, contactos, negocios, tareas, notas) y CPQ. Finanzas de 1.0 sigue leyendo cuentas y contactos sincronizados desde 2.0.

### Fase 3 — Operación y terreno · pendiente · semanas por recalcular: empieza después de la fase 2 (desde la semana 13; antes 9–17), sin cruce con ella

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/operaciones.md`: puestos y asignaciones, pautas, turnos extra, supervisión y visitas, libro de novedades | **Esqueleto** (25-oct, CAR-10); se completa contra 1.0 antes del Brief 11 |
| Extracción | `extraccion/portales.md`: Portal Guardia, Terreno, Cliente y Supervisor de 1.0, flujos, emparejamiento de dispositivos, uso real | Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte, antes del Brief 15 |
| Extracción | `extraccion/rondas-y-tickets.md` | Hecho |
| Especificación | `modulos/operaciones.md` (borrador: Puestos y guardias con reglas definidas por Carlos el 25-oct-2026 (Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación) · `modulos/rondas.md`, `modulos/tickets.md`, `modulos/portales.md` | Operaciones I escrita (25-oct); el resto pendiente |
| **11** | **Operaciones I · Puestos y guardias** (**adelantado**: va justo después del cierre del Núcleo, antes de Comercial y CPQ): puestos (1 puesto = 1 posición, PPC con motivo), asignaciones persona ↔ puesto, pauta (planilla) guardada como series y excepciones (ADR-048 §6), turnos y cobertura («confirmar cobertura» sin Asistencia) | Pendiente: aprobación del mockup y ajuste al DS V2 → brief |
| **12** | **Operaciones II**: turnos extra, supervisión y visitas, libro de novedades. El alcance del supervisor por instalación y de los portales (ADR-022, brecha B3) ya no va aquí: pasó al Brief 07c (Decisión de Carlos, 26-oct-2026 9:36 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)); este brief lo usa | Pendiente |
| **13** | **Tickets** transversal (ADR-025) | Pendiente |
| **14** | **Rondas** (ADR-024): puntos, plantillas, ejecución sin conexión con cola local, trust score, informes | Pendiente |
| **15** | **Portales Supervisor y Trabajador** con cola sin conexión (ADR-044.3) y push | Pendiente |
| **16** | **Portales Cliente y Terreno**, dispositivos emparejados (ADR-029.10), keys del cliente (ADR-033), **control de acceso físico** (portado y mejorado desde `portal/acceso` de 1.0, decisión de Carlos del 24-oct) | Pendiente |
| **17** | **Empaquetado nativo** con Capacitor (iOS y Android), GPS en segundo plano, push nativo, publicación en tiendas | Pendiente |

- **Criterio de término:** «Las pautas, turnos extra, supervisión, rondas y novedades de Gard se operan en 2.0 durante un mes completo; supervisores y guardias usan los portales de 2.0 instalados en su celular, y **1.0 deja de usarse para Operaciones, Supervisión, Rondas y portales**»; las apps están publicadas en App Store y Google Play.
- **Dependencias:** fase 2 cerrada, salvo el Brief 11 (Operaciones I · Puestos), adelantado para después del cierre del Núcleo (nota del 25-oct en ADR-030); extracciones de Operaciones y Portales; cuentas de desarrollador y D-U-N-S (en curso); base PWA (Brief 04).
- **Deja de usarse en 1.0:** Operaciones (puestos, pautas, turnos extra), Supervisión, Rondas, Portal Guardia, Portal Terreno, Portal Cliente y Portal Supervisor.

### Fase 4 — Asistencia y DT · pendiente · semanas por recalcular (antes 18–21)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/dt-normativa.md` | Hecho |
| Extracción | `extraccion/asistencia.md`: flujo de marcación, Face ID y GPS de 1.0 (no en vivo) | **Extracción pendiente**, antes del Brief 18 |
| Especificación | `modulos/asistencia.md` | Pendiente |
| **18** | **Asistencia**: marca inmutable con bitácora encadenada, comprobante, marca sin conexión como contingencia, verificación facial con prueba de vida, correcciones con oposición de 48 h | Pendiente |
| **19** | **Reportes DT y fiscalización**: seis reportes, acceso del inspector, respaldos con manifiesto, límites de jornada; inicio de certificación | Pendiente |

- **Criterio de término:** «Todas las instalaciones de Gard marcan en 2.0 durante un mes, los seis reportes DT salen de 2.0 y se presenta la solicitud de certificación»; cada regla de `dt-normativa.md` tiene su test.
- **Dependencias:** portales y dispositivos (fase 3); adaptador de biometría; decisión sobre la marca sin conexión. Operaciones es **fuente opcional** (ADR-048): sin ella, se marca contra la jornada pactada del vínculo laboral.
- **Deja de usarse en 1.0:** asistencia y reportes DT (en 1.0 no hay marcación en vivo; deja de ser el lugar de referencia).

### Fase 5 — Finanzas · pendiente · semanas por recalcular (antes 22–29)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/flujo-de-caja.md`: flujo de caja v3 de 1.0, filas, derivación al leer, proyecciones (ADR-026, insumo obligatorio) | Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte, antes del Brief 20 |
| Extracción | `extraccion/finanzas.md`: banca y conciliación (Fintoc), DTE emitidos y recibidos (SimpleAPI), factoring y cesión, rendiciones, contabilidad e informes | **Extracción pendiente**, antes del Brief 21 |
| Especificación | `modulos/finanzas.md` (con sub-módulos activables) | Pendiente |
| **20** | **Flujo de caja** al centro (planilla por semana y mes, derivada de hechos, escenarios) | Pendiente |
| **21** | **Banca y conciliación** | Pendiente |
| **22** | **Ventas y compras (DTE) y factoring** | Pendiente |
| **23** | **Rendiciones** | Pendiente |
| **24** | **Contabilidad, informes y migración del historial financiero** | Pendiente |

- **Criterio de término:** «Gard cierra un mes completo en 2.0 (flujo de caja, conciliación, facturación DTE, compras, rendiciones) con cifras cuadradas contra 1.0, y **1.0 pasa a solo lectura**».
- **Dependencias:** núcleo (cuentas, instalaciones, puestos); Comercial, CPQ, Operaciones y Nómina son fuentes opcionales (ADR-048), y para el corte de Gard se mantiene el orden de las fases 2 y 3; credenciales de DTE, banco y factoring por tenant (ADR-027); extracciones de Finanzas y flujo de caja.
- **Deja de usarse en 1.0:** todo Finanzas; 1.0 queda en solo lectura.

### Fase 6 — Nómina y Licitaciones · pendiente · semanas por recalcular (antes 30–35)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/nomina.md`: estructuras de sueldo, liquidación, previsión, anticipos, libro de remuneraciones y Previred en 1.0 | Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte, antes del Brief 25 |
| Extracción | `extraccion/licitaciones.md`: Mercado Público, secciones generadas, propuesta (en 1.0 requiere rediseño) | **Extracción pendiente**, antes del Brief 27 |
| Especificación | `modulos/nomina.md`, `modulos/licitaciones.md` | Pendiente |
| **25** | **Nómina I**: liquidación sobre un resumen de periodo (días trabajados desde Asistencia, o manual o importado sin ella; la pauta no la alimenta; ADR-048, respuesta 2) y las capas de sueldo de ADR-036; **exige Puestos (Operaciones I)** (ADR-048, respuesta 1) | Pendiente |
| **26** | **Nómina II**: previsión, libro, archivos de pago y Previred | Pendiente |
| **27** | **Licitaciones** sobre el motor CPQ | Pendiente |
| **28** | **Firma electrónica avanzada** (proveedor chileno) | Pendiente |
| **29** | **Apagado de 1.0**: archivo de datos, redirección de `opai.gard.cl`, `app.opai.cl` en producción | Pendiente |

- **Criterio de término:** «Una nómina mensual completa de Gard se liquida en 2.0 y cuadra al peso con la anterior; una licitación se presenta desde 2.0; **Gard opera 100 % en 2.0** y `opai.gard.cl` queda archivado».
- **Dependencias:** núcleo (personas, vínculo laboral, cargos, capas de sueldo y anexos de contrato) y **Puestos (Operaciones I)**, que Nómina exige porque el sueldo sale de la capa de instalación o de puesto (Decisión de Carlos, 25-oct-2026 23:08–23:10 (t263u–t265u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0); ADR-048, respuesta 1; antes Operaciones era fuente opcional). **Asistencia** es la fuente de los días trabajados (Face ID o marca manual); sin ella, entrada manual o importación Excel (ADR-048). La pauta no alimenta la nómina. Finanzas (pagos y flujo de caja) es destino opcional. Opai SpA para facturar suscripciones a otros tenants.
- **Nómina se puede adelantar** (Briefs 25 y 26 antes de las fases 3 a 5), **siempre después de Puestos (Brief 11)**, si hay un cliente que la quiera comprar sin el resto; los archivos de pago los genera Nómina, y el cruce con el flujo de caja se suma cuando Finanzas exista. **Actualización (25-oct):** Carlos, 25-oct-2026 ~21:20, chat con OPAI 2.0, según el registro del bot OPAI 2.0: no tiene clientes que comprarían solo payroll. Como el ROADMAP solo permitía adelantar Nómina si un cliente la compraba sola, Nómina queda en la fase 6. Además, desde las 23:10 Nómina exige Puestos (respuesta 1 de ADR-048), lo que también impide venderla sola.
- **Deja de usarse en 1.0:** Payroll y Licitaciones; 1.0 se apaga.

### Backlog (sin fecha)

No se portan de 1.0 y solo se reconstruyen con demanda real (lista canónica de `CONTEXTO-agentes.md`): inventario, cámaras, ATS, alertas y cobertura, incidentes, conocimiento, onboarding, comunicaciones, gamificación, psicolaboral, chat, Slack como módulo (queda como canal opcional de notificaciones) y Productividad. Además: sitio de marketing 2.0, «grupo de sueldo» (solo si un cliente lo pide; ADR-036, 25-oct) y facturación de suscripciones (con Opai SpA). *(26-oct: salen del backlog los roles personalizados, que van en el Brief 07c, y la cadencia de seguimiento comercial, que va en el módulo Comercial, configurable por paso; Decisión de Carlos del 24-oct-2026, confirmada el 26-oct-2026 9:20 CLT.)*

## 3. Mejoras sobre 1.0 por módulo

| Módulo | Mejoras documentadas | Fuente |
|---|---|---|
| Núcleo · maestros | Cuenta con RUT único y nombre canónico; una sola instalación (no una por módulo); persona única con vínculo laboral; puesto de servicio en el núcleo; estructuras de sueldo en tres capas que no se combinan (instalación, puesto y sueldo por RUT; rige la más específica) versionadas por vigencia, con anexo de contrato en el núcleo; contacto único por tenant con roles por cuenta (reemplaza los flags `recibe*`) | `extraccion/maestros.md`, ADR-005, ADR-036 (actualizado el 25-oct), ADR-040 §5, ADR-048 |
| Núcleo · configuración, notificaciones, integraciones | Un centro de Configuración por ámbitos (no una página por función); silencio por defecto en vez de ~1.000 avisos diarios; plantillas por evento con marca; secretos cifrados por tenant; consumos medidos | ADR-018, 020, 027, 031, 038 |
| Documentos | Un solo servicio con vínculos polimórficos, huella SHA-256 y bitácora, vencimientos, explorador transversal, editor de plantillas y firma en tres niveles | ADR-019, ADR-039 |
| Comercial | Negocio con instalaciones por tabla puente (no texto copiado, P1); bandeja de solicitudes separada del maestro; roles de contacto de catálogo (P6); etiquetas transversales (P8); actividad unificada en vez de nueve tablas (P9); embudo configurable con requisitos por etapa; dedupe, fusión y transferencia; agentes con vista previa | `extraccion/comercial-y-cpq.md` §2 y §4, ADR-040 |
| CPQ | Cotización siempre con negocio y una sola vigente (P2, P3); varias instalaciones por cotización sin bundles (P4); un solo estado (P5); `tenant_id` y RLS en todo (P12); catálogos del tenant, nada global (P13); variables y fórmulas por vertical (P14); enteros escalados (P15); versión congelada al enviar (P16); motor puro y en el navegador (P17); margen financiero portado con casos dorados | `extraccion/comercial-y-cpq.md`, ADR-042 |
| Rondas | Módulo vendible solo; offline-first con cola idempotente; trust score configurable; vista del cliente | `extraccion/rondas-y-tickets.md`, ADR-024 |
| Tickets | Responsable obligatorio desde la creación, SLA opcional, solicitudes de trabajadores como tipos con aprobación, sin chat | `extraccion/rondas-y-tickets.md`, ADR-025 |
| Asistencia y DT | Certificable desde el diseño: hecho inmutable, bitácora encadenada, comprobante, correcciones con oposición, reportes oficiales, acceso de inspector | `extraccion/dt-normativa.md`, ADR-023 |
| Operaciones (puestos, pautas, turnos extra, supervisión) | 1 puesto = 1 posición; catálogo de patrones por tenant; PPC con motivo; puestos creados desde la instalación u ofrecidos al ganar el negocio, con confirmación de RRHH; pauta por series. Extracción en esqueleto → `extraccion/operaciones.md`, se completa antes del Brief 11 | `modulos/operaciones.md`, ADR-036 y ADR-040 (25-oct), ADR-048 |
| Portales | Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte (a `extraccion/portales.md`), antes del Brief 15 (base ya decidida: PWA instalable, sin conexión en terreno, ADR-044) | — |
| Finanzas y flujo de caja | Flujo de caja: extracción hecha fuera del repo, sin verificar; se sube en un PR aparte (`extraccion/flujo-de-caja.md`, ADR-026), antes del Brief 20. **Extracción pendiente** → `extraccion/finanzas.md` antes del Brief 21 | ADR-026 |
| Nómina | Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte (a `extraccion/nomina.md`), antes del Brief 25 | — |
| Licitaciones | **Extracción pendiente** → `extraccion/licitaciones.md` antes del Brief 27 | — |

## 4. Bases transversales (antes del brief de Comercial)

| Base | Decisión | Documento | Implementación | Estado |
|---|---|---|---|---|
| Rendimiento | Navegación instantánea: shell persistente, esqueleto a más tardar a los 200 ms, prefetch, caché de datos, ≤ 8 consultas por navegación, gate en CI | ADR-045 | Brief 03 | ADR vigente. PR #29 (sin «rayas», caché de 30 s, prefetch del menú) y PR 1 del Brief 03 (#33: medición y gate como informe) integrados; **falta el PR 2**: shell en layout, contadores, `forTenant` por capacidad y gate obligatorio |
| PWA | Una sola app «OPAI» instalable (un manifest; abre el portal según la membresía), service worker con actualización controlada, sin conexión en terreno, push, cámara y GPS, presupuesto de terreno, prueba en CI; Capacitor para tiendas | ADR-044 | Brief 04 (base); cola sin conexión con el primer módulo de terreno; Brief 17 (tiendas) | ADR vigente; brief pendiente |
| Navegación | Áreas, menú vs. pestañas, ⌘K, fijados, barra inferior por rol, portales, activación por módulo, nombres únicos | ADR-046, `NAVEGACION.md` | Design Prompt de navegación → Brief 05 | Diseño aprobado (fuente: «Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (dictado por voz); 28 pantallas); `briefs/BRIEF-05-navegacion.md` propuesto, pendiente de su aprobación |

## 5. Próximas tareas, en orden

Orden (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)): **primero se cierra el Núcleo, después Puestos → Comercial → CPQ** (el orden de Comercial y CPQ: Decisión de Carlos, 25-oct-2026 23:29 (t267u–t268u), chat con OPAI 2.0 (registrada por el bot OPAI 2.0)). Responsable y etapa de cada módulo en [`PLAN-desarrollo.md`](PLAN-desarrollo.md). **Hecho:** PR de documentación del plan (#35, CAR-10, integrado como `f1c4064`).

0. **Diseño 1 · DS 2.0 en Claude Design:** cargarlo desde el repo (`tokens.css`, `design/export-ds-2.0/`) en «OPAI 2.0 Design System V2» (en curso: completando componentes). **Carlos** lo revisa y lo publica.
1. **Brief 05 · Navegación por áreas:** Design Prompt y diseño en Claude Design **hechos** («Confirmo que apruebo el diseño 53e9b74b» — Carlos, 26-oct-2026 10:51 CLT, chat con el Revisor OPAI 2.0 (dictado por voz); D1–D10 decididas por el bot OPAI 2.0 bajo la delegación de Carlos: «Sí, que OPAI 2.0 decida los criterios de navegación. […] Pero todos tienen que ser con la paleta de diseño» — Carlos, 26-oct-2026 10:53 CLT, chat con el Revisor OPAI 2.0 (dictado por voz), en `NAVEGACION.md` §10) → brief **propuesto** (`briefs/BRIEF-05-navegacion.md`, pendiente de la aprobación de **Carlos**) → PR A (cabecera estable, CAR-12) y PR B (navegación por áreas), Revisor, QA y merge (bot «OPAI 2.0»).
2. **Brief 04 · Base PWA:** brief (**Claude**) → aprobación de **Carlos** → construcción en `main`. Termina cuando la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión.
3. **Brief 07b · Capas de sueldo:** (preguntas de ADR-048 respondidas) diseño de capas de sueldo y anexo → aprobación de **Carlos** → brief y PR (**Claude**).
3b. **Brief 07c · Acceso y permisos** (B1, B2 y B3) y **Brief 07d · Ley 21.719** (B4, en `main` antes del 30-nov-2026): brief (**Claude**) → aprobación de **Carlos** → PR. Son condición para cerrar el Núcleo.
4. **En paralelo:** PR 2 del Brief 03 (**Claude**); sesión D del Brief 02 (**Carlos**, en su Mac: seeds, secretos de previews, verificación guiada); aprobación del mockup de Puestos (**Carlos**).
5. **Brief 11 · Puestos y guardias (Operaciones I):** ajustar el mockup al sistema si difiere → completar `extraccion/operaciones.md` → brief (**Claude**).
6. **Comercial:** v2 del mockup → `modulos/comercial.md` aprobado → Briefs 06 y 07. **Requisito:** los Briefs 06 y 07 se construyen antes del Brief 10 (cotizador), porque CPQ depende de Comercial.
7. **CPQ** (se diseña cuando cierren sus reglas): 8 respuestas de **Carlos** → `modulos/cpq.md` → diseño → Briefs 08 y 10.
8. **QA y merge por PR** de cada brief (Revisor, «Diseño y QA OPAI 2.0», bot «OPAI 2.0»).
