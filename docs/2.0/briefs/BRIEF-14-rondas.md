# BRIEF DE IMPLEMENTACIÓN — 14 RONDAS (puntos de control por QR y GPS)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución (a crear por quien construya):** `brief/14-rondas` (desde `main` actualizado) · **Fecha de este brief:** 29-oct-2026 · **Tarea:** CAR-72 (`Fixes CAR-72` en el PR) · **Fase:** 3 (y la parte nativa en el Brief 17, ADR-044.8) · **Estado:** escrito en la rama `docs/brief-14-rondas` (solo documentos); pendiente de abrir el PR y de que alguien lo ejecute.

**Especificación aprobada:** [`docs/2.0/modulos/rondas.md`](../modulos/rondas.md) (aprobada por Carlos el 29-oct-2026, 14:58 CLT, ADR-047; reglas R1–R35, estados §6, permisos §7, eventos §8, herramientas MCP §9, dependencias §10, criterios de aceptación §13). **Design Prompt:** [`docs/2.0/design/DESIGN-PROMPT-rondas.md`](../design/DESIGN-PROMPT-rondas.md). **Diseño (mockup v3), referencia visual aprobada:** [`docs/2.0/diseño/export-rondas/`](../diseño/export-rondas/) — **Decisión de Carlos, 29-oct-2026 16:29 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)**. **Benchmark:** [`docs/2.0/referencias/benchmark-rondas.md`](../referencias/benchmark-rondas.md). **Extracción de 1.0:** [`docs/2.0/extraccion/rondas-y-tickets.md`](../extraccion/rondas-y-tickets.md), ADR-024. **Reglas generales:** `AGENTS.md`, `docs/2.0/REGLAS-codigo.md` (en particular «Hechos regulados», «Migraciones de datos después de FORCE RLS»), ADR-004/ADR-034/ADR-055 (paridad y agent-first), ADR-016 (permisos), ADR-018/ADR-038 (Configuración por ámbitos), ADR-020 (silencio por defecto), ADR-022 (alcance en la consulta), ADR-023 (hechos regulados, GPS no bloquea), ADR-027 (integraciones y geolocalización del núcleo), ADR-028 (marca del tenant), ADR-029 (outbox, trabajos, consumos, dispositivo en el punto 10), ADR-031 (consumos por clase de tarea), ADR-037 (presupuesto de JS), ADR-044 (PWA y terreno), ADR-045 (rendimiento), ADR-048 (fuentes opcionales entre módulos), ADR-049 (agente interno).

> **1.0 es el piso.** Todo lo que `extraccion/rondas-y-tickets.md` documenta como funcionando en 1.0 (geocerca por punto, tres métodos de verificación —ahora dos, sin NFC—, tracking con batería y precisión, trust score con los mismos pesos, offline-first con cola idempotente, estados y cierres automáticos, vista del cliente) se conserva o se mejora; no se pierde ninguna capacidad de 1.0 en el camino (§11 de `rondas.md`). **Todo lo automático es configurable por tenant**, con el defecto de la vertical como punto de partida (R6, R20): radios, precisiones, permanencias, modos de punto, pesos y bandas del trust score, umbrales de anomalía y tolerancias no quedan fijos en el código. **Solo el Design System de OPAI 2.0** (nunca el estilo de 1.0): toda pantalla usa tokens y componentes de `@opai/ds`, nunca el CSS ni el JS del export de `diseño/export-rondas/`, que es solo referencia visual. **375, 1024 y 1280 px, claro y oscuro, y los cuatro estados** (cargando, vacío, error, sin permisos) en cada pantalla nueva, como exige `REGLAS-codigo.md` §UI.

---

## 1. Objetivo

Que la empresa y su cliente puedan **creer** que la ronda se hizo: quién pasó por cada punto, a qué hora, en qué orden y con qué grado de certeza, aunque no haya señal (rondas.md §1). Este brief construye el módulo completo de la especificación: puntos de control, plantillas, programación, ejecución con cola sin conexión, trust score versionado, rastro con huecos honestos, anomalías y su revisión, novedades e incidentes conectados, vistas por portal (ERP, Supervisor, Terreno/Trabajador, Cliente) y las herramientas MCP correspondientes, con paridad completa (R33, ADR-055).

Se nota que funciona cuando una empresa de seguridad puede operar sus rondas de principio a fin —configurar puntos y plantillas, ejecutar en el teléfono sin red, revisar anomalías, responder un reclamo del cliente con el informe de una ronda en menos de 5 minutos— sin ninguna pantalla que el MCP no pueda hacer también.

## 2. Estado actual del repo y dependencias (verificado en `origin/main` `960112e`, 29-oct-2026)

