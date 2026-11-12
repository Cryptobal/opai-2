# Referentes SaaS — la vara de OPAI 2.0

**Vigente desde:** 12-nov-2026 · **Decidió:** Carlos · **Adoptado por:** [ADR-106](01-decisiones.md) · **Mantiene:** Sesión Estándares (Linear «22 · Estándares y arquitectura», CAR-348)

Todo OPAI 2.0 (diseño, lógica, permisos, Núcleo y módulos) sigue el patrón de los mejores SaaS de cada capa y no reinventa la rueda. Este archivo dice, capa por capa, a quién se copia, qué patrón concreto se copia y cómo se comprueba que se cumple. Si un módulo ya construido se aparta sin motivo, se ajusta o se rehace.

Lo que **no** cambia con este documento: Hilo es el sistema visual oficial (ADR-102); las reglas duras del repositorio (`AGENTS.md`, `REGLAS-codigo.md`) siguen mandando; la normativa chilena (DT, SII, Ley 21.719) manda sobre cualquier referente.

## Cómo se usa

1. **Antes de diseñar o construir**, se lee la capa que toca y se parte del patrón del referente, no de una idea propia ni de OPAI 1.0.
2. **En el PR**, si toca arquitectura, permisos, modelo de datos o UX, la descripción lleva la línea «Referente seguido y en qué se aparta» (plantilla del PR y `AGENTS.md`).
3. **Apartarse está permitido** cuando hay una razón escrita: ley chilena, regla de negocio decidida por Carlos, agent-first (ADR-034) o costo desproporcionado. Sin razón escrita, es una brecha.
4. **La auditoría** (`docs/2.0/auditoria-estandares/`) compara cada capa contra esta vara con cuatro gravedades: crítica (riesgo de seguridad, datos o plata), alta (un cliente que viene de un SaaS serio lo nota o bloquea vender), media (fricción o deuda) y baja (pulido).
5. **Un referente se cambia** con una adenda al ADR-106, nunca en un PR de módulo.

Las «medidas» son comprobables: una prueba, un `grep`, un conteo o una pantalla. Si una medida no se puede comprobar, se reescribe.

## Resumen

| Capa | Referente principal | Apoyo | En una línea |
|---|---|---|---|
| Permisos y roles | GitHub | Google Workspace, Rippling | Roles por organización hechos de permisos finos; el alcance de datos es otra dimensión; todo queda en auditoría |
| Multi-tenant y organizaciones | Linear | Slack, Stripe | Una cuenta de persona, muchas organizaciones; datos de prueba separados de los reales |
| API y MCP | Stripe | — | Recursos predecibles, idempotencia, errores tipados, versión con fecha, paginación por cursor, eventos salientes |
| Comercial (CRM y CPQ) | HubSpot | Salesforce, Pipedrive | Objetos estándar con asociaciones, embudo con reglas por etapa, cotización con aprobación |
| Finanzas | Stripe Billing | Xero, QuickBooks | La factura es una máquina de estados; conciliar es calzar líneas del banco con reglas |
| Personas | Rippling | Deel, BambooHR | Un registro único de la persona del que cuelga todo; cambios con fecha de vigencia y aprobación |
| Operación en terreno | Connecteam | Deputy, ServiceTitan | Turno publicado y avisado; tablero del día; teléfono primero y sin conexión |
| UX y navegación | Linear | Notion | Teclado, paleta de comandos, lista más detalle, respuesta inmediata; con la piel Hilo |
| IA | Patrón propio de la casa | — | La IA propone, una persona aprueba en una cola, y queda registro |

## 1. Permisos y roles — GitHub · Google Workspace · Rippling

**Patrón que se copia**

