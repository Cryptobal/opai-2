# CAR-368 · Horas en 24 h (Sesión Diseño, 13-nov-2026)

- **Entra:** los 6 campos de hora que quedaban nativos (`type="time"` o `InputHora`, que lo envuelve) pasan a `SelectorHora` de `@opai/ds` (24 h, «hh:mm», con selector de horas y cuartos). Son: el incidente de Cumplimiento, el horario de la instalación (día y noche), los horarios de las rondas, la hora de la actividad, la hora de los pasos del plan de seguimiento y el horario de silencio de los avisos del trabajador. Los valores siguen siendo «HH:mm». Ahora también tiene nombre accesible la hora de cada horario de ronda («Hora N»).
- **Prueba:** `apps/web/test/sin-fecha-nativa.test.ts` prohíbe además `type="time"` e `InputHora` en las pantallas (probado: falla con la versión anterior). Se agrega la prueba `@preview` `e2e/horas-24h-preview.spec.ts`.
- **Corrige** el pendiente de `CAR-368-incidente-asistencia.md`: el DS ya tenía un campo de hora de 24 h (`SelectorHora`), así que no hacía falta diseñar uno nuevo.
- **Pendiente:** `InputHora` sigue exportado en `@opai/ds` (nadie lo usa en pantallas). Retirarlo queda para la sesión dueña del DS.