Esta sección responde al pedido de que el brief diga explícitamente qué está en `main`, qué no, y qué bloquea a qué PR. Fuente: lectura directa de `origin/main` en esta sesión (no de `PLAN-desarrollo.md`, que queda desactualizado más rápido que el repo).

| Dependencia | En `main` | Detalle | Bloquea |
|---|---|---|---|
| **Núcleo** (identidad, permisos finos, RLS, Configuración por ámbitos, `core.documentos`, outbox de eventos, `ctx.medidor`/consumos, auditoría encadenada, rate limit) | **Sí** | `packages/capabilities/src/core/**`, `execute.ts`, `core/config/**`, `core/documentos/**` | Nada; Rondas se apoya en esto directamente |
| **Maestros / Instalaciones** | **Sí** | `packages/capabilities/src/core/maestros/instalaciones*.ts` | Nada |
| **Puestos y guardias** (Operaciones I, Brief 11) | **Sí** | `packages/db/prisma/schema/puestos.prisma`, `packages/capabilities/src/core/maestros/{puestos,patrones,funciones}*.ts` | Habilita la asignación «quien esté de turno en el puesto» (R27, decisión 18) **solo si el tenant tiene Operaciones activo**; sin eso, Rondas asigna a personas a mano (ADR-048), que es el camino que este brief implementa siempre y usa como único camino mientras Operaciones II no exista |
| **Geolocalización y mapas del núcleo** | **Sí** | `packages/integrations/src/geo/**` (Google, variantes, mapa estático) | Nada; Rondas lo consume para `MapaEstatico` y para medir en `core.consumos` (ADR-031) |
| **PWA base** (Brief 04) | **Sí** | `apps/web/app/manifest.ts`, `apps/web/public/sw.js` | Nada directo, pero la cola sin conexión de Rondas (R22–R24) depende de que el almacenamiento persistente y el service worker ya existan, lo que es el caso |
| **App Terreno** (Brief 16) | **No, solo placeholder** | `apps/web/app/(terreno)/terreno/page.tsx` renderiza `PortalPlaceholder` («Próximamente»); no hay shell propio, ni barra de pestañas, ni pantalla Inicio | **Bloquea el PR de guardia/Terreno** (§3, PR 3): este brief tiene que construir el shell mínimo de Terreno (header, barra de pestañas, pantalla Inicio) porque Terreno no tiene otro dueño todavía. NAVEGACION.md §4 describe hoy Terreno como «pantalla de tarea única, sin menú»; la decisión de Carlos del 29-oct-2026 (ver §6) lo cambia a una barra de pestañas Inicio·Rondas·Acceso·Novedades·Asistencia — **este brief actualiza esa descripción de Terreno en NAVEGACION.md cuando se construya**, porque hoy el repo y la decisión no coinciden |
| **Portal Trabajador** (Brief 15) | **No, solo placeholder** | mismo patrón que Terreno | No bloquea: la especificación (rondas.md §3) pone «Mis rondas de hoy» y «Ronda en curso» en Trabajador **y** Terreno con el mismo patrón; este brief construye esas pantallas dentro del shell de Terreno (que es donde vive la ejecución real, decisión de Carlos del 29-oct-2026) y deja Trabajador con el placeholder hasta su propio brief |
| **Portal Supervisor** (Brief 15) | **Parcial** | `Hoy`, `Instalaciones`, `Personas` ya tienen pantalla; no hay barra inferior «Visitas y rondas» ni pestaña Rondas | No bloquea, pero el PR del supervisor (§3, PR 4) agrega esa barra inferior y sus pantallas dentro del shell que ya existe |
| **Portal Cliente** (Brief 16) | **No, solo placeholder** | igual que Terreno | No bloquea: el PR del cliente (§3, PR 5) construye `/cliente/reportes/rondas` dentro del shell existente (que sí tiene login, según ESTADO.md) |
| **Operaciones II** (Libro de novedades, Brief 12) | **No** | Sin esquema, sin capacidades; `extraccion/operaciones.md` es solo un esqueleto | **Bloquea el modelo de Novedad**: la especificación (rondas.md §2 y §10) pone la Novedad en el «libro electrónico de novedades (Operaciones II) o propio de Rondas si Operaciones no está activo» (ADR-048). Como Operaciones II no existe, **este brief construye el modelo mínimo de Novedad dentro del propio módulo Rondas** (tabla `rondas.novedades` con `gravedad`, `tipo`, `origen`, evidencia y estados, R33/R34), con un identificador y una forma pensados para que Operaciones II, cuando exista, se quede con la tabla y Rondas solo la referencie (como describe la sección (a) «Modelo de incidente único conectado» de la QA del 29-oct-2026, §6 de este brief) |
| **Central de monitoreo** (CAR-70) | **No** | Rama `claude/car-70-central-monitoreo-fd61sl`, PR en borrador (#122), no integrado | No bloquea: Rondas solo **emite** eventos por outbox (`rondas.ejecucion.atrasada`, `rondas.ronda.sin_movimiento`, `rondas.emergencia`, `rondas.novedad.grave`…); si no hay nadie suscrito, no pasa nada (silencio por defecto, ADR-020), que es el comportamiento normal de un tenant que compra solo Rondas (ADR-048). Cuando la Central se integre, se suscribe a estos eventos sin que Rondas cambie |
| **Control de acceso físico** (CAR-73) | **No** | Rama `claude/car-73-acceso-firma-8r4b7l`, no integrado | No bloquea Rondas en sí; sí significa que la pestaña «Acceso» del shell de Terreno queda como marcador sin funcionalidad hasta que ese módulo se integre (mismo patrón que Novedades y Asistencia abajo) |
| **Asistencia** (Briefs 18–19) | **No** | Sin esquema ni capacidades | No bloquea: rondas.md §10 la lista como fuente opcional («cruzar que el guardia marcó entrada»); la pestaña «Asistencia» del shell de Terreno queda como marcador |
| **Actor «dispositivo»** (ADR-029.10) | **No** | El registro de capacidades solo conoce actores sistema, usuario y agente | Afecta el diseño del PR 3 (ejecución en Terreno): **este brief ejecuta con la sesión del guardia que usa el dispositivo**, no con un actor de dispositivo nuevo (rondas.md §10 ya deja esa opción explícita: «el Brief 14 necesita la identidad de dispositivo de ADR-029.10 **o** ejecuta en Terreno con la sesión del guardia que la usa»). Construir el actor «dispositivo» queda fuera de este brief; si Carlos prefiere adelantarlo, es una decisión pendiente (ver §8) |
| **Ámbito «instalación» en Configuración** | **No** | `defineAjustes` solo tiene ámbitos plataforma, tenant y usuario (`packages/capabilities/src/core/config/**`) | Confirma R6: los valores propios de un punto o de una instalación (radio, precisión, modo) se guardan como dato de la instalación o del punto en el propio módulo Rondas, no como un ajuste de Configuración con ámbito «instalación» |

**Conclusión para la planificación:** Rondas puede construirse completo sobre lo que ya está en `main`, sin esperar a Operaciones II, la Central, Control de acceso ni Asistencia (todas fuentes opcionales, ADR-048), a condición de que este brief incluya (a) el modelo mínimo de Novedad dentro del propio módulo y (b) el shell mínimo de la app Terreno. Ambos quedan en el PR 1 y PR 3 respectivamente (ver §3).

## 3. Alcance en PRs pequeños y verificables

Un PR por bloque, cada uno con su propio gate completo, criterios de aceptación verificables y, si crea tablas, su propia migración con RLS. El orden respeta las dependencias de datos (no se puede ejecutar una ronda sin puntos ni plantilla).

### PR 1 — Datos, dominio y configuración de puntos (ERP, iPad/escritorio)

- **Datos** (`packages/db/prisma/schema/rondas.prisma`, schema `rondas`): `PuntoControl`, `PlantillaRonda`, `PlantillaPunto` (N–N con orden), `Programacion`, `Novedad` (modelo mínimo descrito en §2, con `origen`, `ejecucion_id`/`punto_id` nulables, `idempotency_key`, evidencia vía `core.documentos`) y el catálogo `TipoIncidente` por tenant (R con gravedad sugerida, decisión de Carlos del 29-oct-2026, §6). Todas con `tenant_id`, RLS `tenant_isolation`, `created_at`/`updated_at`, `uuid(7)`. Migración única, con los 2 patrones de 1.0 que haga falta migrar (ver «Migración de datos» en REGLAS-codigo.md: toda migración de datos sobre tablas forzadas verifica filas afectadas).
- **Dominio** (`packages/domain/src/rondas/`): cálculo de distancia y estado dentro/dudosa/fuera (R3), validación de radio/precisión/permanencia (R1–R5), catálogo del modelo de confianza «OPAI 1.0» con sus pesos (R19, R20), con tests.
- **Capacidades:** `rondas.puntos.{crear,actualizar,archivar}`, `rondas.plantillas.{crear,actualizar}`, `rondas.programaciones.{fijar,pausar}`, `rondas.etiquetas.pdf`, `rondas.incidentes_tipo.{crear,actualizar,listar}` (catálogo de tipos de incidente por tenant, decisión de Carlos del 29-oct-2026). Todas con `dryRun`, `idempotencyKey`, auditoría y paridad MCP.
- **Pantallas:** pestaña «Rondas» de la ficha de instalación, segmentado Puntos · Plantillas · Programación (c13p/c13pd/c13h/c13s de `export-rondas/Rondas ERP.dc.html`), con mapa de puntos y sus radios, drawer de edición con herencia visible, «Imprimir etiquetas» y «Reemplazar etiqueta». Configuración → Rondas (modelo de confianza, defectos de modo/radio/precisión/permanencia, catálogo de tipos de incidente) como formulario de ajustes del núcleo (ADR-018), nunca página propia.

### PR 2 — Reemplazo de etiqueta QR y migración de las de 1.0

- Capacidad irreversible `rondas.puntos.reemplazar_etiqueta` (con `APPROVAL_REQUIRED`, R34), generación del identificador opaco y firmado (R7), script de migración que importa los puntos de 1.0 con su código físico actual y aplica la firma/opacidad sin obligar a reimprimir (decisión de Carlos, 29-oct-2026, pregunta 20 de `rondas.md`). Se separa del PR 1 porque toca datos de 1.0 y necesita verificar en el código de 1.0 qué contiene hoy el QR (brecha pendiente de `rondas.md` §11) antes de escribir el script.

### PR 3 — Ejecución en terreno (shell mínimo de Terreno, Guardia)

- **Shell mínimo de la app Terreno** (bloqueante, §2): header «Terreno · instalación · turno · guardia», barra de pestañas Inicio · Rondas · Acceso · Novedades · Asistencia (g0 de `export-rondas/Rondas Guardia.dc.html`); las pestañas Acceso, Novedades y Asistencia quedan como marcador «Próximamente» hasta sus propios briefs (Control de acceso CAR-73, Operaciones II, Asistencia); solo Inicio y Rondas son funcionales. Esto **actualiza** `docs/2.0/NAVEGACION.md` §4 (hoy dice «pantalla de tarea única, sin menú» para Terreno), con nota fechada.
- **Datos:** `Ejecucion`, `Marca`, `PosicionRastro`, `Senal`, `Anomalia` (hechos inmutables, R28, con sello del servidor y bitácora encadenada, `REGLAS-codigo.md` «Hechos regulados»).
- **Selector de guardia** (g1, decisión de Carlos del 29-oct-2026, pregunta 18 de `rondas.md`): cuando el turno o dispositivo tiene más de un guardia asignado.
- **Capacidades de ejecución** (excepción de paridad `soloPersonas`, R33, motivo «hecho físico en terreno»): `rondas.ejecuciones.iniciar`, `rondas.marcas.registrar`, `rondas.ejecuciones.cerrar`, `rondas.novedades.registrar`, `rondas.emergencia.activar`. Se ejecutan con la sesión del guardia (ver §2, sin actor «dispositivo» nuevo). Cola sin conexión con `idempotencyKey` generada en el dispositivo (R22, R23) sobre el mismo almacenamiento persistente de la PWA del Brief 04.
- **Pantallas:** «Mis rondas de hoy» (g2), «Ronda en curso» con mapa plegable del componente `MapaEstatico` extendido (g3), marcar punto por QR (g4qr) y por GPS con cuenta regresiva (g4gps), resultado con checklist y «Realizado»/«Hay un problema» (g4res; decisión de Carlos del 29-oct-2026, §6), reportar novedad desde la ronda o desde un punto (g10), cierre de ronda (g5), cola sin conexión (g6), permisos en contexto (g7), zona de riesgo (g3, botón junto a Emergencia; decisión de Carlos del 29-oct-2026, §6) y el botón Emergencia con confirmación (R35).
- **Trabajos:** `rondas.cierres` (no realizada, cerrada automática, recálculo por marca tardía, R23/R25), encolado por cron (ADR-029).

### PR 4 — Supervisión y control en vivo (Supervisor, ERP)

- Barra inferior «Visitas y rondas» del Supervisor (NAVEGACION.md §3) con «Rondas de hoy» (s8, filtro por instalación — decisión de Carlos del 29-oct-2026, §6), ficha de la ejecución con las 6 pestañas Resumen · Marcas · Rastro · Anomalías y revisión · Documentos · Actividad (s9; **ficha completa también en el ERP**, c18 — decisión de Carlos del 29-oct-2026, §6, ver §5 de este brief sobre el ajuste de c12/c18), revisión de anomalía (s10), crear punto en el lugar desde el teléfono (s11, R4).
- «Control de rondas» en vivo del ERP (c12), con filtro de instalación y «Crear ticket»/«Ver en la central» cuando corresponda.
- «Informes de rondas» (c14, DashboardScreen): cumplimiento, puntos omitidos, bandas de confianza, anomalías, mapa de calor; «Programar informe al cliente» (opcional por cuenta, PDF semanal por defecto, decisión de Carlos del 29-oct-2026, pregunta 17 de `rondas.md`).
- Historial exportable en la pestaña Rondas de la instalación (c13h, decisión de Carlos del 29-oct-2026, §6).

### PR 5 — Novedades e incidentes conectados

- La capacidad única `rondas.novedades.registrar` (PR 3) ya escribe en la tabla mínima de Novedad; este PR agrega: tipos de incidente por tenant con gravedad configurable aplicados a la hoja de novedad (c15t, decisión de Carlos del 29-oct-2026, §6), estados Abierto → En atención → Resuelto → Cerrado (más «Derivado a ticket»), el mismo identificador visible en la ficha de la ronda (mapa y timeline), en el historial de la instalación y, si está marcada visible, en el Portal Cliente. Evidencia completa (varias fotos, video corto ≤ 30 s, nota de voz con dictado — decisión de Carlos del 29-oct-2026, §6) vía `core.documentos`, medida en `core.consumos`. Relevo de turno con tarjeta de incidentes abiertos (g12 del export).
- Checklist corto por punto cuando el punto requiere una acción (c13pd, decisión de Carlos del 29-oct-2026, §6), que se muestra en g4res.

### PR 6 — Portal Cliente y eventos para la central

- `/cliente/reportes/rondas` (d16, d16f): cumplimiento, rondas con hora y puntos, recorrido en el mapa, novedades visibles; sin anomalías internas ni desglose de confianza salvo que el tenant active la banda (R30).
- Los 11 eventos de `rondas.md` §8 por outbox en la misma transacción (ADR-029), con prueba de que `rondas.ronda.sin_movimiento` dispara y llega al outbox de verdad (decisión de Carlos del 29-oct-2026, pregunta 19 de `rondas.md`: «tiene que funcionar de verdad», no basta con registrar el evento).

### PR 7 — e2e, accesibilidad y presupuesto de JS

- Playwright de los flujos críticos por portal a 375/1024/1280 px, claro y oscuro: ejecutar una ronda completa sin conexión con 4 puntos y una novedad (CA5 de `rondas.md`), revisar una anomalía, ver el control en vivo, ver el reporte del cliente.
- Presupuesto de JS por ruta, con el tope especial de terreno (≤ 150 KB, ADR-044.6); gráficos de informes y mapa de calor cargados en diferido, nunca en el JS inicial de terreno.
- Lighthouse ≥ 90 en rendimiento y accesibilidad en las rutas de terreno (CA14 de `rondas.md`, enmienda de ADR-044 que ya aplicó el Brief 04).

**Publicación de la app Terreno en Play Store: opción de este brief, no obligatoria.** Ver §7.

## 4. Arquitectura

- **Datos** (ADR-036, REGLAS-codigo.md): schema `rondas` nuevo. `tenant_id` sin `@relation` a `Tenant` (la FK va en el SQL, como en `comercial.prisma`); toda tabla con RLS `tenant_isolation` para `opai_app`, `FORCE ROW LEVEL SECURITY`. Las tablas de hechos (`Ejecucion`, `Marca`, `PosicionRastro`) son `INSERT`-only para `opai_app` desde la capacidad (sin `UPDATE`/`DELETE`), igual que `core.audit_events`.
- **Capacidades** (ADR-004, ADR-022, ADR-029, ADR-034): toda consulta y mutación es `defineCapability`; UI, `/api/v1` y MCP invocan la misma. Alcance por filas (R29) en la consulta: supervisor por instalaciones a cargo, cliente por cuenta, trabajador por sus propias rondas — nunca filtrado en la UI (ADR-022). Las escrituras de ejecución (PR 3) van con excepción de paridad `soloPersonas` (R33), anotada en `paridad-excepciones.ts` con el motivo «hecho físico en terreno»; el resto expone su herramienta MCP.
- **UI** (ADR-014, ADR-017, ADR-018, ADR-045): solo tokens y componentes de `@opai/ds`. Piezas nuevas del DS que esta especificación necesita y que todavía no existen (lector de QR con cámara, indicador de permanencia GPS con cuenta regresiva, indicador fijo de conexión y cola, mapa con recorrido/radios/tramos sin rastro como extensión de `MapaEstatico`, selector de guardia compuesto con `Avatar`) se proponen al DS con diseño en Claude Design (ADR-017), nunca se construyen dentro del módulo.
- **Eventos y trabajos** (ADR-029): toda escritura relevante emite su evento por outbox en la misma transacción (`ctx.transaccion(async (tx) => {...; await ctx.eventos.emitir(tx, {...})})`); los crons (`rondas.cierres`) solo encolan.
- **Consumos** (ADR-031): geolocalización/mapas, fotos/video/audio de evidencia y el PDF de informes se miden en `core.consumos` por la clase de tarea que corresponda, nunca con el SDK del proveedor dentro del módulo.

## 5. Ajustes del mockup v3 que se resuelven al construir (obligatorios, con criterio de aceptación)

Carlos decidió que estos 2 detalles pendientes de la QA de v3 **no se corrigen en el mockup**: se corrigen al construir y este brief los exige como criterio de aceptación (Decisión de Carlos, 29-oct-2026 16:29 CLT, chat con OPAI 2.0, registrada por el bot OPAI 2.0).

a) **Encabezado de la tabla de rondas del ERP a 1280 px (c12).** En «Control de rondas» a 1280 px, el encabezado «Instalación · ronda · responsable» no se corta y el nombre de la instalación cabe en una línea.
   - **CA-a1.** A 1280 px, el encabezado de esa columna se lee completo, sin truncar ni partirse en 3–4 líneas.
   - **CA-a2.** A 1280 px, el nombre de la instalación de cada fila cabe en una sola línea (puede usar `text-overflow: ellipsis` con `title` si el nombre es muy largo, pero no se parte en varias líneas de alto de fila).
   - Prueba: e2e con captura a 1280 px que mide el alto de la celda del encabezado y de la celda de instalación de al menos una fila con nombre largo («Planta Quilicura», «Bodega Lampa»).

