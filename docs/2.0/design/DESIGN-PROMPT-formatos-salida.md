# DESIGN PROMPT — FORMATOS DE SALIDA COMERCIAL POR TENANT (OPAI 2.0, CAR-68)

> **Estado:** listo para copiar, **pero no se usa hasta que Carlos apruebe `docs/2.0/modulos/documentos.md` (parte 1)** y responda sus preguntas abiertas (ADR-047). Si una respuesta cambia una regla, se ajusta este prompt antes de pegarlo.

Para pegar completo en Claude Design, en un proyecto nuevo «Documentos · Formatos de salida», **con el Design System de OPAI 2.0 V2** (oficial; el mismo de `packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`). Nunca el estilo de OPAI 1.0. No crees colores, tipografías, radios ni componentes nuevos salvo los que se piden en la sección 3; todo lo demás se compone con los existentes (`AppShell`, `ListScreen`, `SplitScreen`, `DetailScreen`, `FormScreen`, `FilaSeleccionable`, `Seccion`, `Pares`, `Table`, `Sheet`, `Dialog`, `Select`, `Combobox`, `Checkbox`, `Switch`, `RadioGroup`, `Segmentado`, `Tabs`, `Badge`, `Chip`, `ChipToggle`, `Timeline`, `Vigencia`, `avisar` + `Toaster`, `Empty`, `ErrorState`, `Forbidden`, `Loading`, `Alerta`, `Uploader`, `MapaEstatico`).

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 7, más una captura por pantalla y viewport. Es la referencia de contenido y jerarquía para el brief, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad primero). En el export usa la empresa ficticia **«Atlas Seguridad SpA»** como tenant y **«Inmobiliaria Los Andes S.A.»** como cliente; nada de Gard, ni logos ni nombres reales. Todo lo que se ve en pantalla existe también como capacidad por API y MCP: la UI no inventa flujos.

Cada empresa genera tres **formatos de salida comercial**, con su propia marca y sus propias plantillas:

1. **Presentación de empresa** (quiénes somos, servicios, clientes, certificaciones).
2. **Propuesta técnica aperturada** (detalle del servicio y costo abierto, una sección por instalación).
3. **Cotización simple de una hoja** (solo el valor).

Especificación: `docs/2.0/modulos/documentos.md` (reglas R1–R39, criterios CA1–CA11). Datos de cotización: `docs/2.0/modulos/cpq.md` y ADR-042. Marca: ADR-028 (perfil de marca del núcleo).

**Dos mundos visuales, no los mezcles:**
- **La UI del ERP** (listas, editor, fichas, hojas) va **siempre** con el DS 2.0: superficies, acento índigo, tipografía Inter, estilos `t-*`.
- **El documento** (vista previa en el editor, PDF y página del cliente) va sobre **papel** (`--ds-paper`, `--ds-paper-fg`, `--ds-paper-rule`, `--ds-paper-rule-subtle`), que no cambia con el modo oscuro, y lleva **la marca del tenant**: su logo y sus dos colores de marca, que en el export son marcadores (`Color de marca 1`, `Color de marca 2`) que se rellenan con el perfil de marca. Muéstralos con dos colores de ejemplo bien distintos del índigo del DS y anota en el export que **son datos del tenant, no tokens**. La UI que rodea al papel nunca toma esos colores.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; CLP `$ 12.560.000`; UF `UF 412,35` con «UF del 29-10-2026: $ 39.512,11»; RUT en `t-mono`; códigos `CPQ-2026-041 v3` en `t-mono`; montos en planillas con `t-numeric`.

**Viewports:** 375, 1024 y 1280 en todas las pantallas de la UI; modo oscuro al menos en la lista de plantillas, el editor de plantilla y la ficha del documento. La **página del cliente** a 375 y 1280 (es lo que abre el cliente en su celular).

**Principios (ADR-014, ADR-017, DISENO.md):** una acción principal por pantalla; color solo para estado; foco visible; skeleton con la forma del contenido; vacío con acción; movimiento 150–200 ms con `prefers-reduced-motion`; touch ≥ 44 px; en iPad y escritorio el título vive en la barra del shell. En el celular **se ve, se genera desde una plantilla, se envía, se comparte y se registra una aceptación**; editar plantillas y secciones es de iPad y escritorio (en el celular, esas pantallas muestran la vista previa y el aviso «Edita la plantilla en un iPad o computador»).

## 2. Navegación

