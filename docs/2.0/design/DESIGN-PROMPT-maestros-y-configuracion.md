# DESIGN PROMPT — MAESTROS Y CENTRO DE CONFIGURACIÓN (OPAI 2.0)

Para pegar completo en Claude Design, en un diseño nuevo **dentro del sistema de diseño OPAI DS 2.0** (el creado el 23-oct-2026 a partir de `docs/2.0/design/export-ds-2.0/index.html`; las pantallas de acceso aprobadas están en `docs/2.0/design/export-acceso/`). No crees colores, tipografías ni radios nuevos. Los componentes nuevos que se piden en la sección 3 quedan definidos como componentes del sistema; todo lo demás se compone con los existentes.

Resultado esperado: el **export HTML standalone**, una pantalla por archivo, nombrado como en la sección 7. Es la referencia de layout y jerarquía para la implementación (Brief 02), no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant para empresas intensivas en personal (seguridad privada primero). Estas pantallas son del **portal ERP** (administrativos y gerentes) y se usan en iPad apaisado y desktop, pero también desde el teléfono (el dueño opera desde el celular). Agent-first: cada acción que aparece en pantalla existe también por API y por MCP, así que la UI no inventa flujos; muestra entidades, sus estados y acciones claras.

**Tenant de ejemplo:** Gard Security (vertical seguridad; vocabulario: *guardia* por persona, *instalación*, *puesto*). El vocabulario cambia por vertical (aseo dice *operario*; outsourcing dice *faena* por instalación): los textos deben funcionar al reemplazar la palabra, nunca con iconos de escudos o guardias como identidad.

**Formatos:** español de Chile; fechas `dd-mm-aaaa`; horas `HH:mm`; CLP `$ 560.000` sin decimales; RUT `16.234.567-8` en `t-mono`; teléfonos `+56 9 8765 4321`.

**Viewports:** 375 (teléfono) y 1024 (iPad apaisado) para todas las pantallas; 1280 para las listas, el detalle de instalación y Configuración. Modo oscuro al menos en: lista de cuentas, detalle de persona, índice de Configuración e Integraciones.

**Principios que mandan (ADR-014 y ADR-017):** una acción principal por pantalla; jerarquía por tamaño, peso y espacio; color solo para estado; bordes finos, sin sombras salvo overlays; pulido obligatorio: foco visible, skeleton con la forma del contenido, estado vacío con acción, overlays accesibles, movimiento 150–200 ms. Touch targets ≥ 44 px. En iPad y desktop el título de la página vive en la barra superior del shell; en teléfono lo muestra el patrón.

## 2. Patrón nuevo del sistema: `SplitScreen` (vista dividida)

Lista a la izquierda y detalle a la derecha, para iPad (1024) y desktop (1280). Lo usan Cuentas, Instalaciones, Personas y el centro de Configuración.

- **1024:** columna izquierda de 360 px con búsqueda, chips de filtro y filas (`FilaSeleccionable`); columna derecha con `DetailScreen` (cabecera, tabs, secciones). La fila seleccionada se marca con `fill` y una barra de 2 px en `accent` al borde izquierdo. Sin fila seleccionada, la derecha muestra un estado vacío discreto ("Elige una cuenta").
- **1280:** la izquierda sube a 400 px; el resto igual.
- **375:** no hay vista dividida: la lista es una pantalla (`ListScreen` con tarjetas) y el detalle otra, con botón "Atrás" en la barra superior. Mostrar ambas.
- Estados: loading (skeleton de filas a la izquierda y de secciones a la derecha), vacío (sin registros, con acción "Nueva cuenta"), error, sin permisos.

## 3. Componentes nuevos del sistema (definirlos con sus estados)

Construidos sobre primitivas Radix re-estilizadas con los tokens; comportamiento idéntico en iOS, Android y desktop. Mostrar cada uno en **reposo, hover (solo puntero), foco por teclado, deshabilitado y error** cuando aplique, en claro y oscuro.

