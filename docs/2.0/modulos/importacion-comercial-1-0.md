# Importación Comercial desde OPAI 1.0

Hoja de alcance para la carga idempotente JSON → 2.0 (`comercial.importar_1_0`, CAR-25 y encargos relacionados).

## Principios (Carlos, nov-2026)

### Integraciones por tenant

SimpleAPI, Octava y cualquier facturador DTE son **integraciones de 2.0** (Configuración › Integraciones). Cada tenant tiene su propia configuración; Gard usa la suya. **Ningún tenant depende de las credenciales de otro.**

El importador **no lee ni exige** una integración DTE configurada. Los datos tributarios del cliente se persisten en **`core.cuentas`** (RUT validado, razón social, giro, dirección/comuna/ciudad tributarias, correo DTE). El enriquecimiento vía SII en runtime usa el proveedor que tenga configurado **ese** tenant; más adelante puede cambiar de facturador sin reimportar.

### Módulos vendibles por separado

El importador recibe el contexto del tenant (`modulosActivos`, igual que MCP y pantallas). **No asume** que Finanzas, Comercial (CRM), CPQ u otros módulos estén contratados.

| Ámbito | Sin módulo | Con módulo |
|--------|------------|------------|
| **Núcleo** | Siempre: cuentas (incl. tributarios en cuenta), contactos, instalaciones, `core.ids_externos` (`opai1`) | — |
| **Comercial (CRM)** | Negocios, etapas e historial quedan en `pendientes` (`modulo_comercial_inactivo`) | Importación cuando el schema comercial esté en `main` (`COMERCIAL_EN_MAIN`) |
| **Finanzas** | Programaciones de facturas recurrentes de 1.0 **no se crean**; tributarios igual se importan en la cuenta (`modulo_finanzas_inactivo`) | Recurrentes solo cuando exista modelo en 2.0 (`pendiente_modelo_finanzas_programacion` hasta entonces) |

### Dry-run

El plan marca cuentas con **`tributario_incompleto`** (campos faltantes sin PII en el reporte). Una cuenta **lista para facturar** exige RUT válido y todos los campos tributarios obligatorios; no se inventan valores por defecto.

## Origen JSON

Esquema Zod en `packages/db/scripts/importar-opai1/origen.ts`. Campos de cuenta alineados con `docs/2.0/extraccion/maestros.md` (`giro`, `address`, `commune`, `city`, `emailDte`). Opcional: `recurringInvoiceSchedules[]` para filas de programación recurrente de 1.0 (solo contabilizadas en pendientes hasta haber modelo Finanzas).

## Identificadores

- En el JSON de 1.0: `id` de cada fila.
- En 2.0: `core.ids_externos` con sistema **`opai1`**.

## Referencias

- Simulación previa: `docs/2.0/briefs/BRIEF-07-importacion-opai1-simulacion.md`
- Ventas DTE: `finanzas.ventas` (receptor desde cuenta, no desde el proveedor)
- Operación: `docs/2.0/OPERACION-agentes.md`
