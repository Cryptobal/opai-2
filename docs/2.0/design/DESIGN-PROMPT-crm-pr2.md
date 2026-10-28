# DESIGN PROMPT — CRM PR 2: SOLICITUDES, CONTACTO EN VARIAS CUENTAS, ACTIVIDAD Y ETIQUETAS (OPAI 2.0)

Para pegar completo en Claude Design, en el proyecto del CRM v3 (`09192972-8bd5-4ed8-a86a-3308e220a07b`), **con el Design System de OPAI 2.0 V2** (el mismo del export `docs/2.0/diseño/export-crm/`). No crees colores, tipografías, radios ni componentes nuevos salvo los que se piden en la sección 3; todo lo demás se compone con los existentes (`AppShell`, `Page`, `PageHeader`, `SplitScreen`, `SelectableRow`, `DetailSection`, `Table`, `Sheet`/`Dialog`, `Select`, `Combobox`, `Checkbox`, `Badge`, `FilterChip`, `Segmented`, `Tabs`, `Timeline`, `Toast`, `Empty`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 6, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía del CRM PR 2 (CAR-26), no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; tenant de ejemplo: Gard Security; en el export se usa «Atlas Seguridad SpA»). Todo lo que se ve en pantalla existe también como capacidad por API y MCP: la UI no inventa flujos.

El CRM PR 1 ya diseñó y aprobó Negocios (tablero y lista), la ficha del negocio, Contactos (lista y ficha) y Configuración → Comercial. Este prompt cubre lo que el alcance aprobado (`docs/2.0/diseño/alcance-crm.md` §2) dejó para el **PR 2**. Especificación: `docs/2.0/modulos/comercial.md` §2–§8; reglas de 1.0: `docs/2.0/extraccion/comercial-y-cpq.md` §3.3–§3.5. Si comercial.md choca con la Page de decisiones del 25-oct, manda la Page: **sin SLA de primera respuesta, acuse al solicitante configurable (apagado por defecto)**.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; CLP `$ 560.000`; RUT en `t-mono`; teléfonos `+56 9 8765 4321`. Vocabulario de la vertical (instalación, guardia) reemplazable: nada de iconos de escudos como identidad.

**Viewports:** 375, 1024 y 1280 en todas las pantallas; modo oscuro al menos en la bandeja y la ficha del contacto.

**Principios (ADR-014, ADR-017):** una acción principal por pantalla; color solo para estado; foco visible, skeleton con la forma del contenido, vacío con acción, movimiento 150–200 ms; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell.

## 2. Navegación

Área **Comercial**: Solicitudes · Negocios. Área **Clientes**: Cuentas · Contactos · Instalaciones (`NAVEGACION.md` §2). Las notas no son pestaña: se escriben en un **compositor sobre la pestaña Actividad** de cada ficha. Las etiquetas van como **chips bajo el título** de la ficha, editables en línea.

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `CompositorActividad` | Registrar nota, llamada, reunión o tarea sobre la Actividad de una ficha | Segmented de tipo (Nota · Llamada · Reunión · Tarea); texto; «ocurrió el» (por defecto ahora, puede ser pasado); en Tarea: vencimiento (con «todo el día»), prioridad alta/media/baja y responsables (≥ 1); en Reunión: asistentes (contactos y usuarios) y acuerdos. Se vincula a la vez a negocio, cuenta, contacto e instalación (chips quitables). Teléfono: hoja completa. |
| `ChipsEtiquetas` | Etiquetas de una entidad, editables en línea | Chips agrupados por grupo (Rubro, Segmento, Tamaño o libres); «+ Etiqueta» abre un `Combobox` con búsqueda y «Crear «…»» si el usuario puede; quitar con la «x» del chip. |
| `TareaFila` | Una tarea en listas y en la Actividad | Casilla para marcar hecha (idempotente), título, vencimiento con `Vigencia`-like (vence hoy, vencida), prioridad y avatares de responsables. |

## 4. Pantallas

