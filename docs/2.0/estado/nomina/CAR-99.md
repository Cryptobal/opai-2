# CAR-99 · Nómina II · Liquidaciones (parte 1 de Nómina II + Cumplimiento DT)

- **Sesión:** Sesión Payroll
- **PR:** por abrir · rama `brief/car-99-nomina-liquidaciones`
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

- Parte 2: archivos LRE, Previred y F30-1 «por verificar». Parte 3: Cumplimiento DT como complemento.
- Marcar liquidaciones como revisadas, congelarlas al cerrar (hoy no se recalculan con el período cerrado), publicar al Portal Trabajador y PDF.
- Validar los montos contra 2 liquidaciones reales de Gard (decisión 11 del motor), con Carlos.
- Gratificación legal con tope mensual proporcional, semana corrida, cargas familiares y APV.

## Qué se decidió

- Días trabajados desde las novedades (licencia y ausencia) mientras Asistencia no entrega días: reversible y es lo que exige el PR 2 de la especificación.
- Mes de 30 días para proporcionar (práctica chilena y la de la especificación).
- Los descuentos no recortan el líquido: solo avisan (CAR-455).
