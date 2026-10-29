# Firma electrónica — Especificación funcional

**Estado:** **borrador**, pendiente de aprobación de Carlos (ADR-047) · **Fase:** 2 (niveles 1 y 2, con Documentos, Brief 09) y posterior (nivel 3, Brief 28) · **Insumos:** [`extraccion/control-acceso-y-firma.md`](../extraccion/control-acceso-y-firma.md) §B, ADR-019 (firma en tres niveles), ADR-023 (hechos regulados), ADR-027, ADR-031, ADR-039, ADR-044 (punto 5), ADR-049 (puntos 4 y 9), ADR-055, Brief 07b (anexo de contrato), Brief 07d · **Autor:** Claude · **Tarea:** CAR-73 (pedido de Carlos del 29-oct-2026, 08:18 CLT)

> Lenguaje de negocio, sin código (ADR-047). La firma es una capacidad del servicio `core.documentos` y del módulo **Documentos** (ADR-019): ningún módulo firma por su cuenta; CPQ, Nómina, Operaciones y Control de acceso piden firmas a través de él. No es una sección de un `documentos.md` porque esa especificación todavía no existe; cuando exista, la citará.

## 1. Objetivo

Que cada documento que la empresa necesita firmar (contratos, anexos, propuestas, actas, recepciones) se firme desde el celular en minutos, con el nivel de firma que su valor legal exige, con evidencia que se sostenga ante la Dirección del Trabajo o un juez, y sin que nadie pueda cambiar un documento después de firmado.

**Métricas:** tiempo desde el envío hasta la última firma (meta: mediana < 24 h); porcentaje de contratos y anexos firmados electrónicamente; documentos firmados con huella verificable (meta: 100 %).

## 2. Los tres niveles