b) **Marca 3 de Bodega A en la ficha de la ronda del ERP (c18).** La marca 3 de Bodega A debe decir «Hay un problema · NOV-0418», igual que en `s9` (ficha del supervisor) y `c13h` (historial).
   - **CA-b1.** La ficha de la ejecución en el ERP (`c18`, pestaña Marcas) muestra la marca 3 de Bodega A con el estado «Hay un problema» y la referencia `NOV-0418`, consistente con las demás vistas del mismo hecho (principio de incidente único conectado, §6 de este brief).
   - Prueba: e2e que crea una ejecución con una marca «Hay un problema» vinculada a una novedad y verifica que la ficha de la ejecución en el ERP, la ficha del supervisor y el historial de la instalación muestran el mismo estado y el mismo identificador.

## 6. Decisiones de Carlos (29-oct-2026) que entran en este brief

Decisiones de Carlos, 29-oct-2026, chat con OPAI 2.0, tomadas durante la revisión de los mockups v1 a v3 de Rondas. Complementan —sin contradecir— las 21 preguntas que `rondas.md` ya registra en su propia sección «Decisiones de Carlos (29-oct-2026)»; se anotan también ahí (ver cambio en ese archivo en este mismo PR).

1. **Tipos de incidente predefinidos por cada tenant, con gravedad configurable por tenant.** Catálogo editable en Configuración → Rondas (pantalla `c15t` del mockup v3); cada tipo tiene ícono, gravedad por defecto y se puede activar o desactivar.
2. **Evidencia completa en la novedad o incidente:** varias fotos, video corto y nota de voz con dictado — sí, como en `g9`/`g10` del mockup.
3. **En cada punto, confirmación «Realizado» / «Hay un problema».** Si el guardia marca «Hay un problema», se abre la hoja de novedad prellenada con el punto ya enlazado (como `g4nov`/`g4res` del mockup).
4. **Checklist por punto cuando el punto requiere realizar algo**, de 1 a 3 ítems sí/no (`c13pd`, `g4res`).
5. **Historial de todo** (marcas, confirmaciones, checklists, incidentes) **visible en la ficha de la instalación, pestaña Rondas, y exportable** (`c13h`).
6. **Incidente de ronda conectado con Novedades y la Central:** un solo objeto «Novedad» (gravedad alta = incidente), sin copias entre Rondas, el Libro de novedades y la Central; cada vista referencia el mismo identificador (`NOV-0418` en el mockup) y su línea de tiempo.
7. **El guardia ve un mapa con su posición y el próximo punto** en la ronda en curso (componente `Mapa Rondas` variante `guardia`, plegable, con «Centrar en mí»).
8. **Filtro por instalación** en el control de rondas del ERP y en «Rondas de hoy» del supervisor.
9. **Rondas vive en la app Terreno** junto con Control de acceso, Libro de novedades y Asistencia, con una pantalla Inicio de Terreno y una barra de pestañas Inicio · Rondas · Acceso · Novedades · Asistencia.
10. **Radio de geocerca por defecto de 15 m**, con un techo de 19–20 m (afina la decisión de la pregunta 1 de `rondas.md`, que fijaba «menor a 20 m, calibrado con 1.0», sin un número exacto).
11. **Ficha de la ronda también en el ERP** (`c18`), con las mismas 6 pestañas que la ficha del supervisor, no solo un panel lateral.
12. **Modelo de confianza inicial se llama «Modelo de confianza v1»** en pantalla (no «Modelo OPAI 1.0», que podía confundirse con la versión del producto); el modelo sigue siendo el de los pesos de 1.0 (R20).