| Componente | Qué es | Especificación |
|---|---|---|
| `Select` | Lista desplegable para 2–12 opciones | Disparador de 44 px igual que `Input`, chevron a la derecha; panel con radio 10, sombra de overlay, ítems de 44 px, marca de selección. En teléfono el panel se abre como sheet inferior. |
| `Combobox` | Select con búsqueda, para listas largas (cuentas, instalaciones, cargos, comunas) | Input con lupa, lista filtrada, "Sin resultados", opción "Crear '…'" cuando se permite, chips para selección múltiple. |
| `CommandPalette` (⌘K) | Búsqueda global y "buscar un ajuste" | Diálogo centrado de 640 px máx. (pantalla completa en teléfono); grupos: Ir a, Cuentas, Instalaciones, Personas, Ajustes; navegación con teclado; atajo visible `⌘K` en la barra superior de desktop. |
| `Popover` | Panel anclado (campana de notificaciones, filtros avanzados) | Radio 10, flecha opcional, cierra con Escape y clic fuera. |
| `Tooltip` | Ayuda breve sobre iconos | Solo con puntero; 150 ms; inverso (`inverse-bg`/`inverse-fg`); nunca contiene información imprescindible. |
| `Checkbox` y `RadioGroup` | Selección múltiple y única en formularios | Caja de 20 px, fila tocable de 44 px, etiqueta y descripción. |
| `Switch` (rediseño) | Interruptor | Como en el DS 2.0 (pista 40×24, acento); fila completa tocable. |
| `Menu` (rediseño) y `Dialog` (rediseño) | Menú desplegable y diálogo modal | Sobre primitivas Radix; mismo aspecto que el export actual; el menú de usuario del shell y el selector de portal usan `Menu`. |
| `Sheet` (ajuste) | Panel modal | Inferior con asa en teléfono, lateral de 420 px en md+; cabecera con título y cerrar; pie con acciones. |
| `Tabs` (por ruta) | Pestañas que son rutas reales (`/cuentas/<id>/contactos`) | Mismo aspecto; subrayado 2 px en `fg`; scroll horizontal en teléfono; contador opcional. |
| `Toast` | Confirmaciones y errores de acción | Inferior en teléfono (sobre la barra), inferior derecha en desktop; inverso; icono de estado; acción opcional ("Deshacer"); 4 s. |
| `FilaSeleccionable` | Fila de lista tocable (reemplaza los `<button>` crudos) | 56–72 px, avatar o icono a la izquierda, título + línea secundaria, badge y chevron a la derecha; estados hover/activo/seleccionada. |
| `InputFecha` | Fecha | Input nativo estilizado (usa el selector del sistema); formato `dd-mm-aaaa`; icono de calendario; rango opcional (desde/hasta). |
| `Uploader` | Zona de carga de archivos | Desktop: zona punteada "Arrastra el archivo o **elige uno**" con tipos y tamaño máximo; teléfono: botón `lg` "Agregar archivo" que abre cámara/galería/archivos. Lista de archivos en proceso con barra de progreso 2 px en `accent`, error por archivo con reintentar. |
| `CampoSecreto` | Credencial de una integración | Input tipo contraseña con "mostrar"; tras guardar queda enmascarado (`••••••••1234`) y solo admite "Reemplazar"; nota "Se guarda cifrado y no se vuelve a mostrar". |
| `CampoDireccion` | Dirección con autocompletado | Combobox que sugiere direcciones (servicio de geolocalización); al elegir, muestra comuna, región y un `MapaEstatico` debajo; permite editar manualmente. |
| `MapaEstatico` | Mapa embebido sin JS | Imagen de 16:9 con un marcador y, si hay geocerca, círculo; borde 1 px, radio 10; placeholder cuando no hay coordenadas ("Sin ubicación"). |
| `Timeline` (Actividad) | Lista de eventos de auditoría de una entidad | Punto + línea vertical fina; cada ítem: actor (avatar o monograma del agente), acción, hace cuánto; expandible para ver detalle. |
| `Vigencia` | Estado de vencimiento de un documento | Badge con punto: vigente (success), por vencer (warning, "vence en 22 días"), vencido (danger, "venció hace 52 días"), sin fecha (neutro). |
| `AjustesForm` | Grupo de ajustes renderizado desde un esquema | Secciones con título `t-subheading`, campos etiqueta/control/ayuda, "Guardar" fijo al pie en teléfono, "Restablecer valor por defecto" por campo, indicador "Fijado por OPAI" para ajustes de plataforma (solo lectura). |

## 4. Pantallas de maestros

Diseñar cada una a 375 y 1024 (y 1280 donde se indica), con los estados obligatorios de la sección 6.

### 4.1 Cuentas

