# CAR-438 · Limpieza 3, parte 11: exportaciones sin uso en maestros y satélites del ERP

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-erp-maestros-1f57`
- **Estado:** En PR
- **Migración:** No
- **Base:** `main` (apilado conceptualmente sobre partes 9–10 abiertas en otros PR; sin solapar esos archivos)

## Qué entra

30 exportaciones sin uso menos en `apps/web/app/(erp)` (simplicidad **246 → 216**):

- **Cuentas y contactos:** `accionesCuenta`, reexports de `ROL_CONTACTO`.
- **Cotizaciones:** constantes/tipos internos de margen y lista, `faltaDeLinea`.
- **Finanzas:** `CODIGO_CORRIGE_TEXTO`, tipos/helpers de bancos/destinos, `CampoDte`, `Grupo` en resumen «hoy».
- **Personas:** helpers de ficha, matriz, previsión, pago y contrato.
- **Pauta:** reexports de dominio y tipos solo internos (`SerieVista`, `PuestoMes`); `presencia` importa `EstadoPresencia` de `@opai/domain`.
- **Negocios, documentos vencimientos, portal cliente, mi-cuenta:** tipos solo usados en el mismo módulo.

Sin cambio de pantalla. `pnpm --filter @opai/web test` en verde (879). Typecheck del monorepo falla por un error previo en `packages/capabilities/.../sensibles.ts`, ajeno a este diff.

## Qué queda pendiente

- Resto de exportaciones sin uso en `(erp)` (configuración y otros PRs parte 9–10).
- CAR-440 (funciones/archivos largos) sigue en backlog.

## Qué se decidió

- Parte 11 acotada a maestros/satélites no tocados por #1011 / #1025.