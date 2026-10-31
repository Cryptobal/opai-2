# BRIEF 20 · Flujo de caja (Finanzas) — PR 1

Encargo CAR-91 (Ola 5), «ENCARGO DE CONSTRUCCIÓN · flujo-caja» del 31-oct-2026. Diseño aprobado tal cual: `docs/2.0/diseño/export-flujo-caja-v3/` (PR #171), DS OPAI 2.0 V2, sin pendientes de diseño. ADR-026: planilla derivada de hechos, nunca copiada.

## Qué entra en el PR 1

- **Datos:** schema `finanzas` (`flujo_filas`, `flujo_celdas`, `flujo_cierres`, `flujo_ajustes`), migración aditiva `20261031010000_finanzas_flujo_caja` (RLS ENABLE+FORCE y política `tenant_isolation`, trigger `mismo_tenant` en celdas, CHECK de lunes y capas). **Sin aplicar** (la aplica el bot «OPAI 2.0» con respaldo).
- **Dominio puro** con tests: semanas ISO, saldo acumulado, tono (bajo 0 / bajo el umbral), reprogramación con regla de arrastre, tolerancia de cierre.
- **12 capacidades** (`finanzas.planilla.obtener`, `finanzas.filas.*`, `finanzas.celdas.{fijar,mover,cumplir}`, `finanzas.cierres.*`, `finanzas.ajustes.*`) con `dryRun`/`preview_…`, auditoría en la misma transacción y eventos de dominio; permisos `finanzas:flujo.{ver,gestionar,cerrar,configurar}` (owner y admin; el bloqueo financiero `finanzas:*` ya excluye a los demás roles).
- **Pantalla** `/finanzas/flujo`: planilla de 12 semanas (patrón `PlanillaScreen`) con capas por celda, totales, saldo y tono, semanas selladas.
- **Aislamiento:** `rls-dos-empresas` y la pasada de capacidades por dos empresas cubren las 4 tablas (ajustes de siembra en `dos-empresas/ajustes.ts`).

## Decisiones tomadas en el código (revisar)

1. Solo la capa **Plan** se guarda y se edita; **Comprometido** y **Real** vendrán de hechos (DTE, banco, nómina) cuando existan esos módulos. «Dar por cumplida» deja la celda en capa `real` manual.
2. **Arrastre por fila:** con `arrastre`, reprogramar mueve también las celdas Plan posteriores; lo comprometido o real nunca se mueve. Una semana sellada no se toca (origen ni destino).
3. **Tolerancia del cierre:** 1.000 CLP de diferencia contra el banco sin motivo (`TOLERANCIA_CIERRE_CLP`); la spec no fija el número.
4. Montos `Int` (CLP, hasta 2.000 millones por celda).

## Pendiente para el PR 2

Pantallas de escritura del diseño (traza de celda, reprogramar con vista previa, cierre semanal, filas y ajustes en Configuración › Módulos), vista móvil de 4 semanas, metas de rendimiento y correo de saldo negativo (pantalla 10), y las capas derivadas de DTE, banco y nómina.

## Autorrevisión del merge de #186 (CAR-91)

Encargo limitado a unir main y regenerar derivados: no autoriza cambiar lógica ni
migraciones. La revisión detectó una carrera pendiente entre el cierre de una semana
y la modificación de sus celdas: la transacción común no añade bloqueo ni CAS.
La migración es aditiva y transaccional, con RLS, pero su SQL no se puede reejecutar
sin errores de objetos existentes. Mantiene fecha posterior a las migraciones de main.

Las decisiones de código de la sección anterior siguen por revisar; no hay atribución
verificada ni se presume aprobación de Carlos. No se tomó una nueva decisión de negocio.

Aceptación del PR 1: datos, dominio, capacidades, planilla de lectura y pruebas de
aislamiento están implementados; su validación depende del gate. El alcance completo
sigue parcial: pantallas de escritura, móvil, metas, aviso y capas derivadas continúan
en PR 2. Este merge conserva esa separación y no completa esos criterios.
