# BRIEF · Base «Hilo»: hoja de alcance y plan por etapas (CAR-274)

**Estado:** aprobado por Carlos el 11-nov-2026 (ADR-090) · **Sesión:** «Sesión Hilo» (chat del proyecto «Opai 2.0») · **Diseño:** [`design/export-base-hilo/`](../design/export-base-hilo/README.md) · Este documento es la hoja de alcance y el plan. Cada etapa trae su brief de 16 secciones en el PR que la construye. Nada de esto está construido todavía.

## 1. Objetivo

Que OPAI 2.0 se opere desde el agente: una persona, o una IA externa conectada, ve lo que espera decisión, lo que pasó y lo que viene, y pide lo que necesita desde cualquier pantalla. El marco nuevo («Hilo») reemplaza la barra lateral, la barra inferior, Inicio, la Bandeja, la campana y el panel del agente por tres piezas: hilo, lienzo y barra. Lo que se construya debe ser copia fiel del diseño aprobado (§6).

## 2. Estado actual (verificado en `main`, 11-nov-2026)

- **Un solo punto de montaje del marco:** los seis layouts de portal usan `apps/web/app/_components/portal-layout.tsx`, que monta `marco-shell.tsx`, y este monta `AppShell` (`packages/ds/src/shell/`) (ADR-045). `marco-shell.tsx` es un componente de cliente: para no descargar los dos marcos, la elección se hace en `portal-layout.tsx`.
- **La navegación es declarativa:** cada módulo declara sus entradas en el manifiesto (`area`, `href`, `permiso`); el núcleo las filtra por módulo activo y permiso. El Índice del marco nuevo sale de ahí, sin tocar módulos.
- **Preferencias por usuario:** existen ajustes de ámbito `usuario` (por ejemplo, Tema) en `packages/capabilities/src/core/config/nucleo.ts`. Cada ajuste vive en un solo ámbito (`core/config/set.ts`) y el marco actual no lee preferencias en el servidor (ADR-045): se cargan después de hidratar.
- **Agente interno:** existe solo en el ERP (`modulos/agente.md` R1; `datos-shell.ts`), como panel lateral. Su contexto es hoy una ficha de cuatro tipos (cuenta, instalación, negocio, persona): la pantalla envía tipo e id y el servidor lo revalida (R9). No accede a Plataforma (R2, ADR-055).
- **Datos del hilo que ya existen como capacidad, con herramienta MCP:** `core.inicio.pendientes` (lo que espera decisión), `core.aprobaciones.*`, `core.actividades.*` (tareas y línea de tiempo) y `core.actividad.list` (actividad de toda la empresa, que exige `core:audit.read` y se niega a actores con alcance). No existe una lectura de «lo que viene».
- **Límites que el marco debe respetar:** el tope vigente de JS de cada ruta en `apps/web/presupuesto-js.json` (ADR-037; hoy terreno y trabajador están entre 162 y 178 KB), las 8 consultas por navegación (ADR-045), 93 specs e2e, la caché de componentes y la CSP con nonce.
- **Por verificar en la etapa que corresponda:** cómo se aplica hoy el Tema sin parpadeo y si un ajuste puede tener valor por usuario con un valor por defecto por empresa (H1); si los webhooks salientes de ADR-029 están construidos y cómo se comporta una IA externa con el número actual de herramientas MCP (H6).

## 3. Alcance

**Entra:** el marco Hilo en los seis portales, la piel Hilo de los patrones del DS, el acceso al sistema con la piel nueva, las lecturas del hilo con su herramienta MCP, la barra del agente con contexto, las propuestas y la autonomía por agente, y el retiro del marco clásico.

**No entra:** cambios de reglas de negocio, de permisos o de datos de los módulos; rehacer el contenido de las pantallas aprobadas; dar al agente interno acceso a Plataforma; desplegar a la producción de Gard; tocar OPAI 1.0.

**Reglas de orden (ADR-090):**

1. No se tocan pantallas de Finanzas hasta cerrar las verificaciones reales (CAR-266 a CAR-269).
2. Trabajador y Terreno migran al final, midiendo el funcionamiento sin conexión y el tope de JS de cada ruta.
3. Marcas de asistencia, rondas, firmas y registros de acceso son siempre el acto de una persona. La barra no los ejecuta.

## 4. Arquitectura

