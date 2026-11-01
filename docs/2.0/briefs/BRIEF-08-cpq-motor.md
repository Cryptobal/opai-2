# Brief 08 · Motor CPQ · PR A

Encargo CAR-133, referencia CAR-119, 1-nov-2026. Alcance autorizado en el encargo de Carlos; sin migración ni pantallas. Especificación: [cpq.md](../modulos/cpq.md) §5.A/C–F/K/L y §13; continuación: [Brief 10](BRIEF-10-cpq-cotizador.md).

**Hoja de alcance.** 1.0 es el piso: se conservan sus fórmulas financieras, los tres modos de margen, adicionales y pagos únicos. Se mejora floats → aritmética racional con `bigint`, CLP enteros y redondeo contable de `@opai/domain` en cada total de línea y venta final (R25), traza por monto y proyección segura por lista permitida (R59). `modules/cpq/domain/motor` es puro, sin I/O, Prisma, reloj ni dependencias de servidor; export `@opai/mod-cpq/motor`, tree-shakeable. Parser cerrado con aritmética, paréntesis, `min`, `max`, `redondear`, `si`, referencias con unidad/escala y ámbito; sin evaluación de código. Validación de referencias, ciclos, unidades, división por cero en los valores presentes y límites de tamaño/operaciones/precisión. No demuestra estáticamente que todos los posibles valores futuros eviten cero (CA5 parcial).

**Contrato.** `calcular(version, modelo, parametros, proveedor?)`: versión del modelo fijada, líneas de puesto/ítem/adicional, margen/modo/precio manual, duración y sobrescritura de instrumentos; modelo con plantilla `seguridad`, categorías directas/indirectas, feriados fijos, variables/fórmulas/ítems; parámetros con fecha, UF escalada y fecha, mínimo y umbral. Devuelve líneas, secciones, categorías, directos/indirectos, costo mensual incluyendo adicionales, `costoBase` sin adicionales, `totalMensual` base más instrumentos (comparables con `costsBase`/`monthlyTotal` de 1.0), únicos, venta, margen efectivo, semáforo, instrumentos, posiciones/personas y traza racional. Porcentajes escala 1.000.000; UF y cantidades escala 10.000. `alcanceDotacion` del ítem elige cotización (defecto, incluido Común) o sección para evitar aplicar personas de otras instalaciones. Es una precisión técnica del contrato de R29, no un margen por sección.

**Costo empleador: decisión de Carlos del 1-nov-2026 en el encargo.** Solo `ProveedorCostoEmpleador`, snapshot síncrono y puro del motor de sueldos 07e/CAR-71; sin ingreso manual y sin reimplementar remuneraciones. El adaptador real hacia `costoEmpleadorPorPersona`/`ContratoCostoEmpleador` llegará en un PR de cableado posterior. Este PR no importa esa rama. Sin dato del proveedor, se omite el monto laboral desconocido, devuelve «costo laboral pendiente: motor de sueldos», venta `null` y `noEnviable`; los subtotales conocidos no son una estimación del costo total. La capacidad no instala proveedor ficticio: los falsos solo existen en tests.

**Reglas.** R10, R21, R24–R36, R38, R55, R56, R60, R64 y R65 cubiertas en dominio; R6–R9/R27 como tipos, plantilla y vínculo de versiones, sin publicación/persistencia. R33–R34 históricos, con guarda `k ≥ 0,35`, aviso y `requiereAprobacion`; R66 excluida hasta confirmación del corredor. No se añaden meses extra de vigencia: los 24 meses probados son plazo contractual histórico, no R66. Falta UF → instrumento dependiente en cero y no enviable. `cpq.motor.simular` es lectura, sin preview ni escritura/auditoría personal, por API/MCP: requiere `cpq:cotizaciones.read`, resultado completo solo con `cpq:costos.ver`; sin él, solo venta/únicos/dotación/UF/fecha/estado/advertencias públicas, sin costos, margen, semáforo, aprobación ni operandos. No consulta base: otro tenant con iguales entradas da el mismo resultado.

**PR B (CAR-134).** Ficha `/cotizaciones/[id]`, ensamblado y persistencia del modelo/catálogo del tenant, snapshots, defaults y selección explícita de exámenes sin duplicaciones, acciones de planilla y diseño aprobado. Después: aprobación, envío, línea base R68, importación, pólizas R66 y adaptador 07e. Ningún cambio en lista/alta 10.2a, permisos ni roles.

