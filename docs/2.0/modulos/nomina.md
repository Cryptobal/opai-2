# Nómina — Especificación funcional

**Estado:** **borrador de construcción, a aprobar junto con el diseño v2** (el diseño de Nómina v2 quedó aprobado el 30-oct-2026 15:32 CLT, PR #166; esta especificación no existía y la escribe el PR 1) · **Tarea:** CAR-92 (Nómina) y CAR-99 (Cumplimiento DT, complemento: fuera de este documento) · **Fase:** Ola 6, Brief 25 · **Insumos:** `modulos/motor-sueldos.md` §15 (qué queda en Nómina), `extraccion/dt-normativa.md`, `referencias/dt-integracion.md`, capas de sueldo (Brief 07b), `diseño/export-nomina/` (v2: 01–10 y B1–B3), ADR-004, ADR-021, ADR-022, ADR-023, ADR-055.

> Lenguaje de negocio. Las reglas se citan por número (R1, R2…) y los criterios por CA1, CA2… Todo formato, plazo o campo oficial que no está verificado contra la fuente se marca **«por verificar»** y la pantalla lo muestra con el Badge «Formato por verificar», nunca como oficial (decisión de Carlos del 30-oct-2026).

## 1. Objetivo

Que la empresa cierre cada mes de remuneraciones con orden y trazabilidad: abrir el período, cargar lo que cambia (licencias, ausencias, horas extra, anticipos, cuotas de préstamo, descuentos), revisar, cerrar, pagar, y llevar el calendario de lo que hay que declarar y pagar (LRE, Previred, retención del impuesto único para el F29, Declaración Jurada y certificados de sueldos). El sueldo **sale de la capa de sueldo** (Brief 07b): Nómina no lo redefine. El cálculo (bruto → imponible → descuentos → líquido, impuesto único) lo hace el **motor de sueldos del Núcleo** (`modulos/motor-sueldos.md`, Brief 07e), que está especificado y **todavía no está construido**.

## 2. Alcance por PR (por dependencia)

| PR | Qué entrega | Depende de |
|---|---|---|
| **PR 1** (este) | Datos y operación del período **sin cálculo**: períodos con sus estados, novedades, préstamos con plan de cuotas (B3), regla de anticipo quincenal (B2), conceptos con tratamiento y código LRE «por verificar», ajustes, calendario de obligaciones. Pantallas 01, 05, 09 y 10. | Núcleo, Personas (existentes en `main`) |
| **PR 2** | Cálculo y liquidaciones (03, 04), cierre con bloqueos (02), archivos LRE y Previred y retención F29 (06), cuadratura contra 1.0 (B1), finiquito (08). | Motor de sueldos (07e), Asistencia (CAR-89) para días trabajados, previsión y banco en la ficha (Personas, #165) |
| **PR 3** | Cumplimiento DT (07) y lo que quede: archivo de pago, certificados de sueldos, Declaración Jurada. | Complemento Cumplimiento DT (CAR-99) |

## 3. Entidades

`Periodo` (mes calendario por empresa) · `Novedad` (del período y de una persona) · `Prestamo` y `Cuota` (plan mensual) · `ReglaAnticipo` (una por persona) · `Concepto` (haber o descuento con su tratamiento) · `Obligacion` (calendario). Schema Postgres propio `nomina`, `tenant_id` y RLS forzada en las siete tablas. Referencias a `core.personas` con FK; al respaldo documental (`core.documentos`) con el trigger de mismo tenant. La configuración escalar (día de cierre, umbral de diferencia, banco, datos del empleador y del representante laboral) son **ajustes del manifest**, no tablas (ADR-018, ADR-021).

## 4. Reglas de negocio

- **R1.** Un mes tiene un solo período. Abrirlo crea sus tres obligaciones mensuales del calendario.
- **R2.** El período avanza `abierto → en revisión → cerrado → pagado`. Se puede devolver a una etapa anterior hasta el pago, **con motivo**; `pagado` es terminal y lo marca un permiso aparte (irreversible: un agente necesita aprobación humana).
- **R3.** Las novedades solo se cargan, importan o anulan mientras el período está abierto o en revisión. Una novedad no se borra: se anula con motivo.
- **R4.** Cada tipo se mide en su unidad: licencia y ausencia en días, horas extra en horas, anticipo, préstamo y descuento en pesos enteros (nunca float). Las fechas deben tocar el mes del período.
- **R5.** Las cuotas de préstamo **no se cargan a mano**: nacen del plan del préstamo (R7) al aplicarlas al período.
- **R6.** Una licencia lleva su respaldo como documento del Núcleo (`documento_id`); la nota no admite diagnósticos (dato de salud, Ley 21.719).
- **R7.** Préstamo (B3): monto total y número de cuotas (1 a 60), sin interés, cuotas en pesos enteros; las primeras valen `floor(total / n)` y la última absorbe el resto, de modo que la suma es exacta. Cada cuota cae en un mes; aplicarla al período crea una novedad de tipo préstamo (idempotente). Al **cerrar** el período la cuota queda «descontada»; al devolverlo vuelve a «pendiente». El préstamo se salda cuando ninguna cuota sigue pendiente. Cancelarlo condona las pendientes y anula sus novedades abiertas; no se cancela con un mes ya cerrado sin reabrirlo.
- **R8.** Anticipo quincenal (B2): una regla por persona (activa, modo, valor, día del mes; si el mes es más corto, el último día). Generar el período crea un anticipo por regla activa de **monto fijo**, es idempotente y no recrea uno anulado a propósito. Las reglas **por porcentaje** del sueldo base se guardan pero se omiten hasta que el motor entregue el sueldo de la capa (PR 2).
- **R9.** Los conceptos llevan tratamiento imponible y tributable y un código LRE que **siempre queda «por verificar»** hasta validarlo contra el suplemento oficial; editar el código lo vuelve a poner sin verificar.
- **R10.** El calendario de obligaciones muestra la fecha límite **solo si está verificada**; si no, «Plazo por verificar». Verificar un plazo exige indicar la fecha.
- **R11.** OPAI **genera y valida** los archivos; **no envía** nada a la DT, a Previred ni al SII: la DT no tiene API pública y quien sube es el representante laboral electrónico con su ClaveÚnica. OPAI guarda el comprobante que sube el usuario.

## 5. Permisos y roles (decisión 5)

Permisos del módulo: `nomina:read` (períodos, conceptos, calendario), `nomina:periodos.manage`, `nomina:periodos.pagar`, `nomina:novedades.read` y `nomina:prestamos.read` (**sensibles**: dato salarial por persona, lecturas auditadas por IDs, NÚCLEO-H), `nomina:novedades.manage`, `nomina:prestamos.manage`, `nomina:anticipos.manage`, `nomina:config.manage`, `nomina:obligaciones.manage`. Owner, admin y un rol personalizado de RRHH con estos permisos: todo. **Gerente, supervisor y viewer: sin acceso** (el bloqueo financiero `nomina:*` ya los excluye); el **resumen para gerente** necesita el cálculo y llega en el PR 2. Los roles nuevos nacen sin acceso a nómina.

## 6. Estados

Período: `abierto`, `en_revision`, `cerrado`, `pagado`. Novedad: `vigente`, `anulada`. Préstamo: `activo`, `pagado`, `cancelado`. Cuota: `pendiente`, `descontada`, `condonada`. Obligación: `por_generar`, `generado`, `con_errores`, `cargado`, `pagado` (los dos intermedios los fija el generador de archivos del PR 2).

## 7. Eventos y herramientas MCP

Eventos: `nomina.periodo.{abierto,en_revision,cerrado,reabierto,pagado}`, `nomina.novedad.{registrada,anulada}`, `nomina.prestamo.{creado,cancelado}`. Herramientas: una por capacidad `nomina.<entidad>.<verbo>` (21 en el PR 1); toda escritura tiene su `preview_…` (dryRun) y acepta `idempotency_key`; lo irreversible (`nomina.periodos.marcar_pagado`) pide aprobación humana a los agentes (ADR-055).

## 8. Documentación previsional, laboral y tributaria (por verificar)

Previred (formato y cantidad de campos), columnas del suplemento del LRE (solo está verificado el nombre `rutempleador_aaaamm` y el separador `;`, `referencias/dt-integracion.md`), formularios, plazos y formatos del SII (F29, Declaración Jurada, certificado de sueldos), el formato de nómina masiva del banco y qué parte del registro de contribuyentes cubre OPAI: **todo por verificar** con las fuentes oficiales y el contador. El PR 1 solo deja los datos, el calendario y los comprobantes; los generadores llegan en el PR 2 con su Badge.

## 9. Criterios de aceptación (PR 1)

- **CA1.** Abrir un mes crea el período y sus tres obligaciones; abrirlo dos veces da CONFLICT; la vista previa no persiste.
- **CA2.** El período recorre sus estados; devolver sin motivo se rechaza; `pagado` exige cerrado y no se deshace.
- **CA3.** Cada tipo de novedad rechaza la unidad equivocada; la carga masiva es todo o nada e indica la fila con error; un período cerrado no admite novedades.
- **CA4.** El plan de cuotas suma exactamente el total; cerrar el período descuenta la cuota y salda el préstamo; reabrirlo lo revierte.
- **CA5.** Generar anticipos dos veces no duplica; las reglas por porcentaje se omiten con motivo.
- **CA6.** Dos empresas: ninguna ve ni usa períodos, novedades, préstamos ni personas de la otra (RLS + trigger de mismo tenant).
- **CA7.** Gerente, supervisor y viewer reciben FORBIDDEN en todas las capacidades de Nómina.
- **CA8.** Las lecturas de novedades, préstamos y reglas de anticipo quedan auditadas con IDs, sin datos personales.

## 10. Preguntas abiertas para Carlos

1. ¿El resumen para gerente (costo y totales) entra en el PR 2 junto con el cálculo? Recomendación: sí.
2. ¿Un tope legal para descuentos por anticipos y préstamos (porcentaje de la remuneración) se aplica en el PR 2? **Por verificar con el abogado**; el PR 1 no lo aplica.
3. ¿Los préstamos con interés quedan fuera? Recomendación: sí, B3 es sin interés.
