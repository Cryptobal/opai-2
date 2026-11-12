# Design Prompt · Configuración › Aprobaciones › Reglas (CAR-252, ADR-106)

Diseña, con el Design System de OPAI 2.0 (nunca el de 1.0), la pestaña **Reglas** dentro de **Configuración › Aprobaciones**. Hoy esa sección tiene la cola de aprobaciones; se suma la pestaña. Mobile first (375 y 1024 px), también a 1280 px.

## Qué hace

Una empresa elige qué acciones necesitan aprobación, desde qué monto y quién las aprueba. Ejemplo: «Las facturas desde $1.000.000 las aprueba el rol Gerente de finanzas».

## Contenido

1. **Lista de reglas** (patrón `ListScreen`). Cada fila muestra:
   - la acción en palabras: «Emitir documentos al SII» o «Enviar cotizaciones o propuestas»;
   - el monto: «Desde $1.000.000» o «Siempre»;
   - quién aprueba: un rol o un grupo, con su nombre.
   - Acción por fila: **Editar** y **Desactivar** (con confirmación).
2. **Estado vacío:** «Sin reglas, las acciones se ejecutan sin pedir aprobación. Dueños y administradores siempre pueden aprobar.» Botón **Nueva regla**.
3. **Hoja «Nueva regla» / «Editar regla»** (patrón `FormScreen` en hoja lateral; pantalla completa en teléfono):
   - **Acción:** un selector con las dos acciones.
   - **Desde qué monto (opcional):** campo de monto en pesos; vacío significa «siempre».
   - **Quién aprueba:** un selector de dos opciones, «Un rol» o «Un grupo», y luego la lista correspondiente.
   - Ayuda fija: «Dueños y administradores pueden aprobar todo. Nadie aprueba su propia solicitud.»
   - **Vista previa** antes de guardar: frase de resumen («Las facturas desde $1.000.000 las aprobará Gerente de finanzas»).
4. **Estados:** cargando (skeleton con la forma de la lista), error, sin permisos.

## Capacidades (ya existen)

`core.aprobaciones.reglas_list`, `core.aprobaciones.reglas_guardar` (con vista previa) y `core.aprobaciones.reglas_desactivar`. Roles: `core.roles.list` y la lista de roles base; grupos: `core.grupos.list`.

## Fuera de esta pantalla

Varias aprobaciones por solicitud, reemplazos por vacaciones y la unión con las aprobaciones de CPQ, Rendiciones y tickets (CAR-253).
