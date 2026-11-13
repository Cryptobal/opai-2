# CAR-368 · Fechas: incidente de cumplimiento y Asistencia (Sesión Diseño)

- **Entra:** «Cuándo se detectó» del incidente (Configuración › Cumplimiento) deja el campo nativo `datetime-local` y pasa a `InputFecha` (dd-mm-aaaa) + `InputHora`; el valor enviado sigue siendo el mismo instante ISO (sin hora, el inicio del día). El encabezado de Asistencia usa `diaLargo` («Jueves 12-11-2026», regla R5 de Hilo) en vez de «jueves 12 nov 2026».
- **También entra:** `apps/web/test/sin-fecha-nativa.test.ts` ahora prohíbe además `type="datetime-local"` (probado: falla con la versión anterior del incidente).
- **Pendiente:** quedan `type="time"` nativos en `configuracion/_comercial/editor-plan.tsx` y `trabajador/_componentes/formulario-avisos.tsx` (en un equipo en inglés muestran AM/PM). `InputHora` del DS también usa el campo nativo, así que cambiarlo no basta: hace falta un campo de hora escrita de 24 h en `@opai/ds`, con diseño.
- **Riesgo:** ninguno de datos; mismo payload de `core.cumplimiento.incidente_registrar`.