Área **Documentos** (`NAVEGACION.md` §2). Dentro de Documentos, pestañas por ruta: **Explorador** (existente, no se diseña aquí) · **Comerciales** · **Plantillas** · **Secciones**. Las salidas también se generan desde la **ficha del negocio** (pestaña Documentos y acción «Generar documento»), desde la **cotización** («Generar propuesta») y desde la **cuenta**. Los ajustes van en **Configuración → Documentos** (centro único de Configuración).

## 3. Componentes que faltan (definirlos con sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `HojaDocumento` | El papel donde se ve un documento | Fondo `paper`, márgenes de página carta, sombra solo como capa (`shadow-overlay`) en la vista previa, numeración de página al pie; zoom ajustar-a-ancho en 375. En el PDF es la misma pieza sin sombra. Variantes: `vista-previa` (editor), `lectura` (página del cliente), `impresion`. |
| `BloqueDocumento` | Cada bloque de la plantilla dentro de `HojaDocumento` | Una variante por tipo (sección 5.2): Portada, Índice, Texto fijo, Sección institucional, Servicios, Clientes, Certificaciones, Comprensión del servicio, Instalaciones, Dotación por instalación, Ítems y costos, Incluye y exclusiones, Condiciones, Resumen económico, Contacto del ejecutivo, Aceptación, Salto de página. Estados en el editor: normal, seleccionado (borde `focus`), oculto al cliente (rayado `fill` con etiqueta «Oculto al cliente»), con aviso (variable vacía, certificado vencido). |
| `ListaBloques` | La lista ordenable de bloques en el editor de plantilla | Fila con asa de arrastre, icono del tipo, nombre, chips «Fijo» u «Opcional», interruptor de visibilidad y menú «…». Reordenar con arrastre y también con «Subir/Bajar» por teclado. «+ Agregar bloque» abre un `Popover` con los tipos agrupados (Institucional · Datos de la cotización · Estructura). |
| `EstadoSeccion` | El estado de una sección editable del documento | `Badge`: «Propuesta por IA» (`info`, con icono de chispa), «Editada» (neutro), «Revisada» (`success`). En las propuestas por IA, botón «Marcar revisada». |
| `ComprobacionesEnvio` | Lista de lo que falta antes de enviar | Ítems con icono y tono: variables vacías, secciones por revisar, certificado vencido, cotización no `lista` (con motivo: en aprobación por margen), destinatarios sin correo. Cada ítem lleva a su lugar. Si no hay nada: «Todo listo para enviar» (`success`). |
| `SelectorNivelApertura` | Los tres niveles de apertura de la propuesta | `RadioGroup` con tarjeta por nivel (Por instalación · Por categoría · Por ítem), una línea de explicación y una mini-tabla de ejemplo de qué ve el cliente. Nota fija: «Margen y costos financieros nunca se muestran al cliente». |
| `SeguimientoEnvio` | Estado por destinatario | Por destinatario: nombre, correo enmascarado, «Enviado 12-10 09:14», «Visto 3 veces · última 13-10 18:02», resultado (Aceptó / Rechazó / Sin respuesta) y menú (copiar enlace, compartir por WhatsApp, revocar). |

## 4. Contenido de ejemplo (úsalo en todas las pantallas)

- **Negocio:** «Seguridad Torres Los Andes» · cuenta Inmobiliaria Los Andes S.A. (RUT 96.512.340-8) · ejecutivo Valentina Rojas, Ejecutiva comercial.
- **Cotización:** `CPQ-2026-041 v3`, estado Lista, en UF, válida hasta 28-11-2026, 3 instalaciones:
  - Torre A · Av. Apoquindo 4500, Las Condes: 2 puestos 24×7 (guardia, 4×4 12 h), 1 puesto diurno lun–vie 08:00–20:00.
  - Torre B · Av. Apoquindo 4700: 1 puesto 24×7.
  - Estacionamientos · Av. Apoquindo 4600: 1 puesto nocturno 20:00–08:00.
  - Servicios comunes: supervisor móvil, rondas con GPS.
  - Total mensual neto **UF 412,35** + IVA; pago único **UF 38,00** (equipamiento inicial).
  - Condiciones: pago a 30 días contra factura, reajuste anual IPC, duración 12 meses, inicio a 15 días de la aceptación.
