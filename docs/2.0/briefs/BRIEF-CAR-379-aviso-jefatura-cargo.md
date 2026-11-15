# BRIEF CAR-379 · Aviso bajo la meta a la jefatura por cargo

Pendiente de CAR-312 (ADR-094, adenda CAR-312).

## 1 Objetivo
Que el aviso «N de tu equipo bajo la meta» llegue también a la jefatura que viene del cargo (CAR-314), cuando la persona no tiene un jefe anotado en su ficha.

## 2 Estado actual (verificado)
`emitirBajoMeta` arma el aviso de equipo solo con `jefePersonaId` de la ficha. Con jefatura por cargo y sin jefe en la ficha, el aviso no tenía a quién llegar.

## 3 Alcance
- Al cerrar el mes con el aviso encendido, se suman las jefaturas directas de la jerarquía de cargos (`directasPorJefatura`, la misma regla que usa Desempeño para «quién reporta a quién»).
- También cuenta el jefe de la ficha, y se evitan duplicados.
- El consumidor no cambia: entrega solo si la jefatura puede ver el resultado de esa persona.

## 9 Seguridad
- Sin capacidad nueva ni migración.
- Se lee dentro de la transacción del cierre (`tx`) y el aviso nunca lleva el puntaje.

## 12 Tests
Nuevo caso en `desempeno-avisos-db.test.ts`: la persona sin jefe en la ficha y con cargo que reporta a «Jefe de ventas». El aviso de equipo llega a la jefatura.