**Lista** (`/cuentas`, `ListScreen` dentro de `SplitScreen`). Acción principal "Nueva cuenta". Búsqueda por nombre o RUT; chips: Estado (Cliente activo, Prospecto, Inactivo), Con instalaciones. Columnas en md+: Cuenta (nombre y razón social), RUT, Estado, Instalaciones, Contacto principal, Cliente desde. Tarjeta en teléfono: monograma, nombre, "RUT · estado", instalaciones.

Filas de ejemplo (usar al menos 8):

- *Logística Andina SpA · 76.543.210-K · Cliente activo · 3 instalaciones · Paula Riquelme · desde 01-03-2024*
- *Inmobiliaria Costanera Ltda. · 77.120.456-3 · Cliente activo · 2 instalaciones · Rodrigo Méndez · desde 15-07-2023*
- *Minera Cerro Alto SpA · 76.998.001-7 · Prospecto · 1 instalación · Carolina Vidal · —*
- *Bodegas Pudahuel S.A. · 96.512.330-2 · Inactivo · 0 instalaciones · — · 2021–2025*

**Detalle** (`/cuentas/<id>`, `DetailScreen`). Cabecera: badge de estado + "cliente desde 01-03-2024", nombre comercial, razón social, menú de acciones (Editar, Cambiar estado, Archivar). Tabs por ruta: **Resumen · Contactos (4) · Instalaciones (3) · Documentos (6) · Actividad**.

- *Resumen:* `Pares` en dos columnas en md+: Razón social, RUT, Giro ("Transporte y logística"), Origen ("Referido"), Sitio web, Dirección ("Av. Las Industrias 4520, Quilicura, Región Metropolitana"); Representante legal ("Andrés Fuentes · 10.987.654-3"); Personería ("Escritura del 12-05-2019, Notaría Musalem"); Notas.
- *Contactos:* lista de `FilaSeleccionable` (avatar, nombre, cargo, correo, roles como badges neutros: Principal, Operacional, Facturación, Cobranza); acción "Nuevo contacto" abre `Sheet` con formulario (nombres, apellidos, correo, teléfono, cargo, principal con `Switch`, roles con `Checkbox`). Ejemplo: *Paula Riquelme · Gerente de Operaciones · paula.riquelme@logandina.cl · +56 9 8765 4321 · Principal, Operacional*.
- *Instalaciones:* filas con nombre, comuna, estado, dotación (puestos activos); "Nueva instalación".
- *Documentos:* ver 4.5.
- *Actividad:* `Timeline` ("Carlos Irigoyen cambió el estado a Cliente activo · hace 3 días", "Grokbot vía Carlos Irigoyen creó el contacto Paula Riquelme · hace 2 semanas").

**Formulario** "Nueva cuenta" (`FormScreen`, en `Sheet` lateral en md+ y pantalla completa en teléfono): secciones Identificación (nombre, razón social, RUT con validación en línea "RUT inválido"), Clasificación (estado, giro, origen con `Select`), Dirección (`CampoDireccion`), Representante legal. Validación inline; acciones "Cancelar" y "Crear cuenta".

### 4.2 Instalaciones

**Lista** (`/instalaciones`, `SplitScreen`). Acción principal "Nueva instalación". Búsqueda; chips: Cuenta (Combobox), Estado, Región. Columnas: Instalación, Cuenta, Comuna, Estado, Puestos, Dotación, Vigencia. Tarjeta: nombre, "cuenta · comuna", estado, dotación.

Ejemplos: *Planta Quilicura · Logística Andina SpA · Quilicura · Activa · 3 puestos · 5 personas · desde 01-03-2024*; *CD Pudahuel · Logística Andina SpA · Pudahuel · Activa · 2 puestos · 4*; *Torre Costanera Oriente · Inmobiliaria Costanera Ltda. · Las Condes · Activa · 2 · 3*; *Faena Cerro Alto · Minera Cerro Alto SpA · Illapel · Prospecto · 0 · 0*; *Bodega Lo Boza · Bodegas Pudahuel S.A. · Pudahuel · Inactiva*.

**Detalle** (`/instalaciones/<id>`, también a 1280). Cabecera: badge de estado, nombre, cuenta (enlace), menú de acciones. Tabs: **Resumen · Puestos (3) · Documentos (4) · Actividad** (y "Personas" como tab deshabilitada con tooltip "Disponible con Operaciones", para que el patrón quede diseñado).