- **Interruptor:** ajuste `marco` con valores `clasico` e `hilo`. Por usuario; el valor por defecto por empresa queda por verificar en H1, porque hoy cada ajuste vive en un solo ámbito. El marco se elige en `portal-layout.tsx`; las páginas, las capacidades y los manifiestos son los mismos para ambos. Solo se descarga el marco activo.
- **Marco Hilo:** componentes nuevos en `packages/ds/src/shell/hilo/` (cabecera, hilo, lienzo, barra y el hilo plegado para planillas). Aparecen en `/ds` con sus estados.
- **Piel Hilo:** los tokens y las variantes de los patrones se aplican con alcance (atributo en la raíz del marco). El marco clásico no cambia de aspecto. `DISENO.md` se actualiza en H2.
- **Datos del hilo:** Pendientes reutiliza `core.inicio.pendientes`. Actividad parte de `core.actividad.list` y resuelve en H3 cómo la ve un actor con alcance. Agenda es una lectura nueva de lo que viene según los módulos (vencimientos, turnos, pagos programados); no es un calendario ni se edita (ADR-032). Todas con herramienta MCP (ADR-055), alcance por filas (ADR-022) y lecturas auditadas (NÚCLEO-H).
- **Barra:** el agente interno (ADR-049) más la búsqueda de ⌘K. Sin la licencia del módulo `agente` o sin el permiso `agente:usar`, la barra solo busca y navega. H4 amplía R9: además del tipo y el id de la ficha, la pantalla envía la lista o el tablero y la pestaña, y el servidor lo revalida igual.

## 5. Etapas

Cada etapa es un PR (o una serie corta), con su issue de Linear, su brief, su novedad in-app si cambia algo visible y la revisión visual de Carlos en `preview.opai.cl` (A2.10).

| Etapa | Qué entrega | Criterios de aceptación |
|---|---|---|
| **H1 · Interruptor y marco Hilo en el ERP** | Ajuste `marco` en Preferencias. Marco Hilo en el ERP con cabecera, Pendientes reales (`core.inicio.pendientes`), lienzo con las páginas actuales, Índice desde el manifiesto, cambio de portal y de empresa e hilo plegado para planillas. La barra todavía no es el agente: busca pantallas y registros (⌘K actual) | Con `marco = clasico` nada cambia (e2e actuales en verde). Con `hilo`, todas las rutas del ERP abren dentro del lienzo. Sin parpadeo al cargar y sin pasar de 8 consultas por navegación. JS dentro del tope de cada ruta o con la subida justificada |
| **H2 · Piel Hilo de los patrones** | Variantes con alcance de `ListScreen`, `DetailScreen` (pestañas con subrayado), `FormScreen`, `PlanillaScreen`, `DashboardScreen`, `KpiTile`, botones, avisos y estados (cargando, vacío, error, sin permiso). `DISENO.md` actualizado | Una lista, una ficha, una planilla y un formulario reales se ven como en el export. Contraste AA en claro y oscuro. Ninguna pantalla pierde campos. El marco clásico no cambia |
| **H3 · Actividad y Agenda** | Lectura de actividad para el hilo (sobre `core.actividad.list`) y lectura nueva de agenda, con herramienta MCP, alcance por filas y pruebas con dos empresas. Los ids se fijan en el brief de la etapa | La misma lista se obtiene en pantalla, por `/api/v1` y por MCP. Un supervisor solo ve sus instalaciones. Un cliente no ve nada interno |
| **H4 · Barra del agente con contexto** | En el ERP, la barra reemplaza al panel dentro del marco Hilo: chip «Sobre: …», sugerencias por pantalla y respuesta como pantalla. El servidor queda preparado para encender el agente por portal y por rol. Amplía R9 y aplica la enmienda de `modulos/agente.md` | En Solicitudes, una pregunta se responde sobre esa lista. Lo irreversible va siempre a Pendientes (R5). El consumo se mide por portal. Sin licencia o sin permiso, la barra solo busca |
| **H5 · Portales y acceso** | Marco Hilo y barra en Supervisor y Cliente; después en Trabajador y Terreno. En Plataforma, marco Hilo con barra que solo busca. Acceso al sistema con la piel nueva. Antes de Terreno se define quién es la persona que pide en el dispositivo compartido (ADR-079) | Cada portal coincide con su tablero del export. Un trabajador solo llega a sus datos; un cliente, solo a su cuenta y sin costos. Terreno y Trabajador funcionan sin conexión y dentro de su tope de JS. Marca, ronda, bitácora y control de acceso no cambian de reglas |
| **H6 · Núcleo agéntico** | Propuestas como entidad (un agente deja un cambio preparado y una persona lo aprueba), nivel por agente como atajo sobre la autonomía por capacidad de ADR-032, «Deshacer» para lo reversible, y conexión de IA externas: el hilo completo por MCP, revisión del catálogo de herramientas y OAuth por usuario (CAR-247, si Carlos lo adelanta) | Un agente externo con su llave lee Pendientes, deja una propuesta y ve su resultado. Lo que ADR-032 o un módulo exige con aprobación humana no se ejecuta solo. Cada acción queda en la auditoría con el agente y quien aprobó |
| **H7 · Marco por defecto y retiro del clásico** | Hilo como valor por defecto por empresa con el OK de Carlos; retiro del marco clásico y de su código en la fecha que él fije al terminar H5 | Ninguna ruta depende del marco clásico. El JS baja al retirar su código |

