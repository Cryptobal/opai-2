# BRIEF CAR-338 · Las vistas se actualizan al tiro tras una acción

1. **Objetivo:** después de Reenviar, aprobar, tomar una solicitud o cualquier escritura desde la pantalla, todo lo visible muestra el estado nuevo sin recargar.
2. **Estado actual (verificado):** `ejecutarCapacidad` (acción de servidor) invalida el layout tras una escritura real, así que la página se pone al día. Lo que se pide desde el navegador después de pintar (hilo, campana, Bandeja, contador de Solicitudes) solo se refresca con el evento `opai-bandeja`, que lanzan aprobaciones y avisos.
3. **Alcance:** un aviso central tras toda escritura real hecha desde la UI; el hilo refresca también Actividad y Agenda abiertas. No cambia capacidades ni datos.
4. **Arquitectura:** la acción devuelve `escritura: true`; la pasarela del navegador `app/_components/ejecutar-capacidad.ts` lanza `opai-bandeja` (con espera de 250 ms para juntar ráfagas), salvo con `revalidar: "ninguna"`.
5. **Archivos:** `app/_acciones/capacidad.ts`, `app/_components/ejecutar-capacidad.ts`, `app/_components/use-capacidad.ts`, `app/_components/hilo/use-hilo.ts`, importaciones de 61 pantallas, `paridad.test.ts` (pasarela conocida).
6. **Modelo de datos:** sin cambios. Sin migración.
7. **Capacidades:** sin cambios; el gate de paridad sigue leyendo los ids literales.
8. **Interfaz:** sin cambios visuales; los números y el hilo se actualizan solos.
9. **Seguridad y tenant:** sin cambios; la acción de servidor es la misma.
10. **Casos límite:** errores y lecturas no avisan; ráfagas, un solo aviso; preferencias propias (`"ninguna"`) no avisan para no repetir el problema B1.
11. **Plan:** un commit.
12. **Tests:** `test/aviso-cambio.test.ts`; ajuste de dos pruebas que dependían del número de microtareas o del resultado exacto.
13. **Validación:** gate local; e2e local con build de producción (crear cuenta → contadores se vuelven a pedir).
14. **Criterios de aceptación:** tras una escritura, campana, Bandeja, contador de Solicitudes y el hilo se vuelven a pedir sin recargar.
15. **Riesgos y rollback:** unas pocas lecturas extra por acción. Rollback: revertir el PR.
16. **Reporte:** en `docs/2.0/estado/diseno/CAR-338.md`.
