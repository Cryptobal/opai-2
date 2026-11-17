# CAR-438 · Limpieza 3, parte 9: exportaciones sin uso en `(erp)` (personas, documentos, pauta, instalaciones, remuneraciones)

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** pendiente (rama `cursor/car-438-erp-exports-1f57`)
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

Primera tanda en pantallas `(erp)` según `pnpm simplicidad --detalle`:

- **Personas:** `TonoEstado`, `DIAS_AVISO_VENCIMIENTO`, `Celda`, `PENDIENTES` dejan de exportarse; se eliminan `cargarCargos` y `cargarLaboral` en `datos.ts` (muertas; la ficha usa `lecturas-ficha` / `laboralDe`).
- **Documentos:** `POR_PAGINA` y `entradaDe` internos en `datos.ts`.
- **Pauta instalaciones:** `ORDENES` y `tonoDe` internos.
- **Instalaciones:** `SIN_PATRON` interno en `puestos-filtro.ts`.
- **Remuneraciones:** `OPCIONES` interno; se mantiene `export type Activa` para rutas del segmento.

Simplicidad: exportaciones sin uso 246→235; funciones >60 líneas 670→669 (`simplicidad-base.json` actualizado).

Sin cambio visible en pantalla.

## Qué queda pendiente

- Más áreas de `(erp)` y `apps/web/lib` con exportaciones listadas en simplicidad (configuración, finanzas, etc.), un PR por bloque.

## Qué se decidió

- Alcance mínimo alineado con parte 8; gate local `@opai/web` typecheck, lint y 879 tests en verde.