- **Incluye:** uniformes completos, radios, supervisión 24 h, reportes en el portal del cliente. **No incluye:** CCTV, conserjería.
- **Biblioteca:** Quiénes somos · Nuestros servicios · Supervisión y contingencias · Capacitación · Uniformes y EPP · Certificaciones (OS-10 vigente hasta 03-2027; ISO 9001 **vencida** 08-2026, para mostrar el aviso) · Clientes de referencia (6 logos genéricos).
- **Plantillas del tenant:** Presentación institucional (por defecto) · Propuesta estándar (por defecto, apertura por instalación) · Propuesta detallada (apertura por categoría) · Propuesta licitación privada (apertura por ítem) · Cotización simple (por defecto).

## 5. Pantallas

### 5.1 Plantillas (`/documentos/plantillas`)
`SplitScreen` en 1024/1280; lista en el teléfono. Agrupadas por formato (Presentación · Propuesta · Cotización simple) con `Segmentado` o encabezados. Fila: nombre, chip «Por defecto», versión publicada («v4 · publicada el 21-10-2026»), «Borrador con cambios» si lo hay, uso sugerido (chips), cantidad de documentos generados. Acción principal: **Nueva plantilla** (hoja: formato, nombre, partir de una base de la vertical o duplicar otra). Panel derecho: miniatura de la primera página y «Abrir editor». Vacío: «Aún no tienes plantillas de propuesta» con «Usar la plantilla base».

### 5.2 Editor de plantilla (`/documentos/plantillas/[id]`)
Tres zonas en 1280: **izquierda** `ListaBloques`; **centro** `HojaDocumento` en vista previa con datos de ejemplo de la sección 4 (selector «Ver con: Seguridad Torres Los Andes / Datos de ejemplo»); **derecha** propiedades del bloque seleccionado (texto fijo con variables insertables desde un `Combobox` «Insertar variable»; para la sección institucional, cuál de la biblioteca; para dotación, columnas visibles; para clientes, cuáles logos). En 1024: lista y vista previa, con propiedades en `Sheet` lateral. Arriba, pestañas internas **Bloques · Marca y página · Apertura** (solo en propuesta) · **Versiones**.
- **Marca y página:** variante de logo (principal, claro, oscuro, isotipo), color de portada (Color de marca 1 o 2), estilo de portada (completa, encabezado, sin portada), tamaño carta/A4, numeración de secciones, pie con variables. Enlace «Editar el perfil de marca» a Configuración → Marca. Mensaje: «Los colores salen del perfil de marca de tu empresa».
- **Apertura:** `SelectorNivelApertura` y nombre de la línea agregada («Gastos generales y utilidad», editable).
- **Versiones:** `Timeline` de versiones publicadas con quién y cuándo, y «Comparar con la publicada».
- Barra de acciones: «Guardar borrador» y **Publicar** (principal; `Dialog` con resumen de cambios y avisos: variables desconocidas impiden publicar).
- **Asistente de IA (ADR-028):** botón secundario «Proponer con IA» que abre un `Sheet` con una instrucción («propuesta formal para minería, con tabla de dotación y certificaciones primero») y muestra la propuesta como **diferencias sobre los bloques** (agregados en `success-muted`, quitados tachados) con «Aplicar al borrador» o «Descartar». Nunca publica sola.

### 5.3 Biblioteca de secciones (`/documentos/secciones`)
Lista con título, uso (en cuántas plantillas), última edición y aviso de certificado vencido. Edición en `Sheet` ancho (en 1280, dos columnas: editor enriquecido con títulos, listas, tabla simple, imagen desde Documentos; y vista en papel). En «Certificaciones», tabla de documentos enlazados con `Vigencia`. Vacío: «Escribe una vez «Quiénes somos» y úsala en todas tus propuestas».

### 5.4 Comerciales (`/documentos/salidas`)
Lista de documentos generados: código (`CPQ-2026-041 v3 · Propuesta`, `PRE-2026-012`), cliente, formato, estado (`Badge`: Borrador, Enviado, Visto, Aceptado `success`, Rechazado `danger`, Vencido `warning`, Reemplazado, Retirado), vistas, ejecutivo, fecha. Filtros con chips: formato, estado, ejecutivo, «Mis documentos». En el teléfono, filas apiladas con estado y vistas.

