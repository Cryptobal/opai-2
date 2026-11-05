# BRIEF-35 · Plataforma: cobro por módulo (CAR-188)

**Plataforma · Code · 5-nov-2026 · rama `brief/car-188-plataforma-cobro-modulos` · ADR-071 y su adenda · hoja: `modulos/plataforma-hoja-alcance.md`**

Dos PRs, uno a la vez: **PR 1 Cobro** (#317) y **PR 2 Pruebas y solo lectura** (después de integrar el 1).

## 1. Objetivo

Que Plataforma sepa cuánto cobrarle a cada empresa y deje cada mes un **cargo listo para facturar**, sin emitir facturas ni usar SimpleAPI. Ver de un vistazo qué se factura y qué no (con su motivo), por empresa y en total.

## 2. Decisiones de Carlos que rigen (ADR-071 y adenda, 4-nov-2026)

1. **Plan base mensual fijo en UF** por empresa: el «módulo» reservado `base` (`PLAN_BASE`). Siempre aparece; se cobra si la empresa no está suspendida.
2. **Cada módulo tiene su precio y su unidad.** Forma de cobro: **fijo mensual**, o **por unidad × cantidad del mes**, con **mínimo mensual opcional** y **después el descuento**. La cantidad del mes queda guardada en el cargo. Moneda por defecto: UF (CLP permitido).
3. **Unidades de referencia** (los montos los fija Carlos en Plataforma; no se siembran precios): Finanzas fijo; Rendiciones por usuario que rinde (`rendiciones:rendir`; los aprobadores no se cobran); Asistencia, Nómina y Cumplimiento DT por trabajador activo con mínimo; Operaciones/Pauta por instalación activa; Comercial y CPQ por usuario con licencia; firma por uso (fuera de este brief).
4. **Pruebas** (PR 2): no hay autoservicio; las abre Plataforma a una empresa validada (con RUT), por módulo y con fecha de término. Aviso 7 días antes. Al vencer: con «pasa a cobro» se cobra desde el día siguiente; sin él, el módulo queda en **solo lectura** (nada se borra).
5. **Primer mes proporcional** por días; los siguientes, completos.
6. **UF del cargo:** la del último día del mes cobrado. Sin ella, el cargo en UF se omite con motivo y se reintenta al día siguiente.
7. **Sin facturas reales ni SimpleAPI.**

## 3. PR 1 · Cobro

- **Dominio** (`packages/domain/src/cobros/`): `cargoDelMes(condicion, estadoModulo, periodo, cantidad)`. Orden: fijo o cantidad × precio → mínimo → prorrateo del primer mes → descuento. Aritmética entera (CLP en pesos, UF × 10.000, descuento en `PCT_ESCALA`). Cantidad 0 sin mínimo: no se factura (`bonificado`).
- **Datos** (migración `20261106210000_core_cobro_modulos`, aún sin aplicar, aditiva): `core.cobro_condiciones` y `core.cobro_cargos` con `forma`, `unidad`, `minimo_mensual`, `pasa_a_cobro` y `cantidad`; RLS + FORCE + `tenant_isolation`; único parcial del cargo vigente.
- **Conteo de unidades** (`unidadesCobro()` + `contarUnidades`, sin datos personales en la salida), al calcular y al generar (el trabajo corre el día 1): `usuario_activo` (membresías activas), `usuario_rinde` (con `rendiciones:rendir` efectivo: rol base o personalizado más excepciones), `usuario_licencia` (algún permiso efectivo del módulo; **propuesta, DECISIÓN CARLOS**), `trabajador_activo` (personas con vínculo vigente), `instalacion_activa`.
- **Capacidades** `platform.cobros.*`: `resumen` (plan base y módulos con forma, unidad, cantidad, mensual, monto y motivo; totales «se facturan» / «no se facturan»), `condiciones_set` (irreversible, `dryRun` con el mes en curso y la cantidad de hoy; acepta `moduloId: "base"`), `cargos_generar` (idempotente), `cargos_list`, `cargo_anular`. Trabajo diario `core.cobros.generar_mes_anterior`.
- **Pantallas** (DS 2.0; sin diseño aprobado de Facturación ni Cobro, base: Plataforma de `export-maestros` 48–51): `/platform/facturacion` separa «Se facturan» y «No se facturan» con su motivo; pestaña «Cobro» de la empresa edita la condición con vista previa.

## 3b. Entre el PR 1 y el PR 2 · RUT de la empresa (decisión de Carlos, 5-nov-2026)

Abrir una prueba exige una empresa validada con RUT. El RUT vive en `core.perfil_empresa.rut`, pero «Nueva empresa» no lo pedía. Se agrega: razón social y RUT obligatorios al crear la empresa (guardados con ella en una transacción), «Datos tributarios» editables en la ficha, aviso «Falta el RUT» en Atención, `platform.tenants.perfil_get` y `perfil_set`, e índice único parcial del RUT. Las empresas existentes quedan sin RUT hasta que Plataforma lo complete.

## 4. PR 2 · Pruebas y solo lectura

`platform.cobros.prueba_abrir`; trabajo diario de aviso a 7 días (ficha de empresa «Atención» y «Pruebas por vencer» en Facturación); al vencer, `activo` (pasa a cobro) o estado nuevo `solo_lectura` (`executeCapability` rechaza escrituras e irreversibles del módulo y deja pasar lecturas); `platform.modules.set` acepta `solo_lectura` y pasa a `irreversible` (hallazgo §2.9). Toca permisos: pide «Revisor OPAI 2.0: sin bloqueos».

## 5. Seguridad y tenant

Solo `platformRole` (`platform:tenants.read` / `.manage`). Toda escritura y lectura queda en la auditoría global y las escrituras también en la empresa objetivo, con antes y después en `condiciones_set`. Las operaciones filtran por `tenantId` además de la RLS. Lo irreversible pide aprobación humana a un agente.

## 6. Tests

Dominio (fijo, por unidad, mínimo, descuento, proporcional, UF del último día, prueba con y sin «pasa a cobro», cantidad 0); capacidades en memoria (permisos, `dryRun`, idempotencia, cantidad en el cargo, plan base, auditoría); `test:db` con dos empresas sobre RLS real, incluido el conteo de unidades; Playwright de las dos pantallas a 375, 1024 y 1280 px.

## 7. Riesgos y rollback

Migración aditiva (`DROP TABLE`). Nada se cobra ni se emite. Los precios no se siembran: sin condición, nada se factura.

## 8. Reporte de ejecución

Ver el PR.