- *Resumen:* a la izquierda `Pares` (Dirección "Av. Las Industrias 4520, Quilicura", Región, Geocerca "300 m", Vigencia "01-03-2024 – sin término", Notas); a la derecha `MapaEstatico` con el marcador y el círculo de la geocerca. En teléfono, mapa arriba.
- *Puestos:* tabla/filas de puestos de servicio: Puesto, Cargo, Patrón, Horario, Dotación, Estado. Ejemplos: *Guardia día · Guardia · 4×4 · 08:00–20:00 · 2 · Activo*; *Guardia noche · Guardia · 4×4 · 20:00–08:00 · 2 · Activo*; *Supervisor · Supervisor · 5×2 · 08:00–18:00 · 1 · Activo*. "Nuevo puesto" en `Sheet`: nombre, cargo (`Combobox`), patrón (días trabajo / descanso con `Select` de patrones comunes y "personalizado"), horario inicio/fin, jornada (día/noche/rotativa con `RadioGroup`), dotación, vigencia. Nota visible: "El cruce de medianoche se calcula solo".

### 4.3 Personas

**Lista** (`/personas`, `SplitScreen`; título con el vocabulario: "Guardias"). Acción principal "Nueva persona". Búsqueda por nombre o RUT; chips: Cargo, Estado (Activa, Inactiva, Bloqueada), Instalación. Columnas: Persona (avatar, nombre), RUT (`t-mono`), Cargo, Contrato, Instalación (si tiene puesto), Estado, Ingreso. 24 filas; ejemplos: *María Fernanda Soto · 16.234.567-8 · Guardia · Indefinido · Planta Quilicura · Activa · 03-03-2025*; *José Antonio Pérez · 12.345.678-5 · Supervisor · Indefinido · CD Pudahuel · Activa · 10-01-2022*; *Camila Andrea Rojas · 19.876.543-2 · Guardia · Plazo fijo hasta 30-11-2026 · — · Activa · 01-09-2026*; *Luis Alberto Muñoz · 14.222.333-9 · Operador CCTV · — · — · Inactiva · finiquitado 31-08-2026*; *Pedro Pablo Lagos · 15.555.666-1 · Guardia · — · — · Bloqueada*.

**Detalle 360** (`/personas/<id>`; modo oscuro también). Cabecera: avatar grande, badge de estado, nombre, "Guardia · Planta Quilicura", RUT en `t-mono`, acciones (Editar, Bloquear, Finiquitar en menú). Tabs: **Resumen · Laboral · Documentos (5) · Actividad**.

- *Resumen:* Datos personales (RUT, fecha de nacimiento "14-06-1990 (36 años)", sexo, nacionalidad), Contacto (correo personal, correo laboral, teléfono), Dirección (`Pares` + `MapaEstatico` pequeño), Acceso ("Usuario vinculado: no" con acción "Vincular usuario"). Mostrar también la variante **sin permiso** para ver datos de contacto (sección reemplazada por el estado "Sin permisos" compacto).
- *Laboral:* Vínculo vigente (`Pares`: Cargo "Guardia", Tipo "Indefinido", Ingreso "03-03-2025", Término "—"), historial de vínculos como `Timeline` corto, y **Estructura de sueldo efectiva** en tres filas tipo cascada con el nivel que aplica resaltado:
  - Persona (excepción) · *no definida*
  - Puesto · *Planta Quilicura · Guardia noche · Base $ 600.000 · Colación $ 45.000 · Movilización $ 40.000 · Bono nocturno $ 60.000 · Gratificación legal 25 % · vigente desde 01-03-2025* ← **aplica**
  - Cargo · *Guardia · Base $ 560.000 · Colación $ 45.000 · Movilización $ 40.000 · Gratificación legal 25 %*
  Acción "Definir excepción para esta persona" (requiere motivo; `Sheet` con campos de la estructura y `InputFecha` de vigencia). Variante **sueldo sensible sin permiso**: montos reemplazados por "••••" y nota "Solo owner y admin".
- *Documentos:* ver 4.5 (ejemplos: *Contrato de trabajo.pdf · Contrato laboral · emitido 03-03-2025 · sin vencimiento*; *Certificado OS-10.pdf · OS-10 · vence 14-11-2026 · por vencer (22 días)*; *Cédula de identidad.jpg · Cédula · vence 02-2030 · vigente*; *Certificado de antecedentes.pdf · Antecedentes · venció 01-09-2026 · vencido*).

