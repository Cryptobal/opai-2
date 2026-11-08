# Aceptación pendiente de Rendiciones R3 (CAR-208) — caso sintético

**Alcance aprobado:** R3 integrado en el PR #361 (`bc5f47a`), autorizado **solo en test** (decisión de Carlos del 6-nov-2026). Este documento no cambia código ni amplía a R4. Todo dato es ficticio, en empresas `qa-*`. **No se transfieren fondos, no se usa ningún archivo bancario real y no se toca Gard.** «Marcar pagado» solo registra fecha y referencia; OPAI nunca transmite al banco.

**Quién valida:** OPAI 2.0 (bot) en `preview.opai.cl`, con `@opai-2.0:` en un PR. Una QA independiente no acredita que la web sea segura; solo aporta hallazgos. No se espera una prueba manual de Carlos.

## 1. Datos del caso (todos ficticios)

Empresa A `qa-rendiciones-r3` y empresa B `qa-rendiciones-r3-b` (aislamiento), sembradas con `pnpm --filter @opai/auth seed:rendiciones-r3-e2e` (solo base e2e/dev; rechaza Gard y toda base que no sea de pruebas).

| Rol (empresa A) | Persona ficticia | Permiso relevante |
| --- | --- | --- |
| Quien rinde | Sofía Supervisora (QA) | `rendiciones:rendir` |
| Aprobador designado | Ana Aprobadora (QA) | `rendiciones:aprobar` |
| Arma el lote | Gabriel Gerente (QA) | `rendiciones:pagar` |
| Aprueba el lote | Greta Gerente (QA) | `rendiciones:pagar.aprobar` |
| Sin permisos | Vera Viewer (QA) | ninguno |

Rendiciones de la semilla: REN-910001 $12.500 (enviada), REN-910002 $7.490 (enviada), REN-910003 $18.000 (aprobada). Total del lote esperado: **$37.990** (CLP entero, una sola fila de nómina porque las tres son de la misma persona).

Precondiciones que **no** crea la semilla y que se cargan solo en la empresa A, con datos inventados:
- Ficha de pago de Sofía: banco «Banco de Chile» (SBIF `001`), RUT titular `11.111.111-1` (dígito verificador válido), cuenta destino `000000000001`.
- Una cuenta de Bancos de la empresa A (cuenta de origen ficticia, p. ej. `9990000001`, banco ficticio, activa).
- Para comprobar «Ver respaldo» (opcional): crear en la empresa A una rendición nueva de Sofía con una foto ficticia de boleta subida por el flujo normal (documento del núcleo); la semilla no sube documentos.
- Ajustes del módulo en la empresa A: `nomina_formato_confirmado` = encendido y `nomina_cuenta_origen_id` = la cuenta anterior. Los enciende quien administra la empresa QA; el apagado es el estado por defecto y debe verificarse primero.

## 2. Recorrido y resultado esperado

| # | Quién | Acción (capacidad) | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Ana | Bandeja: listar y abrir REN-910001 y REN-910002 (`rendiciones.bandeja.listar/obtener`) | Ve ambas; la semilla las crea con motivo «Dato de prueba» y **sin respaldo**, así que «Ver respaldo» no aparece (ver precondición de respaldo); Sofía no ve la bandeja ajena; Vera, «sin permiso». |
| 2 | Ana | Aprobar las dos (`rendiciones.rendiciones.aprobar`, `…devolver`, `…rechazar`), probar además devolver y rechazar sin motivo | Aprobadas; devolver y rechazar sin motivo se rechazan por validación. Sofía no puede aprobar lo suyo. |
| 3 | Gabriel | Crear lote con las tres (`rendiciones.lotes.crear`, antes `preview_…`) | Lote `LP-1` en borrador, total $37.990 calculado por el servidor. Una rendición ya en un lote activo no entra en otro. |
| 4 | Gabriel | Intentar aprobar su propio lote | Rechazado (quien crea no es el único que aprueba). |
| 5 | Greta | Aprobar el lote (`rendiciones.lotes.aprobar`) | Estado aprobado; total, cantidad e ítems ya no cambian (trigger). |
| 6 | Gabriel | Generar nómina (`rendiciones.lotes.generar_nomina`) | Estado generado; no devuelve cuentas. Con el ajuste apagado: rechazo explícito. |
| 7 | Persona (no agente) | Descargar `LP-1-santander.xlsx` (`nomina_descargar`, solo personas) | Archivo con el formato de la sección 3; auditoría con solo IDs. |
| 8 | Gabriel | Marcar pagado con fecha ≤ hoy y referencia ficticia (`rendiciones.lotes.marcar_pagado`) | Irreversible; un agente recibe `APPROVAL_REQUIRED`; las tres rendiciones pasan a «Pagada». Es un registro, no una transferencia. |
| 9 | Aislamiento | Empresa B (`sin-aprobador`) | No ve ni modifica lotes ni rendiciones de A; sin aprobador, la bandeja lo dice. |

