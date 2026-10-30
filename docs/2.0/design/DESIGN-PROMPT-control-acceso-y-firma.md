# DESIGN PROMPT — CONTROL DE ACCESO Y FIRMA ELECTRÓNICA (OPAI 2.0)

**Estado:** **listo para copiar.** Carlos aprobó [`modulos/control-acceso.md`](../modulos/control-acceso.md) y [`modulos/firma.md`](../modulos/firma.md) el 29-oct-2026 (15:17 CLT; §16 y §17 de cada especificación); este prompt ya incorpora sus decisiones (lista como única base, listas del cliente desde su perfil, formulario configurable, escaneo de cédula/pasaporte/patente, FEA opcional apagada, firma automática del representante legal configurable por tipo de documento, verificación de externos contratada por la plataforma) y el diseño debe ser **premium** en todas las pantallas. Queda abierta, en investigación, la pregunta P10 de firma (Mi DT); no afecta al diseño. Tarea: CAR-73.

Para pegar completo en Claude Design, en un **proyecto nuevo** «Control de acceso y firma OPAI 2.0», **con el Design System de OPAI 2.0 V2** (`packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`; shell y bordes según ADR-050). Nunca el estilo de OPAI 1.0. No crees colores, tipografías, radios ni sombras nuevos; los componentes nuevos son solo los de la sección 3, y todo lo demás se compone con los existentes: `AppShell`, `ListScreen`, `SplitScreen`, `DetailScreen`, `FormScreen`, `DashboardScreen`, `Seccion`, `Pares`, `Table`, `FilaSeleccionable`, `Sheet`, `Dialog`, `Campo`, `Input`, `InputBusqueda`, `Select`, `Combobox`, `Checkbox`, `Switch`, `InputFecha`, `InputFechaRango`, `InputHora`, `Uploader`, `Button`, `Badge`, `Chip`, `ChipToggle`, `Segmentado`, `Tabs`, `Timeline`, `Vigencia`, `Card`, `KpiTile`, `Alerta`, `EstadoIlustrado`, `avisar`/`Toaster`, `Loading`, `Empty`, `ErrorState`, `Forbidden`.

Resultado esperado: **export HTML standalone**, una pantalla por archivo, con los nombres de la sección 6, y una captura por pantalla y viewport. Es la referencia de contenido y jerarquía de los Briefs 16, 09 y 28, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS multi-tenant y agent-first para empresas intensivas en personal (seguridad primero; en el export usa la empresa ficticia **«Atlas Seguridad SpA»** y el cliente ficticio **«Bodegas del Sur S.A.»**, nunca Gard). Todo lo que se ve en pantalla existe también como herramienta MCP con los mismos permisos: la pantalla no inventa flujos.

- **Control de acceso:** el guardia de la portería registra entradas y salidas de visitas, contratistas, proveedores, vehículos y despachos desde un **celular o tablet emparejado** a la instalación, también **sin conexión**; el cliente prerregistra visitas y ve quién está en su recinto; el ERP gestiona listas autorizadas y bloqueadas. Reglas R1–R28 de `control-acceso.md`.
- **Firma electrónica:** tres niveles, **N1 firma simple**, **N2 firma simple reforzada** (código de un solo uso y verificación de identidad; los «externos» —quien firma sin estar enrolado: representante del cliente, proveedor, postulante— verifican con cédula, selfie y prueba de vida por un proveedor que contrata la plataforma, no el tenant) y **N3 firma electrónica avanzada**, **integración opcional que cada tenant activa y contrata, apagada por defecto** (Gard no la usa). Los documentos se congelan al enviarse y el PDF firmado lleva una página de evidencia con QR de verificación. El representante legal puede configurar su firma automática por tipo de documento, también en contratos y anexos con el personal, con autorización expresa, vigencia y revocable. Reglas R1–R19 de `firma.md`.

**Formatos:** español de Chile; `dd-mm-aaaa`; `HH:mm`; RUN en `t-mono` y **enmascarado** fuera de la portería (`12.3••.•••-K`); patentes en `t-mono` (`ABCD·12`); teléfonos `+56 9 8765 4321`.

**Viewports:** **375 (teléfono), 1024 (iPad) y 1280 (escritorio)** en todas las pantallas. En Terreno, el 1024 va **horizontal** (tablet fija en un mesón) y el 1280 solo verifica que nada se rompa en una pantalla grande de portería. **Modo oscuro** obligatorio en todas las de Terreno (porterías nocturnas) y en la pantalla Firmar.

