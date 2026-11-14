# BRIEF CAR-330 · Operaciones: informe por instalación

Pedido de Carlos (12-nov-2026, ADR-094 adenda CAR-311 c). Apilado sobre CAR-312 (#579), porque reutiliza los días con turno de los indicadores de Asistencia (CAR-311).

## 1 Objetivo

Comparar instalaciones en un mes por cobertura de la pauta, turnos por cubrir (PPC), refuerzos, ausentismo sin justificación y entradas atrasadas, para ver cuál anda peor. Primero como capacidad con herramienta MCP; la pantalla, después de su diseño en Claude Design.

## 2 Estado actual (verificado)

- `pauta.resumen.leer` ya da cobertura y PPC por instalación (sin asistencia).
- Los indicadores de Asistencia (CAR-311) calculan ausentismo y atrasos por persona desde `asistencia.dias`, turnos esperados y ausencias de la Pauta.

## 3 Alcance

- Capacidad `pauta.informes.instalaciones` (lectura auditada, permiso `pauta:read`, alcance por instalación ADR-022): por instalación, puestos, turnos programados, cobertura %, PPC, refuerzos, días con turno, ausentismo % y atrasos %. Orden por `cobertura` (menor primero), `ppc`, `ausentismo` o `atrasos` (mayor primero); sin dato al final.
- Ausentismo y atrasos solo si Asistencia está activa y quien consulta tiene `asistencia:ver`; si no, `null` y `conAsistencia: false`.
- Misma regla que los indicadores: licencias, vacaciones, pre y postnatal, accidentes, permisos y ausencias justificadas no cuentan; atraso = entrada fuera de la tolerancia de la empresa (15 min por defecto).
- Refactor sin cambio de comportamiento: los días con turno pasan a `packages/capabilities/src/pauta/dias-con-turno.ts`, compartido por el informe y los indicadores de Asistencia.

## 6 Modelo de datos y migraciones

Ninguna.

## 9 Seguridad y tenant

Todo por `forTenant`; instalaciones y puestos con `dondeInstalacion`/`dondePuesto`; los datos de asistencia se ven solo con su permiso. Auditoría de lectura con los IDs de instalación revelados.

## 12 Tests

`asistencia-indicadores-db.test.ts`: los indicadores siguen igual tras el refactor y el informe da 9 días, 44,4 % de ausentismo y 20 % de atrasos en la instalación, y nada en otra empresa. Paridad: herramienta MCP `pauta_informes_instalaciones` en la instantánea.

## 15 Riesgos

Calcula el mes completo por instalación en cada consulta (sin caché); con muchas instalaciones conviene paginar o precalcular. La pantalla queda pendiente de diseño.

## Segunda entrega · pantalla (aprobada por Carlos el 12-nov-2026, 23:25)

**Objetivo.** Ver en pantalla el informe que ya existe por MCP y API (`pauta.informes.instalaciones`).

**Diseño.** Propuesta hecha con el diseño nuevo (ADR-109) y aprobada en el chat. Registro: adenda CAR-330 en ADR-094.

**Alcance.**
- Pestaña **Por instalación** en la barra de la Pauta (junto a Mensual y Diaria), ruta `/pauta/instalaciones`. No entra al menú: Operaciones ya tiene sus 7 entradas.
- `ListScreen`: en teléfono, una tarjeta por instalación con la cobertura destacada y una grilla de 2 columnas con por cubrir, refuerzos, ausentismo y atrasos; en iPad y escritorio, una tabla. La fila abre `/pauta?inst=…&mes=…`.
- Mes y orden en la URL (`?mes=aaaa-mm`, `?orden=`; por defecto, menor cobertura). Descarga CSV del mes en pantalla, armada en el navegador desde lo ya leído (no hay consulta nueva ni ruta nueva).
- El color marca solo el estado, con los umbrales de la adenda (no son metas). Ausentismo y atrasos se ocultan sin Asistencia o sin permiso, con un subtítulo que lo explica.

**Archivos.** `apps/web/app/(erp)/pauta/instalaciones/` (page, datos, barra, vistas, valores) y el enlace en `pauta/_componentes/barra-pauta.tsx`.

**Consultas por navegación.** 1 (`pauta.informes.instalaciones`).

**Seguridad.** Sin capacidad nueva. La pantalla invoca la misma capacidad que el MCP, con alcance por instalación y auditoría de lectura.

**Tests.** `e2e/pauta-instalaciones-preview.spec.ts` (`@preview`, 375/1024/1280). Sin datos de instalaciones en qa-e2e, la prueba verifica el estado vacío.

**Pendiente.** Sembrar una instalación con pauta en qa-e2e para capturar la lista con datos.
