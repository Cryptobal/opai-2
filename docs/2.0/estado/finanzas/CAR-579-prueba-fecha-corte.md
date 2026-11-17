# CAR-579 · Prueba de fecha de corte al día con el lenguaje de producto

- #954 cambió el mensaje de `finanzas.ventas_programacion.generar` al cortar por fecha de corte: ya no dice «OPAI 1.0». La prueba `finanzas-programacion-db.test.ts` seguía esperando ese texto y dejaba `test:db` en rojo en `main` y en todos los PR.
- La prueba ahora busca «fecha de corte», que sí aparece en el mensaje actual. El comportamiento no cambia.