**Principios (ADR-014, ADR-017, `DISENO.md`):** **diseño premium en todas las pantallas** (decisión de Carlos del 29-oct-2026): jerarquía tipográfica cuidada, espaciado generoso, microinteracciones sutiles y acabado consistente con el DS, sin recargar; una acción principal por pantalla; color solo para estado (`success` autorizado, `danger` bloqueado, `warning` sin validar, desactualizado o fuera de lista, `info` diferido); foco visible; skeleton con la forma del contenido; vacío con acción; movimiento 150–200 ms con `prefers-reduced-motion`; contraste AA; áreas táctiles ≥ 44 px (**≥ 56 px en Terreno**, se usa con guantes y a pleno sol); en iPad y escritorio el título vive en la barra del shell; nada fijo bajo la safe-area de iOS. Terreno: pantalla de tarea única, sin menú (`NAVEGACION.md` §4).

## 2. Navegación

- **ERP:** área **Operaciones** → «Accesos» (séptima entrada). Ficha de instalación → pestaña **«Accesos»** con sub-pestañas por ruta: Registros · En sitio · Esperados · Listas · Intentos denegados (ADR-041). Área **Documentos** → Documentos → vista «Firmas» (`NAVEGACION.md` §2). Configuración (al pie) → Módulos → Control de acceso, y Documentos → Firma.
- **Terreno:** el dispositivo emparejado abre la **Portería** como tarea principal.
- **Cliente:** Instalaciones → instalación → «Accesos» (en sitio, registros, prerregistrar, su lista si está habilitada); Reportes → destinatarios de accesos; Documentos → por firmar.
- **Trabajador:** Mis documentos → «Por firmar».
- **Público:** la pantalla Firmar (enlace personal) y Verificar (`/verificar/<token>`), con la marca del tenant (logo y colores del perfil de marca), nada fijo.

## 3. Componentes que faltan (definirlos con todos sus estados)

| Componente | Qué es | Especificación |
|---|---|---|
| `EscanerDocumento` | Vista de cámara para leer la cédula (QR o PDF417), la zona MRZ del pasaporte o una patente, con la mejor tecnología disponible en el dispositivo | Marco guía según el modo (`Segmentado`: Cédula · Pasaporte · Patente · Escribir); linterna; texto de ayuda; estados: buscando, leído (vibración y check), no se pudo leer (pasar a escribir), sin permiso de cámara. A pantalla completa en teléfono |
| `ResultadoAcceso` | Bloque grande con la decisión de listas | Variantes: **Autorizado** (`success`, con «Prerregistrado por …» si aplica), **Sin lista** (neutro, sigue el registro manual: la instalación no tiene lista cargada para este tipo), **Fuera de lista, permitido** (`info`, modo lista estricta con «permitir ingresos fuera de lista» activo: se admite y queda marcado), **No autorizado** (`danger`, modo lista estricta sin la opción activa o persona bloqueada: sin motivo, con «Avisar a mi supervisor»), **Fuera de horario** (`warning`), **Sin validar con la lista actual** (`warning`, sin conexión). Ícono + texto: nunca solo color |
| `IndicadorConexion` | Estado de red y de la cola en la barra superior de Terreno; extiende el estado `SinConexion` que ya existe en el DS | En línea · Sin conexión (N pendientes) · Sincronizando · Listas desactualizadas (> 24 h). Toca para ver la cola |
| `FilaEnSitio` | Persona dentro del recinto | Nombre, tipo (`Chip`), empresa, desde `HH:mm`, permanencia con `Vigencia`-like (normal, por vencer, excedida), patente si hay; acción «Salida» de 56 px |
| `NivelFirma` | Insignia del nivel de firma | N1 Simple · N2 Reforzada · N3 Avanzada (`Badge` con ícono distinto por nivel, misma paleta de estados) |
| `PasosFirma` | Avance de la firma para el firmante | Revisar → Identificarse (según nivel: código, prueba de vida, prestador FEA) → Firmar → Listo |
| `PadFirma` | Área para dibujar la firma o escribir el nombre | `Segmentado` Dibujar · Escribir; «Borrar»; casilla de aceptación con el texto legal visible; deshabilitado hasta que el documento se haya recorrido entero |
| `EvidenciaFirma` | Lista de lo registrado por cada firmante | Nombre, rol, nivel, fecha y hora, método de identidad, estado (`Timeline` compacta); la huella del documento en `t-mono`, truncada con copiar |
| `CampoCodigo` | Código de un solo uso de 6 dígitos | Seis casillas, pegado automático, reenviar con cuenta regresiva, intentos restantes |