Estas decisiones están verificadas contra `/workspace/qa/rondas-v1/MEJORAS.md` (sección «Decisiones de Carlos»), `/workspace/qa/rondas-v2/INFORME.md` y `/workspace/qa/rondas-v3/INFORME.md` (no se copian al repo, son insumos de QA fuera de `docs/2.0/`). No se agrega ninguna decisión que no esté en esas fuentes.

## 7. Publicación en Play Store (opción, no obligatoria)

Decisión de Carlos, 29-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0; ver `rondas.md` §10 y §14 pregunta 5, y ADR-024 en `01-decisiones.md`): la app web de Rondas vive **dentro de la app Terreno** y entrega rondas por QR (sin NFC) con GPS como evidencia mientras la pantalla está activa. La publicación en Play Store **queda disponible como opción de este brief, sin esperar al Brief 17** (empaquetado nativo con Capacitor, ADR-044.8).

**Qué implica tomar esa opción en este brief:**

- Empaquetar la PWA de Terreno con Capacitor (ya decidido como envoltorio, ADR-044.8; benchmark §D descarta TWA/PWABuilder porque no dan GPS en segundo plano ni detección de ubicación simulada).
- El ajuste por instalación «Exigir app OPAI nativa» (decisión de Carlos, pregunta 6 de `rondas.md`, defecto no) solo tiene efecto real si existe un empaquetado que publicar; sin tomar esta opción, el ajuste queda declarado pero sin ninguna instalación que pueda exigirlo todavía.
- La fidelidad completa (rastro con pantalla apagada, ubicación simulada, integridad del dispositivo, redes cercanas) sigue exigiendo ese empaquetado nativo, porque la PWA no la permite (benchmark §B); tomar esta opción en el Brief 14 no adelanta esas señales si no se construye también el plugin de geolocalización en segundo plano (comparación Transistorsoft vs. `@capacitor-community/background-geolocation` que el benchmark deja para el Brief 17).
- Subida a Play Console (formulario de declaración de `ACCESS_BACKGROUND_LOCATION`, video, divulgación en la app) y cuenta de desarrollador: estas gestiones no son técnicas y las hace Carlos.