**Formulario** "Nueva persona": secciones Identidad (nombres, apellidos, RUT con formato automático y validación, nacimiento `InputFecha`, sexo `Select`, nacionalidad), Contacto (correo personal, correo laboral, teléfono), Dirección (`CampoDireccion`), Vínculo laboral (cargo `Combobox`, tipo de contrato `Select`, fecha de ingreso, término opcional).

### 4.4 Cargos y sueldos

`/personas/cargos`, `ListScreen` con acción "Nuevo cargo". Columnas: Cargo, Clase (Operativo/Administrativo), Personas, Puestos, Sueldo base, Colación, Movilización, Gratificación, Estado. Ejemplos: *Guardia · Operativo · 42 · 9 · $ 560.000 · $ 45.000 · $ 40.000 · Legal 25 % · Activo*; *Supervisor · Operativo · 6 · 3 · $ 850.000 · $ 45.000 · $ 60.000 · Legal 25 %*; *Operador CCTV · Operativo · 4 · 2 · $ 620.000*; *Jefe de turno · Operativo · 2 · 1 · $ 700.000*; *Administrativo · Administrativo · 3 · — · $ 900.000 · (sueldo sensible 🔒)*.

**Detalle de cargo** (`Sheet` lateral o `DetailScreen`): datos (nombre, descripción, clase, "sueldo sensible" `Switch` con ayuda "Solo owner y admin ven los montos"), **estructura base** con sus ítems (base, colación, movilización, gratificación, bonos fijos o porcentuales con imponible/tributable como `Checkbox`), versiones por vigencia (`Timeline`: "Vigente desde 01-01-2026 · base $ 560.000", "01-01-2025 – 31-12-2025 · base $ 520.000"), y "Nueva versión" con `InputFecha` de inicio. Validación: "La vigencia se solapa con la versión del 01-01-2026".

### 4.5 Ficha de documentos de una entidad (tab Documentos)

Igual en cuenta, instalación y persona. Lista agrupada por tipo con `Vigencia`; acción principal "Subir documento". Cada fila: icono por tipo de archivo (PDF, imagen, otro), nombre, tipo de documento, "emitido dd-mm-aaaa", `Vigencia`, menú (Ver, Descargar, Nueva versión, Editar datos, Archivar). Encima, un resumen compacto: "2 vigentes · 1 por vencer · 1 vencido · 1 obligatorio faltante (Certificado de antecedentes)". Los tipos obligatorios que faltan aparecen como filas punteadas "Falta: Certificado de antecedentes · obligatorio · Subir".

**Subir documento** (`Sheet`): `Uploader`, tipo (`Combobox` con los tipos de la capa), fecha de emisión y vencimiento (`InputFecha`, el vencimiento solo si el tipo lo exige), etiquetas (chips), visible en portal (`Switch` por portal: Cliente / Trabajador). Estados: subiendo (progreso), verificando ("Comprobando integridad…"), listo, error ("El archivo supera 50 MB").

**Vista previa** (`Dialog` grande, pantalla completa en teléfono): PDF o imagen con barra superior (nombre, tipo, vigencia, "Descargar", cerrar); pie con "Versión 2 · subido por Carlos Irigoyen · 03-03-2025 · SHA-256 verificado".

## 5. Centro de Configuración

Una sola entrada "Configuración" en la navegación. Organizado por **ámbitos** (ADR-018), en `SplitScreen`: índice a la izquierda (en teléfono es una pantalla de lista) y sección a la derecha. Búsqueda "Buscar un ajuste" arriba del índice (también desde ⌘K).

**Índice** (grupos y ítems, cada uno con icono Lucide, título y descripción de una línea):

- *Empresa:* Datos de la empresa · Marca · Preferencias (las mías)
- *Acceso:* Usuarios y permisos · Agentes y API keys · Aprobaciones pendientes (badge con contador: 2)
- *Plataforma:* Módulos · Integraciones · Comunicaciones · Documentos · Consumos · Auditoría
- *Módulos activos:* una entrada por módulo con ajustes (ejemplo: "Comercial", "Operaciones"; mostrar dos para ver el patrón)

Secciones a diseñar (1024 y 1280; 375 como pantalla propia):

