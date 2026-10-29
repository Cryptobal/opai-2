# Control de acceso — Especificación funcional

**Estado:** **borrador**, pendiente de aprobación de Carlos (ADR-047) · **Fase:** 3 (Brief 16, Portales Cliente y Terreno) · **Insumos:** [`extraccion/control-acceso-y-firma.md`](../extraccion/control-acceso-y-firma.md) §A (primera extracción, 29-oct-2026), ADR-019, ADR-022, ADR-023, ADR-027, ADR-029 (puntos 6, 9 y 10), ADR-031, ADR-033, ADR-044, ADR-048, ADR-049, ADR-055, Brief 07d (Ley 21.719) · **Autor:** Claude · **Tarea:** CAR-73 (pedido de Carlos del 29-oct-2026, 08:18 CLT)

> Lenguaje de negocio, sin código (ADR-047). El diseño y el brief citan las reglas por número (R1, R2…) y los criterios por número (CA1…). 1.0 es el piso, no el techo: todo lo que hace `portal/acceso` de 1.0 está aquí (§11), corregido y mejorado. Lo que falta decidir va en §14, con recomendación.

## 1. Objetivo

Que el guardia de una instalación registre en segundos quién entra y sale (visitas, contratistas, proveedores, vehículos, despachos y personal), que nadie bloqueado entre aunque no haya señal, y que el cliente sepa en todo momento quién está en su recinto, todo con los datos personales mínimos y por el tiempo justo (Ley 21.719).

**Métricas:** tiempo medio de un registro de entrada (meta: menos de 20 s con QR de cédula); porcentaje de entradas con prerregistro; intentos de personas bloqueadas detenidos (meta: 100 %, también sin conexión); registros vencidos eliminados a tiempo (meta: 100 %).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| **Punto de acceso** | Una puerta, portería o acceso vehicular de una instalación. Una instalación tiene uno o varios | Instalación (núcleo) 1–N punto; dispositivos emparejados | Módulo `acceso` |
| **Configuración de acceso** | Reglas de una instalación: tipos de registro, modo de lista, qué se captura, permanencia máxima, retención, reportes | Tenant (valores por defecto), instalación (ajuste), plantilla de la vertical | Ajustes del núcleo (ADR-018/038), declarados por el módulo |
| **Tipo de registro** | Visita, contratista, proveedor, vehículo, despacho, personal y los que cree el tenant, cada uno con sus campos | Configuración | Módulo |
| **Registro de acceso** | El hecho de una entrada (y su salida): quién, qué documento, a qué va, con quién, por qué punto, quién lo registró, cuándo según el servidor y según el dispositivo | Punto, tipo, persona registrada, prerregistro, lista que coincidió, dispositivo, guardia de turno | Módulo (hecho inmutable) |
| **Persona registrada** | Quien entra y no es personal de la empresa: el visitante identificado por su documento. Se recuerda para acelerar la siguiente visita | Registros, listas, prerregistros | Módulo (titular de datos «visitante», Brief 07d) |
| **Lista** | Autorizada (blanca) o bloqueada (negra), con alcance: empresa, cuenta cliente, instalación o grupo de instalaciones | Personas registradas o patentes; tipos de registro | Módulo |
| **Entrada de lista** | Una persona o patente en una lista, con vigencia, días y horario, uso único, motivo (obligatorio en la bloqueada) y quién la agregó | Lista | Módulo |
| **Grupo** | Conjunto de instalaciones que comparten listas (por ejemplo, todas las sucursales de un cliente) | Instalaciones, listas | Módulo |
| **Prerregistro** | Aviso anticipado de una visita, de uno o varios días, con su invitación (código QR de un solo uso por día) | Instalación, anfitrión, cuenta cliente, registro que lo usó | Módulo |
| **Intento denegado** | El hecho de que alguien no pudo entrar y por qué (bloqueado, fuera de lista, fuera de horario, documento inválido) | Punto, lista, dispositivo | Módulo (hecho inmutable) |
| **Dispositivo emparejado** | Celular o tablet de la portería, con su guardia de turno identificado | Instalación, punto (ADR-029.10) | Núcleo (Brief 16) |

Relaciones: cuenta 1–N instalación 1–N punto de acceso 1–N registro; persona registrada 1–N registro; lista 1–N entrada de lista; prerregistro 0–1 registro por día.

## 3. Pantallas y pestañas

| Pantalla | Portal | Patrón | Entrada |
|---|---|---|---|
| **Portería (inicio)**: en sitio, esperados hoy, «Registrar entrada» y «Registrar salida» | Terreno (dispositivo emparejado) y Supervisor | Tarea única (Terreno), tablero corto | Pantalla principal del dispositivo de acceso. **Cambio propuesto a `NAVEGACION.md` §4** (pregunta P11): Terreno suma la tarea «Acceso» y Supervisor la entrada «Portería» en «Más» |
| **Registrar entrada**: escanear (QR de cédula, MRZ, patente) o escribir → resultado de listas → formulario del tipo → confirmar | Terreno | Formulario por pasos | Desde Portería |
| **Resultado bloqueado** | Terreno | Estado ilustrado a pantalla completa | Desde Registrar entrada |
| **Registrar salida**: buscar en «en sitio» o escanear | Terreno | Lista con búsqueda | Desde Portería |
| **En sitio y evacuación**: quién está dentro, desde cuándo, permanencia excedida; exportable sin conexión | Terreno, ERP, Cliente | Lista | Portería; pestaña de la instalación |
| **Accesos** (registros de todas las instalaciones a cargo, con filtros) | ERP | Lista (`SplitScreen` en iPad y escritorio) | Área **Operaciones** → «Accesos» (séptima y última entrada posible del área; cambio propuesto a `NAVEGACION.md` §2, pregunta P11) |
| **Ficha de instalación → pestaña «Accesos»**: un `Segmentado` dentro de la pestaña cambia entre Registros · En sitio · Esperados · Listas · Intentos denegados (ADR-041 no contempla pestañas anidadas) | ERP | Pestaña de módulo (ADR-041) | Pestaña de módulo en la ficha de instalación |
| **Listas** (empresa, cuenta, instalación, grupo): ver, agregar, importar con vista previa, exportar | ERP; Cliente (las de su cuenta, si el tenant lo permite) | Lista + hoja | Accesos → Listas; pestaña de la instalación |
| **Prerregistrar visita** (uno o varios días, varios visitantes, invitación por correo o WhatsApp) | Cliente, ERP | Hoja (pantalla completa en celular) | Portal Cliente → Instalaciones → Accesos; ERP desde la pestaña |
| **Configuración de acceso** | ERP | Formulario por ámbitos (ADR-018) | Configuración → Módulos → Control de acceso (tenant) y ámbito instalación; nunca una página de configuración propia del módulo |
| **Reportes de acceso** (destinatarios y frecuencia) | ERP, Cliente | Formulario | Configuración (ERP); Portal Cliente → Reportes |

