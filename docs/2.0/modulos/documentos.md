# Documentos — Especificación funcional · Parte 1: formatos de salida comercial

**Estado:** **borrador** (pendiente de aprobación de Carlos, ADR-047) · **Fase:** 2 · **Tarea:** CAR-68 (pedido de Carlos del 29-oct-2026) · **Insumos:** ADR-019, ADR-020, ADR-021, ADR-028, ADR-039, ADR-042 (puntos 2, 7 y 10), ADR-047, ADR-048, ADR-049 (propuesto en PR #38; su servidor ya está en `main` como NÚCLEO-E2), ADR-055, `extraccion/comercial-y-cpq.md` §1 y §3.7, `modulos/cpq.md`, `modulos/comercial.md`, lectura de 1.0 (`Cryptobal/opai` @ `40d19a5`, 28-oct-2026, solo lectura; ver §11) · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). Este archivo es la especificación del **módulo Documentos** (ADR-019). Esta primera parte cubre solo los **formatos de salida comercial**: presentación de empresa, propuesta técnica aperturada y cotización simple de una hoja. Las otras partes del módulo (explorador transversal, bandeja de firmas pendientes, vencimientos de cuentas e instalaciones, editor de documentos no comerciales como contratos y anexos) se agregan como partes siguientes de este mismo archivo, con sus propias reglas. El diseño y el brief citan las reglas como **R1, R2…** y los criterios como **CA1, CA2…**. El Design Prompt de esta parte está en [`design/DESIGN-PROMPT-formatos-salida.md`](../design/DESIGN-PROMPT-formatos-salida.md) y se usa solo después de que Carlos apruebe esta especificación.

## 1. Objetivo

Que cada empresa (tenant) le entregue a sus clientes documentos comerciales **con su marca, su estructura y sus textos**, generados desde los datos reales de OPAI y no desde un Word aparte, en tres formatos:

1. **Presentación de empresa:** quiénes somos, servicios, clientes, certificaciones. Secciones institucionales que el tenant arma una vez y reutiliza.
2. **Propuesta técnica detallada y aperturada:** el detalle del servicio y el costo abierto (dotación, turnos, ítems, condiciones), con una sección por instalación.
3. **Cotización simple de una hoja:** solo el valor económico, sin apertura.

Cada documento sale en **PDF** y como **enlace para el cliente**, donde el cliente lo lee, lo descarga y lo **acepta con firma simple**. El agente (externo por MCP o el agente interno de ADR-049) puede **proponer el formato y armar el borrador** con los permisos del usuario; enviar es una acción humana o aprobada por una persona.

**Cómo se nota que funciona:**
- El 100 % de las cotizaciones enviadas por Gard en 2.0 salen con un formato de OPAI (cero propuestas armadas fuera de la plataforma) durante el corte de la fase 2.
- Tiempo desde «cotización lista» hasta «propuesta enviada» menor a 10 minutos para una propuesta multi-instalación con la biblioteca de secciones ya cargada.
- Al menos la mitad de las aceptaciones se registran en el enlace (con evidencia) y no por correo suelto.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| **Formato** | Uno de los tres tipos de salida comercial: `presentacion`, `propuesta`, `cotizacion_simple`. Catálogo cerrado, porque cada uno tiene reglas distintas (de dónde salen los datos, si lleva apertura, si se acepta) | Plantillas | Documentos (catálogo del sistema; el nombre visible lo cambia el tenant) |
| **Plantilla de salida** | La receta de un documento del tenant: formato, nombre, bloques en orden, visibilidad de cada bloque, nivel de apertura, textos fijos y variante de marca. Versionada: se edita un borrador y se publica | Formato, bloques, secciones institucionales, perfil de marca | Documentos, por tenant |
| **Bloque** | Una pieza de la plantilla, de un tipo de un conjunto cerrado (§5.2): portada, texto fijo, sección institucional, dotación por instalación, ítems, «incluye», condiciones, resumen económico, aceptación, etc. | Plantilla | Dentro de la versión de la plantilla |
| **Sección institucional** | Texto reutilizable del tenant con título, contenido enriquecido e imágenes (por ejemplo «Quiénes somos», «Supervisión y contingencias», «Certificaciones»). Versionada. Puede enlazar documentos del núcleo (certificados con vencimiento, logos de clientes) | Plantillas que la usan; `core.documentos` | Documentos, por tenant (biblioteca) |
| **Documento comercial** | Una salida concreta: la plantilla publicada (versión X) aplicada a una cuenta o negocio y, si el formato lo pide, a una versión de cotización (versión Y). Tiene su propio contenido editable mientras es borrador y queda **congelado al enviar** | Plantilla (versión), cotización (versión), negocio, cuenta, contactos destinatarios, documento PDF | Documentos; el PDF final se registra en `core.documentos` (ADR-019) vinculado a cuenta, negocio y cotización |
| **Enlace del cliente** | Acceso personal de un destinatario al documento enviado, con vigencia, revocable, con registro de vistas | Documento comercial, contacto destinatario | Documentos |
| **Aceptación** | El hecho de que un destinatario aceptó (o rechazó) el documento, con evidencia de firma simple (quién, cuándo, cómo, huella del PDF). Inmutable | Documento comercial, enlace, cotización | Documentos (hecho regulado: inmutable, hora de servidor, hash, bitácora encadenada; ADR-019, ADR-023) |
| **Perfil de marca** | Logo (cuatro variantes), colores, nombre comercial, eslogan, datos legales y de contacto | Toda salida | Núcleo (ya existe: `core.perfil_empresa`, ADR-028) |

Todas las entidades nuevas de esta parte (plantillas, versiones, secciones, documentos comerciales, enlaces y aceptaciones) llevan `tenant_id` con RLS forzada y la política `tenant_isolation`, y referencias validadas del mismo tenant (AGENTS.md, «Multi-tenant»).

Relaciones clave:

```
Formato 1──N Plantilla de salida 1──N Versión publicada ──N Bloque ──0..1 Sección institucional (versión)
Negocio 1──N Cotización (versiones) 1──N Documento comercial (propuesta / cotización simple)
Cuenta | Negocio 1──N Documento comercial (presentación, sin cotización)
Documento comercial 1──N Enlace del cliente (uno por destinatario) 1──0..1 Aceptación
Documento comercial (enviado) 1──1 PDF en core.documentos (con huella SHA-256)
```

## 3. Pantallas y pestañas

Área **Documentos** de `NAVEGACION.md` §2 («Documentos: explorador, plantillas, firmas pendientes»). No hay entrada nueva en el menú: las salidas comerciales viven dentro de Documentos y se **generan desde la ficha** que las origina.

| Pantalla | Ruta propuesta | Portal | Patrón | Entrada o pestaña |
|---|---|---|---|---|
| Plantillas de salida (lista por formato) | `/documentos/plantillas` | ERP | Lista (`ListScreen`, `SplitScreen` en iPad y escritorio) | Pestaña «Plantillas» de Documentos |
| Editor de plantilla | `/documentos/plantillas/[id]` | ERP | Formulario de tres zonas (bloques · vista previa · propiedades) | Desde la lista |
| Biblioteca de secciones institucionales | `/documentos/secciones` | ERP | Lista + hoja de edición (`Sheet`) | Pestaña «Secciones» de Documentos |
| Salidas comerciales (todas) | `/documentos/salidas` | ERP | Lista con filtros por formato, estado y responsable | Pestaña «Comerciales» de Documentos |
| Generar documento | Hoja sobre la ficha del negocio, la cotización o la cuenta | ERP | `Sheet` | Acción «Generar documento» |
| Borrador y seguimiento del documento | `/documentos/salidas/[id]` | ERP | Ficha (`DetailScreen`) con editor de contenido y vista cliente | Desde la lista, la ficha del negocio o la cotización |
| Enviar | Hoja sobre la ficha del documento | ERP | `Sheet` | Acción principal del documento |
| Documento para el cliente | `/d/[token]` | Público (sin sesión), con la marca del tenant | Página de lectura | Enlace recibido por correo o WhatsApp |
| Aceptar o rechazar | Hoja sobre la página del cliente | Público | `Sheet` | Botón «Aceptar propuesta» |
| Comprobante de aceptación | `/verificar/[token]` (ya existe, ADR-039) | Público | Página de verificación | Desde el correo de confirmación |
| Ajustes de salidas comerciales | Configuración → Documentos (centro por ámbitos, ADR-018/038) | ERP | `AjustesForm` | Configuración |

«Comerciales», «Plantillas» y «Secciones» son **pestañas** de la entrada Documentos, no entradas nuevas del menú; el brief agrega las dos nuevas (Comerciales y Secciones) a `NAVEGACION.md` §2.

**Pestañas aportadas a fichas de otros módulos** (ADR-041, orden Resumen → propias → de módulos → Documentos → Actividad): en la ficha del **negocio** y de la **cuenta**, la pestaña **Documentos** existente muestra arriba las salidas comerciales (formato, versión de cotización, estado, vistas, aceptación) con la acción «Generar documento». En la ficha de la **cotización** (CPQ), la acción «Generar propuesta» abre la misma hoja con la cotización ya elegida.

**Qué se hace en cada dispositivo** (DISENO.md §4):
- **Celular:** ver la lista, ver un documento en vista cliente, generar desde una plantilla con los datos ya cargados (sin editar bloques), **enviar**, copiar o compartir el enlace por WhatsApp, ver vistas y aceptación, registrar una aceptación recibida fuera de línea. El cliente lee y acepta en su celular.
- **iPad y escritorio:** todo lo anterior más editar plantillas, editar la biblioteca y editar el contenido de un borrador sección por sección.

## 4. Campos y validaciones

### 4.1 Plantilla de salida

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente |
|---|---|---|---|---|---|
| Formato | Catálogo cerrado (`presentacion`, `propuesta`, `cotizacion_simple`) | Sí | No cambia después de crear | Permiso `documentos:plantillas.manage` | No |
| Nombre | Texto (≤ 80) | Sí | Único por tenant y formato | Ídem | No |
| Descripción de uso | Texto (≤ 240) | No | — (la usa el agente para elegir, R27) | Ídem | No |
| Uso sugerido | Etiquetas de catálogo: `cliente_nuevo`, `ampliacion`, `renovacion`, `licitacion_privada`, `multi_instalacion`, `prospeccion` | No | — | Ídem | No |
| Por defecto | Sí/No | — | Una por formato y tenant | Ídem | No |
| Bloques | Lista ordenada (§5.2) | Sí | La propuesta y la cotización simple exigen el bloque «Resumen económico»; la cotización simple cabe en una hoja (R12) | Ídem | Según bloque |
| Nivel de apertura | `por_instalacion`, `por_categoria`, `por_item` (§5.3) | Solo en propuesta | — | Ídem | Define qué ve |
| Variante de marca | Logo (principal, claro, oscuro o isotipo), color de portada (primario o secundario de la marca), estilo de portada (`completa`, `encabezado`, `sin_portada`) | Sí | Solo valores del perfil de marca; nunca un color libre | Ídem | Sí |
| Tamaño de página | `carta`, `a4` | Sí | Por defecto `carta` (Chile) | Ídem | Sí |
| Numeración de secciones | Sí/No | — | — | Ídem | Sí |
| Pie de página | Texto fijo con variables (§5.4) | No | Variables válidas | Ídem | Sí |
| Estado de la versión | `borrador`, `publicada`, `retirada` | Sí | Una publicada vigente por plantilla | Ídem | No |

### 4.2 Sección institucional

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente |
|---|---|---|---|---|---|
| Clave | Texto corto | Sí | Única por tenant | `documentos:plantillas.manage` | No |
| Título | Texto (≤ 120) | Sí | — | Ídem | Sí |
| Contenido | Texto enriquecido (títulos, párrafos, listas, tabla simple, imagen) con variables | Sí | Imágenes solo desde `core.documentos` del tenant | Ídem | Sí |
| Documentos enlazados | Vínculos a documentos del núcleo (certificados, logos de clientes, fotos) | No | Del mismo tenant; si tiene vencimiento, se muestra la vigencia (R20) | Ídem | Sí (el documento enlazado, solo como imagen o anexo) |
| Etiquetas de uso | Mismas que «Uso sugerido» | No | — | Ídem | No |
| Estado | `activa`, `archivada` | Sí | No se archiva si una plantilla publicada la usa sin reemplazo | Ídem | No |

### 4.3 Documento comercial

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente |
|---|---|---|---|---|---|
| Código | `<código de cotización> v<n> · <formato>` (propuesta y simple); `PRE-AAAA-NNN` (presentación, contador del núcleo) | Sí | Lo asigna el sistema | Nadie | Sí |
| Formato y plantilla (versión) | Referencia | Sí | Plantilla publicada del mismo tenant | Al generar | No |
| Cuenta y negocio | Referencia | Cuenta siempre, salvo la presentación suelta a un correo de prospecto (R37); negocio en propuesta y simple | Del mismo tenant; la cuenta es la del negocio | Al generar | Sí (nombre de la cuenta) |
| Cotización (versión) | Referencia | En propuesta y simple | En estado `lista` o `enviada` (ADR-042.7); vigente del negocio | Al generar | Sí (código y versión) |
| Contenido | Secciones editables con su origen (`plantilla`, `datos`, `persona`, `agente`) y estado (`propuesta_ia`, `editada`, `revisada`) | Sí | No se envía con secciones `propuesta_ia` sin revisar (R24) | `documentos:salida.manage` mientras es borrador | Sí |
| Destinatarios | Contactos del negocio o de la cuenta | Para enviar | Con correo; rol en el negocio o en la cuenta (ADR-040 §5) | `documentos:salida.enviar` | Su nombre en la aceptación |
| Validez | Fecha | En propuesta y simple | Igual a `valida_hasta` de la cotización; no la supera | Sale de la cotización | Sí |
| Estado | §6 | Sí | Máquina de estados | Sistema y acciones | Parcial («vigente», «aceptada», «vencida», «reemplazada») |
| PDF | Documento en `core.documentos` | Al enviar | Huella SHA-256 registrada | Sistema | Sí |

### 4.4 Aceptación (firma simple)

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible |
|---|---|---|---|---|---|
| Decisión | `aceptada`, `rechazada` | Sí | — | El destinatario en el enlace, o un usuario al registrar una aceptación fuera de línea (R33) | Sí |
| Nombre completo, RUT, cargo | Texto | Sí (aceptar) | RUT válido (módulo 11) | El destinatario | Solo en la constancia del PDF aceptado, que reciben los destinatarios y el tenant; **nunca** en la página pública `/verificar` ni en el enlace (R32) |
| Correo | El del enlace, verificado con un código de un solo uso (pregunta 4) | Sí | Coincide con el destinatario | Sistema | En la constancia del PDF, enmascarado |
| Declaración | Casilla «Acepto esta propuesta y sus condiciones» | Sí (aceptar) | — | El destinatario | Sí |
| Trazo de firma | Imagen | Según ajuste del tenant (pregunta 4) | — | El destinatario | En la constancia del PDF aceptado |
| Motivo de rechazo | Catálogo (`precio`, `alcance`, `plazo`, `otro`) + texto | Sí (rechazar) | Texto obligatorio con `otro` | El destinatario | No |
| Evidencia | Hora de servidor, huella del PDF, identificador del enlace, dispositivo resumido y red como huella HMAC con sal secreta del servidor (como el rate limit de NÚCLEO-B; nunca IP en claro ni un hash simple reversible, Ley 21.719) | Sí | — | Sistema | Huella del PDF, fecha y estado en `/verificar`; el resto solo en la constancia |

## 5. Reglas de negocio

### 5.1 Formatos y plantillas por tenant

- **R1.** Los tres formatos son un catálogo cerrado del sistema; el **nombre visible** de cada formato lo puede cambiar el tenant (por ejemplo «Propuesta técnica» → «Oferta de servicio»). Todo lo demás de una salida lo define la **plantilla del tenant**: nada sale igual para todas las empresas.
- **R2.** Cada tenant puede tener **varias plantillas por formato** (por ejemplo «Propuesta retail» y «Propuesta minería») y una **por defecto** por formato.
- **R3.** Al activar el módulo, OPAI **copia al tenant** las plantillas base de su vertical (en v1 solo `seguridad`, ADR-042 decisión 10) y una biblioteca de secciones de ejemplo con texto marcado como ejemplo. Después de copiadas son del tenant: un cambio de OPAI en la plantilla base **nunca** cambia la plantilla ni los documentos de un tenant (problema P13 de 1.0).
- **R4.** Una plantilla se edita en **borrador** y se **publica**. Publicar crea una versión inmutable. Los documentos ya generados siguen con la versión con que nacieron; un borrador de documento abierto puede **actualizarse a la versión nueva** con una acción explícita que muestra qué cambia.
- **R5.** La plantilla define: qué bloques lleva y en qué orden, cuáles son **visibles al cliente**, cuáles puede quitar quien genera el documento (bloque **opcional**) y cuáles no (bloque **fijo**, por ejemplo condiciones legales), el nivel de apertura, los textos fijos y la variante de marca.
- **R6.** La **marca** sale siempre del perfil de marca del núcleo (ADR-028): logo, colores, nombre comercial, razón social, RUT, dirección, teléfono, correo y sitio. Ninguna plantilla guarda su propio logo ni un color libre; elige entre las variantes del perfil. Si cambia el perfil, cambian los **borradores** y las plantillas; los documentos enviados no (R21).
- **R7.** La interfaz del ERP sigue con el DS 2.0 de OPAI; **los colores del tenant solo se aplican al documento** (PDF y página del cliente), nunca a la UI (ADR-028). Sin logo cargado, la portada usa el nombre comercial en texto.

### 5.2 Bloques (conjunto cerrado)

- **R8.** Los bloques disponibles son un conjunto cerrado, probado y con su fuente de datos declarada:

| Bloque | Qué muestra | Fuente | Formatos |
|---|---|---|---|
| Portada | Logo, título del documento, cliente, fecha, código, ejecutivo | Marca + cuenta + documento | Los tres |
| Índice | Secciones numeradas | El documento | Presentación, propuesta |
| Texto fijo | Párrafo del tenant con variables (§5.4) | Plantilla | Los tres |
| Sección institucional | Una sección de la biblioteca (versión vigente al generar) | Biblioteca | Presentación, propuesta |
| Servicios | Lista de servicios del tenant con descripción | Biblioteca (sección tipo servicios) | Presentación, propuesta |
| Clientes | Logos o nombres de clientes de referencia (solo los que el tenant marcó como referencia, marca `es_referencia` de la faceta comercial de la cuenta, propuesta en `extraccion/comercial-y-cpq.md` §5 (`cuentas_comercial`)) | Comercial + documentos | Presentación, propuesta |
| Certificaciones | Certificados con su vigencia | Documentos del tenant con vencimiento | Presentación, propuesta |
| Comprensión del servicio | Texto por negocio (lo escribe una persona o lo propone el agente) | Documento | Propuesta |
| Instalaciones | Una sección por instalación del negocio: dirección, mapa estático, servicio | Núcleo + Comercial | Propuesta |
| Dotación por instalación | Puestos de la cotización: cargo, horario, días, dotación, jornada (y valor si la apertura lo pide) | CPQ (líneas tipo `puesto`) | Propuesta |
| Ítems y costos | Ítems visibles de la cotización según el nivel de apertura | CPQ (líneas `item` y `adicional`) | Propuesta |
| «Incluye» y exclusiones | Lo que el servicio incluye (ítems sin costo y visibles, ADR-042.2) y lo que no incluye | CPQ + texto | Propuesta, simple (solo «incluye», en una línea) |
| Condiciones comerciales | Forma y plazo de pago, reajuste, duración, inicio, póliza, validez | CPQ (condiciones estructuradas) | Propuesta, simple |
| Resumen económico | Valor mensual neto, IVA, total, pagos únicos aparte, moneda (UF o CLP), UF del día y su fecha | CPQ (totales congelados) | Propuesta, simple (obligatorio) |
| Contacto del ejecutivo | Nombre, cargo, correo y teléfono del responsable del negocio | Usuario responsable | Los tres |
| Aceptación | Recuadro para aceptar (en la página del cliente, el botón; en el PDF, el espacio o la evidencia si ya se aceptó) | Documento | Propuesta, simple |
| Salto de página | — | — | Los tres |

- **R9.** No hay bloques de código ni HTML libre. Un bloque nuevo se agrega al sistema con su diseño en Claude Design y sus pruebas, no por tenant.

### 5.3 Qué sale del CPQ y qué se abre al cliente

- **R10.** La propuesta y la cotización simple **siempre parten de una versión de cotización** en estado `lista` o `enviada`. Del CPQ salen: código y versión, instalaciones y sus líneas, dotación, ítems visibles, «incluye», condiciones comerciales, moneda, UF del día y su fecha, validez y totales. **Del perfil de marca** sale la identidad del emisor; **de Comercial**, la cuenta, el negocio, las instalaciones y los contactos; **del usuario**, el contacto del ejecutivo.
- **R11.** El documento **muestra, no calcula**: los montos son los totales congelados de la cotización (ADR-042.7). Un documento nunca recalcula precios ni redondea distinto que el CPQ.
- **R12.** La **cotización simple** muestra solo el valor económico: cliente, instalaciones (una línea cada una con su valor mensual, o solo el total si la plantilla lo pide), condiciones básicas, «incluye» en una línea, validez y aceptación. **Cabe en una hoja**: si el contenido no cabe, el sistema lo avisa al generar y propone la propuesta técnica.
- **R13.** **Nivel de apertura** de la propuesta (lo elige la plantilla; quien genera puede bajar el nivel, nunca subirlo):
  - `por_instalacion`: valor mensual por instalación y por puesto, sin desglose de costos.
  - `por_categoria`: además, subtotales por categoría de costo (mano de obra, equipamiento, logística, seguros…).
  - `por_item`: además, cada ítem visible con cantidad y valor, y en mano de obra el detalle que la plantilla habilite (sueldo base, leyes sociales, provisiones), como piden algunas licitaciones privadas.
- **R14.** **Lo interno nunca sale:** margen, modo de margen, costo financiero, póliza como costo interno, margen efectivo, trazas de fórmulas y sueldos de personas concretas no aparecen en ningún nivel. Cuando la apertura llega al ítem, la diferencia entre costos abiertos y precio sale en **una sola línea** con el nombre que fije la plantilla (por defecto «Gastos generales y utilidad»; pregunta 1).
- **R15.** **La visibilidad de la cotización manda:** una línea marcada «oculta al cliente» en el CPQ (ADR-042.7) nunca aparece listada, en ningún nivel; su valor queda incluido en el subtotal de su instalación (o en el común) sin nombrarla. La plantilla puede ocultar más, nunca mostrar lo que el CPQ ocultó.
- **R16.** La dotación se presenta como **puestos y horarios**, nunca con nombres, RUT ni datos de trabajadores (Ley 21.719): un documento comercial no contiene datos personales de trabajadores.

### 5.4 Textos fijos y variables

- **R17.** Los textos fijos y las secciones admiten **variables validadas** de una lista cerrada por formato (por ejemplo `{{cliente.nombre}}`, `{{negocio.titulo}}`, `{{cotizacion.codigo}}`, `{{cotizacion.valida_hasta}}`, `{{empresa.nombre_comercial}}`, `{{ejecutivo.nombre}}`, `{{instalaciones.cantidad}}`). Una variable inexistente impide **publicar** la plantilla; una variable sin dato en un documento concreto se marca en el borrador y **impide enviarlo** hasta completarla o quitarla.
- **R18.** Las variables se resuelven al generar y se **vuelven a resolver** mientras el documento es borrador; al enviar, todo queda congelado como texto.

### 5.5 Versiones

- **R19.** Un documento de propuesta o cotización simple está atado a **una versión de cotización**. Si la cotización cambia de versión (ADR-042.7), el documento anterior **no se modifica**: si ya fue enviado pasa a `reemplazado` cuando se envía uno nuevo, y su enlace muestra «Esta propuesta fue reemplazada» con acceso a la vigente si el destinatario la recibió.
- **R20.** Una sección institucional que enlaza un **certificado vencido** se marca en el borrador y en la plantilla; enviar con un certificado vencido pide confirmación explícita (no se oculta solo).
- **R21.** Al **enviar**, el documento queda congelado: contenido resuelto, versión de plantilla, versión de cada sección institucional, versión de cotización, perfil de marca usado y PDF con huella SHA-256 en `core.documentos` (ADR-039), vinculado a la cuenta, el negocio y la cotización. Cambiar algo después crea un **documento nuevo** (nueva versión), nunca edita el enviado.
- **R22.** Se puede **regenerar** un documento desde la última versión de la cotización con una acción («Nueva versión»), que copia las ediciones manuales de las secciones que no dependen de datos y muestra las diferencias.

### 5.6 Contenido editable y agente

- **R23.** Mientras es borrador, quien tiene `documentos:salida.manage` edita el texto de las secciones no fijas, quita bloques opcionales y cambia el orden solo si la plantilla lo permite. Los bloques de datos (dotación, ítems, condiciones, resumen) **no se editan a mano**: se corrigen en la cotización.
- **R24.** Toda sección escrita o reescrita por un agente queda en estado **«propuesta por IA»** con su origen visible. **No se puede enviar** un documento con secciones «propuesta por IA» sin que una persona las marque revisadas (se conserva el flujo `ia → editada → aprobada` de 1.0).
- **R25.** El agente usa el **asistente de plantillas de ADR-028**: propone textos y plantillas dentro del sistema de bloques; nunca genera HTML ni cambia montos.
- **R26.** Todo texto de terceros que el agente use para escribir (correos del cliente, bases de una licitación privada) se trata como dato externo y nunca habilita una escritura irreversible (ADR-034).
- **R27.** **El agente elige o propone el formato** con reglas explicables, en este orden: (a) si el negocio no tiene cotización `lista`, propone **presentación**; (b) si la tiene, propone la plantilla cuyo «uso sugerido» coincide con el tipo de negocio y de instalación (`nueva`, `ampliacion`, `renovacion`, `reemplazo`; ADR-040) y con el número de instalaciones; (c) si es una ampliación o renovación de una sola instalación, propone **cotización simple**; (d) si no hay coincidencia, la plantilla por defecto del formato. La propuesta siempre dice **por qué** eligió y la persona puede cambiarla.

### 5.7 Envío, enlace y aceptación

- **R28.** Enviar es una acción con permiso `documentos:salida.enviar`. Para un agente es **irreversible**: va a la cola de aprobación humana (`APPROVAL_REQUIRED`) aunque tenga el permiso. Enviar una propuesta o cotización simple exige que esa versión de la cotización esté `lista` o ya `enviada` (por ejemplo, la cotización simple primero y la propuesta después, o un reenvío), nunca `en_aprobacion` ni subvalorada sin aprobación (ADR-042.6); si estaba `lista`, la marca `enviada` por la capacidad de CPQ. Con un certificado vencido (R20), enviar exige la confirmación explícita, que la herramienta MCP recibe como parámetro y la pantalla como casilla.
- **R29.** Se envía por correo con la plantilla de Comunicaciones del evento (ADR-020), con el **enlace personal** de cada destinatario y el PDF adjunto si el tenant lo activa. También se puede **copiar el enlace** o **compartirlo por WhatsApp** (como en 1.0); cada forma queda registrada.
- **R30.** Cada destinatario recibe **un enlace propio**, revocable, que vence con la validez de la cotización (presentación: 90 días por defecto, ajuste del tenant). Después de vencer, el enlace muestra el documento en solo lectura con «Pedir una propuesta actualizada», que avisa al ejecutivo.
- **R31.** La página del cliente muestra el documento con la marca del tenant, adaptado al celular, con descarga del PDF idéntico al enviado, y registra **vistas** (primera, última, cantidad) sin guardar la IP en claro.
- **R32.** **Aceptar** exige: la declaración, nombre, RUT y cargo, y la verificación del correo del destinatario con un código de un solo uso (pregunta 4). Se registra la **aceptación** como hecho inmutable con evidencia, se agrega al PDF una página de **constancia** con quién, cuándo y cómo (nuevo documento en `core.documentos`, `reemplaza_a_id` del enviado), que reciben el destinatario y el ejecutivo, y se envía el enlace al comprobante `/verificar/<token>` (ADR-039), que muestra **solo** la huella del PDF, la fecha y el estado, **sin datos personales**. La página del enlace dice «Esta propuesta ya fue aceptada el …» sin nombrar a quién. Una propuesta aceptada no se vuelve a aceptar ni se puede rechazar después.
- **R33.** **Aceptación fuera de línea:** un usuario con `documentos:salida.enviar` puede registrar que el cliente aceptó por otro medio (orden de compra, PDF firmado, correo), adjuntando el respaldo como documento (obligatorio). Para un agente es irreversible y va a aprobación humana.
- **R34.** Al aceptar, CPQ marca la cotización `aceptada` (y rechaza las hermanas abiertas, como en 1.0 §3.2) y Comercial **propone ganar el negocio** o lo gana según el ajuste del tenant «Ganar el negocio al aceptar» (pregunta 2). Ganar sigue sus reglas de Comercial: los puestos se **ofrecen** y RRHH los confirma (`modulos/cpq.md` R1–R5); aceptar nunca crea puestos.
- **R35.** **Rechazar** en el enlace pide un motivo; queda registrado, avisa al ejecutivo y no mueve el negocio (la pérdida la decide una persona en Comercial).
- **R36.** Revocar un enlace o retirar un documento enviado lo deja en solo lectura con «Este documento ya no está disponible» y no borra la evidencia.
- **R39.** **Seguridad del enlace público.** El token del enlace es aleatorio con al menos 128 bits de entropía y se guarda **solo como hash**; el tenant se resuelve desde ese hash con una consulta acotada de columnas mínimas, igual que `/verificar` (nunca `dbAdmin()` ni una lectura sin `forTenant` después de resolverlo). El código de un solo uso tiene 6 dígitos, vence a los 10 minutos, admite 5 intentos y luego se bloquea ese enlace por 15 minutos; pedir código, aceptar y rechazar pasan por el rate limit centralizado con **falla cerrada** (`permitir(..., { fallarCerrado: true })`, como recuperar contraseña). Un token inválido o revocado responde igual, sin revelar si el documento existe; un token **vencido** muestra el documento en solo lectura, como dice R30, sin permitir aceptar ni rechazar.

### 5.8 Presentación de empresa

- **R37.** La presentación **no usa datos del CPQ**: se genera desde una cuenta, un negocio o **suelta** (prospección, a un correo sin cuenta todavía; en ese caso se registra con el correo y se vincula a la cuenta si después se crea). No lleva aceptación. El correo de un prospecto se guarda solo para trazar el envío, con la base legal que registre el tenant en su RAT (Brief 07d); si no se vincula a una cuenta, entra en la política de retención de 07d (categoría configurable, apagada por defecto, como las demás) y nunca se usa para otros envíos.
- **R38.** La propuesta puede incluir las **mismas secciones institucionales** de la biblioteca que usa la presentación (no se anida un documento dentro de otro): se escribe una vez y se reutiliza en los dos formatos.

## 6. Estados y transiciones

**Documento comercial**

| Desde | Hacia | Quién (rol, agente) | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| — | `borrador` | `documentos:salida.manage`; agente con vista previa | Plantilla publicada; en propuesta y simple, cotización `lista` o `enviada` | Contenido resuelto desde plantilla y datos | Sí (descartar) |
| `borrador` | `descartado` | Ídem | — | Se archiva; no deja PDF | No (se crea otro) |
| `borrador` | `enviado` | `documentos:salida.enviar`; agente solo con aprobación humana | Sin variables vacías, sin secciones «propuesta por IA», cotización `lista` o ya `enviada` en esa versión (R28), certificados vencidos confirmados, destinatarios con correo | PDF congelado con huella; enlaces; evento `documentos.salida.enviada`; cotización → `enviada`; anterior del mismo negocio y formato → `reemplazado` | No |
| `enviado` | `visto` | Sistema | Primera apertura de un enlace | Evento `documentos.salida.vista` | No |
| `enviado` / `visto` | `aceptado` | Destinatario en el enlace, o usuario (fuera de línea) | Dentro de la validez | Aceptación inmutable; PDF con constancia; cotización → `aceptada`; propuesta o ganancia del negocio (R34) | No |
| `enviado` / `visto` | `rechazado` | Destinatario en el enlace | Motivo | Aviso al ejecutivo | No (se envía una versión nueva) |
| `enviado` / `visto` | `vencido` | Sistema (trabajo diario) | Pasó la validez | Enlace en solo lectura | No |
| `enviado` / `visto` | `reemplazado` | Sistema | Se envía una versión nueva del mismo negocio y formato | Enlace con aviso y acceso a la vigente | No |
| `enviado` / `visto` | `retirado` | `documentos:salida.enviar` | Motivo | Enlaces revocados | No |

**Plantilla:** `borrador` → `publicada` (permiso `documentos:plantillas.manage`; validaciones de R8, R12 y R17) → `retirada` (no se ofrece para documentos nuevos; los existentes no cambian). Publicar una nueva versión retira la anterior automáticamente.

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Agente (scope) |
|---|---|---|---|---|---|---|---|
| Ver salidas comerciales (`documentos:salida.read`) | ✓ | ✓ | ✓ | — | ✓ | Solo las suyas enviadas (fase 3) | `documentos` lectura |
| Generar y editar borradores (`documentos:salida.manage`) | ✓ | ✓ | ✓ | — | — | — | Con vista previa |
| Enviar, retirar, registrar aceptación fuera de línea (`documentos:salida.enviar`) | ✓ | ✓ | ✓ | — | — | — | Solo con aprobación humana |
| Editar plantillas y biblioteca (`documentos:plantillas.manage`) | ✓ | ✓ | — (pregunta 9) | — | — | — | Borradores con vista previa; publicar con aprobación humana |
| Ajustes de salidas (Configuración) | ✓ | ✓ | — | — | — | — | — |

- **Alcance de filas (ADR-022):** se ven las salidas de los negocios y cuentas que el usuario ya ve en Comercial; el filtro va en la consulta, nunca en la UI. Generar una propuesta exige además leer la cotización (`cpq:cotizaciones.read`); sin ese permiso no se ofrecen los formatos que la usan.
- Los roles personalizados del Brief 07c pueden recibir estos permisos por separado (por ejemplo un rol «Marketing» que solo edita la biblioteca).
- El **destinatario** no es usuario de OPAI: su acceso es el enlace personal (y, en la fase 3, el Portal Cliente con la misma cotización, ADR-033).

## 8. Eventos y notificaciones

Silencio por defecto (ADR-020): ninguno se envía hasta que el tenant lo activa en Configuración → Comunicaciones. Los marcados «recomendado» son la propuesta para Gard.

| Evento | Cuándo ocurre | Quién se entera (recomendado) | Canal | Plantilla |
|---|---|---|---|---|
| `documentos.salida.enviada` | Al enviar | Destinatarios (es el envío mismo) | Correo | «Te enviamos nuestra propuesta» con enlace personal |
| `documentos.salida.vista` | Primera apertura de cada destinatario | Ejecutivo responsable (recomendado) | In-app, push | «{{cliente}} abrió la propuesta» |
| `documentos.salida.aceptada` | Aceptación en el enlace o fuera de línea | Ejecutivo y gerente comercial (recomendado); destinatario (comprobante, siempre) | Correo, in-app | Comprobante con `/verificar/<token>` |
| `documentos.salida.rechazada` | Rechazo en el enlace | Ejecutivo (recomendado) | In-app, correo | Con motivo |
| `documentos.salida.por_vencer` | 3 días antes de la validez sin respuesta | Ejecutivo | In-app | «La propuesta vence el …» |
| `documentos.salida.actualizacion_pedida` | El cliente pide una propuesta actualizada desde un enlace vencido | Ejecutivo (recomendado) | In-app, correo | — |
| `documentos.plantilla.publicada` | Se publica una versión | — | In-app | — |

Los eventos de aceptación son los que consumen CPQ (cotización aceptada) y Comercial (propuesta o ganancia del negocio, R34), por outbox en la misma transacción (ADR-029).

## 9. Herramientas MCP

Toda acción de pantalla tiene su herramienta (ADR-055), y la pantalla, `/api/v1` y el MCP invocan la misma capacidad. Las escrituras aceptan `dryRun` (en MCP, `preview_…`), aceptan `idempotency_key` y quedan auditadas como «agente vía <usuario>» (ADR-049).

| Herramienta | Qué hace (lenguaje de negocio) | Tipo | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `documentos_formatos_list` | Lista los formatos y las plantillas publicadas del tenant con su descripción de uso | Lectura | — | — |
| `documentos_formato_proponer` | Recomienda formato y plantilla para un negocio, con el motivo (R27) | Lectura | — | — |
| `documentos_salida_generar` | Crea el borrador de un documento desde una plantilla, un negocio o cuenta y, si aplica, una versión de cotización | Escritura | ✓ | — |
| `documentos_salida_get` | Devuelve el contenido del documento, sus avisos (variables vacías, certificados vencidos, secciones por revisar) y su estado | Lectura | — | — |
| `documentos_salida_editar_seccion` | Reescribe el texto de una sección no fija; queda «propuesta por IA» (R24) | Escritura | ✓ | — |
| `documentos_salida_ajustar_bloques` | Quita o repone bloques opcionales y los reordena, si la plantilla lo permite (R23) | Escritura | ✓ | — |
| `documentos_salida_cambiar_plantilla` | Pasa un borrador a la versión nueva de su plantilla o a otra plantilla del formato, mostrando qué cambia (R4) | Escritura | ✓ | — |
| `documentos_salida_nueva_version` | Regenera desde la última versión de la cotización (R22) | Escritura | ✓ | — |
| `documentos_salida_descartar` | Descarta un borrador | Escritura | ✓ | — |
| `documentos_salida_enviar` | Envía a los destinatarios con su enlace personal; recibe la confirmación de certificados vencidos (R20, R28) | Irreversible | ✓ | Sí |
| `documentos_salida_enlace` | Devuelve el enlace de un destinatario para compartirlo | Lectura | — | — |
| `documentos_salida_registrar_compartido` | Registra que el enlace se compartió por WhatsApp o se copió (R29) | Escritura | ✓ | — |
| `documentos_salida_revocar_enlace` | Revoca el enlace de un solo destinatario (R30, R36) | Irreversible | ✓ | Sí |
| `documentos_salida_retirar` | Retira el documento enviado y revoca todos sus enlaces | Irreversible | ✓ | Sí |
| `documentos_salida_registrar_aceptacion` | Registra una aceptación recibida fuera de línea con su respaldo (R33) | Irreversible | ✓ | Sí |
| `documentos_salidas_list` | Lista salidas por negocio, cuenta, formato o estado, con vistas y aceptación | Lectura | — | — |
| `documentos_plantillas_list` | Lista las plantillas del tenant con su versión publicada y si tienen borrador | Lectura | — | — |
| `documentos_plantilla_get` | Lee una plantilla (borrador y versiones) | Lectura | — | — |
| `documentos_plantilla_guardar_borrador` | Crea una plantilla o edita su borrador (bloques, orden, visibilidad, apertura, marca) | Escritura | ✓ | — |
| `documentos_plantilla_publicar` | Publica la versión | Irreversible | ✓ | Sí |
| `documentos_plantilla_retirar` | Retira una plantilla para documentos nuevos | Irreversible | ✓ | Sí |
| `documentos_secciones_list` | Lista la biblioteca de secciones institucionales con su uso y avisos | Lectura | — | — |
| `documentos_seccion_guardar` | Crea o edita una sección institucional | Escritura | ✓ | — |
| `documentos_seccion_archivar` | Archiva una sección que ya no usa ninguna plantilla publicada | Escritura | ✓ | — |

**Excepciones de paridad (con motivo, ADR-055):**
- `documentos.salida.revisar_seccion` (marcar revisada una sección propuesta por IA) es `soloPersonas`: es la revisión humana de R24, y un agente que la marca, aunque sea con aprobación, deja sin revisar el texto.
- Las acciones del **destinatario** en la página pública (pedir el código, aceptar, rechazar y pedir una propuesta actualizada) son capacidades con el enlace como credencial, sin sesión ni key: van en `paridad-entradas.ts` como rutas públicas, igual que `/verificar`. Cuando exista el Portal Cliente con keys de cliente (ADR-033, fase 3), aceptar y rechazar se exponen también por MCP para el agente del cliente.
- Los ajustes de Configuración → Documentos se cambian con `core.config.set`, que ya existe.

**Flujo típico del agente** (para el manual `docs/2.0/agentes/salidas-comerciales.md`, con su escenario de prueba en `pnpm test`, ADR-034):

1. «Prepara la propuesta para el negocio X» → `documentos_formato_proponer` → explica el formato elegido y por qué.
2. `preview_documentos_salida_generar` → muestra el borrador; `documentos_salida_generar` tras la confirmación del usuario (en «confirmar paso a paso» o «aprobar todo», ADR-049.4).
3. Si la plantilla tiene «Comprensión del servicio», la propone con `documentos_salida_editar_seccion` y le dice al usuario qué secciones debe revisar.
4. **Se detiene** antes de enviar: deja el documento listo y pide la revisión de las secciones IA y la aprobación del envío. Nunca envía ni registra aceptaciones sin aprobación humana.

## 10. Integraciones

- **PDF:** generado en el servidor desde el mismo contenido de bloques que la vista en pantalla, idéntico en pantalla e impresión (ADR-019). El motor de PDF es infraestructura del núcleo (lo fija el brief); su costo de cómputo se mide en `core.consumos` (ADR-031).
- **Almacenamiento:** PDF y respaldos en R2 por `core.documentos` con URLs firmadas de corta duración (ADR-039). La página del cliente nunca expone una URL de R2 permanente.
- **Correo:** adaptador de correo del tenant (Resend por defecto, dominio propio cuando el tenant lo configure; ADR-020).
- **WhatsApp:** en v1, compartir el enlace desde el celular (enlace `wa.me`, sin proveedor). Envío por API de WhatsApp queda para cuando exista la integración del núcleo.
- **IA:** asistente de plantillas y textos por el adaptador de IA del núcleo con clase de tarea `estandar` (ADR-031), con la key del tenant o la de OPAI según ADR-049.9; si el tenant tiene key propia y falla, **nunca** se pasa a la key de OPAI: la generación falla y se avisa al tenant (ADR-049.6).
- **Mapas:** mapa estático de la instalación por el servicio de geolocalización del núcleo (ADR-027).
- **Firma electrónica avanzada:** no en esta parte; se suma en el Brief 28 (fase 6) como un nivel más de la aceptación.

## 11. Mejoras respecto de 1.0 y lo que no se porta

Verificado en `Cryptobal/opai` @ `40d19a5` (solo lectura): `prisma/schema.prisma` (`CpqProposalTemplate`, `CpqFixedSection`, `CpqIncludesSuggestion`, `CpqQuoteIncludesItem`, `Presentation`), `src/app/api/cpq/proposal-templates/route.ts`, `src/lib/cpq/fixed-sections.ts`, `src/lib/cpq/proposal-sections/schema.ts` y `send-gates.ts`, `src/app/api/cpq/quotes/[id]/send-presentation/route.ts` y `src/app/api/portal/cliente/cotizaciones/[id]/accept-proposal/route.ts`.

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| `CpqProposalTemplate`: una plantilla es un conjunto de **interruptores** (`showCoverPage`, `showCompanyIntro`, `showPositionsTable`, `showCostBreakdown`, `showCostSummaryByCategory`, `showLaborDetail`, `showEquipmentDetail`, `showVehicleDetail`, `showAdditionalServices`, `showConditions`, `showIncludedItems`, `showSignature`, `showComplianceSection`, `numberedSections`, `headerStyle`) sobre un PDF fijo; `tenantId` nullable | Plantilla de **bloques ordenables** por tenant, versionada, con visibilidad por bloque y nivel de apertura | Se conserva la idea (qué se muestra) y se gana orden, textos propios y versiones; nada global (P13) |
| Tres plantillas por defecto en código («Estándar», «Detallado», «Licitación») | Plantillas base de la vertical **copiadas** al tenant (R3), equivalentes a esas tres más la presentación | Se iguala lo que Gard ya usa y deja de estar cableado |
| `showCostBreakdown` / `showLaborDetail` / `showCostSummaryByCategory` | Nivel de apertura `por_instalacion` · `por_categoria` · `por_item` (R13) y lo interno que nunca sale (R14) | Una regla clara en vez de combinaciones de interruptores |
| `CpqFixedSection`: secciones institucionales por tenant con **claves fijas** (`quienes_somos`, `uniformes_epp`, `capacitacion`, `opai_sla`, `supervision_contingencias`, `preventivo`, `experiencia_certificaciones`, `matriz_identificacion_oferente`) y texto plano con semilla de Gard | Biblioteca de secciones con claves del tenant, texto enriquecido, imágenes y documentos enlazados con vigencia, versionada (R20, R38) | Cada tenant define sus secciones; certificados con vencimiento real |
| Contenido de la propuesta en un JSON dentro de la cotización (`proposalAiContent`) con secciones y estados `ia` → `editada` → `aprobada`, orígenes `fija_empresa`, `ia`, `auto`, `bases` | Documento comercial propio, con secciones y estados equivalentes (R23, R24) y vínculo a la versión de cotización | **Se conserva** la revisión de lo escrito por IA; el documento deja de ser un campo de la cotización (y la cotización deja de cargar campos de IA) |
| Bloqueo de «Enviar» si la propuesta no está lista o falta cuenta, contacto o negocio (`send-gates.ts`) | Condiciones de envío de R28 y §6 | Se conserva y se suma la cotización `lista` (margen) |
| `CpqIncludesSuggestion` con `tenantId` nullable e `CpqQuoteIncludesItem` con `showInPdf` | «Incluye» como ítems sin costo y visibles del CPQ (ADR-042.2) que el bloque «Incluye y exclusiones» muestra | Una sola fuente; nada global |
| `Presentation`: enlace público `/p/<uniqueId>` con conteo de vistas, aperturas y clics, vencimiento y envío por correo o WhatsApp | Enlace **personal por destinatario**, revocable, con vistas, vencimiento ligado a la validez y sin IP en claro (R29–R31) | Trazabilidad de quién vio y quién aceptó; Ley 21.719 |
| Aceptación en el Portal Cliente (`accept-proposal`): aprueba la cotización y mueve el negocio a la etapa ganada | Aceptación en el enlace y en el Portal Cliente con **firma simple y evidencia** (R32), comprobante verificable y ganancia del negocio según ajuste (R34) | Se iguala el flujo y se agrega prueba de quién aceptó y de qué PDF exacto |
| Propuesta y bundle (`CpqProposalBundle`) para varias instalaciones | Una propuesta con **una sección por instalación** desde una sola cotización (bloques «Instalaciones» y «Dotación por instalación») | P4 de la extracción |
| Modo `licitacion` con matriz de cumplimiento y secciones generadas desde las bases | Fuera de esta parte: va con Licitaciones (Brief 27), reutilizando bloques y biblioteca | Licitaciones es fase 6 |

**No se porta:** interruptores `show*` como modelo, plantillas globales (`tenantId` nulo), contenido de propuesta dentro de la cotización, `CpqProposalBundle`, PandaDoc (`proposalLink`), plantillas de presentación de otro sistema (`Template` de 1.0), conteo de clics de correo (lo mide el adaptador de correo, no el documento) y la generación de contrato desde la cotización (`generate-contract`, va con la parte de contratos y la firma avanzada).

## 12. Casos borde

- **La cotización cambia después de generar el borrador:** el borrador avisa «Hay una versión nueva de la cotización» y ofrece «Nueva versión» (R22); no se envía un borrador de una versión `reemplazada`.
- **La cotización pasa a `en_aprobacion` (margen bajo el mínimo) con un borrador abierto:** el borrador se puede editar, pero «Enviar» queda deshabilitado con el motivo hasta que se apruebe (ADR-042.6).
- **Cotización en UF:** el documento muestra UF con su valor y fecha congelados al enviar la cotización; en CLP, sin UF. Nunca mezcla monedas en un mismo total.
- **Treinta instalaciones:** la propuesta pone un resumen por instalación al inicio y una sección por instalación con salto de página; la cotización simple pasa a mostrar solo el total y avisa si no cabe en una hoja (R12).
- **Líneas comunes (sin instalación):** van en una sección «Servicios comunes» o, en la simple, en una línea aparte.
- **Destinatario sin correo:** no se puede enviar a ese contacto; se puede generar el enlace y compartirlo por WhatsApp desde la pantalla con aviso (queda registrado quién lo compartió).
- **Dos destinatarios intentan aceptar:** gana el primero; el segundo ve «Esta propuesta ya fue aceptada el …», sin el nombre de quien aceptó.
- **Aceptan después de la validez:** no se puede; ven «Pedir una propuesta actualizada».
- **El tenant cambia el logo después de enviar:** los enviados conservan el logo con que salieron (R21); los borradores toman el nuevo.
- **Plantilla retirada con borradores abiertos:** los borradores siguen con su versión; se ofrece actualizar a otra plantilla.
- **Sección institucional archivada usada por una plantilla publicada:** no se puede archivar hasta reemplazarla (§4.2).
- **Certificado vencido en la biblioteca:** aviso en el borrador; enviar pide confirmación (R20).
- **Presentación suelta a un correo sin cuenta:** se registra con el correo; si después se crea la cuenta con ese contacto, se vincula.
- **Enlace reenviado por el cliente a otra persona:** quien lo abre ve el documento; para aceptar debe verificar el correo del destinatario original (pregunta 4), así la aceptación siempre es del destinatario; si la propuesta ya fue aceptada, ve la fecha, no el nombre (R32).
- **Agente intenta enviar sin aprobación:** responde `APPROVAL_REQUIRED` y la solicitud aparece en la Bandeja del usuario responsable.
- **Módulo Documentos apagado con CPQ encendido:** ver pregunta 7.

## 13. Criterios de aceptación

Verificables por Carlos en `test.opai.cl` y por el bot de Diseño y QA.

- **CA1.** Un owner crea una plantilla de propuesta propia, reordena bloques, oculta «Ítems y costos», elige apertura `por_categoria`, publica, y un documento nuevo sale con ese orden y esa apertura; otro tenant no ve ni recibe nada de ella.
- **CA2.** Al activar el módulo en un tenant de seguridad aparecen las plantillas base (presentación, propuesta estándar, propuesta detallada, cotización simple) como copias editables; cambiar la plantilla base de OPAI después no cambia las del tenant.
- **CA3.** Una propuesta generada desde una cotización con una línea oculta al cliente no lista esa línea en ningún nivel de apertura, y la suma de lo mostrado por instalación coincide al peso con el total de la cotización.
- **CA4.** Ningún documento muestra margen, costo financiero, margen efectivo ni datos de trabajadores, en ningún nivel de apertura.
- **CA5.** La cotización simple de una cotización de tres instalaciones cabe en una hoja carta; con 30 instalaciones avisa y propone la propuesta.
- **CA6.** Al enviar, queda un PDF en Documentos con huella SHA-256 vinculado a la cuenta, el negocio y la cotización; editar algo después crea una versión nueva y el enviado no cambia.
- **CA7.** El cliente abre el enlace en un celular de 375 px, descarga el mismo PDF, acepta con nombre, RUT, cargo y código al correo; queda la aceptación con su comprobante verificable, la cotización pasa a `aceptada` y el negocio se gana o queda propuesto según el ajuste.
- **CA8.** Un agente con permisos de gerente genera el borrador correcto para un negocio (explicando el formato), propone «Comprensión del servicio» y, al pedir enviar, recibe `APPROVAL_REQUIRED`; el documento no se envía hasta que una persona aprueba y revisa las secciones IA.
- **CA9.** Un usuario sin acceso a un negocio no ve sus documentos ni por pantalla, ni por API, ni por MCP.
- **CA10.** Cuando sale una versión nueva de la cotización y se envía su propuesta, el enlace anterior muestra «Esta propuesta fue reemplazada».
- **CA11.** `tools/list` en `main` incluye las herramientas de §9 y el gate de paridad está en verde.

## 14. Preguntas abiertas para Carlos

Cada una con la recomendación de Claude y por qué. Las numeradas se citan como «pregunta N» en las reglas.

1. **¿Hasta dónde se abre el costo en la propuesta aperturada?** Recomendación: tres niveles por plantilla (`por_instalacion`, `por_categoria`, `por_item`, R13); en `por_item` la mano de obra puede mostrar sueldo base, leyes sociales y provisiones si la plantilla lo habilita; margen, costo financiero y póliza **nunca** aparecen y la diferencia sale en una línea «Gastos generales y utilidad». *Por qué:* cubre lo que piden los clientes que exigen apertura sin regalar la estructura de margen, y evita el error humano de mostrar un porcentaje interno.
2. **¿Aceptar en el enlace gana el negocio automáticamente?** Recomendación: ajuste del tenant «Ganar el negocio al aceptar», **encendido por defecto para Gard** (igual que 1.0, que mueve el negocio a la etapa ganada), apagado en la plantilla base de otros tenants (queda «propuesto» y una persona confirma). *Por qué:* 1.0 es el piso, y en 2.0 ganar no crea puestos, solo los ofrece a RRHH (`modulos/cpq.md` R2), así que el riesgo es bajo.
3. **¿La propuesta y la simple llevan la firma del emisor (ejecutivo o representante legal)?** Recomendación: v1 lleva el bloque «Contacto del ejecutivo» con su nombre y cargo, sin firma manuscrita; la firma del representante legal queda para contratos con firma avanzada (Brief 28). *Por qué:* una propuesta no es un contrato y una firma en imagen pegada no agrega prueba.
4. **¿Qué pide la firma simple del cliente?** Recomendación: declaración + nombre, RUT y cargo + **código de un solo uso al correo del destinatario**; el **trazo** de firma queda como opción del tenant, apagada por defecto. *Por qué:* el código prueba que aceptó el destinatario y no quien recibió el enlace reenviado; el trazo suma poco como prueba y es incómodo en el celular. **Ojo:** esto ajusta ADR-019, que define la firma simple como «trazo + sello de tiempo» y pide IP en la evidencia; aquí la prueba principal es el código al correo y la red se guarda como huella HMAC, no como IP en claro (Ley 21.719). Si Carlos lo aprueba, se agrega una nota fechada a ADR-019.
5. **¿Un enlace por documento o uno por destinatario?** Recomendación: **uno por destinatario**, revocable. *Por qué:* permite saber quién lo vio y quién aceptó, y revocar a una persona sin afectar a las demás (en 1.0 el enlace es uno solo y público).
6. **¿Se registran aceptaciones recibidas fuera de OPAI (orden de compra, PDF firmado, correo)?** Recomendación: sí, con respaldo adjunto obligatorio, solo personas con `documentos:salida.enviar`; un agente solo con aprobación humana (R33). *Por qué:* es como aceptan hoy muchos clientes de Gard y sin esto el negocio quedaría sin evidencia en OPAI.
7. **¿CPQ puede venderse sin el módulo Documentos?** Recomendación: sí. CPQ trae las **plantillas base** de propuesta y cotización simple con la marca del tenant, sin editor (como el anexo de contrato del Brief 07b usa una plantilla base del sistema); el **editor de plantillas, la biblioteca, la presentación de empresa y la aceptación con firma** son del módulo Documentos. *Por qué:* respeta ADR-048 (módulos vendibles por separado) sin dejar a CPQ sin PDF, y Documentos queda como mejora vendible. Al revés, **Documentos sin CPQ** ofrece solo la presentación de empresa (desde una cuenta del núcleo o suelta) y oculta la propuesta y la cotización simple; **sin Comercial** la presentación sale desde la cuenta o suelta, sin negocio.
8. **¿La presentación de empresa puede enviarse sin negocio (prospección)?** Recomendación: sí, desde la cuenta o suelta a un correo, siempre registrada (R37). *Por qué:* es el uso típico antes de que exista el negocio y así queda trazado qué se mandó a quién.
9. **¿Quién edita plantillas y la biblioteca?** Recomendación: owner y admin por defecto, con el permiso `documentos:plantillas.manage` asignable a roles personalizados (Brief 07c), por ejemplo un rol «Marketing» que solo edita la biblioteca. *Por qué:* la marca y los textos institucionales son de la empresa, no de cada vendedor.
10. **¿Se exige revisar cada sección escrita por IA antes de enviar?** Recomendación: sí (R24), igual que el `ia → editada → aprobada` de 1.0. *Por qué:* el agente propone, la persona responde ante el cliente; evita mandar un texto inventado.
11. **¿Numeración propia de los documentos?** Recomendación: propuesta y simple usan el código de la cotización y su versión (`CPQ-2026-041 v3 · Propuesta`); solo la presentación lleva correlativo propio `PRE-AAAA-NNN`. *Por qué:* el cliente ya conoce el código de la cotización y un segundo número confunde.
12. **¿Plantillas en inglés u otros idiomas en v1?** Recomendación: no; v1 solo en español de Chile, con el idioma como campo de la plantilla para sumarlo después sin migrar. *Por qué:* no hay hoy un cliente de Gard que lo pida y duplica el trabajo de textos.
13. **¿Avisar al ejecutivo cuando el cliente abre la propuesta?** Recomendación: sí para Gard (evento `documentos.salida.vista`, in-app y push), apagado por defecto en otros tenants (ADR-020). *Por qué:* es el momento de llamar y 1.0 ya registra las aperturas.
14. **¿Las plantillas base de Gard se arman desde sus propuestas actuales de 1.0?** Recomendación: sí; Claude prepara la plantilla base de seguridad y la biblioteca de ejemplo a partir de los textos de `CpqFixedSection` de Gard y de dos o tres propuestas reales que Carlos elija, y Carlos las aprueba antes del brief. *Por qué:* el diseño se valida con contenido real y Gard parte con sus textos, no con relleno.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Primera versión: parte 1, formatos de salida comercial (CAR-68) | — (pendiente de aprobación de Carlos) |
