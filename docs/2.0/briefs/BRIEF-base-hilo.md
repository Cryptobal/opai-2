# BRIEF · Base «Hilo»: hoja de alcance y plan por etapas (CAR-274)

**Estado:** aprobado por Carlos el 11-nov-2026 (ADR-090) · **Sesión:** «Sesión Hilo» (chat del proyecto «Opai 2.0») · **Diseño:** [`design/export-base-hilo/`](../design/export-base-hilo/README.md) · Este documento es la hoja de alcance y el plan. Cada etapa trae su brief de 16 secciones en el PR que la construye.

## 1. Objetivo

Que OPAI 2.0 se opere desde el agente: una persona, o una IA externa conectada, ve lo que espera decisión, lo que pasó y lo que viene, y pide lo que necesita desde cualquier pantalla. El marco nuevo («Hilo») reemplaza la barra lateral, la barra inferior, Inicio, la Bandeja, la campana y el panel del agente por tres piezas: hilo, lienzo y barra. Lo construido es copia fiel del diseño aprobado.

## 2. Estado actual (verificado en `main`, 11-nov-2026)

- **Un solo punto de montaje del marco:** `apps/web/app/_components/marco-shell.tsx` monta `AppShell` (`packages/ds/src/shell/`) en el layout de cada portal (ADR-045). Recibe `DatosShell` (portal, navegación, portales, empresa, usuario, agente).
- **La navegación es declarativa:** cada módulo declara sus entradas en el manifiesto (`area`, `href`, `permiso`); el núcleo las filtra por módulo activo y permiso. El Índice del marco nuevo sale de ahí, sin tocar módulos.
- **Preferencias por usuario:** ya existen ajustes de ámbito `usuario` (por ejemplo, Tema) en `packages/capabilities/src/core/config/nucleo.ts`. El marco actual no lee preferencias en el servidor (ADR-045): se cargan después de hidratar.
- **Agente interno:** existe solo en el ERP (`modulos/agente.md` R1), como panel lateral con contexto de la ficha o lista. ADR-090 lo lleva a todos los portales.
- **Datos del hilo que ya existen como capacidad:** aprobaciones (`core.aprobaciones.*`), actividades y tareas (`core.actividades.*`), avisos de la Bandeja. No existe una capacidad que reúna «lo que viene» ni una de actividad reciente transversal.
- **Límites que el marco debe respetar:** presupuesto de JS por ruta (ADR-037; terreno ≤ 150 KB, ADR-044), 109 specs e2e, caché de componentes y CSP con nonce.
- **Por verificar en la etapa que corresponda:** cómo se aplica hoy el Tema sin parpadeo (H1), si los webhooks salientes de ADR-029 están construidos (H6) y cómo se comporta una IA externa con el número actual de herramientas MCP (H6).

## 3. Alcance

**Entra:** el marco Hilo en los seis portales, la piel Hilo de los patrones del DS, el acceso al sistema con la piel nueva, las capacidades del hilo con su herramienta MCP, la barra del agente con contexto en todos los portales, las propuestas y la autonomía por agente, y el retiro del marco clásico.

**No entra:** cambios de reglas de negocio, de permisos o de datos de los módulos; rehacer el contenido de las pantallas aprobadas; desplegar a la producción de Gard; tocar OPAI 1.0.

**Reglas de orden (ADR-090):**

1. No se tocan pantallas de Finanzas hasta cerrar CAR-267, CAR-268 y CAR-269.
2. Guardia y Terreno migran al final, midiendo el funcionamiento sin conexión y el presupuesto de JS.
3. Marcas de asistencia, rondas, firmas y registros de acceso son siempre el acto de una persona. La barra no los ejecuta.

## 4. Arquitectura

- **Interruptor:** ajuste `marco` con valores `clasico` e `hilo`, de ámbito usuario, con valor por defecto por empresa. El marco se elige en `marco-shell.tsx`; las páginas, las capacidades y los manifiestos son los mismos para ambos. Solo se descarga el marco activo.
- **Marco Hilo:** componentes nuevos en `packages/ds/src/shell/hilo/` (cabecera, hilo, lienzo, barra, riel para planillas). Aparecen en `/ds` con sus estados.
- **Piel Hilo:** los tokens y las variantes de los patrones se aplican con alcance (atributo en la raíz del marco). El marco clásico no cambia de aspecto.
- **Datos del hilo:** tres lecturas con herramienta MCP (ADR-055): pendientes, actividad y agenda. Respetan permiso y alcance por filas (ADR-022) y las lecturas auditadas (NÚCLEO-H).
- **Barra:** el agente interno (ADR-049) más la búsqueda de ⌘K. Envía la pantalla, el registro abierto y la pestaña; el servidor revalida ese contexto (`modulos/agente.md` R9).

## 5. Etapas

Cada etapa es un PR (o una serie corta), con su issue de Linear, su brief, su novedad in-app si cambia algo visible y la revisión visual de Carlos en `preview.opai.cl` (A2.10).