**Recomendación de este brief:** no tomar la opción en el Brief 14. Construir la PWA de Terreno con QR + GPS primero (que ya iguala lo que 1.0 hace hoy en el navegador), y evaluar la publicación en Play Store junto con el Brief 17, cuando se decida también qué plugin de geolocalización en segundo plano usar. Carlos puede pedir adelantarla si algún cliente la exige antes.

## 8. Dudas y decisiones pendientes para Carlos (no se construye hasta que las resuelva)

1. **Shell de Terreno y `NAVEGACION.md`.** Este brief construye el shell de Terreno (header + barra de pestañas) porque Rondas lo necesita y nadie más lo ha construido todavía (§2). Eso cambia la descripción de Terreno en `NAVEGACION.md` §4 (hoy: «pantalla de tarea única, sin menú»). ¿Confirma que ese cambio se hace dentro de este brief, o prefiere que lo apruebe primero como parte del Brief 16 (Portales Cliente y Terreno)?
2. **Actor «dispositivo» (ADR-029.10).** Este brief ejecuta las capacidades de terreno con la sesión del guardia, sin construir el actor «dispositivo» nuevo (§2). Si Carlos prefiere adelantar ese actor para que un dispositivo emparejado (sin sesión de una persona) también pueda ejecutar, es un cambio de alcance que hay que decidir antes de construir el PR 3.
3. **Modelo mínimo de Novedad dentro de Rondas.** Este brief crea la tabla de Novedad dentro del schema `rondas` porque Operaciones II no existe (§2, §6). Cuando Operaciones II se construya, esa tabla se migra ahí y Rondas pasa a referenciarla. ¿Confirma ese orden, o prefiere esperar a que Operaciones II exista antes de construir Rondas?
4. **Publicación en Play Store (§7).** Recomendación de no tomarla en este brief; a decidir si algún cliente la exige antes del Brief 17.