## 3. Requisitos exactos de la nómina Santander (empresa ficticia)

Fuente: decisión de Carlos del 6-nov-2026 (PR #361), implementada en `modules/rendiciones/domain/nomina.ts` y `capabilities/lotes-nomina.ts`.

- **Archivo:** XLSX, hoja «Santander», nombre `{códigoLote}-santander.xlsx` (p. ej. `LP-1-santander.xlsx`). Fila 1 de encabezado en negrita y congelada; sin anchos fijos; una fila por beneficiario (se suman sus rendiciones del lote).
- **13 columnas, en este orden y con estos encabezados exactos:** `Cuenta origen`, `Moneda origen`, `Cuenta destino`, `Moneda destino`, `Codigo banco destino` (sin tilde), `RUT beneficiario`, `Nombre beneficiario`, `Monto transferencia`, `Glosa personalizada transferencia`, `Correo beneficiario`, `Mensaje correo beneficiario`, `Glosa cartola originador`, `Glosa cartola beneficiario`.
- **Valores:** monedas `CLP`; cuentas solo dígitos; código de banco SBIF de 3 dígitos (el tipo de cuenta no va); RUT con formato y dígito verificador válido; monto entero CLP mayor que cero; glosa personalizada = código del lote; correo del beneficiario si existe; columnas K, L y M vacías.
- **Bloquea la descarga si falta:** cuenta de origen configurada; por beneficiario RUT válido, cuenta destino, código SBIF reconocible y monto > 0 (el mensaje nombra a quién y qué falta); que la ficha de pago no haya cambiado desde que se armó el lote (si cambió, se anula y se rearma).
- **Total:** la suma de las filas debe igualar el total del lote.

### Cuenta de origen (solo empresa ficticia)
- No es texto libre: se elige entre las cuentas **activas** ya ingresadas en Bancos de esa empresa (`rendiciones.nomina.cuentas_origen`) y se guarda con `core.config.set` en `nomina_cuenta_origen_id`.
- Se usa el número visible de la cuenta, solo dígitos. Una cuenta inactiva o inexistente equivale a «no configurada» y bloquea la generación.
- Ninguna cuenta real, de Gard o de otra empresa, participa en la prueba.

## 4. Contabilidad e informes: qué cubre R3 y qué no

- **Contabilidad:** R3 **no** crea asientos ni movimientos bancarios (la integración contable posterior quedó fuera del PR, ADR-048). La prueba aceptable es negativa: tras marcar pagado, Bancos y contabilidad de la empresa A no cambian. Un asiento o conciliación del pago pertenece a un trabajo posterior de Finanzas (BRIEF-23, CAR-98), no a este cierre.
- **Informes:** el reporte de rendiciones y la configuración del módulo son R4. En R3 solo existen los totales de la bandeja, las listas y el detalle de lotes, y los eventos `rendiciones.lote.*` y `rendiciones.rendicion.pagada`.

## 5. Siguiente paso verificable

1. Quien administra la empresa QA carga las precondiciones de la sección 1 y enciende el ajuste.
2. OPAI 2.0 ejecuta el recorrido de la sección 2 en `preview.opai.cl` con las capturas ya documentadas (`COMPARACION-DISENO.md`) como referencia y comenta el resultado por paso; luego corre `pnpm mcp:verificar`.
3. Cierre de R3: los 9 pasos en verde, con la nómina `LP-1-santander.xlsx` validada contra la sección 3 (solo estructura; el archivo de prueba no se sube a ningún banco).
