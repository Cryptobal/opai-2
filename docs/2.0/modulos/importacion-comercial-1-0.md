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

Con módulo **Finanzas** activo, el export incluye `recurringInvoiceSchedules[]` (`FinanceDteRecurringTemplate` de 1.0) y se importa a `finanzas.ventas_programaciones` con su forma real (CAR-25 · B1):

- **Líneas:** cantidad, unidad, precio unitario en CLP **o** en UF (según la moneda), descuento (centésimas de punto), exento y marca de cuenta contable de 1.0 (aún sin equivalente: solo se avisa).
- **Agenda:** frecuencia `monthly | biweekly | weekly | yearly` (→ mensual, quincenal, semanal, anual), `dayOfMonth` 1–31 o -1 (último día), día de semana, mes del año, fechas de inicio y término, política y día de fijación de la UF, ajuste IPC y envío automático. Tipos de documento 33, 34, 56 y 61.
- **Cuenta:** por `crmAccountId` (mapa de importadas); si falta, por RUT del receptor contra las cuentas; si tampoco existe, queda con el **receptor congelado** (RUT, razón social, giro, dirección, comuna, ciudad) y el aviso `programacion_sin_cuenta_en_2_0`. Sin cuenta ni RUT se omite (`sin_cuenta_ni_rut`).
- **Destinatarios:** contactos de `recipientContactIds` y de la cuenta con `recibeFacturacion`, más `receiverEmail` (para) y `receiverEmailCc` (cc) como destinatarios por correo.
- **Estado:** las programaciones entran **pausadas y sin próxima ejecución** (no se copia `nextRunAt`). `ultimo_periodo_1_0` guarda el mes (hora de Chile) de la última corrida exitosa, para que la primera generación en 2.0 sea el período siguiente.
- **Valores no soportados** (tipo, moneda, frecuencia, día fuera de rango, política UF, línea sin precio de la moneda, sin líneas): la programación se **omite** con un motivo nombrado, sin hacer fallar el resto. El informe lo muestra en `omitidas[]`.
- La tabla `finanzas.ventas_programaciones_corridas` (UNIQUE programación + período) la usa la generación de borradores del brief A4.

`cpqQuotes[]` en el export alimenta el plan de **correlativo CPQ** (R54): por año, `fijariaUltimo` = máximo `CPQ-AAAA-NNN` sin sufijo. En apply cada año no omitido se fija con la capacidad **`cpq.correlativos.fijar`** (#203). Cuando el exportador de 1.0 (B2) entregue el recurso `correlativos` (`CpqDocumentCounter`), B3 lo usará como fuente del máximo por año y tipo.

Esquema Zod en `packages/db/scripts/importar-opai1/origen-recurrentes-cpq.ts`; conversión pura en `recurrentes-convertir.ts`.

```json
{
  "recurringInvoiceSchedules": [
    {
      "id": "string",
      "crmAccountId": "string | null",
      "receiverRut": "string | null",
      "installationId": "string | null",
      "active": true,
      "dteType": 33,
      "currency": "UF",
      "frequency": "monthly",
      "dayOfMonth": -1,
      "lines": [
        { "itemName": "Guardia", "quantity": 2, "unitPriceUf": 1.5, "discountPct": 10, "isExempt": false }
      ],
      "receiverEmail": "pagos@ejemplo.cl",
      "receiverEmailCc": ["cobranza@ejemplo.cl"],
      "recipientContactIds": ["contact-opai1-id"],
      "lastSuccessfulRun": { "runAt": "2026-10-01T12:00:00.000Z", "period": "2026-10" },
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
