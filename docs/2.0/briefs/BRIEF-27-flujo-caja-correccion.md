# BRIEF-27 · Flujo de caja: corrección (CAR-181)

**Origen:** [auditoría de corrección del flujo de caja](../qa/flujo-caja-correccion-2026-11.md), del 3-nov-2026, con 7 hallazgos Altos y 8 Medios, y el pedido de Carlos de que el flujo de caja «funcione perfecto».
**Rama:** `brief/car-181-flujo-caja-correccion` · **Tarea:** `Fixes CAR-181`.
**Fuera de este PR:** el hallazgo 5 (DTE en el flujo: borradores excluidos por el filtro de cesión, NC total que resta dos veces, comprometido en la planilla). Va en BRIEF-26 / CAR-159, que toca los mismos archivos de DTE (`derivadas/dte.ts`, `proyeccion-flujo-cap.ts`). Aquí no se tocan.

## 1. Objetivo

Que la planilla, el aviso de saldo negativo y la importación den **los mismos números**, sean correctos en la **hora de Chile** y no pierdan datos ni escrituras. Cada arreglo lleva un test que hoy falla.

## 2. Estado actual

Verificado en `main` `7186617` por la auditoría: 33 tests del módulo en verde, que no cubren estos casos. El detalle de cada hallazgo, con `archivo:línea`, el escenario, el arreglo propuesto y el test, está en el informe. Este brief lo toma como especificación.

## 3. Alcance

Todos los hallazgos del informe **salvo el 5**:

1. **Ventana de la planilla.** Arranca en la semana actual menos las semanas de historia configuradas, con navegación hacia atrás y hacia adelante, y no queda fija en `ajustes.desde`. Las consultas tienen un tope: no hay consultas por semana desde el inicio de los tiempos.
2. **El aviso usa exactamente la misma base y el mismo horizonte que la planilla.** Una sola función de saldo compartida, sin duplicar el cálculo. Se recalcula al cambiar ajustes, al archivar y al conciliar. Re-aviso: una semana ya avisada vuelve a avisar solo si su saldo vuelve a caer después de haber quedado en positivo (regla por defecto, anotada en ESTADO como decisión de Carlos).
3. **«Real según cartola» es la cartola:**
   - incluye los egresos y pagos a proveedores (`documento_recibido`);
   - incluye lo no conciliado, en una fila «Sin clasificar» del sistema;
   - incluye los cobros sin fila exacta;
   - el abono del factoring va como ingreso, con el costo separado.
4. **Lo real que cae en una fila archivada sigue sumando al saldo.** Se muestra como «Fila archivada» o se incluye la fila con su marca.
5. *(fuera de alcance, ver arriba)*
6. **La celda de la UI muestra la suma de la semana** (plan o real según corresponda) y cuadra con el total del backend. Una semana pasada sin cartola no se rotula «real».
7. **«Hoy» y el límite de la semana se calculan en la zona del tenant** (America/Santiago por defecto), con una sola función del dominio. Hay que reemplazar los 8 lugares que usan UTC.
8. **Las lecturas no escriben.** `planilla.obtener` y `derivadas.listar` no crean la fila «Cobros»: la fila del sistema se crea en una escritura auditada (al inicializar o en la primera derivada) o se resuelve sin persistir.
9. **Importar CSV:**
   - rechaza filas archivadas;
   - respeta la sección cuando la etiqueta existe;
   - un monto vacío no pisa el valor;
   - parser de CSV con comillas correcto;
   - rechaza fechas imposibles;
   - todo o nada real: un error revierte todo, incluidos los ajustes.
10. **Mover:**
    - lee las celdas dentro del lock o la transacción;
    - su vista previa usa la misma función de saldo de la planilla.
11. **Fijar y cumplir:** la primera escritura de una celda es concurrente y segura (upsert o `ON CONFLICT`), sin error interno.
12. **Hoja «Reprogramar»:** si N cambia, se invalida la vista previa y hay que volver a previsualizar antes de aplicar.
13. **Hoja de celda:** «1.234» y «1,234» se interpretan según la regla chilena (punto de miles), con el parser único de montos.
14. **Tests faltantes del informe:** zona horaria, filas archivadas, planilla UI contra backend, hojas, importación.

## 4. Arquitectura

- **Dominio puro** en `modules/finanzas/domain`: semana y hoy en una zona dada, función única de saldo por semana (plan, real y archivadas) y parser de CSV.
- **Capacidades delgadas** que la usan.
- **Escrituras** con `ctx.transaccion` y evento por outbox.
- **Sin migraciones**, salvo que el upsert necesite un índice único que hoy no existe. En ese caso, migración aditiva con `SET LOCAL lock_timeout` y etiqueta `migracion-pendiente`.

## 5. Interfaz

- Solo cambios mínimos en `apps/web/app/(erp)/finanzas/flujo/**`: navegación de semanas, suma por celda, rótulos y revalidación de vista previa.
- DS 2.0 y formateador único.
- Archivos de hasta 150 líneas.
- Verificar a 375, 1024 y 1280 px.

## 6. Seguridad y tenant

- Todo por `ctx.db` o `tx`.
- Mantener verdes los tests de aislamiento existentes (`finanzas-flujo-aislamiento-db.test.ts`).

## 7. Plan por bloques (un commit por bloque)

1. Dominio: zona horaria, ventana, saldo único, parser CSV, con tests.
2. Lecturas: planilla con ventana, cartola real, filas archivadas, sin escritura en lecturas.
3. Aviso con la misma base y re-aviso.
4. Escrituras: mover, fijar y cumplir concurrentes, importar todo o nada.
5. UI: navegación, suma por celda, hojas.
6. Tests de base, e2e del flujo ampliado si aplica, ESTADO.

## 8. Criterios de aceptación

- Para un mismo tenant y una misma semana, la planilla, el aviso y la vista previa de mover dan el mismo saldo (test).
- Domingo 22:00 en Chile: la semana en curso sigue editable (test).
- Un pago a proveedor conciliado aparece como egreso real. Un movimiento sin conciliar aparece en «Sin clasificar» (test).
- Leer la planilla no escribe en la base (test con conteo de filas o auditoría).
- La importación con una fila mala no aplica nada (test).
- Gate completo en verde, ESTADO al día.

## 9. Riesgos y rollback

- **Riesgo:** cambia los números que ven los usuarios de prueba. Es intencional y queda descrito en el PR.
- **Rollback:** revertir el PR. No hay datos migrados.