## 4. Pantallas — Control de acceso

### 4.1 Portería (Terreno, inicio) — `Porteria`
Cabecera: instalación y punto de acceso, guardia de turno (nombre y «Cambiar guardia»), `IndicadorConexion`. Tres `KpiTile`: En sitio, Esperados hoy, Intentos denegados hoy. Dos botones grandes: **Registrar entrada** (principal) y **Registrar salida**. Debajo, «Esperados ahora» (próximos prerregistros) y «En sitio» (últimos 5 con `FilaEnSitio`). Estados: cargando, sin conexión con cola, listas desactualizadas, dispositivo revocado (pantalla completa, sin datos).

### 4.2 Registrar entrada (Terreno) — `RegistrarEntrada`
Paso 1: `Segmentado` de tipo (Visita · Contratista · Proveedor · Vehículo · Despacho · más tipos del tenant). Paso 2: `EscanerDocumento`. Paso 3: `ResultadoAcceso` + formulario del tipo con lo leído ya lleno (nombre y RUN de solo lectura si vienen del QR o de la lista): empresa, motivo, anfitrión (`Combobox`), patente, nota. Línea fija de aviso de privacidad («Tus datos se usan para la seguridad del recinto · Más información»). Acción fija abajo: **Registrar entrada**. Estados: prerregistro encontrado (todo lleno, solo confirmar), registro sin conexión (`info` «Se enviará al volver la señal»), error de regla con el texto del servidor, éxito (toast y vuelta a Portería).

### 4.3 Acceso no autorizado (Terreno) — `AccesoNoAutorizado`
`EstadoIlustrado` a pantalla completa. Dos variantes distintas: **Bloqueado** (`danger`, persona en una lista bloqueada, R7 y R9): «Acceso no autorizado», nombre leído, sin motivo y **sin excepción posible**; única acción **Avisar a mi supervisor**. **No autorizado** (`warning`, modo «solo autorizados» sin estar en la lista ni prerregistrado, R10): además de avisar, «Pedir excepción», que muestra «Esperando autorización de …» y luego aprobada o rechazada. Ambas con variante sin conexión.

### 4.4 Registrar salida y En sitio (Terreno) — `RegistrarSalida`, `EnSitio`
Lista de `FilaEnSitio` con búsqueda (nombre, empresa, patente) y escanear para salir. Filtros por tipo con `ChipToggle`. Acción secundaria **Evacuación**: lista completa imprimible/exportable, con «Datos de las `HH:mm`» si está sin conexión.

### 4.5 Cola sin conexión (Terreno) — `ColaSinConexion`
Hoja desde `IndicadorConexion`: registros pendientes con hora del dispositivo, estado (pendiente, enviando, enviado, revisar) y «Reintentar». Explica que la hora oficial será la del servidor.

### 4.6 Accesos (ERP) — `Accesos`
`SplitScreen`: lista de registros de todas las instalaciones a cargo; filtros por instalación, fecha, tipo, estado (en sitio, salió, diferido, anulado) y empresa; `MetaLista` con conteos. Detalle a la derecha: `Pares` del registro con RUN enmascarado y «Ver documento» (pide permiso y avisa que la lectura queda auditada), `Timeline` del registro (entrada, salida, anulación, origen diferido). Acciones: «Anular» (motivo). Teléfono: solo la lista; el detalle en una ficha.

### 4.7 Ficha de instalación → Accesos (ERP) — `InstalacionAccesos`
Pestañas por ruta: **Registros**, **En sitio**, **Esperados** (prerregistros por día con estado: pendiente, ingresó, no llegó, cancelado), **Listas**, **Intentos denegados** (hora, documento enmascarado, motivo del rechazo: bloqueado, no autorizado, fuera de horario). Encabezado con los puntos de acceso de la instalación y sus dispositivos (estado y última conexión).