## 9. Criterios de aceptación

Los 14 de `rondas.md` §13 (CA1–CA14), verificables en `test.opai.cl` por Carlos y por Diseño y QA (los de la app nativa, en el Brief 17), más los 2 de este brief sobre el mockup v3 (§5, CA-a1/a2 y CA-b1):

- **CA1–CA14:** ver `rondas.md` §13 (modo por punto heredado, radio/precisión/permanencia, QR lejos de su punto, cola sin conexión con reconciliación, marca tardía tras cierre automático, batería/integridad no disponibles en la PWA sin castigar, desglose y versión del trust score, tramo sin rastro honesto, alcance del supervisor y del cliente, aprobación humana al cerrar por un agente, evento `atrasada` solo a quien corresponde, PDF de etiquetas con marca del tenant, pantallas a 375/1024/1280 con los 4 estados y presupuesto de terreno).
- **CA-a1, CA-a2:** encabezado y nombre de instalación de `c12` a 1280 px (§5a).
- **CA-b1:** consistencia de «Hay un problema · NOV-0418» entre `c18`, `s9` y `c13h` (§5b).
- **CA15 (nuevo de este brief).** Un tenant que solo compra Rondas (sin Operaciones, sin Central, sin Control de acceso, sin Asistencia) puede configurar puntos, armar una plantilla, ejecutar una ronda completa sin conexión con una novedad grave, revisarla como supervisor y verla en el reporte del cliente, con las pestañas Acceso/Novedades/Asistencia del shell de Terreno como marcador sin romper nada.
- **CA16 (nuevo de este brief).** Las herramientas MCP de cada capacidad existen y coinciden con la tabla de `rondas.md` §9; el gate de paridad (`paridad.test.ts`, snapshot `herramientas-mcp.txt`) está en verde y las únicas excepciones son las de ejecución en terreno (R33), anotadas con su motivo.

