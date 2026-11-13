# BRIEF CAR-373 · Permisos y licencias desde la ficha, visibles en la pauta

Decisión de Carlos (12-nov-2026, ADR-094 adenda CAR-311 d): los permisos y licencias se ingresan en la ficha del guardia y se ven en la pauta mensual y diaria. Así se sabe si una falta está justificada. Carlos asignó el trabajo a la Sesión Desempeño el 12-nov a las 23:25.

## 1 Objetivo

Registrar desde la ficha de la persona un permiso, licencia, vacaciones o ausencia para un día o un rango. Tiene que quedar en la pauta sin repetirlo puesto por puesto.

## 2 Estado actual (verificado)

- La pauta ya registra excepciones por puesto y día con `pauta.excepciones.crear`. Los tipos son `ausencia`, `licencia`, `vacaciones` y `permiso`.
- Cada excepción guarda el titular que faltó (`persona_id`). La pauta mensual y diaria ya la muestran con su motivo.
- El ausentismo de Desempeño ya cuenta esas excepciones como justificadas (CAR-311).
- La ficha no tenía dónde ingresarlas.

## 3 Alcance

- Tres capacidades por persona (permisos de Pauta y alcance por instalación, ADR-022):
  - `pauta.ausencias.registrar` (con vista previa): busca los turnos que la persona tiene como titular en el rango, según la serie vigente de cada día y en todos sus puestos, y crea la excepción en cada uno. Rechaza si no tiene turnos o si alguno ya tiene una excepción activa. Bloquea los puestos y revalida dentro de la transacción. Deja historial y un evento por puesto.
  - `pauta.ausencias.listar`: lectura auditada (el motivo es texto libre). Trae los registros de la persona agrupados por registro, con tipo, motivo, fechas, turnos, instalaciones y estado.
  - `pauta.ausencias.anular`: anula las excepciones activas de la persona, de un tipo y en un rango. No toca las de otras personas.
- Pestaña **Ausencias** en la ficha de la persona (después de Laboral):
  - La lista de registros.
  - El botón «Registrar permiso o licencia», que abre una hoja. La hoja pide tipo, desde, hasta y motivo, muestra la vista previa con los turnos afectados por instalación y puesto, y luego pide confirmar.
  - «Anular» en cada registro activo.
- Sin Pauta activa, la pestaña lo explica. Sin `pauta:write`, no aparecen los botones.
- La pauta mensual y diaria no cambian: ya muestran estas excepciones con su motivo.

## 4 Arquitectura

Reutiliza la tabla `pauta.excepciones`; no hay tabla nueva. La planificación por persona está en `pauta/ausencias-plan.ts` y la usan la vista previa y la escritura.

## 6 Modelo de datos y migraciones

Ninguna.

## 8 Interfaz

Sin diseño aprobado propio. Sigue la pestaña Anexos de la misma ficha: lista con ícono, título, badge y una línea secundaria. La hoja sigue la de excepción de la pauta (los mismos campos). Se reporta en el PR.

## 9 Seguridad y tenant

- Todo por `forTenant`.
- La persona y los puestos se filtran por alcance (`dondePersona`, `dondePuesto`); fuera del alcance, la respuesta es NOT_FOUND.
- El historial no copia el motivo.
- La lectura queda auditada con la persona revelada.

## 12 Tests

- `pauta-ausencias-db.test.ts`, contra Postgres real:
  - La vista previa no escribe.
  - Registra en dos puestos de dos instalaciones.
  - Rechaza un registro repetido y uno sin turnos.
  - Otro tenant y un supervisor sin la instalación reciben NOT_FOUND.
  - Anular no toca a otra persona.
- `e2e/ficha-ausencias-preview.spec.ts` (`@preview`): pestaña y hoja, sin confirmar.

## 15 Riesgos

Una persona con muchos puestos y un rango largo (62 días como máximo) genera muchas filas en una transacción. Es aceptable: es el mismo tope que tiene la excepción por puesto.