| Etapa | Qué entrega | Criterios de aceptación |
|---|---|---|
| **H1 · Interruptor y marco Hilo en el ERP** | Ajuste `marco` en Preferencias y en Configuración › Empresa. Marco Hilo en el ERP con cabecera, Pendientes (aprobaciones y avisos reales), lienzo con las páginas actuales, Índice desde el manifiesto, cambio de portal y de empresa, riel para planillas. Sin barra del agente todavía: la barra busca pantallas y registros (⌘K actual) | Con `marco = clasico` nada cambia (e2e actuales en verde). Con `hilo`, todas las rutas del ERP abren dentro del lienzo. Sin parpadeo al cargar. Presupuesto de JS dentro de los topes o justificado. Capturas a 390, 1024 y 1440 comparadas con `Main`, `iPad` e `iPhone` del export |
| **H2 · Piel Hilo de los patrones** | Variantes con alcance de `ListScreen`, `DetailScreen` (pestañas con subrayado), `FormScreen`, `PlanillaScreen`, `DashboardScreen`, `KpiTile`, botones, avisos y estados (cargando, vacío, error, sin permiso) | Una lista, una ficha, una planilla y un formulario reales se ven como en el export. Contraste AA en claro y oscuro. Ninguna pantalla pierde campos. El marco clásico no cambia |
| **H3 · Actividad y Agenda** | Capacidades de lectura `core.hilo.actividad` y `core.hilo.agenda` (nombres por confirmar en el brief), con herramienta MCP, alcance por filas y pruebas con dos empresas | La misma lista se obtiene en pantalla, por `/api/v1` y por MCP. Un supervisor solo ve sus instalaciones. Un cliente no ve nada interno |
| **H4 · Barra del agente con contexto, en todos los portales** | La barra reemplaza al panel en el marco Hilo. Chip «Sobre: …», sugerencias por pantalla, respuesta como pantalla. Se enciende por portal y por rol. Cambia `modulos/agente.md` R1 | En Solicitudes, una pregunta se responde sobre esa lista. Un guardia solo llega a sus datos; un cliente, solo a su cuenta y sin costos. Lo irreversible va siempre a Pendientes. El consumo se mide por portal |
| **H5 · Portales y acceso** | Marco Hilo en Supervisor, Cliente y Plataforma; después Guardia y Terreno. Acceso al sistema con la piel nueva | Cada portal coincide con su tablero del export. Terreno y Guardia funcionan sin conexión y dentro de 150 KB por ruta. Los flujos de marca, ronda, bitácora y control de acceso no cambian de reglas |
| **H6 · Núcleo agéntico** | Propuestas como entidad (un agente deja un cambio preparado y una persona lo aprueba), autonomía por agente con piso por capacidad, «Deshacer» para lo reversible, y conexión de IA externas: el hilo completo por MCP, revisión del catálogo de herramientas y OAuth por usuario (CAR-247) | Un agente externo con su llave lee Pendientes, deja una propuesta y ve su resultado. Nada marcado «siempre una persona» se ejecuta solo. Cada acción queda en la auditoría con el agente y quien aprobó |
| **H7 · Marco por defecto y retiro del clásico** | Hilo como valor por defecto por empresa con el OK de Carlos; retiro del marco clásico y de su código en la fecha que él fije | Ninguna ruta depende del marco clásico. El presupuesto de JS baja al retirar su código |

## 6. Fidelidad («copia fiel»)

- La referencia es el export. Cada PR visual trae capturas a 390, 1024 y 1440 px, en claro y oscuro, junto al tablero equivalente.
- Se compara el marco, la piel y la estructura de cada patrón. El contenido real de cada pantalla manda sobre el de ejemplo: no se quitan campos para parecerse al prototipo.
- Toda diferencia que no se pueda igualar se declara en el PR con su motivo. No se da por aprobada sin el OK visual de Carlos.

## 7. Seguridad y tenant

- El marco no agrega accesos: muestra lo que las capacidades ya permiten. El tenant sale de la sesión.
- Las lecturas del hilo aplican el alcance en la consulta y fallan cerradas.
- El contexto que envía la barra se revalida en el servidor. Todo texto de terceros sigue marcado como externo.
- Las llaves, la autonomía y las aprobaciones las gobiernan solo personas (`soloPersonas`).

## 8. Riesgos y vuelta atrás

| Riesgo | Mitigación |
|---|---|
| Dos marcos a la vez encarecen el mantenimiento | Solo se duplica lo propio del marco; H7 fija una fecha de retiro |
| El marco nuevo rompe la caché o parpadea al cargar | H1 sigue el mecanismo del Tema y lo mide antes de integrar |
| Presupuesto de JS, sobre todo en terreno | Se descarga solo el marco activo; terreno va al final y se mide |
| El hilo queda vacío mientras no existan agentes que propongan | H1 parte con aprobaciones y avisos reales; los agentes llegan en H6, de a uno |
| Choque con sesiones que trabajan en paralelo | Cada etapa toca `packages/ds/src/shell/hilo/` y `marco-shell.tsx`; se avisa en el PR antes de tocar un archivo de otro PR abierto |

**Vuelta atrás:** en cualquier etapa, poner `marco = clasico` por empresa devuelve el marco actual sin desplegar. Cada PR se revierte por separado. No hay migraciones destructivas.

## 9. Decisiones pendientes de Carlos

1. ¿Los agentes de la empresa (Cobranza, Cobertura…) vienen incluidos con su módulo o se cobran aparte?
2. ¿Inicio según rol? Propuesta: quien decide entra al hilo; quien opera todo el día entra a su pantalla de trabajo con el hilo plegado.
3. ¿Se adelanta CAR-247 (OAuth por usuario para el MCP), hoy marcado «después de v1.0»? Es lo que permite conectar una IA externa como la persona, sin llaves.
4. Fecha de retiro del marco clásico (se fija al terminar H5).

## 10. Reporte de ejecución

- **H0 (este PR):** ADR-090, export del diseño y este plan. Sin código.
