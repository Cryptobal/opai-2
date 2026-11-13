# CAR-368 · Fechas: incidente de cumplimiento y Asistencia (Sesión Diseño)

- **Entra:** «Cuándo se detectó» del incidente (Configuración › Cumplimiento) deja el campo nativo `datetime-local` y pasa a `InputFecha` (dd-mm-aaaa) + `InputHora`; el valor enviado sigue siendo el mismo instante ISO (sin hora, el inicio del día). El encabezado de Asistencia usa `diaLargo` («Jueves 12-11-2026», regla R5 de Hilo) en vez de «jueves 12 nov 2026».
- **Pendiente:** cuando entre #629, extender `apps/web/test/sin-fecha-nativa.test.ts` para que también prohíba `type="datetime-local"`.
- **Riesgo:** ninguno de datos; mismo payload de `core.cumplimiento.incidente_registrar`.