## Casos dorados y pregunta 12: diferencias documentadas

CD-1 = **10.279.605**, sin advertencias; CD-2 = **13.500.000**, «precio subvalorado» y requiere aprobación. Tests financieros de 1.0 reexpresados con mismas entradas: financiero, garantía porcentaje/fija, administración histórica, RC prima/tasa/asignación, manual histórico, 12/24 meses, UF ausente, únicos optativos, adicionales y reconstrucción acotada. Casos manuales R31–R32 para markup y margen sobre mano de obra; propiedad con semilla fija: venta entera, determinista y monótona en los tres modos.

`cost-lines` de 1.0: rotación 169.280 ×11 ×3/12 =465.520, dotación explícita 169.280 ×24/17 →238.984 e inversión 4.062.710/17 →238.983; suma trazada 291.983. No se porta la conciliación que inventa «Sin clasificar», el matching de nombres de exámenes ni la inyección silenciosa de defaults. El motor recibe líneas explícitas; el ensamblador del PR B decide sus relaciones. Esas pruebas de ensamblado de 1.0 no están cubiertas en PR A.

## Pregunta 14: CR-A…CR-E y CR-COMB incorporados

Fixtures `modules/cpq/domain/motor/casos/`: selección positiva de números/estructura/patrones/horarios/dotaciones, etiquetas genéricas. Sin nombres, RUT, IDs de origen, códigos, URLs, textos de clientes, sueldo base ni líquido. Los campos `id` genéricos y textos libres de la extracción se omitieron. Costo por persona 1.0 solo en proveedor falso, referencia histórica, no verdad legal. Los floats de referencia se usan para comparación, nunca como entrada de dinero al motor.

| Caso | Base 1.0 → 2.0 (CLP redondeados) | Total costo 1.0 → 2.0 | Venta 1.0 → 2.0 | Explicación |
|---|---:|---:|---:|---|
| CR-A | 16.603.659 → 16.603.658 | 17.033.455 → 17.033.454 | 18.878.306 → 18.878.305 | Feriados por puesto: suma entera 336.151 vs global 336.151,9722; exámenes 238.982,9412 →238.983. R25 produce −$1 en venta. |
| CR-B | 13.810.068 → 13.810.069 | 14.226.661 → 14.226.662 | 16.663.732 → 16.663.733 | Feriados 237.471,5278 →237.472, uniformes por ítem 651.862,5 →651.863 y equipos 4.271.758,9333 →4.271.759: R25, +$1 en venta. |
| CR-C | 4.215.464 → 4.215.463 | 4.339.704 → 4.339.703 | 4.969.600 → 4.969.600 | Feriados redondeados en 3 líneas suman 108.769 vs global 108.769,5556; venta sigue exacta. |
| CR-D | 52.000 → 52.000 | 52.000 → 52.000 | 1.021.629 → 1.021.630 | Adicionales mensuales: sumar ventas enteras de línea da 961.860 vs 961.858,8235. Únicos aparte: 959.147 vs 959.145,8824 (959.146 redondeado). R25/R32. |
| CR-E | 4.215.464 → 4.215.464 | 4.215.464 → 4.215.464 | 4.845.360 → 4.845.361 | Feriados: 108.769,5556 →108.770; base entera antes de margen lleva +$1 de venta (R25). |
| CR-COMB | 20.819.122 → 20.819.121 | 21.373.159 → 21.358.037 | 23.847.906 → 23.671.273 | Escenario explícito: margen único 10%, financiación 2% y garantía normalizada de A sobre toda la cotización, una vez. Delta −176.633; ver límites abajo. |

Estas diferencias de redondeo **no se declaran aceptadas por Carlos**: pregunta 12 exige documentarlas y su aceptación; CA2/R39 quedan parciales en A/B/D/E. No se agregan ajustes compensatorios al motor. Son redondeos por línea R25, no errores de float demostrados de 1.0.

**Supuestos deducidos del código/montos de 1.0:**