### 4.8 Listas (ERP y Cliente) — `Listas`, `ImportarLista`
`Tabs` Autorizadas · Bloqueadas; alcance con `Segmentado` (Empresa · Cuenta · Instalación · Grupo). Fila: nombre, documento o patente, tipos, `Vigencia`, días y horario, uso único, autor; en Bloqueadas, motivo (solo con permiso) y vence en. Hoja **Agregar** (bloquear exige motivo). Hoja **Importar**: subir Excel → **vista previa obligatoria** (agregan, cambian, quitan, filas con error, una por una) → confirmar; «Reemplazar lista completa» y «Vaciar» piden escribir el nombre de la lista (`Dialog` destructivo). **Vista del Cliente:** entra desde **su perfil** en el Portal Cliente (decisión de Carlos del 29-oct-2026); solo su lista, con «La empresa de seguridad también aplica su propia lista bloqueada», visible solo si el tenant habilitó la gestión del cliente.

### 4.9 Prerregistrar visita (Cliente y ERP) — `Prerregistrar`
Hoja (pantalla completa en teléfono): instalación y punto, uno o varios visitantes (nombre, RUN o pasaporte, empresa, patente; «+ Agregar visitante»), fecha o rango (`InputFechaRango`, máximo 30 días), horario esperado, anfitrión, motivo, nota para el guardia, `Switch` «Avisarme cuando llegue», `Switch` «Enviar invitación con QR» (correo o WhatsApp). Vista previa: «Se enviarán N invitaciones · válidas del … al …». Éxito con la invitación de ejemplo (`InvitacionQR`: marca del tenant, QR, día, instalación, instrucciones).

### 4.10 Configuración → Control de acceso (ERP) — `ConfigAcceso`
`FormScreen` por secciones, con ámbito (Empresa / instalación) arriba: **Tipos de registro** (activos; por cada uno, **campos del formulario y cuáles son obligatorios** —configurable por tenant e instalación—; modo de lista: con lista blanca o negra cargada, el modo por defecto es «Solo autorizados» con el `Switch` **«Permitir ingresos fuera de lista»** apagado por defecto; sin ninguna lista, sigue el registro manual); **Captura** (lectura de cédula QR o PDF417, MRZ de pasaporte, reconocimiento de patente con aviso de consumo, foto apagada por defecto con justificación obligatoria al activarla); **Permanencia y cierre** (máximo, hora de cierre); **Sin conexión** (antigüedad máxima de listas); **Cliente** (puede gestionar su lista desde su perfil, puede autorizar excepciones); **Datos personales** (plazos de retención por categoría con mínimos y máximos, texto del aviso, «Descargar cartel de privacidad»); **Reportes** (frecuencia y destinatarios, «Enviar prueba»).

## 5. Pantallas — Firma electrónica

### 5.1 Firmas (ERP) — `Firmas`
`SplitScreen`. `Tabs`: Por firmar por mí · Enviadas · Completadas · Vencidas y rechazadas. Fila: documento, entidad (persona, cuenta), `NivelFirma`, avance «2 de 3», vence en, estado. Detalle a la derecha (5.3). Vacío: «No hay firmas pendientes» con «Enviar un documento a firma».

### 5.2 Enviar a firma (ERP) — `EnviarFirma`
Hoja: documento con su vista previa y aviso «Al enviar, el documento queda congelado; si lo cambias, la solicitud se cancela». Firmantes (desde la política del tipo; agregar persona, contacto o externo; rol firma, copia o aprueba), orden (`Segmentado` Secuencial · Paralelo, con arrastre del orden), `NivelFirma` (no se puede bajar del mínimo; N3 se ve deshabilitado con «Activa la firma electrónica avanzada en Configuración» si el tenant no la contrató), plazo, mensaje. Vista previa final con la **huella** y el resumen. Cuando quien pidió el envío fue un agente, la persona lo aprueba en la Bandeja con el `PanelAprobacion` que ya existe en el DS, mostrando esta misma vista previa. Si el tipo de documento tiene firma automática del representante legal activa, el firmante de la empresa aparece ya marcado «Firma automática» con su vigencia.

### 5.3 Estado de la solicitud (ERP) — `SolicitudFirma`
`DetailScreen`: documento, `NivelFirma`, huella, `EvidenciaFirma` por firmante (enviado, visto, código enviado, identidad verificada, firmado o rechazado con motivo), acciones Recordar, Cancelar (motivo) y Descargar PDF firmado. Estado completado con «Verificar» y el QR.