La Ley 19.799 distingue dos clases: la **firma electrónica** (simple), «cualquier sonido, símbolo o proceso electrónico» que identifique al autor, y la **firma electrónica avanzada** (FEA), certificada por un prestador acreditado, creada con medios bajo el control exclusivo del titular y que permite detectar cualquier cambio posterior (art. 2 f y g). Ambas valen como la firma en papel (art. 3), salvo cuando la ley exige una solemnidad incompatible, la presencia personal de una parte o en actos de derecho de familia. Un documento privado firmado con FEA hace plena prueba (art. 5); con firma simple, su valor se aprecia según las reglas generales ([Ley 19.799, BCN](https://www.bcn.cl/leychile/navegar?idNorma=196640); arts. 2 y 3 en [iura.cl](https://iura.cl/19799/2); art. 5 según la [Ley 20.217](https://www.leychile.cl/leychile/Navegar/imprimir?idNorma=266348&idParte=0)).

Por eso el valor legal de la firma simple **depende de cuánto pueda probarse quién firmó y que el documento no cambió**. OPAI ofrece tres niveles:

| Nivel | Nombre | Clase legal | Cómo se identifica al firmante | Cuándo conviene |
|---|---|---|---|---|
| **N1** | **Firma simple** | Firma electrónica (art. 2 f) | Enlace personal enviado a su correo o celular, o sesión iniciada en OPAI; trazo o nombre escrito y aceptación expresa | Documentos de bajo riesgo o con firmante ya identificado en sesión: actas, recepciones, aceptación de propuestas |
| **N2** | **Firma simple reforzada** (propuesta de tercer nivel) | Firma electrónica (art. 2 f), con prueba de identidad | N1 más un **código de un solo uso** (OTP) al correo o celular registrado **y** una **verificación de identidad**: la prueba de vida del trabajador ya enrolado en OPAI o, para externos, la cédula vigente con selfie y prueba de vida por un proveedor | Documentos laborales con obligaciones: contrato y anexos |
| **N3** | **Firma electrónica avanzada** | FEA (art. 2 g), por un prestador acreditado | El certificado FEA del firmante, emitido por un prestador acreditado ante la Entidad Acreditadora (en la nube, activado con ClaveÚnica, o en token) | Lo que la ley o la contraparte exijan con FEA y lo de mayor riesgo: contratos de servicio relevantes, poderes, documentos para organismos públicos |

**Por qué el tercer nivel es N2.** ADR-019 ya preveía un nivel intermedio («firma con prueba de vida, para trabajadores»). N2 lo generaliza: sigue siendo firma simple ante la ley, pero reúne evidencia de quién firmó, de que tuvo el control del medio y de qué documento exacto firmó, y busca cumplir los requisitos del Dictamen 0789/015 (a verificar con un asesor laboral). Así cubre lo laboral sin el costo ni la fricción de la FEA. La DT acepta la firma de la Ley 19.799 en contratos y anexos y, como el contrato no es instrumento público, **basta la firma simple** ([DT, consulta 60787](https://www.dt.gob.cl/portal/1628/w3-article-60787.html)); el Dictamen 0789/015 de 2015 la admite en contratos, anexos y reglamento interno siempre que la plataforma cumpla requisitos acumulativos y el trabajador acepte expresamente el medio electrónico (citado en [DT, ORD. 5861](https://www.dt.gob.cl/legislacion/1624/w3-article-116204.html)). N2 está pensado para cumplir esos requisitos.

**Lo que no se firma en OPAI:** el **finiquito** no se cierra con una firma privada. Desde la modernización de la DT, el empleador lo propone en Mi DT y el trabajador lo acepta o rechaza con ClaveÚnica, o se ratifica ante un ministro de fe ([DT, finiquito electrónico](https://www.dt.gob.cl/portal/1626/w3-article-117245.html), [requisitos](https://www.dt.gob.cl/portal/1628/w3-article-118098.html)). OPAI lo prepara, sigue su estado y guarda el PDF ratificado (R14).

## 3. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| **Política de firma** | Por tipo de documento: nivel mínimo, niveles permitidos, firmantes por rol, orden, plazo, recordatorios y quién puede enviar | Tipo de documento (núcleo), plantilla de la vertical | Ajustes del núcleo, declarados por Documentos |
| **Solicitud de firma** | Un documento congelado enviado a firmar: firmantes, orden, nivel, plazo y estado | Documento (versión exacta, con su huella), firmantes, eventos | Núcleo (`core.documentos`) |
| **Firmante** | Persona que firma o recibe copia: trabajador, contacto, usuario del tenant o externo, con su rol (firma, copia, aprueba) | Solicitud; persona, contacto o usuario si existe | Núcleo |
| **Evidencia de firma** | El hecho de que alguien firmó: quién, cuándo (servidor), cómo (nivel, método, OTP, verificación), desde dónde (IP, dispositivo) y la huella del documento | Firmante, bitácora encadenada | Núcleo (hecho inmutable, ADR-023) |
| **Documento firmado** | El PDF final sellado, versión nueva del documento, con su página de evidencia y su comprobante público | Documento original (`reemplaza_a_id`), comprobante `/verificar/<token>` | Núcleo (ADR-039) |
| **Aceptación del medio electrónico** | La aceptación expresa y revocable de un trabajador de firmar sus documentos laborales en forma electrónica | Persona | Núcleo |
| **Firmante de la empresa** | Representante legal u otro firmante autorizado del tenant, con su nivel y, si lo autorizó, su firma automática en N1 | Usuario, perfil de la empresa | Núcleo |

## 4. Qué nivel va en cada documento

Valores por defecto de la **plantilla de la vertical de seguridad**; el tenant los cambia por tipo de documento sin bajar del mínimo legal (R2).

| Documento | Nivel por defecto | Permitidos | Quién firma | Notas |
|---|---|---|---|---|
| **Contrato de trabajo** | **N2** | N2, N3 | Trabajador y representante legal | Requiere la aceptación del medio electrónico (R10); el registro en el Registro Electrónico Laboral de la DT (15 días, Ley 21.327, [Diario Oficial](https://www.diariooficial.interior.gob.cl/publicaciones/2023/06/08/43572/01/2325731.pdf)) queda como paso de Nómina (P10) |
| **Anexo de contrato** (incluido el del Brief 07b) | **N2** | N2, N3 | Trabajador y representante legal | Igual que el contrato |
| **Reglamento interno, cartas y recepción de documentos laborales** (entrega de reglamento, de EPP, de liquidación) | **N1** | N1, N2 | Trabajador | Es toma de conocimiento; el trabajador ya está identificado en su portal |
| **Finiquito** | **No se firma en OPAI** | — | — | Se prepara y se sigue; se firma en Mi DT o ante ministro de fe (R14) |
| **Propuesta comercial (CPQ)** | **N1** | N1, N2, N3 | Contacto del cliente | Es la aceptación de una oferta; el cliente puede pedir N3 |
| **Contrato de servicio con el cliente** | **N1** | N1, N2, N3 | Contacto con poder y representante legal | Si el cliente lo exige o el monto supera el umbral del tenant, N3 (P3) |
| **Acta de supervisión, de entrega de puesto o de inventario** | **N1** en el dispositivo | N1 | Cliente, guardia y supervisor presentes | Firma en el celular o tablet de quien levanta el acta, con nombre y RUN del firmante (corrige B.2-6 de 1.0) |
| **Acta de reunión o de acuerdos comerciales** | **N1** | N1, N2 | Asistentes | — |
| **Poderes, pagarés y documentos para organismos públicos** | **N3** | N3 | Según el documento | Se habilita con el Brief 28 |

## 5. Pantallas y pestañas

| Pantalla | Portal | Patrón | Entrada |
|---|---|---|---|
| **Firmas** (bandeja: por firmar por mí, enviadas, completadas, vencidas) | ERP | Lista (`SplitScreen` en iPad y escritorio) | Área **Documentos** → Documentos → «Firmas» (`NAVEGACION.md` §2) |
| **Enviar a firma** (firmantes, orden, nivel, plazo, mensaje, vista previa del documento congelado) | ERP | Hoja | Acción en la ficha de cualquier documento y en las fichas que lo generan (anexo, propuesta) |
| **Estado de la solicitud** (quién firmó, quién falta, recordar, cancelar, descargar) | ERP | Ficha | Desde la bandeja y desde la pestaña Documentos de la entidad |
| **Firmar** (revisar el documento completo, identificarse según el nivel, firmar, listo) | Público con enlace personal, Trabajador, Cliente | Pasos a pantalla completa | Enlace del correo o WhatsApp; Trabajador → Mis documentos → Por firmar; Cliente → Documentos |
| **Firma en el dispositivo** (actas) | Supervisor, Terreno | Hoja con área de firma | Al cerrar una visita o un acta |
| **Verificar documento** | Público | Página simple | `/verificar/<token>` (ya existe para comprobantes, ADR-039) |
| **Aceptar el medio electrónico** (R10) | Trabajador | Pantalla única | Antes del primer documento laboral |
| **Estado del finiquito** (R14) | ERP | Ficha | Ficha del documento de finiquito |
| **Configuración → Documentos → Firma** (matriz tipo de documento × nivel, firmantes de la empresa, proveedor FEA, plazos y recordatorios) | ERP | Formulario por ámbitos | Configuración (ADR-018) |

**Celular:** firmar, revisar el estado, recordar y firmar actas. **iPad y escritorio:** enviar con varios firmantes y la configuración.

## 6. Reglas de negocio

**Política**

- **R1.** Cada tipo de documento tiene su **política de firma** (§4). El tenant nace con la plantilla de su vertical y la ajusta; nada es igual para todos (ADR-021; principio P13 de `extraccion/comercial-y-cpq.md` §6).
- **R2.** La plataforma fija un **mínimo** por clase de documento que el tenant no puede bajar: contratos de trabajo y anexos, nunca menos de N2; documentos que exigen FEA, solo N3; reglamento interno, cartas y recepciones, N1. El tenant sí puede subir el nivel.
- **R3.** Quien envía puede subir el nivel de una solicitud, nunca bajarlo del de la política.

**Documento y huella**

- **R4.** Al enviar a firma, el documento se **congela**: se genera el PDF definitivo, se calcula su huella SHA-256 y se guarda como versión en `core.documentos`. Desde ahí no se edita; cambiarlo crea una versión nueva y **cancela** la solicitud, avisando a los firmantes (corrige B.2-2 y B.2-3).
- **R5.** Cada firmante firma **esa huella**. La pantalla de firma muestra el documento completo (no un resumen) y el firmante debe llegar al final antes de poder firmar.
- **R6.** Al completarse, OPAI arma el **PDF firmado**: el documento congelado más una página de evidencia (firmantes, nivel, fecha y hora del servidor, método de identificación, huella y QR a `/verificar/<token>`), con un sello electrónico de la plataforma y sello de tiempo (P7). Se guarda como versión nueva e inmutable; la verificación pública compara la huella del archivo que se sube con la registrada.

**Firmantes y flujo**

- **R7.** El orden es secuencial (por defecto) o paralelo, según la política. En secuencial, cada firmante recibe el aviso cuando le toca; en paralelo, todos a la vez. Los recordatorios respetan el modo y llegan a todos los pendientes (corrige B.2-5).
- **R8.** El plazo por defecto es de **7 días** (ajustable); vencido, la solicitud queda «vencida». Recordatorios a las 48 h y 24 h antes del vencimiento, por Comunicaciones (silencio por defecto para todo lo que no sea el firmante, ADR-020).
- **R9.** Un firmante puede **rechazar** con motivo; la solicitud queda «rechazada» y quien la envió decide si corrige y reenvía.
- **R10.** Para firmar electrónicamente documentos laborales, el trabajador debe haber dado su **aceptación expresa del medio electrónico** una vez (revocable). Si no la da o la revoca, el documento sale para firma en papel, que se sube escaneada y queda vinculada (art. 9 del Código del Trabajo, [DT, ORD. 2965](https://www.dt.gob.cl/legislacion/1624/w3-article-115495.html)).
- **R11.** Dos firmas simultáneas del mismo firmante cuentan una sola vez; cada firma es una transición condicionada al estado (corrige B.2-4).

**Identidad por nivel**

- **R12.** **N1:** enlace personal de un solo destinatario, que vence con la solicitud, o la sesión del usuario en OPAI; trazo dibujado o nombre escrito; casilla de aceptación cuyo texto y versión quedan en la evidencia (corrige B.2-4). No se aceptan imágenes de firma subidas desde afuera.
- **R13.** **N2:** además de N1, un código de un solo uso (6 dígitos, 10 minutos, 3 intentos) al correo o celular **registrado en OPAI**, no a uno que escriba el firmante; y la verificación de identidad: el trabajador enrolado usa su prueba de vida (el mismo adaptador de biometría de Asistencia, ADR-044.5); si el tenant no tiene Asistencia o el trabajador no está enrolado, usa el mismo camino que un externo (Documentos no depende de Asistencia, ADR-048); el externo, la cédula vigente con selfie y prueba de vida por el proveedor que contrate el tenant. La biometría es un dato sensible: se pide **consentimiento expreso** antes, se ofrece una alternativa sin biometría (firma presencial en el dispositivo de un supervisor o N3) y OPAI guarda el resultado de la verificación, **no la imagen** (Ley 21.719).
- **R14.** **Finiquito:** OPAI genera el documento y su cálculo, registra «enviado a la DT», «aceptado», «aceptado con reserva» o «rechazado» y guarda el PDF ratificado. No ofrece un botón «firmar finiquito».
- **R15.** **N3:** el firmante firma en el flujo del prestador acreditado con su certificado FEA; OPAI recibe el PDF firmado, verifica que la firma corresponde a la huella enviada y que el certificado es de un prestador de la lista de confianza vigente ([Entidad Acreditadora, TSL](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2025/06/CL-TSL.pdf)), y lo guarda. El prestador lo contrata el tenant o la plataforma (P2) y cada firma se mide en `core.consumos` (ADR-031).

**Firmantes de la empresa**

- **R16.** El representante legal firma como cualquier firmante, con el nivel de la política. La **firma automática** de la empresa (como el autoestampado de 1.0) solo se permite en N1, solo si el representante la autorizó expresamente para tipos de documento concretos, y la autorización queda registrada, con vigencia y revocable (P5).

**Evidencia y datos**

- **R17.** Cada evento (enviado, visto, código enviado, identidad verificada, firmado, rechazado, vencido, cancelado) es un **hecho inmutable en la bitácora encadenada** del núcleo, con hora del servidor, IP y dispositivo.
- **R18.** Los documentos firmados y su evidencia no se borran por retención mientras dure la obligación legal de conservarlos (ADR-023, Brief 07d §4.5); una supresión pedida por el titular se responde con bloqueo y la causa legal.
- **R19.** Un **agente nunca firma** por una persona. Enviar a firma **pide aprobación humana** al agente (`APPROVAL_REQUIRED`), también con autonomía «directo», en esta lista cerrada: toda solicitud **N2 o N3**; contratos de trabajo y anexos; contratos de servicio; propuestas comerciales; cartas al trabajador. **No la pide** el envío N1 de actas (supervisión, entrega de puesto, inventario, reunión) y de recepciones o tomas de conocimiento (reglamento interno, EPP, liquidación). La lista es la misma en §8 y §10.

## 7. Estados y transiciones

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| Borrador | Enviada | usuario con permiso; agente con aprobación (R19) | documento congelado (R4) | avisos al primer firmante o a todos | No (se cancela) |
| Enviada | En curso | firmante | primera firma | — | No |
| En curso | Completada | último firmante | todas las firmas | PDF firmado (R6), copias, evento `documentos.firma.completada` | No |
| Enviada / En curso | Rechazada | firmante | motivo | aviso a quien envió | No |
| Enviada / En curso | Vencida | sistema | plazo cumplido | aviso a quien envió | No (se reenvía como nueva) |
| Enviada / En curso | Cancelada | quien envió, admin; agente con aprobación | motivo; o el documento cambió (R4) | aviso a firmantes | No |
| En curso (N3) | En espera del prestador | sistema | el prestador FEA no responde | reintentos; no baja de nivel (§13) | Sí (vuelve a En curso) |

## 8. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente |
|---|---|---|---|---|---|---|---|---|
| Enviar a firma | sí | sí | según tipo | actas | no | no | no | `documentos:firmas.enviar`; con aprobación según la lista de R19 |
| Ver estado y descargar | sí | sí | según tipo | alcance | según tipo | lo suyo | lo suyo | `documentos:firmas.read` |
| Recordar | sí | sí | sí | actas | no | no | no | `documentos:firmas.enviar` |
| Cancelar | sí | sí | lo que envió | lo que envió | no | no | no | con aprobación |
| Firmar | lo suyo | lo suyo | lo suyo | lo suyo | lo suyo | lo suyo | lo suyo | **nunca** (R19) |
| Configurar la política | sí | sí | no | no | no | no | no | `documentos:firmas.config`, con aprobación |
| Registrar el estado del finiquito | sí | sí | no | no | no | no | ve el suyo | `documentos:finiquitos.manage`, con aprobación |

Los documentos laborales siguen el bloqueo de sueldos y Nómina de ADR-016: quien no ve sueldos no ve el contrato ni el anexo.

## 9. Eventos y notificaciones

| Evento | Cuándo | Quién se entera por defecto | Canal | Plantilla |
|---|---|---|---|---|
| `documentos.firma.solicitada` | Le toca firmar a alguien | El firmante | correo, WhatsApp o push | «Tienes un documento para firmar» (marca del tenant) |
| `documentos.firma.recordatorio` | R8 | El firmante pendiente | el mismo canal | «Recordatorio de firma» |
| `documentos.firma.firmada` | Cada firma | Nadie (activable para quien envió) | — | — |
| `documentos.firma.completada` | Última firma | Quien envió y todos los firmantes (con su copia) | correo | «Documento firmado» con el PDF |
| `documentos.firma.rechazada` | R9 | Quien envió | correo y push | «Firma rechazada» |
| `documentos.firma.vencida` | R8 | Quien envió | correo | «Solicitud vencida» |

## 10. Herramientas MCP

| Herramienta | Qué hace | Tipo | Vista previa | Aprobación humana |
|---|---|---|---|---|
| `documentos_firmas_enviar` | Congela el documento y lo envía a firma con firmantes, orden, nivel y plazo | irreversible con efecto legal | sí (muestra la huella, firmantes y nivel) | **según la lista cerrada de R19** |
| `documentos_firmas_estado` | Estado de una solicitud y de cada firmante | lectura | — | — |
| `documentos_firmas_list` | Solicitudes por estado, tipo o entidad (pendientes, vencidas) | lectura | — | — |
| `documentos_firmas_recordar` | Reenvía el aviso a los pendientes | escritura | sí | no |
| `documentos_firmas_cancelar` | Cancela una solicitud con motivo | escritura | sí | **sí** |
| `documentos_firmas_verificar` | Dice si un archivo corresponde a un documento firmado y por quién | lectura | — | — |
| `documentos_firmas_politica_get` / `documentos_firmas_politica_set` | Lee o cambia la política de firma de un tipo de documento | lectura / escritura | sí | **sí** al cambiar |
| `documentos_finiquitos_get` | Estado del finiquito en la DT | lectura | — | — |
| `documentos_finiquitos_registrar` | Registra un cambio de estado del finiquito en la DT y adjunta el PDF ratificado | escritura | sí | **sí** |

**Fuera del MCP, con motivo** (`paridad-excepciones.ts`, `soloPersonas`): **firmar** y **rechazar** como firmante, porque son actos personales del firmante (R9, R19); dar o revocar la aceptación del medio electrónico (R10); y autorizar o revocar la firma automática del representante legal (R16), que solo puede hacer él.

**Flujos típicos:** (1) el agente interno de RRHH arma el anexo de un cambio de jornada (Brief 07b) y llama `preview_documentos_firmas_enviar`; se detiene en la aprobación humana y, aprobado, el trabajador firma en su portal; (2) el agente comercial pregunta «¿qué propuestas faltan por aceptar?»: `documentos_firmas_list`; (3) el agente de un cliente verifica un contrato que le llegó por correo: `documentos_firmas_verificar`.

## 11. Integraciones

- **Mensajería** para enlaces y códigos (correo; SMS y WhatsApp medidos, ADR-031; ADR-049 punto 9: firmas, biometría y mensajería se cobran a costo más margen sobre lo medido).
- **Biometría** (N2): adaptador del núcleo con prueba de vida (ADR-044.5), el mismo de Asistencia; para externos, verificación de cédula y selfie de un proveedor contratado por el tenant (ADR-027).
- **Prestador FEA** (N3, Brief 28): un adaptador por prestador acreditado, con la credencial del tenant en el almacén cifrado (ADR-027) o de la plataforma (P2).
- **Sello de tiempo y sello electrónico del PDF** (R6): proveedor por definir (P7).
- **Mi DT** (finiquito y Registro Electrónico Laboral): sin integración automática en esta etapa (P10).

## 12. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Un solo nivel (simple) | Tres niveles por política (§2, §4) | Valor legal según el documento |
| Huella calculada al imprimir y PDF que se regenera | Documento congelado, huella al enviar, PDF firmado inmutable y verificación pública (R4–R6) | B.2-2 |
| Documento editable en firma | Editar cancela la solicitud (R4) | B.2-3 |
| Firma subida como imagen o URL | Trazo o nombre en OPAI; sin imágenes de afuera (R12) | B.2-4 |
| Aceptación legal no guardada | Texto y versión en la evidencia (R12); aceptación del medio electrónico del trabajador (R10) | DT, Dictamen 0789/015 |
| Recordatorios que no corren y no respetan el modo paralelo | Trabajo programado y recordatorios a todos los pendientes (R7, R8) | B.2-1, B.2-5 |
| Autoestampado del representante sin límites | Solo N1, con autorización expresa y revocable (R16) | Riesgo legal |
| Firma del cliente en la visita sin nombre ni RUN | Acta N1 con nombre, RUN y huella (§4) | B.2-6 |
| Finiquito «firmable» en OPAI | Se prepara y se sigue; se firma en Mi DT (R14) | Normativa DT |
| Sin MCP | Herramientas con aprobación humana (§10) | ADR-055 |

**No se porta:** la firma subida como imagen, el autoestampado general y la vista `/signed/...` sin comparación de huella.

## 13. Casos borde

- El firmante cambia de correo o celular durante la firma: el código va siempre al dato registrado; cambiarlo exige otro canal y reinicia el paso.
- Un firmante de una firma secuencial rechaza: los siguientes no reciben nada.
- El trabajador no tiene celular ni correo: firma en el dispositivo de un supervisor, con su prueba de vida (N2) o en papel (R10).
- La verificación biométrica falla tres veces: se ofrece la alternativa de R13 y se registra el intento.
- El prestador FEA no responde: la solicitud N3 queda «en espera del prestador» y no cae a un nivel menor.
- Se sube a `/verificar` un PDF impreso y escaneado: no coincide la huella; la página lo dice y ofrece verificar por el código del documento.
- Un documento con dos firmantes de la empresa y uno se va de la empresa antes de firmar: quien envió lo reemplaza; queda en la evidencia.

## 14. Criterios de aceptación

- **CA1.** Un anexo enviado a firma no se puede editar; editarlo crea una versión nueva y cancela la solicitud con aviso.
- **CA2.** Un trabajador firma su anexo N2 desde el celular con su código y su prueba de vida en menos de 3 minutos.
- **CA3.** El PDF firmado tiene la página de evidencia y su QR abre `/verificar`, que confirma la huella; un archivo alterado no coincide.
- **CA4.** Un tenant no puede configurar un contrato de trabajo con N1 (R2).
- **CA5.** Por MCP, `preview_documentos_firmas_enviar` de un contrato muestra huella, firmantes y nivel, y el envío real queda en la cola de aprobación humana; ninguna herramienta permite firmar.
- **CA6.** Con modo paralelo, el recordatorio llega a todos los pendientes.
- **CA7.** Un finiquito no muestra «Firmar»; muestra su estado en la DT y el PDF ratificado.
- **CA8.** Un acta de supervisión firmada en el dispositivo guarda nombre, RUN y huella del acta.

## 15. Preguntas abiertas para Carlos

- **P1. ¿El tercer nivel es la firma simple reforzada (N2)?** **Recomendación:** sí, como está en §2: cubre contratos y anexos con evidencia fuerte sin el costo de la FEA, y generaliza el nivel con prueba de vida que ya estaba en ADR-019.
- **P2. ¿Qué prestador FEA y quién lo contrata?** Según el resumen de la lista de confianza consultado, figuran, entre otros, Acepta, E-Sign, Thomas Signe, E-Digital y TOC S.A.; eCert figura en la portada de la Entidad Acreditadora (§16). **Recomendación:** que lo **contrate el tenant** (ADR-027) y OPAI se integre por adaptador; empezar por **un** prestador con API documentada, cotizando a eCert, Acepta y E-Sign. Antes de considerar a TOC, confirmar su situación de acreditación vigente (§16).
- **P3. ¿Cuándo un contrato de servicio con el cliente pasa a N3?** **Recomendación:** cuando el cliente lo pida o el valor mensual supere un umbral que fije el tenant (por defecto, sin umbral: N1).
- **P4. ¿Aceptas que el finiquito no se firme en OPAI?** **Recomendación:** sí (R14). OPAI calcula, prepara, sigue y archiva; una firma en OPAI no le daría poder liberatorio sin la ratificación del art. 177 del Código del Trabajo (en Mi DT o ante ministro de fe).
- **P5. ¿Firma automática del representante legal?** **Recomendación:** solo en N1 (recepciones y actas), con autorización expresa por tipo de documento, vigencia y revocable (R16). En contratos, anexos y **cartas al trabajador** (amonestación, término) firma él mismo, porque son decisiones que lo comprometen.
- **P6. ¿Qué verificación de identidad usa N2 para externos?** **Recomendación:** código al correo o celular registrado más cédula con selfie y prueba de vida por un proveedor que contrate el tenant; sin biometría, firma presencial o N3. Para trabajadores, la prueba de vida ya enrolada en OPAI.
- **P7. ¿Sello electrónico y sello de tiempo del PDF?** **Recomendación:** sí, sello de la plataforma (PAdES) y sello de tiempo de un prestador acreditado, porque es lo que vuelve detectable cualquier cambio posterior. El costo por documento se mide y se cobra como consumo (ADR-049 punto 9).
- **P8. ¿La aceptación de una propuesta de CPQ cuenta como firma N1?** **Recomendación:** sí: «Aceptar propuesta» en el enlace al cliente es una firma N1, con su huella y evidencia; el negocio pasa a ganado según las reglas de Comercial.
- **P9. ¿Cobro de las firmas?** **Recomendación:** N1 incluida en el módulo Documentos; N2 y N3 cobradas como consumo a costo más margen (códigos, biometría, FEA, sello de tiempo), según ADR-049 punto 9. El margen sigue pendiente del ADR de precios.
- **P10. ¿Integración con Mi DT y el Registro Electrónico Laboral?** **Recomendación:** no en esta especificación. Va con Nómina o RRHH; aquí solo se registran los estados y se guarda el PDF.
- **P11. ¿En qué briefs?** **Recomendación:** N1 y N2 en el **Brief 09 (Documentos)**, en dos PR (N1 con el congelado, la huella y la evidencia; luego N2); N3 en el **Brief 28**. La firma de actas en el dispositivo, con el portal Supervisor (Brief 15). Como Asistencia (con el enrolamiento biométrico) llega en la fase 4, el N2 del Brief 09 parte con código más verificación de cédula y selfie por proveedor, o firma presencial; la prueba de vida ya enrolada se suma cuando exista Asistencia (R13).

## 16. Benchmark de proveedores chilenos

Fuentes vistas el **29-oct-2026**, desde resultados del buscador (las páginas de la BCN no se pudieron abrir desde el entorno de trabajo); deben abrirse antes de citarlas hacia afuera. «No verificable» = sin fuente pública encontrada.

**Registro oficial.** La [Entidad Acreditadora](https://www.entidadacreditadora.gob.cl/) publica la lista de confianza ([TSL v9, jun-2025](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2025/06/CL-TSL.pdf)). Solo la FEA requiere prestador acreditado; la firma simple no ([preguntas frecuentes](https://www.entidadacreditadora.gob.cl/preguntas-frecuentes/)). Existe una guía de acreditación para FEA con biometría ([PSC-BIO](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2010/11/Gu%C3%ADa-de-Evaluaci%C3%B3n-Procedimiento-de-Acreditaci%C3%B3n-PSC-BIO-v1.1.pdf)).

| Proveedor | ¿Prestador acreditado para FEA? | Productos | API | Precio público |
|---|---|---|---|---|
| **eCert Chile** (ex e-certchile, Cámara de Comercio de Santiago) | Sí: aparece en la portada de la Entidad Acreditadora y en [eIDEasy](https://www.eideasy.com/supported-methods/ecert-chile) | FEA en línea y en token, firma simple; firma con huella anunciada en 2011, vigencia no verificable ([DF](https://www.df.cl/empresas/innovacion-y-sustentabilidad/e-certchile-apuesta-por-la-firma-bioelectronica)) | Sí, según [eSign.ai](https://www.esign.ai/it-IT/service-center/detail/ecert-chile) y la integración con [Webdox](https://www.webdoxclm.com/en/integrations/ecert) | No verificable |
| **Acepta** | Sí: su [folleto FEA](https://asistencia.acepta.com/descargas/manuales/manual_fea_brochure.pdf) declara la acreditación; figura en la lista | FEA en token con enrolamiento presencial | No verificable | El folleto menciona $33.500 sin quedar claro el producto: **no verificable** |
| **FirmaVirtual** | **No figura** en la lista de confianza (según el resumen consultado); probablemente opera con un prestador tercero, sin verificar | Firma simple y FEA, trámites notariales; Chile, Perú y México ([Emol](https://www.emol.com/noticias/Economia/2023/11/06/1111836/christian-rodiek-firmavirtual-empresa-chilena.html)) | Sí, según [descubre.vc](https://www.descubre.vc/firmavirtual) | Solo a cotización ([ComparaSoftware](https://www.comparasoftware.com/firmavirtual)) |
| **TOC S.A. / TOC Biometrics** (de Sovos desde 2022) | **Situación de acreditación por confirmar**: hubo un proceso sobre su inscripción en 2021 ([Poder Judicial](https://www.pjud.cl/prensa-y-comunicaciones/getRulingNew/30635)) cuyo resultado final no encontré; figura en la lista de 2025 según el resumen consultado | Verificación facial contra la cédula y firma biométrica ([Emol](https://www.emol.com/noticias/Economia/2022/08/31/1071497/sovos-adquiere-statup-toc-biometric.html)) | No verificable | No verificable |
| **E-Sign** | Sí: en la lista; el [SEA](https://sea.gob.cl/soporte/firma-electronica) lo lista como proveedor de FEA | FEA | No verificable | No verificable |
| **Thomas Signe, E-Digital, Certinet, Firmadox, BPO Advisors** | Sí ([resolución Thomas Signe](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2020/12/R.A.EX_.-442.pdf), [resolución E-Digital](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2022/10/RAEX202202626.pdf)) | No verificable | No verificable | No verificable |
| **Autentia** | No verificable (sin resultados) | — | — | — |
| **Verifik, Didit** (verificación de identidad, no prestadores FEA) | No | Selfie contra la foto del Registro Civil ([Verifik](https://docs.verifik.co/identity/chile/), [Didit](https://didit.me/blog/non-doc-verification-chile-registro-civil/)) | Sí | No verificable |

**Notas:** la FEA en la nube suele activarse con ClaveÚnica, la cédula vigente y un factor adicional ([ECERT](https://www.ecertla.com//content/uploads/2026/08/SGI-F-104-0039-R0.pdf)); una columna describe el mercado de FEA como concentrado en pocos oferentes ([Estrategia](https://www.diarioestrategia.cl/texto-diario/mostrar/4136835/peligrosa-concentracion-negocio-firma-electronica-avanzada)). Ningún precio por firma de los prestadores se pudo verificar en una fuente pública.

### Qué adoptamos, qué mejoramos y qué descartamos

- **Adoptamos:** la FEA en la nube activada con ClaveÚnica (sin token físico) como forma de N3; la verificación de identidad contra la cédula con prueba de vida para N2 de externos; la página de verificación por QR.
- **Mejoramos:** la política por tipo de documento con mínimo legal que el tenant no puede bajar (los proveedores venden niveles, no reglas por documento); la integración con el resto de OPAI (el anexo nace en Nómina, se firma en el portal del trabajador y queda en su ficha); el agente que prepara y sigue firmas sin poder firmar ni enviar lo legal sin aprobación.
- **Descartamos:** construir OPAI como prestador acreditado (cuesta 798 UF solo la acreditación de un solicitante nuevo, [aranceles 2025](https://www.entidadacreditadora.gob.cl/wp-content/uploads/2025/03/RAEX202500777_Aranceles_2025.pdf), más la operación); firmar finiquitos en OPAI; aceptar imágenes de firma subidas desde afuera; amarrarse a un solo prestador sin adaptador.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Borrador inicial (CAR-73) | Pendiente |