**Celular:** todo lo de Terreno (es su lugar), prerregistrar, ver en sitio y aprobar. **iPad y escritorio:** listas, importaciones, configuración y reportes. La portería se diseña también para tablet horizontal fija en un mesón.

## 4. Campos y validaciones

### 4.1 Registro de acceso

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente o el trabajador |
|---|---|---|---|---|---|
| Tipo de registro | catálogo | sí | activo en la instalación | guardia | sí |
| Documento | tipo (RUN, pasaporte, otro) + número + país | sí, salvo vehículo sin conductor identificado y despacho si el tenant lo exime | RUN con dígito verificador; pasaporte con país | guardia (nunca se edita después: corrección = registro nuevo) | número enmascarado (R17) |
| Nombre y apellidos | texto | sí | 2–120 caracteres | guardia; de solo lectura si viene de lista o del QR | sí |
| Empresa | texto | según tipo (obligatorio en contratista y proveedor) | — | guardia | sí |
| Motivo y anfitrión | texto / contacto o persona | según tipo | anfitrión de la cuenta o del tenant | guardia | sí |
| Patente | texto | en vehículo | formato chileno o extranjero libre | guardia | sí |
| Foto | imagen | no (apagado por defecto, R16) | por `core.documentos` | guardia | no por defecto |
| Hora de entrada y de salida | fecha y hora | sí (salida al salir) | hora del servidor; la del dispositivo se guarda como dato (R20) | sistema | sí |
| Punto, dispositivo y guardia | referencias | sí | del dispositivo emparejado | sistema | punto sí; guardia por nombre |
| Coincidencia de lista | resultado | sí | calculado (R6–R10) | sistema | sí |
| Origen | en línea o diferido sin conexión | sí | — | sistema | sí |

### 4.2 Entrada de lista

Documento o patente (uno obligatorio), nombre, alcance, tipos de registro a los que aplica (vacío = todos), vigencia desde/hasta, días y horario permitidos, uso único, motivo (obligatorio en la lista bloqueada, visible solo para quien tenga permiso de gestionar listas) y autor. Una entrada bloqueada **vence a los 12 meses** salvo que se renueve (§14, P2).

### 4.3 Prerregistro

Instalación (y punto, opcional), visitantes (uno o varios: nombre, documento, empresa, patente), fecha o rango (hasta 30 días), horario esperado, anfitrión, motivo, nota para el guardia, «avisarme al llegar». Estados en §6.

## 5. Reglas de negocio

**Configuración**

- **R1.** Todo es configurable por tenant y, si el tenant lo permite, por instalación: tipos de registro y sus campos, modo de lista, qué se captura, permanencia máxima, retención y reportes. El tenant nace con la **plantilla de su vertical** copiada (seguridad, aseo, facility), que luego edita (ADR-021; principio P13 de `extraccion/comercial-y-cpq.md` §6: plantillas por vertical copiadas al tenant). Nada queda igual para todos.
- **R2.** Hay dos modos por tipo de registro: **«solo autorizados»** (entra quien está en la lista autorizada o tiene prerregistro vigente para ese día) y **«autorizados más registro manual»** (por defecto). La lista bloqueada se aplica siempre que esté activa para ese tipo, en cualquier modo.
- **R3.** El dispositivo de portería **registra**; no gestiona listas, ni configura, ni exporta, salvo la lista de evacuación (R26) (mejora sobre 1.0, extracción A.2-2). Eso se hace con un usuario con permiso.

**Identificación**

- **R4.** El orden de captura es: QR de la cédula chilena (se lee en el propio dispositivo, sin red y sin enviar la imagen), MRZ del documento, escritura manual. El OCR de MRZ y de patente, si el tenant lo activa, pasa por el adaptador de IA del núcleo con clase `economica` y se mide en `core.consumos` (ADR-031); nunca con la IA de otro tenant.
- **R5.** El RUN se valida con su dígito verificador. OPAI no afirma que una cédula esté vigente salvo que el tenant contrate un servicio de verificación (§14, P5); la pantalla dice «documento leído», no «documento válido».

**Listas**

- **R6.** El cruce con listas lo decide el **servidor** (o la caché del dispositivo sin conexión, R21) y aplica vigencia, días, horario y tipos. Una entrada fuera de su horario cuenta como «no autorizado» (extracción A.2-3).
- **R7.** Prioridad: **bloqueado gana a autorizado**, en cualquier alcance. Si alguien está bloqueado a nivel empresa y autorizado en la instalación, no entra.
- **R8.** Una entrada de uso único se consume al primer ingreso, también si el ingreso fue sin conexión (se consume al sincronizar y el segundo uso queda como intento denegado diferido).
- **R9.** Quien aparece bloqueado no entra: la pantalla muestra «Acceso no autorizado» y la acción «Avisar a mi supervisor». El guardia **no ve el motivo** salvo que tenga permiso de gestionar listas. Se registra el intento denegado y se emite el evento `acceso.intento_denegado` (§8).
- **R10.** En modo «solo autorizados», quien no está autorizado no entra. El supervisor o el anfitrión pueden autorizar **una excepción** desde su celular (una sola entrada, con motivo); queda en el registro quién la autorizó.
- **R11.** Las listas se importan desde Excel con **vista previa obligatoria** (cuántas se agregan, cambian o quitan y qué filas tienen errores). «Reemplazar la lista completa» y «vaciar la lista» son irreversibles: piden confirmación escribiendo el nombre de la lista y, para un agente, aprobación humana.
- **R12.** El tenant decide si cada cliente puede gestionar **su propia lista** (autorizada, bloqueada o ambas) para sus instalaciones. Lo que agrega el cliente solo aplica a sus instalaciones y lo ve el tenant.

