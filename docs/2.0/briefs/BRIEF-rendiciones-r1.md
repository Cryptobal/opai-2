# BRIEF DE IMPLEMENTACIÓN — Rendiciones R1: módulo base, modelo y capacidades

Rama `brief/rendiciones-r1` · PR #303 · `Fixes CAR-175` · Sesión 2. Fuentes: [alcance-rendiciones.md](../diseño/alcance-rendiciones.md) (decisiones de Carlos, 4-nov-2026), [extracción de 1.0](../extraccion/rendiciones.md), diseño aprobado `diseño/export-rendiciones/`, ADR-048 y ADR-069.

## 1. Objetivo
Dejar el módulo vendible **Rendiciones** (se vende solo, sin Finanzas) con su modelo de datos y las capacidades de la rendición de **compra** con **un nivel de aprobación y aprobador asignado**. Sin pantallas: las trae R2 (solicitante) y R3 (aprobador).

## 2. Estado actual (verificado)
`main` `fbb4554`. No existe módulo `rendiciones` ni schema; en 1.0 la rendición vive en `FinanceRendicion*` (115 reglas extraídas). La auditoría del 3-nov puso Rendiciones en 0 %. Revisados los PR abiertos (#241, #246, #299, #301, #302, #168): ninguno toca este módulo; comparten solo líneas de ESTADO, ADR, permisos y las instantáneas del MCP.

## 3. Alcance
Incluye: schema `rendiciones` (rendición, gastos, historial, contador REN-n), 9 capacidades con MCP, `dryRun` e idempotencia, 4 permisos, 2 ajustes, 7 eventos. **No incluye** (otros bloques): kilometraje configurable (R2), pantallas, lotes de pago y nómina (R3), reporte y exportación (R4), traspaso contable (R5), extracción por IA de la boleta y rendir desde el portal del guardia.

## 4. Arquitectura
Módulo `modules/rendiciones` (`@opai/mod-rendiciones`, sin dependencias de otros módulos). Dominio puro en `domain/` (estados, transiciones, duplicados, quién decide). Capacidades en `capabilities/`. Las reglas viven en las capacidades y el dominio; la UI futura solo las invoca (ADR-004).

## 5. Archivos
`modules/rendiciones/{manifest.ts,domain,capabilities}` · `packages/db/prisma/schema/rendiciones.prisma` · migración `20261106123000_rendiciones_base` · `packages/capabilities/test/rendiciones-db.test.ts` · `packages/domain/src/permisos-patrones.ts` (supervisor puede rendir) · instantáneas MCP · ESTADO y ADR-069.

## 6. Modelo de datos y migración (aditiva)
`rendiciones.rendiciones` (estado, solicitante, aprobador, centro de costo = instalación activa o administración, monto total CLP entero), `rendicion_items`, `rendicion_historial` (append-only), `rendicion_contadores`. RLS `tenant_isolation` con FORCE en las cuatro, trigger `mismo_tenant` para instalación, documento y rendición, y CHECK de que nadie sea su propio aprobador. `SET LOCAL lock_timeout`. **No se aplica en Neon**: lo hace el bot «OPAI 2.0» con respaldo (`migracion-pendiente`).

## 7. Capacidades
`listar` (propias, por aprobar, todas) · `obtener` · `crear` · `actualizar` (borrador o devuelta) · `enviar` · `anular` · `aprobar` y `rechazar` (**irreversibles**: un agente necesita aprobación humana) · `devolver`. Todas con `dryRun`; las escrituras se auditan en su transacción y emiten evento.

## 8. Interfaz y responsive
Sin pantallas en R1; no hay entrada de navegación. El módulo es operable por MCP/API.

## 9. Seguridad y tenant
Tenant de la sesión o la key, nunca del body. Solo usuarios del ERP con permiso. **El solicitante nunca aprueba, rechaza ni devuelve la suya**; solo decide el aprobador asignado, que debe ser miembro activo con `rendiciones:aprobar`. Alcance en la consulta (ADR-022): se ve lo propio, lo asignado, o todo con `rendiciones:ver_todas`. Texto de motivos y proveedores es dato, no instrucción.

## 10. Casos límite
Dos envíos o decisiones a la vez (`updateMany` con estado esperado → CONFLICT) · código REN-n sin repetirse (UPDATE del contador bloquea la fila) · boleta repetida (proveedor + folio + monto) solo avisa · sin respaldo solo con motivo y apagable por empresa · fecha futura rechazada · instalación inactiva o de otra empresa rechazada · devolver ≠ rechazar.

## 11. Plan por bloques
1) modelo y migración · 2) dominio con tests · 3) capacidades, permisos y manifest · 4) test con base, instantáneas MCP · 5) ADR-069 y ESTADO.

## 12. Tests
Dominio (9) y `rendiciones-db.test.ts` (7, Postgres real): flujo completo, nadie decide la suya, devolver/rechazar, duplicados y respaldo, vista previa sin efectos, aislamiento entre empresas y no-parte.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`, gate de paridad y presupuesto de JS (sin cambios: no hay UI).

## 14. Criterios de aceptación
Rendir y aprobar por MCP de punta a punta; ninguna ruta deja decidir al solicitante; dos empresas aisladas; instantáneas e inventario al día; migración aditiva con RLS.

## 15. Riesgos y rollback
Migración aditiva: el rollback es `DROP SCHEMA rendiciones` si nada la usa todavía. Riesgo: el aprobador por defecto es un ajuste de texto (UUID) hasta que R4 dé el selector de usuarios.

## 16. Reporte de ejecución
Se completa al integrar (ESTADO).