### 5.5 Generar documento (hoja, desde el negocio o la cotización)
Paso único en `Sheet`: (1) **Formato** con tres tarjetas (Presentación · Propuesta · Cotización simple) y una **recomendación** destacada («Recomendado: Propuesta detallada — negocio nuevo con 3 instalaciones y cotización lista») con «¿Por qué?»; los formatos que necesitan cotización se deshabilitan con motivo si no hay una lista; (2) **Plantilla** (`Select` de las publicadas del formato); (3) **Cotización** (versión, preseleccionada la vigente); (4) **Nivel de apertura** (solo bajar). Pie: vista previa (dry-run) «Se creará el borrador CPQ-2026-041 v3 · Propuesta con 14 secciones; 1 sección para escribir: Comprensión del servicio» y **Crear borrador**. En el teléfono, hoja completa con la acción fija abajo.

### 5.6 Documento (`/documentos/salidas/[id]`) — borrador
`DetailScreen`. Encabezado: código, cliente, formato, estado y chips (plantilla v4, cotización v3). Pestañas por ruta: **Contenido · Envío · Actividad**.
- **Contenido** en 1280: a la izquierda índice de secciones con `EstadoSeccion`; al centro la `HojaDocumento` editable en las secciones no fijas (los bloques de datos muestran «Viene de la cotización · Editar en la cotización»); a la derecha `ComprobacionesEnvio`. Alternar **Vista interna / Vista cliente** con `Segmentado`. Aviso superior si hay una versión nueva de la cotización: «La cotización tiene la versión v4 · Crear nueva versión del documento».
- Acción principal **Enviar** (deshabilitada con el motivo mientras haya comprobaciones abiertas). Secundarias: Descargar PDF (borrador con marca de agua «Borrador»), Descartar.
- **Sección propuesta por el agente:** mostrar una («Comprensión del servicio») con `Badge` «Propuesta por IA · agente interno vía Valentina Rojas» y «Marcar revisada».
- En el teléfono: vista cliente a ancho completo, índice como `Sheet`, y la acción Enviar fija abajo; sin edición de texto.

### 5.7 Enviar (hoja)
Destinatarios (contactos del negocio con su rol, `Checkbox`; los sin correo, deshabilitados con «Sin correo · Compartir por WhatsApp»), asunto y mensaje (de la plantilla de Comunicaciones, editable en el envío), «Adjuntar PDF» (`Switch`), si hay un certificado vencido, `Checkbox` obligatorio «Enviar igual con la certificación ISO 9001 vencida»; resumen «Se enviará a 2 personas, cada una con su enlace personal, válido hasta el 28-11-2026». Estados: vista previa, enviando, éxito («Enviado · copiar enlaces»), error, y la variante **agente**: «Esta acción necesita la aprobación de una persona» con el resumen y «Aprobar y enviar» (Bandeja).

### 5.8 Documento — enviado y seguimiento
Misma ficha en solo lectura. Pestaña **Envío** con `SeguimientoEnvio` por destinatario, el PDF enviado con su huella («SHA-256 · 9f3a…c21e», `t-mono`) y acciones: Copiar enlace, Compartir por WhatsApp, **Registrar aceptación** (hoja: quién aceptó, fecha, medio — orden de compra, PDF firmado, correo — y `Uploader` del respaldo obligatorio), Nueva versión, Retirar (con motivo, `Dialog` destructivo). Estado aceptado: tarjeta `success` con quién, cuándo, cómo y «Ver comprobante»; enlace a «Negocio ganado» o «Ganar el negocio» según el ajuste. Pestaña **Actividad**: `Timeline` (generado, editado por el agente, revisado, enviado, visto, aceptado).

### 5.9 Página del cliente (`/d/[token]`, sin sesión)
Lo que abre el cliente. Sin el shell del ERP: barra superior mínima con **el logo del tenant**, código y «Descargar PDF». Cuerpo: el documento en modo **lectura** (bloques reflujados a una columna en 375; en 1280, papel centrado con índice lateral fijo). Abajo, fija en el teléfono: barra con el valor («UF 412,35 + IVA mensual · válida hasta 28-11-2026») y **Aceptar propuesta** (principal) · «Rechazar». Estados de la página: vigente, **ya aceptada** («Esta propuesta ya fue aceptada el 14-10-2026», sin el nombre de quien aceptó; el nombre solo va en la constancia del PDF), **vencida** («Esta propuesta venció el 28-11-2026 · Pedir una propuesta actualizada»), **reemplazada** («Hay una versión más reciente» con enlace si corresponde), **retirada**, enlace inválido. El comprobante `/verificar` (existente) muestra solo la huella del PDF, la fecha y el estado, sin nombres ni RUT. Pie con datos legales del tenant (razón social, RUT, dirección) y «Documento verificable · OPAI». Esta página usa los colores de marca del tenant en la portada y los acentos del documento; los botones mantienen la forma del DS (`Button`) con el **Color de marca 1** como relleno del primario solo aquí, con contraste AA verificado (si no lo cumple, usa el `accent` del DS; anótalo).