- Feriados: importe/mano de obra = `1/36` en todos los casos con personas. El test usa esa fórmula de modelo, conserva en otro test el default R65 de 12 feriados +10%. TODO(decisión Carlos): recuperar los valores originales separados de feriados/año y colchón; el producto no identifica ambos.
- Uniformes: A, 2 cambios/año; B/C/E, 3. B tiene dos piezas de precio 350.000/400.000 cuyo costo por persona es precio/48; se expresa como fórmula de inversión equivalente. E no entrega el precio unitario original, solo importes visibles: la inversión se reconstruye con 4 personas ×3/12 =1. No se afirma haber recuperado todo el catálogo original.
- Exámenes: A inversión 4.062.710/17; B 80.000 ×5 ×3/12 =100.000. El plazo del examen A es 17, no prueba el plazo del contrato.
- Ítems B: 2.250.000/12 y 80.000/6; D: 300.000/12 =25.000. Se deducen unidades anuales/semestrales o inversiones de sus cocientes visibles, se representan como inversiones con rateo explícito; el JSON no trae la unidad original de catálogo. TODO(decisión Carlos): confirmar ese metadato antes de cablear catálogo real; un ítem que sí diga «por mes» se suma completo (R64). Plan B 63.493,3 ×2 se expresa como entero escalado en fórmula para no perder décimas intermedias.
- Financiero: A 2%; B/C 2,5%; D/E apagado. B contiene «Costo financiero» unitPrice 2,5; `compute-quote-costs.ts` excluye tipos `financial`/`policy` de `monthlyCostItems`: en 2.0 es instrumento 2,5%, nunca una línea de $2,5 ni un costo duplicado.
- A: póliza/S = `1/375`; residuo `(monthlyTotal − costsBase − financiero − póliza)/S =1/10.000`. Normalización algebraica del test: pG=10%, rG=2%, Mg=16, eG=0,1%, RC=0, que reproduce los coeficientes. **No prueba que esos parámetros fueran los originales**: el residuo podría contener RC. TODO(decisión Carlos): recuperar Mg/pG/rG/eG/RC y duración contractual; sin ellos la reproducción A es condicional. Los meses 12 del resto son neutrales con póliza/RC apagadas, no una decisión comercial recuperada. No se usó la UF implícita redondeada de propuestas como UF exacta; instrumentos de referencia no necesitan UF.
- CR-B pagos únicos: la extracción solo trae las ventas de presentación 543.112 y 666.192 (total 1.209.304), sin costos de entrada ni márgenes. TODO(decisión Carlos): obtener esos supuestos; el test mensual no afirma reconstruir esos pagos únicos.
- CR-COMB: no se han identificado montos fijos RC/póliza para restarlos de forma fiable; el escenario usa garantía porcentual/administración normalizada, sin inventar RC. No se duplican instrumentos por sección, y el financiero se calcula sobre el total (2% en vez de 2%/2,5%). TODO(decisión Carlos): margen por sección 10%/13% o margen único y condiciones financieras comunes. El valor 23.671.273 es un escenario trazado, no precio aprobado.

## Criterios de aceptación del PR A

| CA | Estado y evidencia |
|---|---|
| CA1 / R6–R9, R27 | Parcial: plantilla/tipos/vínculo versión; copia al tenant y persistencia en B. |
| CA2 / R38–R39 | CD y financieros exactos; CR-C venta exacta; diferencias y supuestos CR anteriores: parcial, pendiente aceptación/confirmaciones. |
| CA5 | Parcial: parser/validación presente; publicación, impacto y análisis de divisores posibles en B/después. |
| CA6 | Traza en dominio/capacidad probada; interacción de pantalla/PDF en B/después. |
| CA8 | Guarda/advertencia/aprobación calculadas; bloqueo de envío en PR de envío. |
| CA15 | Proyección negativa probada en capacidad, API y MCP; pantalla en B. |
| CA18 | Totales/categorías probados; clasificación de catálogo real y UI pendientes de B. |
| CA19 | Rateo del catálogo/sobrescritura sin mutar probados; persistencia/UI en B. |
| CA20, CA22 | Fórmula histórica, sobrescritura y plazos calculados; edición/restauración/UI en B. |

Decisiones abiertas son las indicadas con TODO; R66 sigue pendiente del corredor. Este PR no cambia el plan ni autoriza integrar, migrar o enviar.
