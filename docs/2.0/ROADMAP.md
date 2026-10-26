# ROADMAP — OPAI 2.0 hasta terminar

**Actualizado:** 25-oct-2026 (CAR-10) · **Orden:** ADR-030 (nota del 25-oct: Núcleo primero, luego Puestos → CPQ → Comercial) y ADR-048 (módulos vendibles por separado) · **Vista por módulo y etapa:** [`PLAN-desarrollo.md`](PLAN-desarrollo.md) · **Estado real:** desde el 24-oct-2026 el estado de las tareas vive en Linear (`AGENTS.md`, «Tareas (Linear)») y `ESTADO.md` es la foto técnica; este archivo planifica y se actualiza si cambia el plan.

> **Las semanas son estimaciones**, contadas desde hoy (viernes 23-oct-2026; semana 1 = lunes 26-oct), para un constructor (Claude) con revisión y QA por bots y decisiones de Carlos a tiempo. Sirven para ordenar y detectar atrasos, no son compromisos. Las fases 1 y 2 se estiman con el ritmo real observado (Briefs 00 a 02 en dos días); de la fase 3 en adelante, con el juicio del documento de arranque, porque dependen de extracciones que aún no existen.

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

### Fase 1 — Núcleo · **en curso (cierre)** · semanas 1–2 (26-oct → 6-nov)

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
| **03** | **En paralelo · Rendimiento de navegación** (ADR-045): instrumentación, shell en el layout, caché de identidad, `forTenant` por capacidad, prefetch y caché del router, gate en CI | PR 1 integrado (#33: medición, `Server-Timing`, contador de consultas y gate como informe). **PR 2 pendiente** (arreglos y gate obligatorio). El texto del brief no está en `docs/2.0/briefs/` |

- **Orden (Carlos, 25-oct):** 05 → 04 → 07b, con el PR 2 del 03 y la sesión D del 02 en paralelo. Al cerrar el Núcleo se abre **Puestos y guardias (Brief 11)**, adelantado desde la fase 3, y después CPQ y Comercial.
- **Criterio de término:** Carlos completa la verificación guiada del Brief 02 en `test.opai.cl` sin bloqueantes; toda capacidad que la UI usa existe en MCP; QA sin hallazgos críticos; la navegación entre Cuentas, Instalaciones, Personas, Cargos y Configuración cumple las metas de ADR-045 medidas antes y después; la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión; ADR-044 y 046 aprobados (cumplido el 24-oct).
- **Dependencias:** seeds y secretos (Carlos desde el Mac); DS 2.0 cargado en Claude Design y diseño de navegación aprobado (para el 05); diseño de capas de sueldo y anexo aprobado (para el 07b).
- **Riesgo de plazo:** dos semanas para cerrar la sesión D, tres briefs y un diseño es optimista; si el diseño de navegación se atrasa, el Brief 05 puede ir junto al Brief 06 y la fase 2 empieza igual con los Briefs 03 y 04 integrados.
- **Deja de usarse en 1.0:** nada (2.0 todavía no opera para Gard).

### Fase 2 — Comercial, CPQ y Documentos · pendiente · semanas 3–8 (9-nov → 18-dic)

> **Orden de trabajo (Carlos, 25-oct):** esta fase empieza después de Puestos y guardias (Brief 11). Primero CPQ y después Comercial en reglas y diseño; recomendación para que Carlos confirme: construir el núcleo comercial (Brief 06) antes que el cotizador (Brief 10), porque CPQ depende de Comercial (ADR-040, ADR-048). El 07b pasó a la fase 1.

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/comercial-y-cpq.md` | Hecho |
| ADR | 040, 041 y 042 | Vigentes (041 y 042 aprobados el 23 y 24-oct) |
| Especificación | `modulos/comercial.md` | Borrador para aprobación de Carlos (24-oct) |
| Especificación | `modulos/cpq.md` | Pendiente: propuesta en Page de Carlos con 8 preguntas abiertas; se escribe con sus respuestas |
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

### Fase 3 — Operación y terreno · pendiente · semanas 9–17 (21-dic → 19-feb, con fiestas de fin de año)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/operaciones.md`: puestos y asignaciones, pautas, turnos extra, supervisión y visitas, libro de novedades | **Esqueleto** (25-oct, CAR-10); se completa contra 1.0 antes del Brief 11 |
| Extracción | `extraccion/portales.md`: Portal Guardia, Terreno, Cliente y Supervisor de 1.0, flujos, emparejamiento de dispositivos, uso real | Extracción hecha fuera del repo (Page para Carlos); se sube tras sus respuestas, antes del Brief 15 |
| Extracción | `extraccion/rondas-y-tickets.md` | Hecho |
| Especificación | `modulos/operaciones.md` (Puestos y guardias aprobado en Page el 25-oct; mockup pendiente de aprobación) · `modulos/rondas.md`, `modulos/tickets.md`, `modulos/portales.md` | Operaciones I escrita (25-oct); el resto pendiente |
| **11** | **Operaciones I · Puestos y guardias** (**adelantado**: va justo después del cierre del Núcleo, antes de CPQ y Comercial): puestos (1 puesto = 1 posición, PPC con motivo), asignaciones persona ↔ puesto, pauta (planilla) guardada como series y excepciones (ADR-048 §6), turnos y cobertura («confirmar cobertura» sin Asistencia) | Pendiente: aprobación del mockup y ajuste al DS V2 → brief |
| **12** | **Operaciones II**: turnos extra, supervisión y visitas, libro de novedades, alcance del supervisor (ADR-022) | Pendiente |
| **13** | **Tickets** transversal (ADR-025) | Pendiente |
| **14** | **Rondas** (ADR-024): puntos, plantillas, ejecución sin conexión con cola local, trust score, informes | Pendiente |
| **15** | **Portales Supervisor y Trabajador** con cola sin conexión (ADR-044.3) y push | Pendiente |
| **16** | **Portales Cliente y Terreno**, dispositivos emparejados (ADR-029.10), keys del cliente (ADR-033), **control de acceso físico** (portado y mejorado desde `portal/acceso` de 1.0, decisión de Carlos del 24-oct) | Pendiente |
| **17** | **Empaquetado nativo** con Capacitor (iOS y Android), GPS en segundo plano, push nativo, publicación en tiendas | Pendiente |

- **Criterio de término:** «Las pautas, turnos extra, supervisión, rondas y novedades de Gard se operan en 2.0 durante un mes completo; supervisores y guardias usan los portales de 2.0 instalados en su celular, y **1.0 deja de usarse para Operaciones, Supervisión, Rondas y portales**»; las apps están publicadas en App Store y Google Play.
- **Dependencias:** fase 2 cerrada; extracciones de Operaciones y Portales; cuentas de desarrollador y D-U-N-S (en curso); base PWA (Brief 04).
- **Deja de usarse en 1.0:** Operaciones (puestos, pautas, turnos extra), Supervisión, Rondas, Portal Guardia, Portal Terreno, Portal Cliente y Portal Supervisor.

### Fase 4 — Asistencia y DT · pendiente · semanas 18–21 (22-feb → 19-mar)

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

### Fase 5 — Finanzas · pendiente · semanas 22–29 (22-mar → 14-may)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/flujo-de-caja.md`: flujo de caja v3 de 1.0, filas, derivación al leer, proyecciones (ADR-026, insumo obligatorio) | Extracción hecha fuera del repo (Page para Carlos); se sube tras sus respuestas, antes del Brief 20 |
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

### Fase 6 — Nómina y Licitaciones · pendiente · semanas 30–35 (17-may → 25-jun)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/nomina.md`: estructuras de sueldo, liquidación, previsión, anticipos, libro de remuneraciones y Previred en 1.0 | Extracción hecha fuera del repo (Page para Carlos); se sube tras sus respuestas, antes del Brief 25 |
| Extracción | `extraccion/licitaciones.md`: Mercado Público, secciones generadas, propuesta (en 1.0 requiere rediseño) | **Extracción pendiente**, antes del Brief 27 |
| Especificación | `modulos/nomina.md`, `modulos/licitaciones.md` | Pendiente |
| **25** | **Nómina I**: liquidación sobre un resumen de periodo (manual o importado; pauta y asistencia como fuentes opcionales, ADR-048) y las capas de sueldo de ADR-036 | Pendiente |
| **26** | **Nómina II**: previsión, libro, archivos de pago y Previred | Pendiente |
| **27** | **Licitaciones** sobre el motor CPQ | Pendiente |
| **28** | **Firma electrónica avanzada** (proveedor chileno) | Pendiente |
| **29** | **Apagado de 1.0**: archivo de datos, redirección de `opai.gard.cl`, `app.opai.cl` en producción | Pendiente |

- **Criterio de término:** «Una nómina mensual completa de Gard se liquida en 2.0 y cuadra al peso con la anterior; una licitación se presenta desde 2.0; **Gard opera 100 % en 2.0** y `opai.gard.cl` queda archivado».
- **Dependencias:** núcleo (personas, vínculo laboral, cargos, capas de sueldo y anexos de contrato); Opai SpA para facturar suscripciones a otros tenants. **Asistencia (fase 4), Operaciones (fase 3) y Finanzas (fase 5, pagos y flujo de caja) son fuentes o destinos opcionales**, no dependencias (ADR-048): sin ellas, el resumen del periodo se ingresa a mano o se importa desde Excel.
- **Nómina se puede adelantar** (Briefs 25 y 26 antes de las fases 3 a 5) si hay un cliente que la quiera comprar sola; los archivos de pago los genera Nómina, y el cruce con el flujo de caja se suma cuando Finanzas exista. **Actualización (25-oct):** Carlos confirmó que hoy no hay clientes de Payroll solo; Nómina se queda en la fase 6.
- **Deja de usarse en 1.0:** Payroll y Licitaciones; 1.0 se apaga.

### Backlog (sin fecha)

No se portan de 1.0 y solo se reconstruyen con demanda real (lista canónica de `CONTEXTO-agentes.md`): inventario, cámaras, ATS, alertas y cobertura, incidentes, conocimiento, onboarding, comunicaciones, gamificación, psicolaboral, chat, Slack como módulo (queda como canal opcional de notificaciones) y Productividad. Además: sitio de marketing 2.0, roles personalizados, «grupo de sueldo» (solo si un cliente lo pide; ADR-036, 25-oct), cadencia de seguimiento comercial y facturación de suscripciones (con Opai SpA).

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
| Operaciones (puestos, pautas, turnos extra, supervisión) | 1 puesto = 1 posición; catálogo de patrones por tenant; PPC con motivo; puestos creados desde la instalación o con botón con vista previa (no al ganar); pauta por series. Extracción en esqueleto → `extraccion/operaciones.md`, se completa antes del Brief 11 | `modulos/operaciones.md`, ADR-036 y ADR-040 (25-oct), ADR-048 |
| Portales | **Extracción pendiente** → `extraccion/portales.md` antes del Brief 15 (base ya decidida: PWA instalable, sin conexión en terreno, ADR-044) | — |
| Finanzas y flujo de caja | **Extracción pendiente** → `extraccion/flujo-de-caja.md` (ADR-026) antes del Brief 20 y `extraccion/finanzas.md` antes del Brief 21 | ADR-026 |
| Nómina | **Extracción pendiente** → `extraccion/nomina.md` antes del Brief 25 | — |
| Licitaciones | **Extracción pendiente** → `extraccion/licitaciones.md` antes del Brief 27 | — |

## 4. Bases transversales (antes del brief de Comercial)

| Base | Decisión | Documento | Implementación | Estado |
|---|---|---|---|---|
| Rendimiento | Navegación instantánea: shell persistente, esqueleto a más tardar a los 200 ms, prefetch, caché de datos, ≤ 8 consultas por navegación, gate en CI | ADR-045 | Brief 03 | ADR vigente. PR #29 (sin «rayas», caché de 30 s, prefetch del menú) y PR 1 del Brief 03 (#33: medición y gate como informe) integrados; **falta el PR 2**: shell en layout, contadores, `forTenant` por capacidad y gate obligatorio |
| PWA | Una sola app «OPAI» instalable (un manifest; abre el portal según la membresía), service worker con actualización controlada, sin conexión en terreno, push, cámara y GPS, presupuesto de terreno, prueba en CI; Capacitor para tiendas | ADR-044 | Brief 04 (base); cola sin conexión con el primer módulo de terreno; Brief 17 (tiendas) | ADR vigente; brief pendiente |
| Navegación | Áreas, menú vs. pestañas, ⌘K, fijados, barra inferior por rol, portales, activación por módulo, nombres únicos | ADR-046, `NAVEGACION.md` | Design Prompt de navegación → Brief 05 | ADR vigente; Design Prompt pendiente |

## 5. Próximas tareas, en orden

Orden de Carlos del 25-oct: **primero se cierra el Núcleo, después Puestos → CPQ → Comercial**. Responsable y etapa de cada módulo en [`PLAN-desarrollo.md`](PLAN-desarrollo.md).

0. **Diseño 1 · DS 2.0 en Claude Design:** cargarlo desde el repo (`tokens.css`, `design/export-ds-2.0/`) en «OPAI 2.0 Design System V2» (en curso: completando componentes). **Carlos** lo revisa y lo publica.
1. **Brief 05 · Navegación por áreas:** Design Prompt (**Claude**) → diseño en Claude Design con el sistema cargado → **Carlos** aprueba y prueba → brief (**Claude**) → PR, Revisor, QA y merge (bot «OPAI 2.0»).
2. **Brief 04 · Base PWA:** brief (**Claude**) → aprobación de **Carlos** → construcción en `main`. Termina cuando la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión.
3. **Brief 07b · Capas de sueldo:** diseño de capas de sueldo y anexo → aprobación de **Carlos** → brief y PR (**Claude**).
4. **En paralelo:** PR de documentación del plan (CAR-10); PR 2 del Brief 03 (**Claude**); sesión D del Brief 02 (**Carlos**, en su Mac: seeds, secretos de previews, verificación guiada); aprobación del mockup de Puestos (**Carlos**).
5. **Brief 11 · Puestos y guardias (Operaciones I):** ajustar el mockup al sistema si difiere → completar `extraccion/operaciones.md` → brief (**Claude**).
6. **CPQ** (se diseña cuando cierren sus reglas): 8 respuestas de **Carlos** → `modulos/cpq.md` → diseño → brief.
7. **Comercial** (ídem): v2 del mockup → `modulos/comercial.md` aprobado → Briefs 06 y 07. Recomendación para que Carlos confirme: Brief 06 (núcleo comercial) antes que el Brief 10 (cotizador).
8. **QA y merge por PR** de cada brief (Revisor, «Diseño y QA OPAI 2.0», bot «OPAI 2.0»).