## 6. Fidelidad («copia fiel»)

- La referencia es el export. Cada PR visual trae capturas a 375, 1024 y 1280 px (como exige `AGENTS.md`) y, además, a 390 y 1440 px para ponerlas junto al tablero equivalente, en claro y oscuro.
- Se compara el marco, la piel y la estructura de cada patrón. El contenido real de cada pantalla manda sobre el de ejemplo: no se quitan campos para parecerse al prototipo.
- Toda diferencia que no se pueda igualar se declara en el PR con su motivo. No se da por aprobada sin el OK visual de Carlos.

## 7. Seguridad y tenant

- El marco no agrega accesos: muestra lo que las capacidades ya permiten. El tenant sale de la sesión.
- Las lecturas del hilo aplican el alcance en la consulta y fallan cerradas.
- El contexto que envía la barra se revalida en el servidor. Todo texto de terceros sigue marcado como externo.
- Las llaves, la autonomía y las aprobaciones las gobiernan solo personas (`soloPersonas`). El agente interno sigue sin acceso a Plataforma.

## 8. Riesgos y vuelta atrás

| Riesgo | Mitigación |
|---|---|
| Dos marcos a la vez encarecen el mantenimiento | Solo se duplica lo propio del marco; Carlos fija la fecha de retiro al terminar H5 y H7 lo ejecuta |
| El marco nuevo rompe la caché o parpadea al cargar | H1 sigue el mecanismo del Tema y lo mide antes de integrar |
| Tope de JS, sobre todo en terreno | Se descarga solo el marco activo; terreno va al final y se mide |
| El hilo queda vacío mientras no existan agentes que propongan | H1 parte con los pendientes reales; los agentes llegan en H6, de a uno |
| Choque con sesiones que trabajan en paralelo | Cada etapa toca `packages/ds/src/shell/hilo/`, `portal-layout.tsx` y `marco-shell.tsx`; se avisa en el PR antes de tocar un archivo de otro PR abierto |

**Vuelta atrás:** en cualquier etapa, volver el ajuste `marco` a `clasico` devuelve el marco actual sin desplegar. Cada PR se revierte por separado. No hay migraciones destructivas.

## 9. Decisiones pendientes de Carlos

1. ¿Los agentes de la empresa (Cobranza, Cobertura…) vienen incluidos con su módulo o se cobran aparte?
2. ¿Inicio según rol? Propuesta: quien decide entra al hilo; quien opera todo el día entra a su pantalla de trabajo con el hilo plegado.
3. ¿Se adelanta CAR-247 (OAuth por usuario para el MCP), hoy marcado «después de v1.0»? Es lo que permite conectar una IA externa como la persona, sin llaves.
4. Fecha de retiro del marco clásico (se fija al terminar H5).
5. ¿La barra de Plataforma debe tener agente? Hoy ADR-055 y R2 lo impiden. Propuesta: que solo busque y navegue.
6. El prototipo muestra que emitir, anular o ceder documentos tributarios y pagar nunca los hace un agente solo. ADR-032 permite que el dueño los autorice por capacidad. ¿Se endurece la regla? Mientras no se decida, rige ADR-032.

## 10. Reporte de ejecución

- **H0 (PR #494):** ADR-090, export del diseño y este plan. Sin código.
