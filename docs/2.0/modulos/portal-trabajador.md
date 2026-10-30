# Portal Trabajador — Especificación funcional

**Estado:** en revisión (la escribe el constructor por encargo de Carlos del 30-oct-2026; la aprobación de Carlos y de la hoja de alcance es suya) · **Fase:** 3 · **Insumos:** diseño aprobado v3 (`diseño/export-portal-trabajador/`), `NAVEGACION.md` §4, ADR-016, ADR-022, ADR-025, ADR-033, `briefs/BRIEF-07d-ley-21719.md`, `modulos/rondas.md` · **Autor:** Claude

> Las reglas se citan como R1, R2… y los criterios como CA1, CA2… El PR 1 construye lo marcado **[PR 1]**; lo marcado **[PR 2]** o **[Pendiente]** depende de módulos que aún no están en `main` (ver §14).

## 1. Objetivo

Que cada trabajador (guardia, aseador, técnico) tenga en su celular **un solo lugar, suyo y pequeño**, para ver lo que le toca hoy, mantener al día sus datos y su privacidad, y comunicarse con la empresa **sin chat libre**. Se nota que funciona si: (a) el trabajador completa sus datos de contacto y dirección sin pasar por RR.HH.; (b) RR.HH. deja de recibir llamados para cambiar un teléfono o una dirección; (c) cada aviso importante llega con acuse (ADR-025) y no por WhatsApp personal.

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Persona | La ficha del trabajador (RUT, contacto, dirección) | `usuario_id` la une a su usuario (1:1) | Núcleo (`core.personas`), **no se modifica su esquema** |
| Preferencia de notificación | Qué categorías de aviso quiere por push y por correo, y su horario de silencio | Una por persona y empresa | Módulo (`portal_trabajador.preferencias_notificacion`) **[PR 1]** |
| Consentimiento / solicitud ARCO | Lo que el trabajador autorizó o pidió sobre sus datos (Ley 21.719) | Persona | Núcleo (07d) |
| Aviso | Notificación del sistema con enlace | Usuario | Núcleo (`core.notificaciones`) |

Regla de alcance: el trabajador ve y edita **solo la persona vinculada a su usuario**. Ningún input de estas capacidades trae un id de persona.

## 3. Pantallas

Barra inferior (NAVEGACION §4): **Inicio · Mis datos · Avisos · Más**. «Marcar», «Mis documentos» y «Solicitudes» aparecen cuando existan sus módulos (Asistencia, Documentos del trabajador, Tickets); hoy no se dibujan como vacíos falsos.

| # | Pantalla | Qué hace | Estado |
|---|---|---|---|
| 01 | **Inicio** | Saludo, tarjeta de datos por completar, avisos recientes, accesos a lo que existe. Lo pendiente no se muestra | PR 1 |
| 06 | **Más** | Mis datos, Notificaciones, Privacidad, cerrar sesión. Las entradas pendientes no aparecen | PR 1 |
| 10 | **Mis datos** | Teléfono, correo personal y dirección (Google Maps, componente de dirección del Núcleo). Nombre, RUT y correo laboral solo se ven | PR 1 |
| 11 | **Privacidad** | Qué datos tiene la empresa, la persona que atiende los derechos (DPO) y cómo ejercer ARCO; enlaza a lo ya construido en 07d | PR 1 |
| 12 | **Notificaciones** | Por categoría: push y correo; horario de silencio | PR 1 |
| 07 | Central | Mensajes tipificados y avisos con acuse | Pendiente (CAR-85) |
| 07b | Avisar a la central | Formulario tipificado, sin chat libre | Pendiente (CAR-85) |
| 08 | Rondas | Ejecución de la ronda | PR 2 (depende de Terreno, CAR-78) |
| 09 | Accesos | Registro de accesos desde el celular personal | Pendiente (Control de acceso operativo) |
| — | Mi pauta | Turnos del mes del guardia | Pendiente (Pauta) |

## 4. Campos y validaciones

- **Teléfono:** chileno o internacional, normalizado a E.164; opcional; se puede quitar.
- **Correo personal:** correo válido (≤ 254); opcional. El **correo laboral no se edita** aquí.
- **Dirección:** texto formateado obligatorio si hay dirección; calle, comuna, región y `place_id` opcionales; latitud y longitud **juntas o ninguna**, dentro de rango. Se obtiene del servicio de geolocalización del Núcleo (`core.geo.*`); **sin claves de Google en el repositorio ni en el navegador** (REGLAS-codigo).
- **Preferencias:** categorías cerradas (pauta, documentos, solicitudes, central) × canales (push, correo); horario de silencio `HH:mm`–`HH:mm` (puede cruzar la medianoche), ambas horas o ninguna.

## 5. Reglas de negocio

