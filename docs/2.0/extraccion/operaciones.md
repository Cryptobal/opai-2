# Extracción de OPAI 1.0 — Operaciones (puestos, asignaciones, pauta, turnos extra, supervisión)

**Estado:** **esqueleto** (25-oct-2026, CAR-10). Se escribe antes del Brief 11 porque ADR-047 exige la extracción de los módulos que existen en 1.0 y ADR-048 (punto 6) envía aquí la regla de la pauta. **Falta la extracción completa contra el código de 1.0** (`Cryptobal/opai`, solo lectura), que la completa antes del Brief 11.

Cada dato lleva su fuente. **Sin verificar** = no se comprobó en el código de 1.0 en este PR.

## 1. Lo ya verificado en otras extracciones

- **Puesto operativo** (`ops.puestos_operativos`, `OpsPuestoOperativo`): `name`, `cargoId`, `rolId`, `puestoTrabajoId`, `shiftStart`/`shiftEnd`, `weekdays[]`, `requiredGuards`, `baseSalary`, `teMontoClp`, `salaryStructureId`, `active`, `activeFrom`/`activeUntil`. Fuente: `extraccion/maestros.md` §5 (`Cryptobal/opai` @ `53bb97d`).
- **Patrón de turno** como entidad de CPQ (`CpqRol`) y tipo de puesto (`CpqPuestoTrabajo`). Fuente: `extraccion/maestros.md` §5.
- **Creación de puestos:** ganar un negocio **no** crea puestos. Se crean con «Enviar dotación a la instalación» desde la cotización (`src/app/api/cpq/quotes/[id]/send-to-installation/route.ts`, crea `OpsPuestoOperativo` con estructura de sueldo y sincroniza el flujo de caja) o en Operaciones (`src/lib/ops/create-puestos.ts`, `POST /api/ops/puestos`, herramienta MCP `create_ops_puesto`). Fuente: `extraccion/comercial-y-cpq.md` §8 (`09ab4fe`).
- **Guardia** (`OpsGuardia`): `currentInstallationId`, instalación prevista, `availableExtraShifts`, ciclo de vida, contrato y datos DT. Fuente: `extraccion/maestros.md` §4.
- **Configuración «alertas-cobertura»** existe en `/opai/configuracion`. Fuente: `extraccion/integraciones-y-configuracion-por-tenant.md`.

## 2. Lo que se sabe y falta verificar

- **Sin verificar:** el flujo de puestos → asignaciones → pauta → turnos → turnos extra usa unas **17 tablas** en 1.0 (dato del operador OPAI 2.0; falta listarlas con su modelo Prisma).
- **Sin verificar:** las alertas de cobertura usan un **radio de 30 km** (dato del operador; falta ubicar la regla y su parámetro en el código).
- **Sin verificar:** cómo guarda 1.0 la pauta (fila por persona y día o por series), cómo maneja los turnos extra y su pago (`teMontoClp`), y el flujo de supervisión, visitas y libro de novedades.

## 3. Reglas que 2.0 ya decidió (para contrastar con 1.0)

- Pauta por **series y excepciones**; nunca una fila por trabajador por día; repintar no toca días pasados ni días con marca (ADR-048, punto 6).
- 1 puesto = 1 posición; catálogo de patrones por tenant; PPC con motivo; los puestos no se crean solos: al ganar el negocio se ofrecen y RRHH los confirma (reglas definidas por Carlos el 25-oct y respuesta 3 de ADR-048, 23:08–23:10; notas en ADR-036 y ADR-040; `modulos/operaciones.md`, borrador).

## 4. Pendiente para completar esta extracción

1. Modelos Prisma del flujo de Operaciones y sus relaciones (las ~17 tablas), con la fuente y el commit.
2. Reglas de la pauta, PPC, turnos extra, supervisión, visitas y novedades, con su archivo de origen.
3. Alertas de cobertura: disparador, radio y destinatarios.
4. Uso real en Gard (qué se usa a diario y qué no) y lista de lo que no se porta.