**Prerregistro**

- **R13.** Pueden prerregistrar: los contactos de la cuenta con ese permiso en el Portal Cliente, los usuarios del tenant con alcance sobre la instalación y los agentes con una key con esos mismos permisos (ADR-033). Un visitante no se prerregistra a sí mismo.
- **R14.** Un prerregistro de varios días vale para cada día del rango en la zona horaria de la instalación (corrige A.2-7). La invitación lleva un **QR por día de un solo uso**; al escanearlo, el formulario llega lleno y el guardia solo confirma.
- **R15.** Si al final del día un prerregistro no se usó, queda «no llegó» de forma automática. Al llegar la visita, si se pidió, se avisa al anfitrión (silencio por defecto, ADR-020).

**Datos personales (Ley 21.719)**

- **R16.** **Minimización por defecto:** se guarda documento, nombre, empresa, motivo, anfitrión, patente y horas. La foto del visitante y la del documento vienen **apagadas**; el tenant las enciende por tipo de registro, con una justificación escrita que queda en el inventario de datos (RAT del Brief 07d) y con retención más corta. **No hay reconocimiento facial de visitantes** (dato biométrico, sensible).
- **R17.** El cliente, los reportes por correo y las exportaciones muestran el documento **enmascarado** (por ejemplo `12.3••.•••-K`). El documento completo solo lo ven quienes tienen el permiso `acceso:datos.ver_documento`, y cada vez que se revela queda en la auditoría de lecturas (NÚCLEO-H).
- **R18.** **Retención por defecto** (editable por el tenant dentro de los mínimos y máximos que fije la plataforma; §14, P2): registros de acceso **90 días**; intentos denegados **180 días**; persona registrada sin visitas en 90 días, se elimina; fotos, **30 días**; entradas de lista bloqueada, hasta su vencimiento. El trabajo diario de retención del Brief 07d anonimiza lo vencido; nadie lo borra a mano. Un registro bajo requerimiento de una autoridad (Ley 21.659) se puede **retener** con motivo y responsable hasta que se libere.
- **R19.** **Aviso al titular:** en cada punto de acceso hay un aviso de privacidad (cartel con QR a la política del responsable, generado por OPAI con la marca del tenant, ADR-028) y la pantalla de registro lo recuerda en una línea. La base de licitud por defecto es el **interés legítimo de seguridad del recinto** y, donde aplique y una vez confirmado en el reglamento D.209, la **obligación legal** de la Ley 21.659; **no se pide consentimiento** salvo para la foto, si el tenant la activa (§14, P1). Los derechos del visitante (acceso, rectificación, supresión, oposición, portabilidad y bloqueo) se atienden con las solicitudes del titular del Brief 07d, con el visitante como un tipo de titular más.

**Sin conexión (ADR-029.9, ADR-029.10, ADR-044)**

- **R20.** **Amplía ADR-044.3**, que limita el modo sin conexión a marcación, rondas y novedades: se propone sumar los accesos (pregunta P13). El dispositivo emparejado registra entradas **y salidas** sin red en una cola local cifrada, cada una con su clave de idempotencia y la hora del dispositivo. Al volver la red se sincronizan por las mismas capacidades; el servidor sella su hora de recepción y el registro queda marcado «diferido». La hora del dispositivo es un dato, nunca la verdad (requisito A.2-4). **Qué guarda la cola:** lo mínimo para enviar cada registro (tipo, documento, nombre, empresa, motivo, anfitrión, patente, horas y punto); va cifrada, cada registro se borra del dispositivo en cuanto el servidor confirma su recepción, y la cola entera se borra a distancia al revocar el dispositivo. Si un registro no se puede enviar en **72 horas**, el dispositivo avisa al supervisor y lo conserva hasta enviarlo o hasta la revocación.
- **R21.** El dispositivo guarda una **copia mínima de las listas de su instalación**: la huella del documento (no el número en claro), el tipo de lista, la vigencia y el horario. Con eso decide sin red: bloqueado no entra; en «solo autorizados» entra solo quien esté autorizado en la copia. La copia se renueva en cada conexión y, si tiene más de **24 horas** (ajustable), la portería muestra «Listas desactualizadas».
- **R22.** Al sincronizar, el servidor **vuelve a cruzar todo** con las listas vigentes. Si alguien entró sin red y estaba bloqueado en la lista actual, se genera la alerta `acceso.ingreso_bloqueado_diferido` al supervisor y al tenant.
- **R23.** La caché del navegador nunca guarda respuestas con datos personales; solo el armazón de la portería, la copia mínima de R21 y la copia de evacuación de R26, ambas cifradas en el dispositivo (extracción A.2-6).

**Operación**