- **R1.** Alcance personal: toda lectura y escritura se acota a la persona con `usuario_id = usuario de la sesión` (o el responsable de la API key). Una persona archivada o anonimizada responde como inexistente.
- **R2.** Editables por el trabajador: teléfono, correo personal y dirección. **No** editables: nombres, apellidos, RUT, fecha de nacimiento, sexo, nacionalidad, correo laboral, estado, bloqueo (los gestiona RR.HH.).
- **R3.** Datos bancarios y previsión: Carlos decidió que el trabajador los edita; pasan al Núcleo con Personas (#165). **[Pendiente]** hasta que existan; no se crean tablas paralelas.
- **R4.** Toda escritura acepta vista previa (`preview_…` en MCP) y clave de idempotencia, y queda en la auditoría. Toda lectura de la ficha queda auditada por id (NÚCLEO-H).
- **R5.** Silencio por defecto (ADR-020): sin elección, el trabajador solo recibe el aviso dentro de la app. El aviso de la app no se puede apagar.
- **R6.** Sin chat libre (decisión 2 de Carlos): la comunicación con la central es por mensajes tipificados y avisos con acuse. **[Pendiente]**
- **R7.** Rondas: traza GPS continua durante toda la ronda; cada punto se marca según su configuración (QR, GPS o ambos); **si el punto exige QR y no se puede leer, no se marca solo por GPS**; la barra inferior se oculta durante la ronda; se puede ejecutar desde el teléfono compartido de la instalación o desde el portal. Rondas y accesos solo en **instalaciones asignadas y durante su turno**; los accesos, desde el celular personal. **[PR 2]**
- **R8.** «Mi pauta» vive en este portal cuando exista Pauta. **[Pendiente]**
- **R9.** Marca del tenant: toda salida usa el perfil de marca del Núcleo (ADR-028); nunca nombres ni logos de Gard en código.

## 6. Estados y transiciones

La preferencia no tiene ciclo de vida: existe o no. «Sin fila» = valores por defecto (R5). Un cambio guardado reemplaza al anterior.

## 7. Permisos por rol y portal

Portal `trabajador` (membresía). Las cinco capacidades del PR 1 **no piden permiso**: el alcance es la persona propia (R1), igual que el inbox y la firma por enlace. Un módulo apagado o un scope de key ausente las bloquea. Un usuario sin persona vinculada recibe «Tu ficha de persona no existe». Los roles nuevos nacen sin acceso a finanzas ni nómina.

## 8. Eventos y notificaciones

`portal_trabajador.mis_datos.actualizados` (payload: solo la lista de campos cambiados, nunca los valores). Sin plantilla de correo por defecto: silencio por defecto (ADR-020).

## 9. Herramientas MCP

| Capacidad | MCP | Efecto |
|---|---|---|
| `portal_trabajador.mis_datos.obtener` | `portal_trabajador_mis_datos_obtener` | Lectura auditada |
| `portal_trabajador.mis_datos.actualizar` | + `preview_…` | Escritura |
| `portal_trabajador.preferencias_notificacion.obtener` | idem | Lectura |
| `portal_trabajador.preferencias_notificacion.actualizar` | + `preview_…` | Escritura |
| `portal_trabajador.privacidad.obtener` | idem | Lectura auditada (DPO, datos tratados, consentimientos y solicitudes ARCO propios) |

Una API key de usuario opera como ese usuario (misma persona propia). Las keys de tipo trabajador (ADR-033) llegan con el emisor de keys del portal.

## 10. Integraciones

Google Maps solo por el servicio de geolocalización del Núcleo (adaptador, sin credenciales en el repo). Para que el trabajador busque su dirección, `core.geo.autocompletar` y `core.geo.detalle` quedan disponibles también en el portal `trabajador` (cambio de una línea en cada una; el resto de `core.geo.*` sigue solo en el ERP). Sin integraciones nuevas en el PR 1.

## 11. Mejoras respecto de 1.0 y lo que no se porta

Ver la hoja de alcance en `briefs/BRIEF-15-portal-trabajador.md` §3 (1.0 es el piso, no el techo).

## 12. Casos borde

Usuario sin persona vinculada; persona archivada o anonimizada; dos dispositivos editando a la vez (gana el último guardado; la escritura es condicional a que la ficha siga siendo del usuario); dirección sin coordenadas (se guarda solo el texto); trabajador con membresías en dos empresas (cada empresa tiene su persona y sus preferencias; RLS lo separa); módulo apagado (la pantalla lo dice, no se rompe).

## 13. Criterios de aceptación

- **CA1.** Un trabajador ve y edita su teléfono, correo personal y dirección; el cambio queda en la auditoría y se ve en la ficha del ERP.
- **CA2.** Un trabajador no puede leer ni editar a otra persona, ni del mismo tenant ni de otro (prueba en `test:db`).
- **CA3.** Las preferencias se guardan por persona; sin elección rige el silencio por defecto.
- **CA4.** La vista previa de cada escritura no persiste nada.
- **CA5.** Las cinco capacidades aparecen en `tools/list` y en `/api/v1`, y el gate de paridad queda en verde.
- **CA6.** Las pantallas 01, 06, 10, 11 y 12 funcionan a 375, 1024 y 1280 px, en claro y oscuro, con estados vacío, cargando, error y sin permiso.

## 14. Preguntas abiertas

0. **Solicitudes ARCO desde el portal.** Hoy `core.cumplimiento.solicitud_crear` es del ERP y solo personas (`soloPersonas`). «Privacidad» muestra las solicitudes de la persona y a quién escribir, pero **no crea solicitudes**: hacerlo exige una capacidad de titular en 07d (origen `portal`, hoy previsto pero sin construir). Se propone en el PR 2.

1. ¿Qué categorías de aviso quiere Carlos en Notificaciones? El PR 1 usa pauta, documentos, solicitudes y central (las que habrá); se ajusta con el diseño aprobado.
2. ¿El correo personal es el canal de los avisos por correo, o RR.HH. define uno? El PR 1 no envía correos.
3. Numeración: este brief usa el 15 por encargo; `CONTEXTO-agentes.md` ya cita un «Brief 15» para la Central de monitoreo. Carlos decide cuál conserva el número.

## Historial

- 30-oct-2026 — borrador del constructor (PR 1).
