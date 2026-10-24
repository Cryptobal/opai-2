# ROADMAP — OPAI 2.0 hasta terminar

**Actualizado:** 23-oct-2026 · **Orden:** ADR-030 · **Estado real:** `ESTADO.md` manda; este archivo planifica. Cada brief que cierra actualiza su fila aquí y en `ESTADO.md`.

> **Las semanas son estimaciones**, contadas desde hoy (viernes 23-oct-2026; semana 1 = lunes 26-oct), para un constructor (Claude) con revisión y QA por bots y decisiones de Carlos a tiempo. Sirven para ordenar y detectar atrasos, no son compromisos. Las fases 1 y 2 se estiman con el ritmo real observado (Briefs 00 a 02 en dos días); de la fase 3 en adelante, con el juicio del documento de arranque, porque dependen de extracciones que aún no existen.

## 1. Ciclo de cada módulo (ADR-047 y ADR-043)

1. **Extracción de 1.0** → `docs/2.0/extraccion/<modulo>.md` (si el módulo existe en 1.0).
2. **Especificación funcional** → `docs/2.0/modulos/<modulo>.md` con `_plantilla.md`, en lenguaje de negocio.
3. **Aprobación de Carlos** de la especificación.
4. **Design Prompt** → Claude Design → **diseño aprobado** por Carlos (export en `docs/2.0/design/`).
5. **Brief** → `docs/2.0/briefs/BRIEF-NN-<nombre>.md`.
6. **PR** (Claude construye; nunca integra).
7. **Revisión** (bot «Revisor OPAI 2.0», modelo contrario: aprueba o pide cambios) e **integración por Carlos**, mientras rija la modificación de ADR-043 del 24-oct. Si hay migración de Neon, Carlos la aplica antes de integrar.
8. **QA** de pantallas en celular y escritorio (bot «Diseño y QA OPAI 2.0»).
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
| **03** | **Rendimiento de navegación** (ADR-045): instrumentación, shell en el layout, caché de identidad, `forTenant` por capacidad, prefetch y caché del router, gate en CI | Pendiente · **prioridad 1** |
| **04** | **Base PWA** (ADR-044): un solo manifest de OPAI con entrada al portal de cada persona, íconos, service worker, página sin conexión, actualización controlada, prueba en CI | Pendiente (ADR-044 vigente) |
| **05** | **Navegación por áreas** (ADR-046, `NAVEGACION.md`): áreas, fijados, ⌘K con acciones y recientes, barra inferior por rol, nombres únicos | Pendiente (Design Prompt de navegación antes) |

- **Criterio de término:** Carlos completa la verificación guiada del Brief 02 en `test.opai.cl` sin bloqueantes; toda capacidad que la UI usa existe en MCP; QA sin hallazgos críticos; la navegación entre Cuentas, Instalaciones, Personas, Cargos y Configuración cumple las metas de ADR-045 medidas antes y después; la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión; ADR-044 y 046 aprobados (cumplido el 24-oct).
- **Dependencias:** seeds y secretos (Carlos desde el Mac); Design Prompt de navegación aprobado (para el 05).
- **Riesgo de plazo:** dos semanas para cerrar la sesión D, tres briefs y un diseño es optimista; si el diseño de navegación se atrasa, el Brief 05 puede ir junto al Brief 06 y la fase 2 empieza igual con los Briefs 03 y 04 integrados.
- **Deja de usarse en 1.0:** nada (2.0 todavía no opera para Gard).

### Fase 2 — Comercial, CPQ y Documentos · pendiente · semanas 3–8 (9-nov → 18-dic)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/comercial-y-cpq.md` | Hecho |
| ADR | 040, 041 y 042 | Vigentes (041 y 042 aprobados el 23 y 24-oct) |
| Especificación | `modulos/comercial.md` | Borrador para aprobación de Carlos (24-oct) |
| Especificación | `modulos/cpq.md` | Pendiente |
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
| Extracción | `extraccion/operaciones.md`: puestos y asignaciones, pautas, turnos extra, supervisión y visitas, libro de novedades | **Extracción pendiente**, antes del Brief 11 |
| Extracción | `extraccion/portales.md`: Portal Guardia, Terreno, Cliente y Supervisor de 1.0, flujos, emparejamiento de dispositivos, uso real | **Extracción pendiente**, antes del Brief 15 |
| Extracción | `extraccion/rondas-y-tickets.md` | Hecho |
| Especificación | `modulos/operaciones.md`, `modulos/rondas.md`, `modulos/tickets.md`, `modulos/portales.md` | Pendiente |
| **11** | **Operaciones I**: asignaciones persona ↔ puesto, pauta (planilla), turnos y cobertura | Pendiente |
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
- **Dependencias:** fase 3 (puestos, asignaciones, portales y dispositivos); adaptador de biometría; decisión sobre la marca sin conexión.
- **Deja de usarse en 1.0:** asistencia y reportes DT (en 1.0 no hay marcación en vivo; deja de ser el lugar de referencia).