- **R24.** Corregir un registro es un **hecho nuevo** que anula el anterior con motivo; no se edita ni se borra (ADR-023).
- **R25.** Quien sigue «en sitio» más allá de la permanencia máxima aparece destacado; a la hora de cierre configurada, los registros abiertos se pueden cerrar en bloque con motivo («salida no registrada»).
- **R26.** **Evacuación:** la lista «en sitio» de una instalación se abre y se exporta en el dispositivo aunque no haya red, con la última copia sincronizada. Junto con la cola pendiente de R20, es la única copia con nombres en el dispositivo: va **cifrada**, contiene solo a quienes están en sitio ese día (nombre, empresa, tipo y hora; documento enmascarado), se reemplaza en cada sincronización, **se borra al cierre del día** y se borra a distancia **al revocar el dispositivo** (ADR-029.10).
- **R27.** El reporte periódico (diario, semanal o mensual, por instalación) cuenta **todos** los registros del período (corrige A.2-9) y se envía por Comunicaciones con la marca del tenant, con documentos enmascarados.
- **R28.** El emparejamiento del dispositivo usa un código temporal de un solo uso (vence en 10 minutos), con límite de intentos, y el guardia de turno se identifica al tomar el equipo con su PIN o su prueba de vida (extracción A.2-10; mecanismo del Brief 16).

## 6. Estados y transiciones

**Registro de acceso**

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| — | En sitio | guardia, dispositivo, agente | listas permiten (R6–R10) | evento `acceso.entrada`; aviso al anfitrión si se pidió | No (se anula con un hecho nuevo) |
| En sitio | Salió | guardia, dispositivo, agente | — | evento `acceso.salida` | No |
| En sitio | Cerrado sin salida | supervisor, sistema (cierre) | hora de cierre o permanencia vencida | motivo obligatorio | No |
| Cualquiera | Anulado | supervisor, admin | motivo | se conserva el original | No |

**Prerregistro:** Pendiente → Ingresó (al usarse) · Pendiente → No llegó (al cierre del día, automático) · Pendiente → Cancelado (quien lo creó o un admin). En los de varios días, el estado es por día.

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Terreno (dispositivo) | Agente |
|---|---|---|---|---|---|---|---|---|
| Registrar entrada y salida | sí | sí | sí | sí (alcance) | no | no | sí (su instalación) | `acceso:registros.create` |
| Ver registros y en sitio | sí | sí | sí | alcance | sí | su cuenta | su instalación, solo el día | `acceso:registros.read` |
| Ver documento completo | sí | sí | según rol | no por defecto | no | no | no | **no** (fuera del MCP, §9); en pantalla, `acceso:datos.ver_documento` y auditado |
| Gestionar listas | sí | sí | sí | según rol | no | su lista, si R12 | no | `acceso:listas.manage`; bloquear, reemplazar o vaciar con aprobación humana |
| Autorizar excepción (R10) | sí | sí | sí | alcance | no | anfitrión, si el tenant lo permite | no | no (es humana) |
| Prerregistrar | sí | sí | sí | alcance | no | sí (su cuenta) | no | `acceso:prerregistros.create` |
| Configurar | sí | sí | no | no | no | no | no | `acceso:config.manage`, con aprobación humana |
| Exportar | sí | sí | según rol | no | no | sus registros, enmascarados | evacuación (R26) | `acceso:registros.export` |
| Puntos de acceso y grupos | sí | sí | no | no | no | no | no | `acceso:config.manage`, con aprobación humana |
| Cerrar en bloque (R25) | sí | sí | sí | alcance | no | no | sistema, a la hora de cierre | `acceso:registros.create`, con aprobación humana |

Alcance de filas (ADR-022): el supervisor ve las instalaciones a su cargo; el cliente, las de su cuenta; el dispositivo, su instalación y solo el día en curso. Se aplica en la consulta, nunca en la pantalla.

## 8. Eventos y notificaciones

| Evento | Cuándo ocurre | Quién se entera por defecto | Canal | Plantilla |
|---|---|---|---|---|
| `acceso.entrada` | Se registra una entrada | Nadie (silencio, ADR-020); el anfitrión si pidió aviso | correo, WhatsApp o push | «Llegó tu visita» |
| `acceso.salida` | Se registra una salida | Nadie | — | — |
| `acceso.intento_denegado` | Alguien bloqueado o no autorizado intenta entrar | Supervisor de la instalación | push | «Intento de acceso no autorizado» |
| `acceso.ingreso_bloqueado_diferido` | Al sincronizar aparece un ingreso de alguien bloqueado (R22) | Supervisor y admin | push y correo | «Revisa un ingreso sin conexión» |
| `acceso.permanencia_excedida` | Alguien supera la permanencia máxima | Nadie (activable) | push | «Visita sobre el tiempo» |
| `acceso.listas_desactualizadas` | El dispositivo lleva más de 24 h sin renovar listas | Supervisor | push | «Portería sin listas al día» |
| `acceso.reporte` | Según la frecuencia | Destinatarios configurados | correo | Reporte con marca del tenant |
| `acceso.prerregistro.invitacion` | Se crea un prerregistro con invitación | El visitante | correo o WhatsApp | Invitación con QR |

## 9. Herramientas MCP

Todas existen también en pantalla y en `/api/v1`, con los mismos permisos, alcance y auditoría (ADR-004, ADR-055). Toda escritura acepta `dryRun` (en MCP, `preview_…`) e `idempotencyKey`, y la real queda en la auditoría; lo hecho por un agente queda como «agente vía <usuario>». Toda tabla del módulo (puntos, registros, personas registradas, listas, prerregistros, intentos) lleva `tenant_id` con RLS y la política `tenant_isolation`. El agente interno (ADR-049) usa estas herramientas con la identidad y los permisos del usuario conectado.

