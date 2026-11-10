# BRIEF CAR-127 · Documentos v4, pantallas 04 a 08

Tarea: [CAR-127](https://linear.app/carlos-irigoyen/issue/CAR-127). Sesión «Personas · Code». Diseño aprobado por Carlos el 30-oct-2026: `docs/2.0/diseño/export-documentos-v4/` (README e Índice). Continúa #265, #284 y #288 (explorador y «Vincular a»).

## 1. Objetivo

Construir las pantallas que faltan del módulo Documentos, tal como están en el export: **04 Vencimientos**, **05 Plantillas**, **06 Editor de plantillas**, **07 Generar documento (con lote B3)** y **08 Firmas pendientes**. Sin Face ID, sin liveness real, sin proveedor biométrico ni FEA real: la firma queda como flujo y estados detrás de un stub o flag apagado.

## 2. Estado actual (verificado en `main` `156376c`)

- `/documentos` (explorador) y `/documentos/firmas` (bandeja de firmas, CAR-82) existen. No hay pestañas entre ellos: el menú tiene dos entradas, «Explorador» y «Firmas».
- Capacidad `core.documentos.vencimientos` (lectura, alcance por filas, `dias` 0–365, filtro por capa) y `core.documentos.renovar` (renovación) existen; ninguna pantalla las usa. `DocumentoTipo` ya trae `diasAlerta` y `hitos`.
- **No existe** modelo de plantillas de documento laboral. `CpqPlantillaDocumento` es del módulo CPQ (salidas comerciales) y no se reutiliza. No existen los permisos `documentos:plantillas.*`.
- `core.firmas.*` (enviar, firmar, completar, verificar, recordar, cancelar) y las tablas `SolicitudFirma`, `Firmante`, `PoliticaFirma` existen (CAR-82).

## 3. Alcance y plan por PR

Un PR por grupo, cada uno revisable por separado y apilado solo si depende del anterior.

| PR | Contenido | Migración |
|---|---|---|
| **1** | Pestañas de Documentos (Explorador · Vencimientos · Plantillas · Firmas pendientes) + **04 Vencimientos** con la capacidad existente + **08 Firmas pendientes** (la bandeja aprobada dentro de las pestañas, vista del diseño) | No |
| **2** | **05 Plantillas**: modelo `core.documento_plantillas` y versiones inmutables, lista (`ListScreen`), permisos `documentos:plantillas.manage`, capacidades de lectura/escritura y paridad MCP | **Sí, aditiva** |
| **3** | **06 Editor de plantillas**: edición en borrador, variables de lista cerrada (`ChipVariable`), vista previa, publicar (aprobación humana), N1/N2 (N3 deshabilitado como en el diseño) | No (usa PR 2) |
| **4** | **07 Generar documento** desde la ficha de la persona + **lote B3**, con la firma detrás de un stub/flag apagado | Probable (registro del lote), a decidir en el PR |

Fuera de alcance: CAR-58 (texto legal del anexo), CAR-101, CAR-124 Postulante/Externo (depende de CAR-96), Face ID real, 09 Importar Word o PDF y 10 Configuración › Módulos › Documentos (no están en este encargo).

## 4. Arquitectura

- Pestañas como rutas reales (server-first, ADR-037), con el `Tabs` del DS, igual que `PestanasVentas`. Las entradas del menú no cambian.
- Todo acceso a datos por capacidades; las pantallas no importan `@opai/db`. Lectura de vencimientos con alcance en la consulta (ADR-022).
- Dominio puro (variables, resolución de texto) en `packages/domain`; sin Next ni Prisma.
- Marca del tenant desde el perfil de marca del núcleo (ADR-028); nunca nombres ni logos de Gard.

## 5. Archivos (PR 1)

- `apps/web/app/(erp)/documentos/_componentes/pestanas-documentos.tsx` (nuevo)
- `apps/web/app/(erp)/documentos/vencimientos/page.tsx` y `_componentes/` (nuevos)
- `apps/web/app/(erp)/documentos/page.tsx` y `firmas/page.tsx` (agregan las pestañas)
- `apps/web/lib/navegacion-entradas.ts` solo si hace falta marcar la pestaña activa
- Tests de `apps/web/test/`, `docs/2.0/paridad/mcp-inventario.md`, `docs/2.0/ESTADO.md`

Los archivos de los PR 2 a 4 se detallan en su propio PR.

## 6. Modelo de datos y migraciones (PR 2 y 4)

Aditivas, con `SET LOCAL lock_timeout`, `tenant_id`, `created_at`, `updated_at`, ids `uuid(7)`, RLS forzada con la política `tenant_isolation` y `GRANT` a `opai_app`. Se describen en el PR que las trae, con `migracion-pendiente` y respaldo previo en Neon (la aplica el bot «OPAI 2.0»). Nada de migración en el PR 1.

## 7. Capacidades

PR 1: ninguna nueva (`core.documentos.vencimientos`, `core.documentos.renovar`, `core.firmas.*`). PR 2 a 4: `core.documento_plantillas.*` y `core.documentos.generar*`, todas con `dryRun`, `idempotencyKey`, auditoría y herramienta MCP (agent-first, ADR-055).

## 8. Interfaz y responsive

Fiel al export, con los estados vacío, cargando, error y sin permiso, a 375, 1024 y 1280. En el teléfono el editor (06) es solo lectura. «Forbidden» sin nombre propio: «Pídele acceso a un administrador». Chips de variable con `t-overline` + `t-mono` (pendiente formalizar `ChipVariable` en el DS).

## 9. Seguridad y tenant

Alcance por filas en la consulta; documentos sensibles filtrados por `filtroDocumentoSensible`; variables `{sueldo.*}` solo con lectura sensible (el diseño 07 lo pide: «owner, admin con lectura sensible»). Lecturas personales auditadas (NÚCLEO-H). Datos de prueba solo sintéticos (QA aislada `opai2_qa`); nunca datos de Gard ni biometría.

## 10. Casos límite

Documento sin fecha de vencimiento (no entra a Vencimientos); vencimiento exactamente hoy; entidad borrada; persona sin dirección (el diseño 07 la marca «Falta la dirección» y la deja sin seleccionar en el lote); lote parcial (cada documento es independiente y reintentable).

## 11. Plan por bloques

Un commit por bloque: (1) brief; (2) pestañas; (3) Vencimientos; (4) Firmas pendientes; (5) tests; (6) ESTADO. Los PR 2 a 4 llevan su propio plan.

## 12. Tests

Vitest para la agrupación de vencimientos (dominio puro) y el armado de parámetros; paridad (`paridad*`) en verde; `test:db` en CI para las capacidades con base; Playwright en 375 y 1024 donde corresponda.

## 13. Validación

Gate local `pnpm typecheck && pnpm lint && pnpm test` (y `test:db` si toca base); en preview, 375/1024/1280 con datos sintéticos. La revisión visual es de Carlos o del bot «OPAI 2.0» (AGENTS.md, A2.10): no se da por hecha.

## 14. Criterios de aceptación

- Las cinco pantallas coinciden con el export aprobado.
- Sin Face ID, liveness, proveedor biométrico ni FEA real; el punto de integración queda detrás de un flag apagado.
- 4 checks obligatorios en verde; `ESTADO.md` con la fila CAR-127 y los pendientes de CAR-182.

## 15. Riesgos, rollback y **preguntas abiertas**

Rollback: cada PR se revierte por separado; las migraciones son aditivas.

**Preguntas abiertas (el diseño no lo define; no se inventa). RESUELTAS el 9-nov-2026: Carlos aceptó las nueve tal como están escritas abajo (adenda de `01-decisiones.md`). Sin número inventado: el tope del lote (punto 5) sigue sin definir y no se fija en código.**

1. **Plantillas laborales vs. salidas comerciales.** El spec `modulos/documentos.md` describe plantillas de *salida comercial* (CPQ); el diseño v4 describe plantillas *laborales* (contrato, anexo, carta, recepción) con variables de persona. ¿Son dos sistemas distintos? Se asume que sí y que las comerciales siguen en CPQ.
2. **Formato del contenido de la plantilla.** ¿Texto con variables `{persona.rut}` renderizado a PDF (se asume), o bloques? El editor del diseño es un documento con variables, sin bloques.
3. **Niveles de firma.** El diseño muestra N1, N2 y N3·FEA (deshabilitado). ¿N1/N2 equivalen a la «clase» de `PoliticaFirma` de CAR-82? Se asume que sí y que N3 queda deshabilitado.
4. **Generación del PDF** en el núcleo: hoy el motor de PDF vive en CPQ. ¿Se mueve un helper neutral a `packages/*` (se asume) o se difiere el PDF?
5. **Lote (B3):** tope de personas por lote y si corre como trabajo en cola (se asume cola, con avance por persona como muestra el diseño).
6. **Permisos nuevos** `documentos:plantillas.manage` (owner y admin, como pide el diseño) y la lectura sensible de `{sueldo.*}`.
7. **Variables disponibles.** El diseño lista Persona, Vínculo, Instalación, Sueldo y Contrato; ¿se agregan más en esta entrega? Se asume que no.
8. **Pestaña «Plantillas» sin permiso:** se asume oculta (el diseño marca gerente, supervisor y viewer «sin permiso»).
9. **Importar Word o PDF** (09) aparece como botón en 05 y 06; se deja deshabilitado con aviso hasta tener su propio encargo.

## 16. Reporte de ejecución

Se completa en cada PR.