1. **Datos de la empresa:** `AjustesForm` con grupos Identificación (razón social, RUT, giro, dirección con `CampoDireccion`), Representante legal, Contacto por área (correo comercial, operaciones, finanzas, contacto; teléfono; WhatsApp), Operación (zona horaria `Select`, vertical en solo lectura con nota "La cambia OPAI desde Plataforma").
2. **Marca:** cuatro logos (principal, para fondo claro, para fondo oscuro, isotipo) y favicon, cada uno con `Uploader` compacto y vista previa sobre fondo claro y oscuro; colores de marca (primario, secundario) con muestra; nombre comercial y eslogan; vista previa en vivo de un encabezado de documento y de un correo con la marca aplicada. Nota: "La interfaz de OPAI no cambia de colores; la marca se aplica a documentos, correos y portales".
3. **Usuarios y permisos:** la lista actual de usuarios (nombre, correo, rol, portales, estado) con "Invitar"; invitaciones pendientes; y una **matriz de permisos** de solo lectura: filas = módulos y acciones (Cuentas: ver/editar; Personas: ver/editar/sueldos; …), columnas = roles (Owner, Administrador, Gerente, Supervisor, Solo lectura) con ✓ en `fg` y — en `fg-subtle`.
4. **Agentes y API keys:** lista de keys (nombre, prefijo `t-mono`, scopes, responsable, consumo del mes con barra "US$ 8,40 de US$ 25 (34 %)", último uso, estado). Detalle de una key (`Sheet` o `DetailScreen`): datos, **presupuesto mensual** (`Input` numérico en US$ con ayuda "Al 80 % avisamos; al 100 % se detiene"), **autonomía**: tabla de capacidades irreversibles con `Select` por fila (Requiere aprobación / Directa) y nota de ADR-032 ("Lectura libre; escritura con vista previa; irreversible con aprobación salvo que la autorices aquí"), botón "Revocar" destructivo. Crear key: el secreto se muestra una sola vez en un `Dialog` con botón "Copiar" y aviso. Incluir la página **"Conectar tu IA"**: tarjeta con la URL del MCP, pestañas con snippets para Claude, ChatGPT, Grokbot y Codex (bloque de código `t-mono` con "Copiar"), y enlace al manual "Operar el núcleo desde un agente".
5. **Aprobaciones pendientes:** lista de solicitudes de agentes: capacidad ("Quitar usuario"), agente y responsable ("Grokbot vía Carlos Irigoyen"), resumen del input ("Quitar a Beto Rojas (admin)"), hace cuánto, vence en; acciones "Aprobar" y "Rechazar" (con motivo en `Dialog`). Vacío: "Sin aprobaciones pendientes". Historial debajo (aprobadas, rechazadas, vencidas).
6. **Módulos:** tarjetas o filas por módulo con estado (Activo, Trial hasta dd-mm-aaaa, Suspendido, No contratado), versión, dependencias; sin acción de activar (lo hace OPAI), solo "Solicitar".
7. **Integraciones:** grid de tarjetas (`Card`) por integración con icono genérico, nombre, modalidad (badge "De plataforma" / "Propia"), estado (badge: No configurada / Configurada / Con error) y "Último test hace 2 h". Integraciones: Correo (Resend), Geolocalización (Google Maps), Inteligencia artificial, WhatsApp, Facturación electrónica (DTE), Banco (Fintoc), Factoring, Biometría, Slack, Webhooks; las que no están disponibles aún con badge neutro "Próximamente". Detalle de **Correo**: modalidad (`RadioGroup`: De plataforma / Propia con mi dominio), remitente, dominio y estado de DNS, `CampoSecreto` para la key propia, "Probar conexión" (resultado en `Toast`), consumo del mes (318 correos). Detalle de **Inteligencia artificial:** modalidad (plataforma / propia por proveedor), `CampoSecreto` por proveedor, tabla **clase de tarea → proveedor y modelo** (Económica, Estándar, Potente, cada una con `Select`), presupuesto mensual, política de datos (`Checkbox`: sin entrenamiento; campos excluidos), consumo del mes ("1,2 M tokens · US$ 4,80").
8. **Comunicaciones:** lista de eventos comunicables agrupados por módulo (Núcleo: Usuario invitado, Recuperar contraseña, Documento por vencer, Documento vencido, Aprobación pendiente, Presupuesto de agente al 80 %, …) con columnas Canales (iconos correo / WhatsApp / push / in-app) y `Switch` "Activo" (todo apagado por defecto salvo los transaccionales, marcados "Siempre" con candado), destinatarios ("Owners y admins", editable). Editor de plantilla (pantalla propia): selector de canal, asunto, cuerpo con variables como chips insertables (`{{persona.nombre}}`, `{{documento.tipo}}`, `{{documento.vence_en}}`), vista previa a la derecha con datos de ejemplo y la marca del tenant, "Enviar prueba a mi correo", historial de versiones.
9. **Documentos (ajustes):** tipos de documento por capa (Empresa, Cuenta, Instalación, Persona, Puesto) en tabla: Código, Nombre, Obligatorio (`Switch`), Vence (`Switch`), Días de alerta, Normativa, Visible en portal; "Nuevo tipo".
10. **Consumos:** cuatro `KpiTile` (IA · US$ 4,80 · 1,2 M tokens; Correos · 318; Geolocalización · 41 consultas; Llamadas API y MCP · 2.340) con variación respecto del mes anterior; tabla por recurso y módulo; tabla por agente; selector de mes; "Descargar estado de cuenta".
11. **Auditoría:** lista de escrituras (fecha y hora, actor con monograma de agente cuando aplica, capacidad, entidad) con filtros (capacidad `Combobox`, actor, rango); detalle en `Sheet` con el payload en `t-mono` plegable.
12. **Preferencias (las mías):** tema (Sistema / Claro / Oscuro con `RadioGroup`), idioma (Español de Chile, solo lectura por ahora), notificaciones personales (silenciar todo; resumen diario a las 08:00; canales).
13. **Sección de un módulo** (renderizada desde esquema): ejemplo "Operaciones" con dos grupos (General: "Días de anticipación para publicar la pauta" numérico; "Permitir turnos extra sin aprobación" `Switch`; Alertas: "Minutos de tolerancia" numérico) para fijar cómo se ve `AjustesForm`.

