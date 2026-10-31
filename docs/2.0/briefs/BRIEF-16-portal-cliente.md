# BRIEF DE IMPLEMENTACIÓN — 16 PORTAL CLIENTE

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `feat/portal-cliente-pr1` (desde `origin/main`) · **Fecha:** 30-oct-2026 · **Tarea:** CAR-88 (`Refs CAR-88`) · **Fase:** 3 · **Estado:** PR 1 construido; PR 2 pendiente de dependencias.

**Especificación:** [`docs/2.0/modulos/portal-cliente.md`](../modulos/portal-cliente.md) (escrita en este PR; Carlos la aprueba al integrar el PR 1). **Diseño aprobado:** [`docs/2.0/diseño/export-portal-cliente/`](../diseño/export-portal-cliente/README.md) (v3, aprobado el 30-oct-2026 12:05 CLT). **Autorización de construir:** Carlos, 30-oct-2026 («Exactamente, tú a Claude.»).

> **1.0 es el piso, no el techo.** El portal de 1.0 daba al cliente sus instalaciones, reportes y documentos. 2.0 conserva eso y agrega alcance fail-closed por contacto e instalación, configuración por cuenta con Ley 21.719 y un resumen que ES el informe mensual.

## 1. Objetivo

Construir el **acceso** del contacto de un cliente a su portal y la **configuración** de lo que ve. Hoy no existe el vínculo usuario-cliente ↔ cuenta/instalaciones: sin él, ningún dato del portal puede mostrarse con seguridad. Es lo central del PR 1.

## 2. Estado del repo y dependencias (verificado en `origin/main` `17f868f`, 30-oct-2026)

| Existe en `main` | No existe en `main` (→ PR 2) |
|---|---|
| Route group `(cliente)/cliente` (placeholder), `portal-layout`, `portal-inicio`, `portales.ts`; membresía con `portales` (incl. `cliente`); maestros (cuentas, contactos, instalaciones); Rondas backend; Documentos; 07d (Ley 21.719) | Marcaciones de Asistencia (CAR-89), libro de novedades (CAR-77), supervisión (CAR-83), control de acceso operativo, CPQ (#147: cotizaciones y aceptación en línea) |

Decisión de coherencia rol-portal: el diseño de NÚCLEO-D1 prohibía el portal `cliente` en toda membresía. Este PR lo permite **solo** para `viewer` con `cliente` como único portal (`esMembresiaDeCliente`, `@opai/domain`); mezclarlo con un portal interno sigue siendo incoherente.

## 3. Hoja de alcance (para la aprobación de Carlos)

| Pantalla de 1.0 / diseño v3 | PR | Notas |
|---|---|---|
| 01 Resumen del mes | **PR 1** | Instalaciones habilitadas; secciones sin datos = «pendiente», sin cifras |
| 12 Configuración Portal Cliente | **PR 1** | En el ERP, con Ley 21.719 |
| Gestión de accesos | **PR 1** | Pestaña nueva en la ficha de la cuenta, archivos nuevos |
| 10 Documentos y protocolos | PR 2 | Requiere Personas y Cargos (#165) y lectura auditada (NÚCLEO-H) de documentos de personas |
| 02 Cobertura, 04 Libro (comentar), 05 Supervisión, 06 Accesos | PR 2 | Sus fuentes no están en `main` |
| 08 Cotizaciones (+ aceptar en línea), 13 Prospecto | PR 2 | CPQ #147 |
| 03 Rondas, 09 Reportes, 11 Solicitudes | PR 2 | Tickets #169; ejecución de Rondas en terreno |

Decididos por Carlos (no se reabren): el cliente ve cobertura y no costo; acepta la cotización en línea y comenta una novedad; ve nombre, foto y RUT de los guardias y el precio de su cotización vigente fuera de pauta; el resumen ES el informe; Ley 21.719. **Pendientes de Carlos (variante B):** guardias «en turno» vs «asignados»; PDF por correo además del portal; selector de varias empresas cliente; RUT en reportes descargables (por defecto omitido).

## 4. Plan de PRs

### PR 1 — Acceso, configuración y pantallas con lo que existe (este PR)

| Bloque | Contenido |
|---|---|
| A | Spec, este brief y una línea en `ESTADO.md` |
| B | `portal-cliente.prisma` (schema `portal_cliente`: `accesos`, `acceso_instalaciones`, `config_cuentas`); capacidades `portal_cliente.accesos.{listar,candidatos,vincular,actualizar}`, `portal_cliente.config.{leer,actualizar}`, `portal_cliente.{mi_acceso,resumen.leer}`; MCP con `preview_…` |
| C | Migración `20261030213000_portal_cliente_acceso`: aditiva, reversible, FORCE RLS, triggers de mismo tenant y de «la instalación es de la cuenta del acceso» |
| D | Pantallas: 01 Resumen, 12 Configuración y accesos en el ERP |
| E | Tests: dominio, `test:db` (aislamiento entre tenants y entre cuentas), snapshot MCP y paridad, e2e |

### PR 2 — Datos del portal (cuando existan sus fuentes)

02, 04, 05, 06, 08, 09, 10, 11, 13; aceptación de cotización y comentario de novedades; invitación con vínculo automático (hoy el contacto se invita desde Usuarios con portal «Cliente» y se vincula con `accesos.vincular`).

## 5. Arquitectura

- **Alcance (R1–R3, R10):** `accesoDelActor` (capacidades del portal) exige membresía de cliente + acceso `activo`; `fuentes.ts` además acota `ctx.alcance` del contacto a sus instalaciones habilitadas. El rol sistema «Contacto del cliente» solo tiene `portal_cliente:read`.
- **Datos personales:** el PR 1 no expone personas; las lecturas que revelan usuarios (`accesos.listar`, `candidatos`) se auditan con los IDs revelados (NÚCLEO-H).
- **Sin integraciones** ni credenciales.

## 6. Criterios de aceptación

- **CA1.** Un contacto sin acceso `activo` recibe FORBIDDEN en todas las capacidades del portal; suspender corta al instante.
- **CA2.** Un contacto limitado ve solo sus instalaciones; uno con «todas» ve las activas de su cuenta; ninguno ve las de otra cuenta ni de otra empresa (capacidad y base).
- **CA3.** La configuración rechaza tipos de documento vedados y correos inválidos; sin fila rigen los defectos fail-closed.
- **CA4.** `test:db` prueba aislamiento entre tenants y entre cuentas del mismo tenant.
- **CA5.** Herramientas MCP con vista previa; vincular/actualizar piden aprobación humana a agentes.

## 7. Gate

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build` antes de cada push; e2e solo de los specs nuevos (1 worker). Migración **no aplicada** en Neon (la aplica el bot «OPAI 2.0» con respaldo).

## 8. Riesgos

- La relajación de la coherencia rol-portal es la decisión más sensible; está acotada a un caso y probada.
- Sin PR 2 el portal muestra instalaciones y estados «pendientes»: es intencional (vacío honesto).

## Historial

- 30-oct-2026 — versión inicial (Claude).
