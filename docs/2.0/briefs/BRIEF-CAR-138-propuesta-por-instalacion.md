# Brief · CAR-138 — Propuesta técnica personalizada por instalación, contexto comercial y catálogo único de campos

Autorizado por Carlos el 7-nov-2026 10:15 (America/Santiago). Issue: CAR-138 (Linear). Sesión: «Comercial · Code».
Base verificada: `main` `ad4ab913`. Este brief se entrega **por etapas y PR pequeños**; completar una etapa no cierra la evolución.

## Qué existe (verificado en el repositorio, no se reconstruye)

- `packages/domain/src/plantillas.ts` (ADR-020): sintaxis `{{ruta.variable}}`, `variablesUsadas`, `validarPlantilla`, `escaparHtml`, `renderizar`. Lo usan Comunicaciones y los anexos. **El catálogo extiende esta sintaxis; no abre otra.**
- `packages/domain/src/formato.ts` (R4): formateador único (CLP, UF, %, fecha). Todo valor de campo se presenta con él.
- Propuesta técnica v2 (CAR-144, #218): biblioteca de bloques, armador, plantilla por tenant, PDF (`pdf-lib`, sin HTML) y envío/congelado. Formatos por tenant (CAR-68).
- `docs/2.0/modulos/documentos.md` R17-R18 define variables de lista cerrada, pero **no hay código** que las resuelva: no existe módulo `documentos` ni resolvedor por entidad. CAR-127 (Documentos v4) solo tiene la rama de diseño `docs/diseno-documentos-v4`.
- El renderer actual no convierte HTML: la importación HTML (etapa 4) requiere resolver la compatibilidad de forma explícita.

## Secuencia de PR (uno por fila; cada uno actualiza `ESTADO.md`)

| PR | Contenido | Superficie compartida | Migración |
|---|---|---|---|
| 1 | **Catálogo único de campos** (contrato, versión, alias, sensibilidad por finalidad), validador y render puros | `packages/domain` (archivos nuevos) | No |
| 2 | Resolvedor con contexto autorizado: valores por entidad, tenant, permisos, alcance y finalidad; lectura auditada | `packages/capabilities` (Núcleo) — acordar con Documentos | No |
| 3 | CPQ y propuestas consumen el catálogo; congelado del contrato de tokens al enviar | `modules/cpq` (propio) | Aditiva propuesta |
| 4 | Contexto comercial del negocio (fuentes, fechas, permisos; confirmado vs inferencia) | CRM/Actividad | Aditiva propuesta |
| 5 | IA por sección (sin sobrescribir lo manual; fuentes y faltantes) | adaptador de IA del Núcleo | No |
| 6 | Capítulo por instalación (servidor y PDF); el editor en pantalla espera diseño aprobado | `modules/cpq` | Aditiva propuesta |
| 7 | Referencias de clientes activos con opt-in | Cuentas | Aditiva propuesta |
| 8 | Prompt exportable generado desde el catálogo | `modules/cpq` | No |
| 9 | Importación HTML sanitizada y versionada por tenant | por definir con el renderer | Aditiva propuesta |

Migraciones: solo se proponen, aditivas, para ejecución por el responsable autorizado con respaldo previo. Este brief no ejecuta ninguna.

## Dependencias y concurrencia

- **Documentos (CAR-127, en curso) y Núcleo** son dueños naturales del contrato transversal. El PR 1 solo agrega archivos nuevos en `packages/domain/src/campos/` y una línea de exportación; **no toca** `plantillas.ts`, `formato.ts` ni nada de Documentos. Si Documentos ya trabaja un catálogo propio, se converge sobre este contrato antes del PR 2.
- Pantallas (editor, capítulo por instalación): requieren diseño aprobado y presentación visual a Carlos (A2.10); no se construyen sin ello.
- Fuera de alcance: Portal Cliente/archivo, CAR-218 PR 2, Face ID, infraestructura, datos y envíos reales de Gard.

## PR 1 — alcance y archivos

Nuevos (todos ≤150 líneas) en `packages/domain/src/campos/`: `tipos`, `grupos`, `catalogo-{empresa,cuenta,contacto,personas,lugares,negocio}`, `catalogo` (índice, alias y versión), `formatos` (sobre `formato.ts`), `plantilla` (analizador), `validar`, `render` e `index`, más `catalogo.test.ts` y `render.test.ts`. Modificado: `packages/domain/src/index.ts` (una línea de exportación), `ESTADO.md`.

Reglas del contrato:
- Cada campo declara `clave` (`entidad.campo`), alias, tipo y formato, fuente, **sensibilidad** y **finalidades** permitidas (`propuesta`, `contrato`, `documento`, `correo`). Un campo sensible permitido en `contrato` no se resuelve en `propuesta`.
- Datos económicos solo con fuente `cpq`; nunca se piden a la IA.
- Sintaxis compatible: `{{clave}}`, `{{clave | formato}}`, `{{#cada coleccion}}…{{/cada}}` y `{{#si clave}}…{{/si}}`.
- Se rechazan: tokens desconocidos, no autorizados para la finalidad, formatos inválidos y estructuras mal cerradas. Los valores faltantes se informan, no se completan.
- Versión del catálogo y mapa de alias para compatibilidad.

## PR 6 — capítulo por instalación (servidor y PDF)

**Alcance (autorizado por Carlos el 7-nov-2026; orden de construir en esta sesión el 9-nov-2026 19:17 UTC).** Solo `modules/cpq` y la migración propuesta. El editor en pantalla **no** entra (espera diseño aprobado); el PR 7 tampoco.

- **Qué es el capítulo.** Uno por cada sección de la cotización que corresponde a una instalación (la «Común» no tiene). Lleva dirección y enlace de mapa **si el dato ya existe**, la tabla de puestos con **guardias simultáneos** y **dotación estimada**, y once secciones de texto: comprensión del servicio, alcance, exclusiones, turnos, accesos, rondas, protocolos, equipamiento, supervisión, reportes y arranque.
- **Qué se calcula y qué se escribe.** Dirección y mapa salen de `resolverCamposDocumento` (finalidad «propuesta», con permisos y alcance del actor; sin otra lectura de maestros). Guardias simultáneos son las posiciones del CPQ; la dotación es `personasPorPosicion` del motor × posiciones. **Nada de eso se guarda** y nunca lo escribe una IA ni una persona. Solo se guarda el **texto narrativo**, que escribe una persona (`manual`) o es una sugerencia de la IA del PR 5 que ella aceptó (`ia_aceptada`).
- **Faltantes.** Dirección, cada sección sin texto, puestos y dotación no calculable son un faltante verificable (`cpq.propuestas_tecnica.capitulos_list`). El PDF en borrador los avisa en una línea; el PDF enviado **no imprime relleno ni avisos**. No se inventan datos, certificados, SLA ni plazos.
- **Supervisión.** Es un texto. No crea un ítem vendido ni promete un supervisor permanente por defecto: el costo se asume dentro de lo cotizado. Precio, moneda, dotación y condiciones económicas vienen del CPQ.
- **PDF.** Con capítulos, el índice se numera (N por bloque, N.k por instalación) y los títulos de los bloques llevan su número; los capítulos se imprimen tras el detalle del servicio. Sin capítulos, el PDF no cambia.
- **Congelado.** Una propuesta congelada rechaza guardar o quitar texto; el PDF enviado se genera con el capítulo vigente de esa propuesta congelada.
- **Capacidades (paridad MCP, dryRun, idempotencia, auditoría):** `cpq.propuestas_tecnica.capitulos_list` (lectura auditada por IDs) y `cpq.propuestas_tecnica.capitulo_guardar` (escritura; la instalación debe ser sección de la versión de la propuesta).
- **Migración propuesta** `20261116100000_cpq_propuesta_capitulos`: tabla nueva `cpq.propuesta_capitulos`, vacía, con RLS ENABLE+FORCE, `tenant_isolation`, disparador de misma empresa y constraints de clave, origen y largo. Reversión: `DROP TABLE "cpq"."propuesta_capitulos"`. La aplica el coordinador con respaldo.

## PR 7 — referencias de clientes con consentimiento (opt-in)

**Alcance (encargo de Carlos vía el coordinador, 10-nov-2026 11:08).** Núcleo (Cuentas) y catálogo de campos, más el ajuste mínimo en `modules/cpq` para congelar la colección. Migración aditiva propuesta, **no aplicada** (la aplica el coordinador con respaldo tras la revisión). Sin pantalla: la gestión en la ficha de la cuenta espera diseño aprobado; mientras tanto se opera por MCP y `/api/v1`.

- **Regla.** Un cliente aparece como referencia en un documento **solo** si hay un consentimiento explícito y registrado, vigente, y la cuenta es «cliente activo» y no está archivada. Por defecto no aparece: sin registro no hay referencia, y una referencia revocada, vencida o de una cuenta inactiva desaparece en el próximo documento.
- **Registro (append-only).** Tabla nueva `core.cuentas_referencias`: cada fila es un otorgamiento o una revocación; el estado vigente es la última fila de la cuenta. El otorgamiento exige fecha del consentimiento, medio de evidencia (correo, documento firmado, contrato, acta u otro) con detalle, y la confirmación explícita de quien registra; guarda quién del cliente lo dio (contacto, opcional), hasta cuándo vale (opcional) y **qué se puede mostrar**: el nombre del cliente (si no, se muestra anonimizado: «Cliente de {giro} en {comuna}»), una descripción del servicio y una cita. Cambiar lo que se muestra es un consentimiento nuevo. La revocación exige motivo. `opai_app` no puede actualizar ni borrar filas.
- **Quién autoriza: decisión de Carlos pendiente.** No se decide aquí. Registrar un consentimiento exige el permiso nuevo `core:cuentas.referencias.autorizar`, que por defecto tienen solo owner y admin (gerente denegado; supervisor y viewer no lo tienen) y que cada empresa puede dar o quitar con roles personalizados y excepciones por usuario. Revocar es la dirección segura: basta `core:cuentas.manage`.
- **Catálogo de campos (versión 2).** Colección `referencias` (entidad `referencia`) con `referencia.cliente`, `referencia.rubro`, `referencia.comuna`, `referencia.cliente_desde`, `referencia.descripcion` y `referencia.cita`, solo para las finalidades «propuesta» y «documento». La lee quien puede leer cuentas, con su alcance (ADR-022). El resolvedor excluye la cuenta destinataria del documento y entrega hasta 10, por nombre.
- **Propuesta.** El contrato congelado al enviar guarda la colección solo si el texto la usa. Si el texto usa `{{#cada referencias}}` y no hay referencias autorizadas, el envío se detiene con un mensaje claro (no se envía una sección vacía).
- **Capacidades (paridad MCP, dryRun, idempotencia, auditoría):** `core.cuentas_referencias.list` (lectura), `core.cuentas_referencias.otorgar` y `core.cuentas_referencias.revocar` (escrituras con evento `core.cuenta.referencia_otorgada` / `core.cuenta.referencia_revocada`; otorgar es solo para personas: ninguna API key lo hace, ni con autonomía «directo»). La lista oculta el detalle de la evidencia, el motivo y el contacto a quien solo lee cuentas. `core.campos.valores` devuelve además la colección.
- **Migración propuesta** `20261118100000_core_cuentas_referencias`: tabla nueva, vacía, RLS ENABLE+FORCE, `tenant_isolation`, disparador de misma empresa (cuenta y contacto), CHECK de estado, evidencia, largos y vigencia; `REVOKE UPDATE, DELETE` a `opai_app`. Reversión: `DROP TABLE "core"."cuentas_referencias"`.
- **Archivos.** `packages/db` (schema + migración), `packages/domain/src/campos/` (catálogo, entidad, mapeo y versión), `packages/domain` (permiso y patrones por rol), `packages/capabilities/src/core/maestros/referencias*.ts` (nuevos), `core/campos/` (resolvedor y salida), `modules/cpq` (contrato congelado), tests de dominio, capacidades y `test:db`, instantáneas de herramientas MCP e inventario de paridad, `ESTADO.md`.
- **Pruebas.** Dominio (catálogo, anonimización, vigencia), CPQ (contrato congelado) y `test:db` (permisos, confirmación explícita, revocación, validaciones y CHECK de la base) con dos empresas ficticias y rol sin BYPASSRLS (sin consentimiento no aparece; revocado, vencido o inactivo no aparece; otra empresa no ve nada; `opai_app` no puede editar ni borrar el registro).

## PR 8 — prompt exportable generado desde el catálogo

**Alcance (encargo de Carlos vía el coordinador, 9-nov-2026 noche).** Solo `modules/cpq`; sin migración. No entran el PR 7, el PR 9 (importar HTML: el renderer de hoy es `pdf-lib`) ni el editor en pantalla.

- **Qué es.** Un texto en español, generado en código desde `packages/domain/src/campos/`, para entregárselo a Claude Design u otra IA. Lleva la versión del catálogo (`VERSION_CATALOGO_CAMPOS`), las reglas (no inventar datos, certificados, SLA ni plazos; los montos y condiciones económicas los pone OPAI), la sintaxis real (`{{clave}}`, `{{clave | formato}}`, `{{#cada instalaciones}}`, `{{#si clave}}`, sin `#cada` anidado), la tabla de marcadores con tipo, formatos válidos, alias y ejemplo ficticio, un ejemplo de repetición que se valida y se renderiza con los ejemplos del catálogo, y la lista de claves de la finalidad sin valores todavía (para que no se usen).
- **De dónde sale cada clave.** De `clasificarCampos("propuesta", ctx.autorizar)`: solo lo que la finalidad «propuesta» declara y lo que quien consulta puede leer. No hay lista escrita a mano; un test comprueba que toda clave citada existe en el catálogo y es de la finalidad.
- **Qué no promete.** No promete archivos Figma, PPT ni PDF ni importación de HTML. El destino es Claude Design u otra IA; no se usa ningún producto de Google.
- **Capacidad.** `cpq.propuestas_tecnica.prompt_exportable` (lectura, permiso `cpq:cotizaciones.read`, `dryRun: false` porque no escribe, paridad MCP). No devuelve datos de clientes ni de la empresa, por eso no lleva `auditarLectura`. El dryRun y la auditoría de escrituras no aplican a una lectura sin IDs revelados.
- **Pruebas.** Dominio (7) y base real (2).

## PR 9 — importación de HTML saneada y versionada por empresa

**Encargo (10-nov-2026, coordinador OPAI 2.0 por Carlos).** Una sola entrega, desde `main`. No entran el PR 7 ni el editor en pantalla. Migración: **sí, aditiva y propuesta** (`20261117100000_cpq_propuesta_html`; la aplica el bot «OPAI 2.0» con respaldo; el PR lleva `migracion-pendiente`).

**HTML de partida.** `docs/2.0/diseño/export-cpq/PropuestaCliente.dc.html` (export de Claude Design con tokens del DS v2). En esta sesión no hay un export más nuevo del mismo diseño.

**Qué hace el PR.**
- Saneador en código (`modules/cpq/domain/documento/sanear-html.ts`, con `parse5`): parsea, recorre contra una lista blanca y vuelve a serializar. Solo estructura y texto (`div`, `p`, `h1-h6`, listas, tablas, `a`, énfasis…); atributos `class`, `style` (propiedades y funciones CSS en lista blanca), `title`, `lang`, `href` (https, mailto, tel o `#`).
- Los marcadores `{{…}}` se validan con `validarPlantillaCampos(…, "propuesta")` contra el catálogo real (`packages/domain/src/campos/`); un marcador desconocido, no autorizado, mal formado o con formato inválido rechaza la importación. Los marcadores solo van en el texto, nunca en atributos.
- Capacidades: `cpq.propuestas_html.importar` (escritura, `dryRun`, permiso `cpq:biblioteca.manage`; el campo `html` no queda en la auditoría), `cpq.propuestas_html.list` y `cpq.propuestas_html.get` (lectura, `cpq:cotizaciones.read`). Paridad MCP.
- Tabla `cpq.propuesta_html` (RLS ENABLE+FORCE, `tenant_isolation`): una fila por versión, con HTML saneado, hash SHA-256, versión del catálogo, marcadores usados y advertencias. Inmutable salvo `estado` (trigger). Una sola versión activa por nombre y empresa; importar un HTML distinto crea la versión siguiente y archiva la anterior; importar el mismo HTML no crea otra.

**Qué se guarda.** Solo el HTML ya saneado (cuerpo, sin `<head>`, sin comentarios) y su metadato. Nunca el HTML original.

**Qué se rechaza (no se guarda nada; el informe lista todos los problemas).** `script`, `iframe`, `object`, `embed`, formularios, `svg`/`math`, `template` y cualquier elemento activo; `link`, `style`, `base`, `img`, `video`/`audio` y todo lo que cargue o declare un recurso; elementos propios o no permitidos (`x-*`, `sc-if`, `helmet`…); atributos `on*`; `href` que no sea https, mailto, tel o `#`; `style` con `url(`, `expression`, `@import` o funciones fuera de la lista blanca; marcadores `{{…}}` en atributos o fuera del catálogo; HTML de más de 400.000 bytes, 48 niveles o 15.000 nodos. Se quitan con aviso (no rechazan): atributos no permitidos (`id`, `data-*`…), propiedades CSS fuera de la lista (p. ej. `position`), `<title>` y `<meta>`.

**Reglas de forma que también rechazan.** (1) Los marcadores de bloque (`{{#cada …}}`, `{{#si …}}`) van dentro de una celda `<td>` o de un contenedor, nunca directo en `<table>`/`<tr>`: el parser HTML5 los reubicaría y la plantilla cambiaría de sentido (`marcador_movido`). (2) El HTML ya saneado no puede pasar de 400 000 bytes (`limite`). (3) Los enlaces son `https://host` sin usuario ni clave, `mailto:`, `tel:` o `#`. (4) El CSS en línea queda en una lista blanca de propiedades: se rechazan `url()`, `expression`, `@`, unidades `vw/vh`, márgenes negativos y `repeat()` con más de 24 repeticiones.

**El export real de Claude Design NO se puede importar tal cual.** `PropuestaCliente.dc.html` usa el formato de componentes de Claude Design (`x-dc`, `sc-if`, `sc-for`, `x-import`, `helmet`), carga `support.js`, `cpq-data.js` y hojas de estilo del DS por ruta, y enlaza datos con `{{ theme }}`, `{{ publica }}`, etc., que no son campos del catálogo. Un test lo prueba: el saneador lo rechaza con esos motivos. Para importar un diseño hay que pedir a Claude Design un HTML estático con los marcadores del prompt exportable (PR 8). No se inventó otro diseño ni se escribió un conversor.

**Qué sigue haciendo el PDF.** Lo mismo que hoy: `pdf-lib` arma el PDF desde los bloques, el capítulo por instalación y el envío congelado. **Ningún renderer lee `cpq.propuesta_html`**; el HTML importado no se convierte a PDF ni se usa en el envío. No se promete Figma, PPT ni PDF desde este HTML. Conectar una plantilla HTML a un renderer (navegador sin cabeza u otro) es una decisión de arquitectura aparte.

**Pruebas.** Dominio (31), base real (6): versionado, rechazo sin guardar, aislamiento entre empresas, inmutabilidad y permiso.

## Responsable y archivos del contrato transversal (autorizado por Carlos el 7-nov-2026 21:49)

Documentos (CAR-127) no tiene código ni PR abierto sobre campos (solo la rama de diseño `docs/diseno-documentos-v4`) y Núcleo no tiene un catálogo propio: **el contrato vigente es el integrado en #387**. No se crea un catálogo alterno ni se espera una elección técnica adicional. Regla para evitar solapes:

| Pieza | Responsable | Archivos |
|---|---|---|
| Catálogo, sintaxis, validador y render (contrato) | Comercial · Code (CAR-138); Documentos y CPQ lo consumen y proponen cambios por PR | `packages/domain/src/campos/**` |
| Autorización por finalidad y permiso, mapeo de maestros | Comercial · Code (PR 2) | `campos/autorizacion.ts`, `campos/mapeo-maestros.ts` |
| Capacidades `core.campos.catalogo` y `core.campos.valores` | Comercial · Code (PR 2); Núcleo revisa permisos y auditoría | `packages/capabilities/src/core/campos/**` |
| Fuentes aún sin resolvedor (empresa/marca, persona, negocio, cotización) | Se suman por entidad, cada una por quien es dueño del dato: marca = Núcleo, persona = Personas (solo contrato), negocio = CRM, cotización = CPQ | un archivo por entidad en `core/campos/` o en el módulo dueño |

Un campo nuevo o un cambio de clave sube `VERSION_CATALOGO_CAMPOS` y mantiene el alias antiguo. Documentos v4 debe consumir `core.campos.valores`; no leer cuentas, contactos ni instalaciones por su cuenta para llenar variables.