## 6. Estados obligatorios

Para cada lista: loading (skeletons con la forma de las filas), vacío con acción, error con "Reintentar", sin permisos. Para cada detalle: loading y sin permisos. Para formularios: validación inline, guardando (botón "Guardando…" y controles deshabilitados), error de guardado (`Alerta` danger arriba del formulario, por ejemplo "Ya existe una cuenta con el RUT 76.543.210-K"), éxito (`Toast`). Para Uploader: subiendo, verificando, error por archivo.

## 7. Entregables

Export HTML standalone, una pantalla por archivo, con este nombre: `01_Cuentas_lista_1024`, `02_Cuentas_lista_375`, `03_Cuenta_detalle_1024`, `04_Cuenta_detalle_375`, `05_Cuenta_nueva_375`, `06_Instalaciones_lista_1280`, `07_Instalacion_detalle_1280`, `08_Instalacion_detalle_375`, `09_Puesto_nuevo_375`, `10_Personas_lista_1024`, `11_Persona_detalle_1024_oscuro`, `12_Persona_detalle_375`, `13_Persona_laboral_1024`, `14_Cargos_1024`, `15_Cargo_detalle_375`, `16_Documentos_tab_1024`, `17_Subir_documento_375`, `18_Vista_previa_documento_1024`, `19_Configuracion_indice_1280_oscuro`, `20_Configuracion_indice_375`, `21_Empresa_1024`, `22_Marca_1280`, `23_Usuarios_y_permisos_1024`, `24_Agentes_1024`, `25_Agente_detalle_375`, `26_Conectar_tu_IA_1024`, `27_Aprobaciones_375`, `28_Integraciones_1280_oscuro`, `29_Integracion_IA_1024`, `30_Comunicaciones_1024`, `31_Plantilla_editor_1280`, `32_Documentos_ajustes_1024`, `33_Consumos_1280`, `34_Auditoria_1024`, `35_Preferencias_375`, `36_Modulo_ajustes_1024`, `37_Componentes_nuevos` (todos los de la sección 3 con estados, claro y oscuro), `38_SplitScreen_estados_1024` (loading, vacío, error, sin permisos), `39_CommandPalette_1280`.

## 8. Supuestos

- El logo de OPAI sigue siendo el wordmark; el logo del tenant aparece solo donde el diseño lo pide (Marca, previews).
- Los datos de ejemplo son ficticios; nunca RUT ni personas reales.
- Si una decisión obliga a elegir entre teléfono y desktop, gana el teléfono (ADR-007).