### Fase 5 — Finanzas · pendiente · semanas 22–29 (22-mar → 14-may)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/flujo-de-caja.md`: flujo de caja v3 de 1.0, filas, derivación al leer, proyecciones (ADR-026, insumo obligatorio) | **Extracción pendiente**, antes del Brief 20 |
| Extracción | `extraccion/finanzas.md`: banca y conciliación (Fintoc), DTE emitidos y recibidos (SimpleAPI), factoring y cesión, rendiciones, contabilidad e informes | **Extracción pendiente**, antes del Brief 21 |
| Especificación | `modulos/finanzas.md` (con sub-módulos activables) | Pendiente |
| **20** | **Flujo de caja** al centro (planilla por semana y mes, derivada de hechos, escenarios) | Pendiente |
| **21** | **Banca y conciliación** | Pendiente |
| **22** | **Ventas y compras (DTE) y factoring** | Pendiente |
| **23** | **Rendiciones** | Pendiente |
| **24** | **Contabilidad, informes y migración del historial financiero** | Pendiente |

- **Criterio de término:** «Gard cierra un mes completo en 2.0 (flujo de caja, conciliación, facturación DTE, compras, rendiciones) con cifras cuadradas contra 1.0, y **1.0 pasa a solo lectura**».
- **Dependencias:** fases 2 y 3 (cuentas, instalaciones, puestos); credenciales de DTE, banco y factoring por tenant (ADR-027); extracciones de Finanzas y flujo de caja.
- **Deja de usarse en 1.0:** todo Finanzas; 1.0 queda en solo lectura.

### Fase 6 — Nómina y Licitaciones · pendiente · semanas 30–35 (17-may → 25-jun)

| Paso | Nombre | Estado |
|---|---|---|
| Extracción | `extraccion/nomina.md`: estructuras de sueldo, liquidación, previsión, anticipos, libro de remuneraciones y Previred en 1.0 | **Extracción pendiente**, antes del Brief 25 |
| Extracción | `extraccion/licitaciones.md`: Mercado Público, secciones generadas, propuesta (en 1.0 requiere rediseño) | **Extracción pendiente**, antes del Brief 27 |
| Especificación | `modulos/nomina.md`, `modulos/licitaciones.md` | Pendiente |
| **25** | **Nómina I**: liquidación sobre asistencia y estructuras | Pendiente |
| **26** | **Nómina II**: previsión, libro, archivos de pago y Previred | Pendiente |
| **27** | **Licitaciones** sobre el motor CPQ | Pendiente |
| **28** | **Firma electrónica avanzada** (proveedor chileno) | Pendiente |
| **29** | **Apagado de 1.0**: archivo de datos, redirección de `opai.gard.cl`, `app.opai.cl` en producción | Pendiente |

- **Criterio de término:** «Una nómina mensual completa de Gard se liquida en 2.0 y cuadra al peso con la anterior; una licitación se presenta desde 2.0; **Gard opera 100 % en 2.0** y `opai.gard.cl` queda archivado».
- **Dependencias:** fase 4 (asistencia) y fase 5 (pagos); Opai SpA para facturar suscripciones a otros tenants.
- **Deja de usarse en 1.0:** Payroll y Licitaciones; 1.0 se apaga.

### Backlog (sin fecha)

No se portan de 1.0 y solo se reconstruyen con demanda real (lista canónica de `CONTEXTO-agentes.md`): inventario, cámaras, ATS, alertas y cobertura, incidentes, conocimiento, onboarding, comunicaciones, gamificación, psicolaboral, chat, Slack como módulo (queda como canal opcional de notificaciones) y Productividad. Además: sitio de marketing 2.0, roles personalizados, cadencia de seguimiento comercial y facturación de suscripciones (con Opai SpA).

## 3. Mejoras sobre 1.0 por módulo