| Herramienta | Qué hace | Tipo | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `acceso_registros_entrada` | Registra una entrada en un punto de acceso y devuelve el resultado de listas | escritura | sí | no |
| `acceso_registros_salida` | Registra la salida de quien está en sitio | escritura | sí | no |
| `acceso_registros_anular` | Anula un registro con motivo (hecho nuevo) | escritura | sí | sí |
| `acceso_en_sitio` | Quién está dentro de una instalación ahora | lectura | — | — |
| `acceso_registros_list` | Registros por instalación, fecha, tipo o empresa (documento enmascarado) | lectura | — | — |
| `acceso_registros_exportar` | Exporta registros de un período a un archivo en `core.documentos` (documento enmascarado) | escritura | sí | no |
| `acceso_registros_cerrar_bloque` | Cierra con motivo los registros abiertos de una instalación (R25) | escritura | sí | **sí** |
| `acceso_listas_verificar` | Dice si una persona o patente está autorizada, bloqueada o sin lista en una instalación y hora; no revela el motivo sin permiso | lectura | — | — |
| `acceso_listas_list` | Entradas de una lista | lectura | — | — |
| `acceso_listas_agregar` | Agrega a una lista autorizada | escritura | sí | no |
| `acceso_listas_bloquear` | Agrega a una lista bloqueada, con motivo | escritura | sí | **sí** (afecta a una persona) |
| `acceso_listas_quitar` | Quita una entrada | escritura | sí | sí, si es bloqueada |
| `acceso_listas_importar` | Importa un Excel o CSV (agregar o reemplazar) | escritura | **obligatoria** | **sí** si reemplaza o si agrega filas a una lista bloqueada (la aprobación depende del efecto de las filas, como en `acceso_listas_bloquear`) |
| `acceso_listas_vaciar` | Vacía una lista | irreversible | sí | **sí** |
| `acceso_prerregistros_create` | Prerregistra una o varias visitas y envía la invitación | escritura | sí | no |
| `acceso_prerregistros_cancelar` | Cancela un prerregistro | escritura | sí | no |
| `acceso_prerregistros_list` | Esperados por instalación y día | lectura | — | — |
| `acceso_intentos_list` | Intentos denegados | lectura | — | — |
| `acceso_config_get` / `acceso_config_set` | Lee o cambia la configuración del tenant o de una instalación | lectura / escritura | sí | sí al cambiar |
| `acceso_reportes_probar` | Envía un reporte de prueba a los destinatarios | escritura | sí | no |
| `acceso_puntos_list` / `acceso_puntos_set` | Lee o crea y cambia los puntos de acceso de una instalación | lectura / escritura | sí | sí al cambiar |
| `acceso_grupos_list` / `acceso_grupos_set` | Lee o arma los grupos de instalaciones que comparten listas | lectura / escritura | sí | sí al cambiar |

**Portales (ADR-033):** con una key de cliente solo aparecen las herramientas del portal Cliente, con el alcance de su cuenta: `acceso_en_sitio`, `acceso_registros_list`, `acceso_prerregistros_*`, `acceso_listas_verificar` y, si el tenant lo permite (R12), las de listas sobre su propia lista. El resto es del portal ERP; registrar entradas y salidas, también del dispositivo de Terreno.

**Fuera del MCP, con motivo** (`paridad-excepciones.ts`): autorizar una excepción en la puerta (R10), porque es una decisión humana en el momento, y revelar el documento completo a un agente, que nunca lo recibe en claro.

**Flujos típicos de un agente** (para `docs/2.0/agentes/`): (1) el agente del cliente prerregistra las visitas de mañana desde un correo del anfitrión: `acceso_prerregistros_create` con `preview_` → confirma → crea; el texto del correo es dato externo, nunca instrucción; (2) el agente interno responde «¿quién está en Bodega Norte?»: `acceso_en_sitio`; (3) el agente de operaciones revisa los intentos denegados de la noche y propone bloqueos: `acceso_intentos_list` → `preview_acceso_listas_bloquear` → se detiene en la aprobación humana.

## 10. Integraciones

- **IA (OCR de MRZ y patente):** adaptador del núcleo, clase `economica`, medido en `core.consumos` (ADR-031, ADR-027). Si el tenant tiene key propia, se usa esa; si su proveedor falla, el OCR falla y **nunca** cae a la key de OPAI (ADR-049, decisión del 26-oct 21:58); sin key propia, el modelo de OPAI como en el resto del núcleo, cobrado como consumo. Sin OCR, la portería sigue con el QR o la escritura manual.
- **Mensajería (invitaciones y avisos):** Comunicaciones del núcleo (correo; WhatsApp y push medidos).
- **Verificación de documento** (opcional, §14, P5): servicio de un proveedor contratado por el tenant (ADR-027), medido.
- **Barreras, torniquetes y lectores** (fase posterior): webhooks salientes por `acceso.entrada` (ADR-029.3), sin integraciones a medida en el módulo.

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Requisitos de seguridad de la extracción (A.2-1, A.2-2) | Toda acción por capacidad con permiso y alcance; el dispositivo solo registra (R3) | Seguridad |
| Reglas de lista al decidir (A.2-3) | Se aplican en el servidor y sin conexión (R6, R21) | Seguridad |
| Validación al sincronizar (A.2-4) | Revalida todo, hora del servidor, alerta de ingreso bloqueado diferido (R20–R22) | Seguridad |
| Salidas sin conexión no se guardan | Entradas y salidas en la cola (R20) | A.2-5 |
| Caché del navegador (A.2-6) | Solo el armazón, una copia mínima con huellas y la copia cifrada de evacuación (R21, R23, R26) | Ley 21.719 |
| Prerregistro de varios días mal calculado, sin «no llegó» | Por día, en la zona de la instalación, con QR por día y cierre automático (R14, R15) | A.2-7 |
| Sin retención, sin aviso, sin derechos | Retención por defecto, aviso en el punto, solicitudes del titular (R16–R19) | Ley 21.719 (rige el 1-dic-2026) |
| Foto opcional sin almacenamiento real | Apagada por defecto; si se activa, por `core.documentos` con retención corta (R16) | Minimización, ADR-019 |
| RUT completo en reportes | Enmascarado; el completo solo con permiso y auditado (R17) | Minimización |
| Sin MCP | 25 herramientas con permisos y aprobación (§9) | ADR-055 |
| Sin aviso al anfitrión | Aviso opcional al llegar (R15) | Benchmark (Envoy, Eptura) |
| Sin lista de evacuación | En sitio exportable sin conexión (R26) | Benchmark (Envoy) |
| Emparejamiento del dispositivo (A.2-10) | Código temporal de un solo uso con límite de intentos (R28) | Seguridad |
| «Visitantes conocidos» guardan foto y conteo sin límite | Persona registrada con lo mínimo y vencimiento a 90 días sin visitas (R18) | Minimización |

