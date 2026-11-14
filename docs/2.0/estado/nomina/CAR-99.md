# CAR-99 · Nómina II · Liquidaciones (parte 1 de Nómina II + Cumplimiento DT)

- **Sesión:** Sesión Payroll
- **PR:** #801 · rama `brief/car-99-nomina-liquidaciones`
- **Estado:** En PR
- **Migración:** `20261231100000_nomina_liquidaciones` (aditiva; se aplica en dev y main con snapshot antes de integrar)
- **Apilado sobre / espera:** apilado sobre #799 (CAR-344): reutiliza la carga de vínculos y capas del costo proyectado.

## Qué entra

- Brief 27 (`docs/2.0/briefs/BRIEF-27-nomina-liquidaciones.md`).
- Cálculo puro `liquidacionDelMes` (`packages/domain/src/nomina/liquidacion.ts`): capa proporcional a los días trabajados (30 − licencia − ausencia, dentro del vínculo), horas extra R19 como haber imponible, cotizaciones e impuesto del motor del Núcleo, y anticipos, cuotas de préstamo y descuentos fuera del imponible. Avisos: sueldo base de la capa bajo el mínimo, líquido negativo y préstamos más descuentos sobre el 15 % (CAR-455, opción A mientras Carlos no decida).
- Tabla `nomina.liquidaciones` con RLS, FORCE y trigger de mismo tenant (período, persona y capa); guarda la capa y la huella del juego de valores (R21).
- Capacidades con MCP: `nomina.liquidaciones.calcular` (dryRun, idempotente, período bloqueado, borra las de personas que ya no corresponden), `nomina.liquidaciones.listar` y `nomina.liquidaciones.obtener` (lecturas auditadas por id). Evento `nomina.liquidaciones.calculadas`.
- Pantallas: «Ver liquidaciones» en el período, `/remuneraciones/[id]/liquidaciones` (resumen, cálculo con vista previa y tabla) y `/remuneraciones/[id]/liquidaciones/[liq]` (haberes, descuentos y líquido a pagar). Prueba `@preview`.

## Qué queda pendiente

- Parte 2: archivos Previred y F30-1 «por verificar» (el LRE entra en el PR apilado, sección siguiente). Parte 3: Cumplimiento DT como complemento.
- Marcar liquidaciones como revisadas, congelarlas al cerrar (hoy no se recalculan con el período cerrado), publicar al Portal Trabajador y PDF.
- Validar los montos contra 2 liquidaciones reales de Gard (decisión 11 del motor), con Carlos.
- Gratificación legal con tope mensual proporcional, semana corrida, cargas familiares y APV.

## Qué se decidió

- Días trabajados desde las novedades (licencia y ausencia) mientras Asistencia no entrega días: reversible y es lo que exige el PR 2 de la especificación.
- Mes de 30 días para proporcionar (práctica chilena y la de la especificación).
- Los descuentos no recortan el líquido: solo avisan (CAR-455).
- Calcular y ver liquidaciones exige acceso a todo el personal (sin alcance por instalación) y el permiso de sueldos sensibles: recalcular reemplaza el período completo y no debe borrar ni revelar lo que el usuario no ve.
- Días en base 30: 30 menos los días calendario fuera del vínculo (mes de 31 y febrero dan lo mismo que un mes de 30).
- Las novedades se leen con el período bloqueado, dentro de la misma transacción que guarda.

## Parte 2a · Archivo LRE (PR apilado sobre #801, rama `brief/car-99-nomina-lre`)

- **Qué entra:** `archivoLre` y `COLUMNAS_LRE` en `packages/domain/src/nomina/` (todas las columnas del índice del Suplemento LRE, Res. Ex. 285/2021, consultado en dt.gob.cl el 14-nov-2026); la liquidación guarda ahora los aportes del empleador (cesantía, Ley 16.744/SANNA, SIS, reforma) y los días de licencia; capacidad `nomina.lre.generar` con MCP (lectura auditada por las personas incluidas; exige permiso de obligaciones, sueldos sensibles y acceso a todo el personal); botón «Descargar LRE» con el Badge «Formato por verificar» en la página de liquidaciones. Sin migración.
- **Valida:** RUT de cada persona y del empleador (Ajustes → Remuneraciones), cuadratura haberes − descuentos = líquido y liquidaciones antiguas sin aportes (pide recalcular).
- **Qué se decidió:** encabezado `Nombre(código)`, nombre `cuerpoRUT_aaaamm.csv` sin DV, CRLF y sin BOM, todo marcado «por verificar» (decisión de Carlos del 30-oct-2026). Horas extra van en Sobresueldo (2102, art. 32 CT); anticipos y cuotas de préstamo en 3188; descuentos varios en 3185 («Otros descuentos»; los que pide el trabajador irían en 3183, por verificar). Sin RUT del empleador no se descarga el archivo.
- **Pendiente:** códigos de catálogo DT (AFP, salud, AFC, región, comuna, jornada) vacíos; bonos no imponibles y aporte de la reforma sin columna propia (solo en totales); marcar la obligación LRE como generada; verificar el formato contra el Manual de Usuarios LRE vigente antes del primer uso real (totales vacíos o en 0, y los totales 5230 y 5410 incluyen montos sin columna de detalle: riesgo de rechazo del validador DT); la prueba `@preview` del botón depende de que qa-e2e tenga liquidaciones calculadas.