### 5.4 Firmar (público, Trabajador y Cliente) — `Firmar` (teléfono primero, claro y oscuro)
Marca del tenant arriba, «Atlas Seguridad SpA te pide firmar». `PasosFirma`. **Revisar:** el documento completo en papel (`paper*`), con barra de avance de lectura; «Rechazar» (motivo). **Identificarse:** N1 (nada extra o solo la sesión); N2: `CampoCodigo` enviado al correo o celular **registrado** (enmascarado) y luego la prueba de vida: el firmante **enrolado** (trabajador con prueba de vida de Asistencia) usa esa misma prueba; el **externo** (representante del cliente, proveedor, postulante, sin enrolar) pasa por cédula, selfie y prueba de vida con el proveedor de verificación que contrata la plataforma (consentimiento expreso de biometría antes, con la alternativa «No quiero usar biometría»); N3: «Continuar con tu firma electrónica avanzada» hacia el prestador, y la vuelta. **Firmar:** `PadFirma` con la casilla de aceptación. **Listo:** «Documento firmado», copia por correo, descarga. Estados: enlace vencido, ya firmado, cancelado porque el documento cambió, código incorrecto con intentos, prestador no disponible, sin conexión.

### 5.5 Aceptar el medio electrónico (Trabajador) — `AceptarMedioElectronico`
Una sola vez, antes del primer documento laboral: qué significa firmar electrónicamente, que puede pedir papel y revocar cuando quiera; «Acepto» y «Prefiero papel».

### 5.6 Firma de acta en el dispositivo (Supervisor) — `FirmaActa`
Al cerrar una visita o un acta: resumen del acta, quién firma (nombre y RUN del firmante, rol: cliente, guardia), `PadFirma`, y «No estaba presente» (motivo). Funciona sin conexión.

### 5.7 Verificar (público) — `Verificar`
Página simple con la marca del tenant: subir un PDF o escanear el QR → «Este documento es auténtico y no cambió» (`success`) con firmantes, niveles y fechas, o «Este archivo no coincide con el documento firmado» (`danger`). Sin datos personales más allá de los nombres de los firmantes.

### 5.8 Configuración → Documentos → Firma (ERP) — `ConfigFirma`
Matriz **tipo de documento × nivel** (`Table`): nivel por defecto, niveles permitidos (los bajo el mínimo legal, deshabilitados con explicación; N3 deshabilitado con «Actívala en Integraciones» si el tenant no la contrató), firmantes por rol, orden, plazo y recordatorios. Sección **Firmantes de la empresa** (representante legal; `Switch` **firma automática por tipo de documento**, incluidos contratos y anexos con el personal, con autorización expresa, vigencia y «Revocar»). Sección **Firma electrónica avanzada** (`Switch` apagado por defecto; integración opcional que el tenant activa y contrata desde Configuración → Integraciones; estado de la conexión). Sección **Verificación de identidad de externos** (proveedor contratado por la plataforma, sin elegir proveedor propio; consentimiento biométrico).

### 5.9 Finiquito (ERP) — `FiniquitoEstado`
En la ficha del documento de finiquito: sin botón «Firmar»; `Timeline` de estados en la DT (preparado, enviado a la DT, aceptado, aceptado con reserva, rechazado) y «Adjuntar PDF ratificado».

## 6. Estados obligatorios y archivos del export

Cada pantalla con: cargando (skeleton con su forma), vacío con acción, error con «Reintentar», sin permisos, y en hojas: vista previa, confirmando, éxito y error de regla con el texto del servidor. Terreno además: sin conexión y listas desactualizadas.

Archivos: `Porteria.dc.html`, `RegistrarEntrada.dc.html`, `AccesoNoAutorizado.dc.html`, `RegistrarSalida.dc.html`, `EnSitio.dc.html`, `ColaSinConexion.dc.html`, `Accesos.dc.html`, `InstalacionAccesos.dc.html`, `Listas.dc.html`, `ImportarLista.dc.html`, `Prerregistrar.dc.html`, `InvitacionQR.dc.html`, `ConfigAcceso.dc.html`, `Firmas.dc.html`, `EnviarFirma.dc.html`, `SolicitudFirma.dc.html`, `Firmar.dc.html`, `AceptarMedioElectronico.dc.html`, `FirmaActa.dc.html`, `Verificar.dc.html`, `ConfigFirma.dc.html`, `FiniquitoEstado.dc.html`, `Componentes-acceso-firma.dc.html` (los nueve componentes de la sección 3 con sus estados), y `shots/` con 375, 1024 y 1280 (Terreno: 375, 1024 horizontal y 1280, claro y oscuro).