**No se porta:** la validación de cédula que siempre respondía «no verificado» (se reemplaza por el texto honesto de R5); el formulario de nómina en dos versiones (se migra a tipos de registro con sus campos); la tabla antigua de dispositivos.

## 12. Casos borde

- El mismo visitante entra por dos puntos sin haber salido: se ofrece cerrar la entrada anterior.
- Dos dispositivos sin red registran la misma salida: la idempotencia y el sello del servidor dejan una sola.
- Un visitante bloqueado en la empresa y autorizado por el cliente: no entra (R7) y el cliente ve «bloqueado por el proveedor de seguridad», sin el motivo.
- Prerregistro que cruza la medianoche o un cambio de horario: se calcula en la zona de la instalación.
- Extranjero sin RUN: pasaporte con país; el QR y la MRZ se leen igual.
- Menor de edad: el tenant puede exigir el adulto responsable como campo del tipo «visita»; nunca se activa la foto por defecto.
- Solicitud de supresión de un visitante con un registro retenido por requerimiento de autoridad (R18): se bloquea el dato y se responde con la causa legal.
- Dispositivo sin red más de 24 h: sigue registrando y avisa «Listas desactualizadas»; el supervisor recibe `acceso.listas_desactualizadas`.
- Importación con RUN inválidos o duplicados: la vista previa los muestra fila por fila y no se importan.

## 13. Criterios de aceptación

- **CA1.** En un dispositivo emparejado, una visita con cédula se registra leyendo el QR en menos de 20 s, sin escribir el RUN.
- **CA2.** Con el dispositivo sin red, una persona bloqueada no entra, y una autorizada sí; al volver la red, ambos hechos aparecen con origen «diferido» y la hora del servidor.
- **CA3.** Si se bloquea a alguien mientras un dispositivo está sin red y esa persona entra, al sincronizar el supervisor recibe la alerta de R22.
- **CA4.** Un supervisor solo ve los accesos de sus instalaciones, por pantalla, API y MCP; un contacto de cliente, solo los de su cuenta y con el documento enmascarado.
- **CA5.** El dispositivo de portería no puede importar, vaciar ni configurar listas (la capacidad responde sin permiso).
- **CA6.** Un prerregistro de tres días permite entrar cada día con su QR una sola vez, y el día sin uso queda «no llegó».
- **CA7.** Un registro de más de 90 días (o el plazo que fije el tenant) queda anonimizado por el trabajo diario y no aparece en exportaciones.
- **CA8.** Por MCP, `preview_acceso_listas_bloquear` muestra el efecto y la escritura real queda en la cola de aprobación humana.
- **CA9.** Cada punto de acceso tiene su cartel de privacidad generado con la marca del tenant.
- **CA10.** El reporte diario cuenta todos los registros del día aunque sean más de 200.

## 14. Preguntas abiertas para Carlos

Numeradas y cerradas, cada una con mi recomendación (13 preguntas).

