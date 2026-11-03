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
| **Finanzas** | Programaciones de facturas recurrentes de 1.0 **no se crean**; tributarios igual se importan en la cuenta (`modulo_finanzas_inactivo`) | Con módulo Finanzas: import a `finanzas.ventas_programaciones` vía `comercial.importar_1_0` (PR recurrentes CAR-25) |

### Dry-run

El plan marca cuentas con **`tributario_incompleto`** (campos faltantes sin PII en el reporte). Una cuenta **lista para facturar** exige RUT válido y todos los campos tributarios obligatorios; no se inventan valores por defecto.

## Origen JSON

Esquema Zod en `packages/db/scripts/importar-opai1/origen.ts`. Campos de cuenta alineados con `docs/2.0/extraccion/maestros.md` (`giro`, `address`, `commune`, `city`, `emailDte`). Opcional: `recurringInvoiceSchedules[]` para filas de programación recurrente de 1.0 (solo contabilizadas en pendientes hasta haber modelo Finanzas).

## Identificadores

- En el JSON de 1.0: `id` de cada fila.
- En 2.0: `core.ids_externos` con sistema **`opai1`**.

## Programación de facturas recurrentes

Con módulo **Finanzas** activo, el export incluye `recurringInvoiceSchedules[]` y se importa a `finanzas.ventas_programaciones` (líneas, destinatarios por ids explícitos en la plantilla más contactos con `recibeFacturacion` en la cuenta, agenda y metadatos). El receptor DTE **no** se copia en la plantilla: emisión manual y programada leen RUT, razón social, giro, dirección y correo desde `core.cuentas`.

El dry-run reporta conteos por acción, destinatarios omitidos (contacto no resuelto) y programaciones fuera por cuenta sin tributarios completos, sin líneas o instalación no resuelta.

`cpqQuotes[]` en el export alimenta el plan de **correlativo CPQ** (R54): por año, `fijariaUltimo` = máximo `CPQ-AAAA-NNN` sin sufijo. En apply (fuera del dry-run) cada año no omitido se fija con la capacidad **`cpq.correlativos.fijar`** (#203); el dry-run del importador invoca la misma capacidad en vista previa.

Esquema Zod en `packages/db/scripts/importar-opai1/origen.ts` (campos alineados a Finanzas › Programación en 1.0: `dayOfMonth`, `facturaTiming`, `recipientContactIds`, etc.).

```json
{
  "recurringInvoiceSchedules": [
    {
      "id": "string",
      "accountId": "string",
      "installationId": "string",
      "name": "string",
      "active": true,
      "dteType": 33,
      "frequency": "monthly",
      "dayOfMonth": 5,
      "currency": "CLP",
      "lines": [{ "description": "Servicio mensual", "amount": 100000 }],
      "plazoPagoDias": 30,
      "recipientContactIds": ["contact-opai1-id"],
      "createdAt": "2026-01-05T12:00:00.000Z",
      "updatedAt": "2026-01-05T12:00:00.000Z"
    }
  ],
  "cpqQuotes": [{ "id": "q1", "code": "CPQ-2026-042", "createdAt": "2026-01-01T12:00:00.000Z" }]
}
```

### TODO(decisión Carlos)

- Cron/worker que genere borradores desde plantillas (fuera de este PR; hoy solo modelo + import).
- Tratamiento de montos en **UF** en plantillas importadas (1.0 mezcla CLP en líneas; confirmar si el export trae conversión).
- Frecuencias distintas de `monthly` si existen en 1.0 (no verificado en export de prueba).

## Referencias

- Simulación previa: `docs/2.0/briefs/BRIEF-07-importacion-opai1-simulacion.md`
- Ventas DTE: `finanzas.ventas` (receptor desde cuenta, no desde el proveedor)
- Operación: `docs/2.0/OPERACION-agentes.md`