## 10. Tests y gate

- **Dominio:** Vitest para distancia/estado dentro-dudosa-fuera, permanencia, trust score y su desglose, derivación de estados y cierres automáticos.
- **Capacidades:** validación, autorización por rol y alcance (negativos: un supervisor de otra instalación, un contacto de otra cuenta, un agente intentando marcar un punto), auditoría, `dryRun`, idempotencia, aprobación humana en lo irreversible (R34).
- **Base (`pnpm test:db`):** RLS por tenant en las tablas nuevas, con prueba de dos tenants (AGENTS.md); trigger de hechos inmutables (sin `UPDATE`/`DELETE` para `opai_app`); reconciliación de la cola sin conexión con concurrencia real (dos marcas simultáneas de secuencias distintas no se pisan); prueba del cierre automático recalculado por una marca tardía.
- **Paridad** (`paridad.test.ts` + snapshot `herramientas-mcp.txt`) y **presupuesto de JS** (ADR-037, con el tope especial de terreno) en verde; `pnpm mcp:verificar` tras desplegar.
- **e2e** (`pnpm --filter @opai/web e2e`) a 375, 1024 y 1280 px, claro y oscuro, comparando contra `export-rondas/`.
- Gate local antes de cada push: `pnpm typecheck && pnpm lint && pnpm test` (+ `test:db` por tocar base, + `build`/`presupuesto` por tocar la web). Autorrevisión con un subagente antes de cada PR, como exige `AGENTS.md`.