| Módulo | Mejoras documentadas | Fuente |
|---|---|---|
| Núcleo · maestros | Cuenta con RUT único y nombre canónico; una sola instalación (no una por módulo); persona única con vínculo laboral; puesto de servicio en el núcleo; estructuras de sueldo en tres niveles versionadas por vigencia y por concepto; contacto único por tenant con roles por cuenta (reemplaza los flags `recibe*`) | `extraccion/maestros.md`, ADR-005, ADR-036, ADR-040 §5 |
| Núcleo · configuración, notificaciones, integraciones | Un centro de Configuración por ámbitos (no una página por función); silencio por defecto en vez de ~1.000 avisos diarios; plantillas por evento con marca; secretos cifrados por tenant; consumos medidos | ADR-018, 020, 027, 031, 038 |
| Documentos | Un solo servicio con vínculos polimórficos, huella SHA-256 y bitácora, vencimientos, explorador transversal, editor de plantillas y firma en tres niveles | ADR-019, ADR-039 |
| Comercial | Negocio con instalaciones por tabla puente (no texto copiado, P1); bandeja de solicitudes separada del maestro; roles de contacto de catálogo (P6); etiquetas transversales (P8); actividad unificada en vez de nueve tablas (P9); embudo configurable con requisitos por etapa; dedupe, fusión y transferencia; agentes con vista previa | `extraccion/comercial-y-cpq.md` §2 y §4, ADR-040 |
| CPQ | Cotización siempre con negocio y una sola vigente (P2, P3); varias instalaciones por cotización sin bundles (P4); un solo estado (P5); `tenant_id` y RLS en todo (P12); catálogos del tenant, nada global (P13); variables y fórmulas por vertical (P14); enteros escalados (P15); versión congelada al enviar (P16); motor puro y en el navegador (P17); margen financiero portado con casos dorados | `extraccion/comercial-y-cpq.md`, ADR-042 |
| Rondas | Módulo vendible solo; offline-first con cola idempotente; trust score configurable; vista del cliente | `extraccion/rondas-y-tickets.md`, ADR-024 |
| Tickets | Responsable obligatorio desde la creación, SLA opcional, solicitudes de trabajadores como tipos con aprobación, sin chat | `extraccion/rondas-y-tickets.md`, ADR-025 |
| Asistencia y DT | Certificable desde el diseño: hecho inmutable, bitácora encadenada, comprobante, correcciones con oposición, reportes oficiales, acceso de inspector | `extraccion/dt-normativa.md`, ADR-023 |
| Operaciones (pautas, turnos extra, supervisión) | **Extracción pendiente** → `extraccion/operaciones.md` antes del Brief 11 | — |
| Portales | **Extracción pendiente** → `extraccion/portales.md` antes del Brief 15 (base ya decidida: PWA instalable, sin conexión en terreno, ADR-044) | — |
| Finanzas y flujo de caja | **Extracción pendiente** → `extraccion/flujo-de-caja.md` (ADR-026) antes del Brief 20 y `extraccion/finanzas.md` antes del Brief 21 | ADR-026 |
| Nómina | **Extracción pendiente** → `extraccion/nomina.md` antes del Brief 25 | — |
| Licitaciones | **Extracción pendiente** → `extraccion/licitaciones.md` antes del Brief 27 | — |

## 4. Bases transversales (antes del brief de Comercial)

| Base | Decisión | Documento | Implementación | Estado |
|---|---|---|---|---|
| Rendimiento | Navegación instantánea: shell persistente, skeleton inmediato, prefetch, caché de datos, ≤ 8 consultas por navegación, gate en CI | ADR-045 | Brief 03 | ADR vigente; brief pendiente (prioridad 1). Avance parcial (24-oct, `qa/navegacion-adr-045`): sin «rayas» al navegar, caché de 5 min con refresco en segundo plano y prefetch del menú; faltan shell en layout, contadores, `forTenant` y gate en CI |
| PWA | Una sola app «OPAI» instalable (un manifest; abre el portal según la membresía), service worker con actualización controlada, sin conexión en terreno, push, cámara y GPS, presupuesto de terreno, prueba en CI; Capacitor para tiendas | ADR-044 | Brief 04 (base); cola sin conexión con el primer módulo de terreno; Brief 17 (tiendas) | ADR vigente; brief pendiente |
| Navegación | Áreas, menú vs. pestañas, ⌘K, fijados, barra inferior por rol, portales, activación por módulo, nombres únicos | ADR-046, `NAVEGACION.md` | Design Prompt de navegación → Brief 05 | ADR vigente; Design Prompt pendiente |

## 5. Próximas 10 tareas, en orden

1. **Revisor:** revisar e integrar este PR de documentación (ROADMAP, NAVEGACION, ADR-043 a 047, plantilla de especificación, flujo de trabajo).
2. **Carlos (Mac):** correr los seeds en Neon `dev` (`seed:dev-tenant` y `seed:maestros-demo`) y `main` (`seed:dev-tenant`), y cargar los secretos de GitHub para los previews por PR.
3. **Carlos con Claude:** verificación guiada del Brief 02 (bloque 14) en `test.opai.cl`; cerrar paridad MCP y arreglos de QA (otros chats) e integrarlos.
4. **Claude: Brief 03 · Rendimiento de navegación** (prioridad 1): medir línea base con el protocolo de ADR-045, aplicar los arreglos, medir después y dejar el gate en CI.
5. **Hecho (24-oct):** Carlos respondió `PREGUNTAS-carlos.md`; ADR-041, 042, 044, 045 y 046 vigentes. **Siguiente:** especificación `modulos/comercial.md` (tarea 8), que puede adelantarse mientras corren los Briefs 03 y 04.
6. **Claude: Brief 04 · Base PWA** (manifest, íconos, service worker, sin conexión mínimo, prueba en CI).
7. **Claude → Carlos:** Design Prompt de navegación; con el diseño aprobado, **Brief 05 · Navegación por áreas**.
8. **Claude:** especificaciones `modulos/comercial.md` y `modulos/cpq.md` desde ADR-040/042 y la extracción; **Carlos** las aprueba.
9. **Claude → Carlos:** Design Prompt de Comercial y CPQ en Claude Design; Carlos aprueba el diseño.
10. **Claude: Brief 06 · Núcleo comercial** (contactos multi-cuenta, etiquetas, actividades, ficha declarativa, catálogos declarativos).
