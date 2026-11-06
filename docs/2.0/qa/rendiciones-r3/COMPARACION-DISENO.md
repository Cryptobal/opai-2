# Rendiciones R3 · comparación con el diseño aprobado (CAR-208)

Fuente: `docs/2.0/diseño/export-rendiciones-v3/Rendiciones OPAI 2.0 — módulo completo.html` (pantallas de escritorio «Bandeja del aprobador» y «Lotes de pago»). Capturas en esta carpeta (375, 1024 y 1280 px, datos ficticios de las empresas `qa-rendiciones-r3` y `qa-rendiciones-r3-b`).

## Qué coincide
- **Bandeja:** tres totales (Por revisar, Monto por revisar, Aprobadas sin pagar), lista a la izquierda y detalle a la derecha, acciones Aprobar / Devolver / Rechazar con un motivo obligatorio al devolver o rechazar, y el aviso «Es tu propia rendición: no puedes aprobarla».
- **Lotes:** tabla «Aprobadas listas para pagar» con casilla, código, persona, cuenta de destino y total; etiqueta «Sin datos bancarios en la ficha» que bloquea la casilla; «Crear lote» con el conteo y el total; descarga de la nómina Santander.

## Diferencias (y por qué)
| Diseño | Código | Motivo |
|---|---|---|
| «Las cuentas de destino se copiaron de la Ficha al lote» | El lote **no copia** la cuenta: guarda la versión de la ficha y falla si cambió | Evita duplicar un dato personal cifrado (Ley 21.719); se avisa al anular y rearmar |
| Cuenta de destino con los últimos dígitos | Banco y tipo de cuenta, sin número | Las listas no revelan cuentas; el número solo está en el archivo |
| «Confirmar lote y marcar como pagadas» en un paso | Tres pasos: crear (borrador) → aprobar (otra persona) → marcar pagado con fecha y referencia | Regla de negocio de R3: crear y aprobar son personas distintas; pagar exige evidencia |
| Descargar nómina disponible siempre | Detrás del ajuste `nomina_formato_confirmado` | **DECISIÓN CARLOS:** el formato no está documentado |
| Aviso de boleta duplicada en el detalle | No incluido | Queda para el seguimiento; la capacidad `rendiciones.duplicados.consultar` existe |
| «Conciliado con el movimiento del banco» | No incluido | Fuera de alcance (conciliación) |
| Filtros de la bandeja no aparecen en el diseño | Se agregaron estado, quien rinde y fechas | Pedido en el encargo |
| Detalle en panel fijo en todos los anchos | Desde 1024 px lista y detalle lado a lado; en 375 son pantallas distintas | Patrón `SplitScreen` del DS |
| Pantalla de la nómina (no existe en el diseño) | Botón en el detalle del lote | Se usó la pantalla más cercana (detalle del lote); sin rediseño |

## Verificación
`apps/web/e2e/rendiciones-r3.spec.ts` (6 pruebas × 3 viewports): aprobador, devolver con motivo, aprobador sin lotes, viewer sin permiso, gerente con la aprobada sin datos bancarios, y empresa B sin aprobador y sin ver lo de A.