## 11. Riesgos

- **Radio de 15 m sin calibrar contra marcas reales de 1.0 todavía.** La decisión de Carlos (§6, punto 10) fija el número; `rondas.md` R3 pedía calibrarlo con las marcas reales de 1.0. El PR 1 debe traer esa calibración (o decir explícitamente que no se pudo verificar en 1.0 y por qué) antes de fijar el 15 m como defecto de fábrica.
- **Formato del QR de 1.0 sin verificar** (brecha ya anotada en `rondas.md` §11): el PR 2 no puede migrar etiquetas sin antes confirmar en el código de 1.0 qué contiene hoy el QR.
- **Shell de Terreno construido por este brief, no por el Brief 16.** Si el Brief 16 (Portales Cliente y Terreno) avanza en paralelo, hay riesgo de construir dos veces el mismo shell. Hay que coordinar antes de abrir el PR 3 (ver duda §8.1).
- **Tipos de incidente y checklist por punto tocan la misma hoja de marcar punto** (PR 3) **y Configuración** (PR 1): si se ejecutan en paralelo, el PR 3 depende de que el catálogo de tipos de incidente del PR 1 ya esté en la rama.
- **Peso del export en el repo.** `docs/2.0/diseño/export-rondas/` agrega varios archivos `.dc.html` de tamaño considerable (hasta ~640 líneas) más el bundle `_ds/`; es solo referencia visual y no afecta el presupuesto de JS de la app, pero infla el repositorio como ya ocurre con `export-crm/` y `export-puestos/`.

## Historial

| Fecha | Cambio | Quién |
|---|---|---|
| 29-oct-2026 | Primera versión del brief, escrita en la rama `docs/brief-14-rondas` tras la aprobación del mockup v3 (16:29 CLT); solo documentación | Claude, por encargo del operador de OPAI 2.0 |