- **Roles hechos de permisos finos.** Roles predefinidos más roles a medida por organización, cada uno una lista de permisos nombrados. Los permisos se suman; para quitar se usa una denegación explícita que siempre gana. ([GitHub: roles a medida de organización](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/permissions-of-custom-organization-roles))
- **Nadie concede más de lo que tiene**, y asignar roles es un permiso separado de crearlos.
- **Roles a equipos, no solo a personas.** Un grupo recibe el rol y sus miembros lo heredan.
- **Acción y alcance son dos dimensiones.** Qué puede hacer (ver, editar, aprobar) y sobre los datos de quién (su línea de reporte, un área, unas instalaciones). ([Rippling: perfiles de permiso](https://www.rippling.com/products/it/platform/permissions))
- **El permiso sigue al atributo.** Si cambia el cargo o el área de la persona, cambia su acceso sin tocarla a mano, y se muestra qué gana y qué pierde antes de guardar.
- **Acceso a campos sensibles por separado** (sueldo, RUT, cuenta bancaria): ver la ficha no es ver el sueldo.
- **Auditoría que se puede consultar y exportar**: quién, qué, cuándo, desde dónde, sobre qué.
- **Llaves de máquina con alcance mínimo y vencimiento**, a nombre de un responsable.

**Cómo se mide**

- Toda capacidad declara un permiso `<modulo>:<accion>` y el ejecutor lo verifica; ninguna pantalla decide acceso por su cuenta (ADR-022).
- Existe una prueba por rol base que fija qué puede y qué no (matriz), y falla si un permiso nuevo queda sin clasificar.
- Un rol a medida y una excepción no pueden conceder lo que su autor no tiene (prueba).
- El alcance por filas se aplica en la consulta y tiene prueba con un segundo actor fuera de alcance.
- Hay una pantalla y una capacidad de «permisos efectivos» que explica por qué alguien puede o no puede algo.
- La auditoría responde «qué hizo esta persona» y «quién tocó este registro» desde pantalla, API y MCP, y se exporta.
- Las llaves de agente no usan `*` en producción y tienen vencimiento.

## 2. Multi-tenant y organizaciones — Linear · Slack · Stripe

**Patrón que se copia**

- **Una identidad, muchas organizaciones.** La persona entra una vez y cambia de empresa con un selector; cada empresa tiene su rol, su configuración y su dirección propia.
- **Invitación por correo con rol**, que se puede revocar y reenviar; quitar a alguien corta sus sesiones y llaves en esa organización.
- **Invitados y clientes son un tipo de miembro acotado**, no un sistema aparte (canales compartidos de Slack; invitados de Linear).
- **Datos de prueba separados de los reales** dentro de la misma cuenta, con llaves distintas (modo de prueba y sandboxes de Stripe).
- **Aislamiento que no depende del programador**: una consulta sin organización no devuelve nada.
- **Exportar y eliminar la organización** es una función del producto, con plazo de gracia.
- **Módulos y planes por organización**: activar o apagar no rompe a los demás.

**Cómo se mide**

- RLS con `FORCE` y política `tenant_isolation` en toda tabla con `tenant_id` (ya lo exige CI).
- Toda capacidad nueva trae prueba con un segundo tenant.
- Existe un tenant de prueba por empresa o una marca de modo prueba, y ningún agente de desarrollo opera sobre datos reales (ADR-051).
- Dar de baja a un miembro revoca sesiones, llaves y apps conectadas en la misma transacción (prueba).
- Exportación completa de una empresa y cierre con retención definidos y probados.

## 3. API y MCP — Stripe

**Patrón que se copia**

- **Recursos predecibles**: mismo nombre de objeto, mismos verbos y misma forma de respuesta en toda la API; cada objeto trae su `id` y su tipo.
- **Idempotencia**: toda escritura acepta una clave; repetirla devuelve el resultado guardado; la misma clave con otros parámetros es un error. ([Stripe: solicitudes idempotentes](https://docs.stripe.com/api/idempotent_requests))
- **Errores tipados**: tipo, código estable, mensaje para personas, el parámetro que falló y un identificador de la solicitud para soporte.
- **Versión con fecha**: los cambios compatibles no cambian la versión; los incompatibles salen en una versión nueva y el cliente elige cuándo subir. ([Stripe: versiones](https://docs.stripe.com/api/versioning))
- **Paginación por cursor** en todas las listas, con «hay más» y un tope de tamaño. ([Stripe: paginación](https://docs.stripe.com/api/pagination))
- **Eventos salientes (webhooks)** firmados, con reintentos y un registro de entregas que el cliente puede ver.
- **Llaves restringidas** por recurso y por lectura o escritura.
- **Referencia pública generada del mismo contrato** que valida las solicitudes.

En el MCP se aplica lo mismo: nombres de herramienta estables, descripción en lenguaje de negocio, `preview_` para toda escritura y los mismos códigos de error.

**Cómo se mide**

- Todas las capacidades `*.list` paginan con cursor y devuelven la misma forma (`items`, `siguienteCursor`); una prueba de registro lo exige.
- Todo error de `/api/v1` y del MCP trae código estable y referencia de correlación; ningún caso de negocio termina en `INTERNAL`.
- La clave de idempotencia se acepta también en la cabecera `Idempotency-Key`.
- Existe una política escrita de versión y de cambios incompatibles, y la instantánea de herramientas MCP falla ante un cambio no declarado (ya existe).
- La referencia de la API se genera desde los esquemas Zod y se publica.
- Un cliente puede suscribirse a eventos de su empresa y ver las entregas.

## 4. Comercial (CRM y CPQ) — HubSpot · Salesforce · Pipedrive

**Patrón que se copia**

- **Objetos estándar con asociaciones**: empresa, contacto, negocio, cotización y actividad, relacionados muchos a muchos, con una línea de tiempo única por registro.
- **Embudos configurables**: varias etapas con probabilidad, propiedades obligatorias al entrar a una etapa, y reglas que impiden saltarse etapas o editar en ciertas etapas. ([HubSpot: reglas de embudo](https://knowledge.hubspot.com/object-settings/set-up-pipeline-rules))
- **Vista de tablero por etapa** para mover negocios arrastrando, con la suma por columna (Pipedrive).
- **Propiedades a medida** por objeto, sin tocar código.
- **Captura automática de la actividad**: correos, reuniones y llamadas entran solos a la línea de tiempo.
- **Cotización con líneas, descuentos y aprobación**: pasa por un flujo de aprobación cuando supera un umbral, se envía con un enlace que el cliente acepta o rechaza, y tiene versiones (Salesforce CPQ).
- **Pronóstico**: monto ponderado por etapa y fecha de cierre.
- **Motivo de pérdida** como dato obligatorio y reportable.
- **Importación con mapeo de columnas, vista previa, detección de duplicados y reversión.**

**Cómo se mide**

- Etapas, probabilidades y campos obligatorios por etapa son configuración de la empresa, no código.
- El mismo contacto puede estar en más de una cuenta y un negocio tener varios contactos con rol.
- La ficha de cuenta, contacto y negocio comparte una sola línea de tiempo.
- La cotización tiene versiones, estados y una aprobación interna por umbral.
- El tablero de negocios y el informe de pronóstico salen de las mismas capacidades que el MCP.
- El importador muestra vista previa, duplicados y permite revertir el lote.

## 5. Finanzas (facturación, cobro, caja) — Stripe Billing · Xero · QuickBooks

**Patrón que se copia**

- **La factura es una máquina de estados** con pocas transiciones permitidas: borrador, emitida, pagada, anulada e incobrable. Un borrador se edita; una emitida no, se corrige con otro documento. ([Stripe: cómo funciona la facturación](https://docs.stripe.com/invoicing/overview))
- **Facturación recurrente** que genera el borrador en la fecha, con un plazo para revisarlo antes de emitir.
- **Cobranza escalonada automática**: recordatorios por tramo de atraso, con plantillas y pausa por cliente.
- **Conciliación por calce** (Xero): cada línea del banco se calza con un documento, se crea una transacción o se marca traspaso; las reglas aprenden y proponen; nada se concilia solo sin poder deshacerse.
- **Partida doble por debajo**: cada documento genera su asiento; los informes salen de los asientos.
- **Cierre de período con candado**: un mes cerrado no se toca sin reabrirlo con permiso y registro.
- **Plata en enteros** y moneda explícita en cada monto.
- **Rastro completo** de quién emitió, anuló o concilió.

En Chile, el SII y el DTE mandan sobre el referente: la nota de crédito reemplaza a «anular», y los estados del SII se suman a los del documento.

**Cómo se mide**

- Cada documento de venta y de compra tiene sus estados y transiciones declarados y probados; no hay transición por fuera.
- Toda conciliación automática es reversible y deja la regla que la produjo.
- El flujo de caja se arma con los mismos documentos y movimientos, sin doble digitación.
- Existe candado de período y prueba de que una escritura en un mes cerrado falla.
- Ningún monto usa decimales flotantes (ya es regla).
- Los recordatorios de cobro se configuran por tramos y se pueden pausar por cliente.

## 6. Personas — Rippling · Deel · BambooHR

**Patrón que se copia**

- **Un registro único de la persona** del que cuelgan contrato, cargo, sueldo, documentos, asistencia y acceso. El usuario del sistema es una faceta de esa persona, no otra entidad.
- **Cambios con fecha de vigencia**: cargo, sueldo, jefatura y lugar de trabajo guardan historia y se pueden programar a futuro.
- **Ingreso y salida como procesos**: una lista de pasos con responsable (documentos, firma, accesos, equipo) que se dispara sola.
- **Autoservicio**: la persona ve y pide cambios de sus propios datos; un tercero aprueba.
- **Documentos con plantilla y firma** desde la ficha, con vencimientos y alertas (Deel, BambooHR).
- **Organigrama y jefatura** como dato del que dependen aprobaciones y alcance.
- **Campos sensibles con permiso propio** y lectura auditada.
- **Informes sobre atributos**: dotación, rotación, vencimientos.

**Cómo se mide**

- Usuario interno, guardia y administrativo son la misma entidad Persona con distinto contrato o cargo.
- Cargo, sueldo y jefatura tienen `vigente desde` y se consulta el estado a una fecha.
- El ingreso y la salida tienen lista de pasos configurable por empresa y vertical.
- Toda edición de datos de pago o personales pasa por solicitud y aprobación de otra persona.
- Las lecturas de datos sensibles quedan auditadas (NÚCLEO-H).
- Dar de baja a una persona corta su acceso el mismo día.

## 7. Operación en terreno — Connecteam · Deputy · ServiceTitan

**Patrón que se copia**

- **Turnos por plantilla y publicación**: se arma la pauta con patrones, se publica y cada trabajador recibe aviso; los cambios posteriores también avisan (Deputy).
- **Turnos abiertos y reemplazos**: un turno sin persona se ofrece a quienes cumplen requisitos; el intercambio pasa por aprobación.
- **Reglas laborales dentro del armado**: el sistema avisa de exceso de horas, descansos y costo antes de publicar.
- **Marcación con geocerca desde el teléfono o un kiosco**, y planilla de horas que sale de las marcas con aprobación de la jefatura (Connecteam).
- **Tablero del día**: quién debía estar, quién está, qué falta y qué va tarde, con alertas por umbral. ([ServiceTitan: tablero de despacho](https://help.servicetitan.com/docs/dispatch-and-track-your-technicians))
- **Formularios y listas de control desde el teléfono**, con foto, firma y ubicación.
- **Teléfono primero y sin conexión**: lo que se registra sin señal se envía al volver.
- **El cliente ve lo suyo** en un portal: visitas, informes, incidentes.

En Chile, la marcación y la jornada siguen la normativa de la Dirección del Trabajo (ADR-023): manda sobre el referente.

**Cómo se mide**

- La pauta tiene estado borrador o publicada y publicar avisa a las personas afectadas.
- Un puesto sin persona aparece como turno por cubrir y se puede ofrecer.
- El armado avisa de infracciones de jornada antes de publicar.
- El tablero del día sale de marcas y pauta en vivo, con alertas configurables.
- Toda pantalla de terreno funciona a 375 px, con objetivos táctiles de 44 px y cola sin conexión probada.
- Las rondas y la bitácora aceptan foto, firma y ubicación.

## 8. UX y navegación — Linear · Notion, con el sistema visual Hilo

Hilo decide cómo se ve. Linear y Notion deciden cómo se comporta.

**Patrón que se copia**

- **Paleta de comandos (⌘K)** que busca todo y ejecuta acciones; cada acción frecuente tiene atajo.
- **Lista más detalle**: al tocar una fila el contenido se abre al lado, sin perder la lista; la dirección de la página guarda filtro y selección.
- **Respuesta inmediata**: la pantalla cambia al instante y se confirma después; si falla, se deshace con aviso.
- **Vistas guardadas y filtros** compartibles, con agrupar y ordenar.
- **Un solo lugar para cada cosa**: la acción principal siempre en el mismo sitio; una sola configuración central, no una por módulo.
- **Bandeja de entrada** de lo que necesita a la persona, no un tablero de adornos.
- **Estados vacíos que enseñan** y carga con la forma del contenido.
- **Deshacer** en lugar de pedir confirmación, salvo en lo irreversible.
- **Bloques y menciones** (Notion): notas con formato, mención de personas y registros, comentarios en contexto.

**Cómo se mide**

- Toda acción de pantalla tiene comando en la paleta o está en una lista de excepciones.
- Toda lista usa el mismo patrón (`ListScreen`) con filtros en la dirección de la página.
- El botón de crear está en el mismo lugar en todas las listas (regla de Carlos del 12-nov).
- Navegar entre pantallas no supera 8 consultas ni el presupuesto de JS (ADR-037, ADR-045).
- `preview-e2e` cubre cada pantalla a 375, 1024 y 1280 px (ADR-092).
- Contraste AA, foco visible y teclado en todo control (ya es regla del DS).

## 9. IA — la IA propone y una persona aprueba

No hay un único producto de referencia; se adopta el patrón que comparten los productos serios con agentes.

**Patrón que se copia**

- **Proponer no es ejecutar**: toda escritura de un agente tiene vista previa; lo irreversible, lo que mueve plata y lo que sale hacia un tercero espera aprobación.
- **Una sola cola de aprobaciones** para toda la empresa, donde la persona ve qué se hará, por qué, con qué datos y lo aprueba, lo edita o lo rechaza.
- **Niveles de autonomía por capacidad**, que la empresa puede subir o bajar.
- **Identidad propia del agente**, con permisos mínimos, presupuesto y vencimiento; nunca la cuenta de una persona.
- **Registro completo**: qué propuso, quién aprobó, qué se ejecutó y cuánto costó.
- **El texto de terceros es un dato**, nunca una orden.
- **Lo que la persona puede hacer en pantalla, el agente lo puede hacer por herramienta** (paridad).

**Cómo se mide**

- Toda capacidad de escritura declara su efecto y soporta `dryRun`; las irreversibles responden `APPROVAL_REQUIRED` a un agente.
- La cola de aprobaciones existe en pantalla, API y MCP, y cada aprobación queda en la auditoría con quién y cuándo.
- El gate de paridad UI ↔ MCP está en verde.
- Cada llave de agente tiene presupuesto y alcance explícito.
- Los campos externos están marcados y hay prueba de que no habilitan escrituras.

## Fuentes

Enlaces oficiales revisados el 12-nov-2026: los que aparecen en cada capa (GitHub, Rippling, Stripe, HubSpot y ServiceTitan). Los patrones de Google Workspace, Linear, Slack, Salesforce, Pipedrive, Xero, QuickBooks, Deel, BambooHR, Connecteam, Deputy y Notion se describen desde el conocimiento del producto, sin enlace verificado en esta revisión; se agregan al repasar cada capa en la auditoría.