- **P1. ¿Quién es el responsable de los datos de los visitantes?** El Brief 07d §4.1 fija que el **tenant es el responsable** y OPAI su encargado. Con los visitantes hay un matiz: el recinto es del cliente y es él quien decide quién entra. **Recomendación:** mantener el modelo del 07d dentro de OPAI (tenant responsable, OPAI encargado) y resolver el matiz en el **contrato de servicio con el cliente**, con una cláusula que diga para qué y por cuánto tiempo se tratan los datos de sus visitantes. Si prefieres que el cliente figure como responsable dentro de OPAI, eso es una **enmienda al 07d §4.1 y al DPA**, no algo que decida esta especificación. Base de licitud: interés legítimo de seguridad y, donde aplique, la obligación de la Ley 21.659; sin consentimiento salvo la foto. Confírmalo con tu asesor legal.
- **P2. ¿Retención por defecto?** **Recomendación:** registros 90 días, intentos denegados 180 días, fotos 30 días, persona registrada sin visitas 90 días, bloqueos con vencimiento a 12 meses renovable; el tenant ajusta entre 30 días y 2 años. Es corta a propósito: la Ley 21.719 premia guardar lo justo, y un requerimiento de autoridad se cubre con la retención por motivo de R18. **Por confirmar:** que el reglamento D.209 de la Ley 21.659 no fije un plazo mínimo de conservación mayor para las entidades obligadas; si lo fija, ese plazo pasa a ser el mínimo para esos tenants.
- **P3. ¿Foto del visitante y del documento?** **Recomendación:** apagadas por defecto y activables por tipo de registro con justificación (R16). Según los resultados del buscador (página no abierta, por confirmar), Envoy advierte que su propio escaneo de documento no cumple el RGPD (§15); no conviene que sea el camino por defecto.
- **P4. ¿Puede el cliente gestionar sus listas?** **Recomendación:** sí, si el tenant lo activa por cuenta (R12), con la lista bloqueada del tenant siempre por encima (R7).
- **P5. ¿Verificar la vigencia de la cédula con un servicio externo?** Hay proveedores que comparan con el Registro Civil, con costo por consulta. **Recomendación:** no en la primera versión; leer el QR en el dispositivo (sin costo y sin enviar la imagen) y decir «documento leído» (R5). Se agrega como integración opcional del tenant si un cliente lo pide.
- **P6. ¿Qué hace la portería sin red en modo «solo autorizados» con alguien que no está en la copia?** **Recomendación:** no entra, salvo excepción del supervisor por teléfono, registrada con motivo y validada al sincronizar (R10, R22). Antigüedad máxima de la copia: 24 h (aviso, no bloqueo).
- **P7. ¿Módulo propio o parte de los portales?** **Recomendación:** módulo vendible propio, **«Control de acceso» (`acceso`)**, que depende del Núcleo y del Portal Terreno (dispositivos), con Portal Cliente y Operaciones como fuentes opcionales (ADR-048). Así se puede vender a un cliente que solo quiere portería.
- **P8. ¿Qué se migra desde 1.0?** **Recomendación:** solo las listas vigentes, los grupos y los prerregistros futuros, con simulación previa (como CAR-25). El histórico de registros no se migra: se exporta una vez a un archivo del tenant y queda en 1.0 hasta que venza su retención, para no traer datos que ya no hacen falta.
- **P9. ¿Corregimos ya las brechas de seguridad de 1.0?** La revisión de 1.0 encontró brechas de seguridad vigentes en producción en el control de acceso; el detalle está fuera del repo. **Recomendación:** sí, como corrección crítica en 1.0 pedida por ti (`AGENTS.md` solo lo permite así), en una sesión aparte, antes de esperar a 2.0. Aquí no se toca 1.0.
- **P10. ¿Kiosco de autoservicio para que el visitante se registre solo?** **Recomendación:** no en la primera versión; la portería la opera el guardia (es el caso de Gard). El prerregistro con QR ya da la experiencia rápida. Kiosco queda en backlog.
- **P11. ¿Entrada en el menú?** **Recomendación:** «Accesos» como séptima entrada de Operaciones (llena el máximo de siete; la siguiente entrada obligará a dividir el área, `NAVEGACION.md` §1.2), pestaña «Accesos» en la ficha de instalación, la tarea «Acceso» en Terreno y «Portería» en «Más» del Supervisor; en el Portal Cliente, dentro de Instalaciones y Reportes. Son cambios a `NAVEGACION.md` que entran con tu aprobación.
- **P12. ¿Patentes de vehículos con lista propia?** **Recomendación:** sí: la entrada de lista acepta documento o patente (§4.2), porque, según una fuente secundaria ([IAPP](https://iapp.org/news/a/el-reglamento-de-seguridad-privada-de-la-ley-n-21-659-y-la-protecci-n-de-datos-personales-en-chile)) por confirmar en el reglamento D.209, las entidades obligadas de la Ley 21.659 deben entregar las patentes que ingresan si la fiscalía o las policías las piden.
- **P13. ¿Sumamos los accesos al modo sin conexión de ADR-044?** ADR-044.3 hoy lo limita a marcación, rondas y novedades. **Recomendación:** sí, con las reglas R20–R23, porque una portería sin señal es justamente el caso que más falla en 1.0 y el que menos resuelve el benchmark; queda como enmienda fechada a ADR-044.3.

## 15. Benchmark

Fuentes vistas el **29-oct-2026**. Las páginas de Envoy y de la BCN no se pudieron abrir desde el entorno de trabajo (dominios fuera de la red permitida); sus datos vienen de los resultados del buscador con su enlace y deben abrirse antes de citarlos hacia afuera. «No verificable» significa que no encontré una fuente pública.

| Función | Envoy Visitors | Eptura Visitor (ex Proxyclick) | Sign In Solutions (Traction Guest, SwipedOn) | Sine (Honeywell) | Greetly | OPAI 2.0 (propuesta) |
|---|---|---|---|---|---|---|
| Prerregistro por anfitrión | Sí, desde el calendario ([Envoy](https://envoy.com/visitor-management/updates-invite-visitors-from-your-calendar-and-more)) | Sí ([Eptura](https://knowledge.eptura.com/Proxyclick/Quick_Start/Visitor_Management_Overview)) | No verificable | No verificable | No verificable | Sí, por el cliente, con QR por día (R13–R15) |
| Lectura de documento | Sí, pero su ayuda dice que **no cumple el RGPD** ([Envoy ID scanning](https://help.envoy.com/id-scanning/)) | No verificable | No verificable | No verificable | Sí, en el plan de USD 159 ([Greetly](https://www.greetly.com/?p=4328)) | QR de cédula en el dispositivo, sin enviar la imagen (R4) |
| QR | Sí ([Envoy](https://help.envoy.com/en/articles/3444455-signing-in-with-qr-codes)) | No verificable | No verificable | No verificable | No verificable | Sí |
| Lista bloqueada | Sí, carga CSV y alertas, aprobación desde Slack o Teams ([blocklist](https://envoy.com/visitor-management/blocklist-workplace-security), [mar-2026](https://envoy.com/workplace-management/whats-new-at-envoy-march-2026-product-releases)) | Sí, internas y externas, reutilizables entre sedes ([Watchlists](https://knowledge.eptura.com/Proxyclick/Modules/Watchlists)) | Sí, cuatro niveles con ruta propia ([Sign In](https://help.signinsolutions.com/en/articles/10578095-how-to-use-the-watchlist-check-page)) | No verificable | Sí ([Greetly](https://www.greetly.com/?p=4328)) | Por empresa, cuenta, instalación y grupo; bloqueado gana (R6–R9) |
| Contratistas | No verificable | No verificable | No verificable | Sí: inducción en el teléfono, permisos y bloqueo si no cumple ([Sine](https://www.sine.co/wp-content/uploads/2026/04/Sine-VCM-overview.pdf)) | No verificable | Tipo de registro con campos; documentos del contratista por `core.documentos` (fase posterior) |
| Vehículos y patentes | No documentado | No documentado | No documentado | No documentado | No documentado | Sí, con lista y OCR (R4, P12) |
| Sin conexión | Registra en el iPad y sincroniza; un resumen de la misma ayuda dice lo contrario: **por confirmar** ([Envoy](https://help.envoy.com/my-ipad-wi-fi-network-is-disconnected/)) | Parcial: cola local, pide buena conexión ([Eptura](https://knowledge.eptura.com/Visitor/Onboarding_with_Proxyclick/Settings/Kiosk/Check_your_Kiosk_Status)) | Parcial: ruta «sin conexión» que **no consulta la lista** ([Sign In](https://help.signinsolutions.com/en/articles/10578095-how-to-use-the-watchlist-check-page)) | No verificable | No verificable | Completo, **con lista bloqueada sin red** y revalidación (R20–R22) |
| Firma de documento al ingresar | Sí (NDA en el iPad) ([Envoy](https://envoy.com/flex/nda/)) | No verificable | No verificable | No verificable | No verificable | Fase posterior, con la firma N1 de [`firma.md`](firma.md) |
| Emergencia y evacuación | Sí, con avisos y seguimiento ([Envoy](https://envoy.com/visitors)) | No verificable | No verificable | No verificable | No verificable | En sitio exportable sin red (R26) |
| Retención y borrado | Configurable; purga solo en planes altos ([compliance](https://envoy.com/legal/compliance), [privacidad](https://help.envoy.com/data-privacy-features/)) | **El más completo**: plazos separados para visitas y perfiles, borrado diario irreversible ([Eptura](https://knowledge.eptura.com/Visitor/Onboarding_with_Proxyclick/Settings/Privacy/Delete_visit_and_visitor_data)) | En todos los planes; SwipedOn anonimiza a N días ([Sign In](https://help.signinsolutions.com/en/articles/10578231-how-do-i-set-up-data-deletion-in-my-account), [SwipedOn](https://help.signinsolutions.com/swipedon-vms/en/articles/15181017-automatically-anonymize-visits)) | No verificable | No verificable | Por categoría, con anonimización diaria y retención por motivo legal (R18) |
| Modo guardia | Rol de seguridad con tablero del día ([Envoy](https://help.envoy.com/about-workplace-security/)) | Kiosco y bitácora web | App para el personal ([Traction Guest](https://help.signinsolutions.com/en/articles/10578190-how-do-i-use-the-traction-guest-mobile-app)) | No verificable | No verificable | **Es el modo principal**: portería operada por el guardia |
| API e integraciones | API y CSV; C•CURE, OpenPath ([Envoy](https://envoy.com/legal/compliance), [SecuritySales](https://www.securitysales.com/news/envoy-visitor-management-integrations/96552/)) | Genetec ([Genetec](https://www.genetec.com/partners/partner-integration-hub/proxyclick/proxyclick-visitor-management)) | No verificable | No verificable | No verificable | API, MCP y webhooks con permisos y aprobación (§9) |

**Precios** (USD; de terceros salvo Greetly; no verificados en las páginas oficiales): Envoy Visitors, Basic gratis hasta 100 visitas al mes, Standard USD 109 y Premium USD 362 por sede al mes, en plan anual ([frontdeskreview, sept-2026](https://frontdeskreview.com/software/visitor-management/envoy/)); Eptura, **no público** (los planes antiguos de Proxyclick eran USD 100 y 300 por sede al mes, [Software Advice](https://www.softwareadvice.com/visitor-management/proxyclick-profile/)); SwipedOn, desde USD 630 al año ([xpay](https://www.xpay.sh/agent-ready-index/swipedon/)); Sine, USD 69 a 209 por sitio al mes ([Capterra](https://www.capterra.com/p/144064/Honeywell-Forge-Visitor-Management/pricing/)); Greetly, USD 99 y 159 al mes ([Greetly](https://www.greetly.com/?p=4328)).

**En Chile** (residencial y conserjería; sin precios vigentes ni documentación de sin conexión, retención o API verificable): GBook ([App Store](https://apps.apple.com/us/app/gbook-control-de-visitas/id1037707875)), EdiPro con conserjería remota ([DF](https://www.df.cl/df-lab/innovacion-y-startups/conserjes-remotos-la-nueva-herramienta-de-edipro-para-el-sector)), PLT Conserjería ([24horas](https://www.24horas.cl/tendencias/ciencia-tecnologia/empresa-chilena-crea-sistema-que-busca-evitar-robos-y-visitas-no-deseadas-en-tu-departamento-3206958)) y ComunidadFeliz, que solo avisa a conserjería ([DPL News](https://dplnews.com/?p=112406)). Bipass, Accesa, Controlia y GuardPass: **no verificados**, no aparecieron en las búsquedas.

**Marco legal citado:** Ley 21.719 ([BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272)), vigente desde el 1-dic-2026; un proyecto (Boletín 18.623-07, [Senado](https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18623)) propone postergarla un año y no encontré que se haya aprobado: se diseña para 2026. Ley 21.659 de seguridad privada y su reglamento D.209 ([Diario Oficial](https://www.diariooficial.interior.gob.cl/publicaciones/2025/05/27/44158/01/2649270.pdf)): las entidades obligadas entregan a la fiscalía y a las policías, si lo piden, los datos y las patentes de quienes ingresan ([IAPP](https://iapp.org/news/a/el-reglamento-de-seguridad-privada-de-la-ley-n-21-659-y-la-protecci-n-de-datos-personales-en-chile)). No encontré en la Ley 21.442 de copropiedad una norma sobre registro de visitas: **no verificable**.

### Qué adoptamos, qué mejoramos y qué descartamos

- **Adoptamos:** prerregistro con invitación QR y aviso al anfitrión (Envoy, Eptura); retención con plazos separados por tipo de dato y borrado diario irreversible (Eptura); lista bloqueada por niveles reutilizable entre sedes (Eptura, Sign In); lista de evacuación (Envoy).
- **Mejoramos:** el modo sin conexión (los demás registran sin red pero no aplican la lista; OPAI aplica la lista bloqueada sin red y revalida al volver); patentes y vehículos (nadie lo documenta); la portería operada por el guardia como modo principal, no como accesorio del kiosco; el agente como operador con permisos y aprobación, no solo una API.
- **Descartamos:** el escaneo de la imagen del documento como camino por defecto (riesgo con la ley de datos; según el buscador, Envoy lo advierte de su propio escaneo, por confirmar); reconocimiento facial de visitantes; kiosco de autoservicio en la primera versión; integraciones a medida con controladores de puertas (van por webhooks).

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial (CAR-73) | Pendiente |