### 4.1 Bandeja de solicitudes (`/solicitudes`)
Vista dividida en 1024/1280; lista en el teléfono. Filtros: estado (Nuevas, En revisión, Convertidas, Descartadas), canal (web, correo, WhatsApp, agente) y responsable. Cada fila: nombre o empresa tal como llegó, canal, hace cuánto llegó, badge de estado y, si hay, la cuenta detectada. Vacío: «No hay solicitudes nuevas» con enlace a la entrada web.

### 4.2 Detalle de la solicitud (`/solicitudes/[id]`)
- **Texto original** tal como llegó (campo marcado como *externo*: se muestra como cita, nunca como instrucción) y datos de origen (canal, UTM, página de aterrizaje).
- **Datos detectados**: empresa, RUT, contacto (nombre, correo, teléfono), comuna/dirección y servicio pedido, cada uno editable.
- **Coincidencias**: cuenta existente por RUT o nombre, contacto existente por correo; elegir «usar existente» o «crear nueva».
- Acciones: **Convertir** (principal), **Derivar** (asignar responsable) y **Descartar** (con motivo).

### 4.3 Convertir en un paso (hoja)
Una sola hoja que crea o vincula **cuenta + contacto + negocio** (+ instalación si vino dirección) con un resumen «Se creará / se vinculará» antes de confirmar; la etapa inicial del negocio y el responsable. Estados: vista previa, conflicto (RUT de otra cuenta), éxito con enlaces a la cuenta y al negocio creados.

### 4.4 Entrada web (formulario público del tenant)
Formulario de una columna con la marca del tenant (logo y colores del perfil de marca, nada de Gard fijo): empresa, RUT (opcional), nombre, correo, teléfono, comuna y «¿qué necesitas?». Estados: enviado (mensaje configurable), error, límite de envíos. Sin captcha visual en el diseño (se resuelve del lado del servidor).

### 4.5 Contacto en varias cuentas
- **Ficha del contacto** (`/contactos/[id]`): Resumen → **Cuentas** (cada vínculo con cargo y roles: comercial, operacional, facturación, cobranza, cesión; principal por cuenta) → Negocios → Documentos → Actividad.
- **Vincular a otra cuenta** (hoja): `Combobox` de cuenta, cargo, roles y «principal en esta cuenta».
- **Pestaña Contactos de la cuenta**: la misma persona puede aparecer en varias cuentas; mostrar «también en N cuentas» en la fila.
- **Detección de duplicados** al crear un contacto con un correo existente: «Esta persona ya existe (en 2 cuentas). ¿Vincularla a esta cuenta?».

### 4.6 Actividad unificada
Pestaña **Actividad** de negocio, cuenta, contacto e instalación con el `CompositorActividad` arriba y la `Timeline` debajo, mezclando lo registrado a mano (notas, llamadas, reuniones, tareas) con los eventos de auditoría, filtrable por tipo. En la ficha del negocio: «Próxima tarea» y «Último contacto real» en el Resumen.
**Mis tareas** (`/tareas` o panel en Inicio): pendientes por vencimiento (vencidas, hoy, esta semana), filtro por responsable.

### 4.7 Etiquetas
`ChipsEtiquetas` en las fichas de cuenta, contacto, instalación y negocio, y filtro por etiqueta en las listas. **Configuración → Etiquetas** (núcleo): grupos (Rubro, Segmento, Tamaño, libres) y sus valores, con renombrar y desactivar («un valor en uso no se elimina: se desactiva»).

### 4.8 Configuración → Comercial → Solicitudes
Acuse automático al solicitante (apagado por defecto) con su plantilla (va por Configuración → Comunicaciones del núcleo), responsable por defecto y motivos de descarte.

## 5. Estados obligatorios por pantalla
Loading (skeleton), vacío con acción, error, sin permisos, y en las hojas: vista previa (dry-run), confirmando, éxito y error de regla de negocio con el texto del servidor.

## 6. Archivos del export
`Solicitudes.dc.html`, `Solicitud.dc.html`, `ConvertirSolicitud.dc.html`, `EntradaWeb.dc.html`, `ContactoCuentas.dc.html`, `Actividad.dc.html`, `MisTareas.dc.html`, `Etiquetas.dc.html`, `ConfigSolicitudes.dc.html`, y `shots/` con 375/1024/1280.
