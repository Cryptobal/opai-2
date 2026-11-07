# BRIEF-41 · Emisión, programación y conciliación (CAR-221)

**Autorización:** Carlos, 7-nov-2026 10:26 CLT, para esta sesión: avanzar YA con CAR-221 (emisión/programación, destinatarios/UF/conciliación y nota de débito) según las decisiones existentes (hoja de alcance §4 bloques 3b, 5 y 6; §5; ADR-067/068/073/074/075). Prioridad con asistencia facial y portal terreno. **Candado CAR-191 intacto:** sin DTE real de producción, sin correos reales, sin datos de Gard, sin SimpleFactura; el adaptador SimpleAPI (#364) se reutiliza tal cual. Que #364 esté integrado **no acredita** emisión real: esa prueba depende de insumos externos (abajo).

## Reparto en PR pequeños (cada uno con su tarea, su plan y sus archivos)
| PR | Alcance | Migración |
| --- | --- | --- |
| **A1** | Referencias SII con catálogo cerrado (801 OC, 802 HES, 803 Contrato, 804 Resolución, 52 Guía), folio y **fecha** de cada una; el XML usa la fecha de la referencia (hoy usa la de emisión: error) | Aditiva: `documentos_emitidos_referencias.fecha_ref` (date, null) |
| **A2** | Nota de débito 56 (anula una NC): capacidad con vista previa/idempotencia, payload y estado; paridad MCP | No |
| **A3** | Pantalla Emitir: cuentas facturables (activas con RUT, vacío claro), tipos 33/34/NC/ND, autocompletar tributarios, referencias, destinatarios (casillas DTE y facturación + correo a mano PARA/CC/BCC) | No (usa lo de A1/A2) |
| **B** | Programación: pestaña junto a Ventas, `/programacion/nueva` sin pantalla negra, UF del día de emisión, glosa con `{{periodo}}`, `{{uf_valor}}`, `{{uf_al_dia}}`, `{{monto}}`, envío de proforma/estado de pago | A definir |
| **C** | Bancos › Reconocer: sugerir/buscar/prorrateo/confirmar hasta completar N:M | No |
| **D** | Hoy en Finanzas: **requiere mockup aprobado** (ADR-076); no se inventa layout | — |

## Verificación y criterios del 100 %
Local aislado (testdb): dos tenants ficticios con permisos reales; emisión, rechazo, reintento idempotente, estados, XML (bytes ISO-8859-1), totales, IVA, fecha, UF y notas; correspondencia entre el ERP y la respuesta del proveedor **solo con simulado/mocks, sin confundirlos con certificación**.

**Insumos externos que faltan para certificar (no se piden ni se muestran en chat):** API key de SimpleAPI, certificado digital (.pfx) y su clave, CAF de certificación (33, 34, 56, 61) y resolución del emisor cargados por Carlos en Integraciones de `test.opai.cl`; confirmar en la prueba en vivo `Tipo: 1`, `ServidorBoletaREST: false`, el RUT del SII y el modo de autenticación (DECISIONES de BRIEF-40). Hasta entonces: cobertura con mocks e integración local.