### 5.10 Aceptar o rechazar (hoja en la página del cliente)
**Aceptar:** resumen (cliente, código, valor mensual, condiciones clave), campos nombre, RUT, cargo, casilla «Acepto esta propuesta y sus condiciones», «Te enviamos un código a m•••@losandes.cl» con `Input` de 6 dígitos y reenviar, y (opcional del tenant) recuadro de trazo de firma. Estados: completando, código incorrecto (quedan N intentos), demasiados intentos («Intenta de nuevo en 15 minutos»), código vencido, aceptando, **aceptada** (pantalla de confirmación con el comprobante y «Descargar PDF con la constancia»). **Rechazar:** motivo (precio, alcance, plazo, otro) y comentario; confirmación «Gracias, le avisamos a Valentina Rojas».

### 5.11 Los tres documentos en papel (vista de impresión, carta)
Diseña las páginas reales (al menos): **Presentación** (portada completa, índice, Quiénes somos, Servicios, Clientes con logos, Certificaciones con vigencia, contacto). **Propuesta detallada** (portada, índice, comprensión del servicio, una sección por instalación con mapa estático y tabla de dotación, ítems por categoría, servicios comunes, incluye y exclusiones, condiciones, **resumen económico** con neto, IVA, total, pago único aparte y UF del día, aceptación; y la **página de constancia** de aceptación con la evidencia). **Cotización simple** (una sola hoja: encabezado con logo, cliente, tabla de 3 instalaciones con su valor mensual, total, condiciones en dos líneas, «incluye» en una línea, validez y recuadro de aceptación). Variante de la propuesta con apertura **por ítem** mostrando sueldo base y leyes sociales y la línea «Gastos generales y utilidad».

### 5.12 Configuración → Documentos
`AjustesForm` con: vigencia del enlace de la presentación (90 días), adjuntar PDF al correo por defecto, trazo de firma en la aceptación (apagado), **Ganar el negocio al aceptar** (`Switch`, con explicación «Al ganar, los puestos se ofrecen a RRHH; nunca se crean solos»), aviso al ejecutivo cuando el cliente abre (enlace a Comunicaciones), nombre visible de cada formato.

## 6. Estados obligatorios por pantalla
Loading (skeleton con la forma: lista, editor de tres zonas, papel), vacío con acción, error con «Reintentar», sin permisos (`Forbidden`, sin datos parciales), y en las hojas: vista previa (dry-run), confirmando, éxito y error de regla de negocio con el texto del servidor. En la página del cliente, además: enlace inválido, vencido, reemplazado y retirado.

## 7. Archivos del export
`Plantillas.dc.html`, `EditorPlantilla.dc.html`, `EditorPlantillaMarca.dc.html`, `EditorPlantillaApertura.dc.html`, `AsistenteIAPlantilla.dc.html`, `Secciones.dc.html`, `SeccionEditar.dc.html`, `Comerciales.dc.html`, `GenerarDocumento.dc.html`, `DocumentoBorrador.dc.html`, `Enviar.dc.html`, `DocumentoEnviado.dc.html`, `RegistrarAceptacion.dc.html`, `ClientePagina.dc.html`, `ClienteAceptar.dc.html`, `ClienteEstados.dc.html`, `PapelPresentacion.dc.html`, `PapelPropuesta.dc.html`, `PapelPropuestaPorItem.dc.html`, `PapelCotizacionSimple.dc.html`, `PapelConstancia.dc.html`, `ConfigDocumentos.dc.html`, y `shots/` con 375/1024/1280 (la página del cliente en 375 y 1280; el papel en carta).

## 8. No hacer
- No usar el estilo, colores ni componentes de OPAI 1.0.
- No pintar la UI del ERP con los colores del tenant.
- No mostrar margen, costo financiero, margen efectivo, trazas de fórmulas ni nombres o RUT de trabajadores en ningún documento.
- No inventar componentes fuera de la sección 3; si algo falta, anótalo como pendiente del DS.
