# BRIEF · CPQ v4 parte 1 — sueldo de referencia, hoja de puesto completa y parámetros por versión (CAR-162)

Depende del PR #242 (desbloqueo). Referencia de diseño: export CPQ v4 (PR #240), capturas «LineaPuesto», «Margen y finanzas» y «Sueldos de referencia para cotizar».

## 1. Objetivo
Que Comercial arme una cotización completa: cargo con sueldo de referencia, colación y movilización por persona, AFP y salud por línea, sueldo bruto o líquido objetivo, y parámetros financieros por versión que llegan al motor.

## 2. Estado actual (verificado)
- Colación, movilización, AFP, salud y contrato estaban fijos en el proveedor de costos (`modules/cpq/persistencia/proveedor.ts`).
- El motor ya aceptaba `Instrumentos` (financiero, garantía, RC) pero la versión no los persistía.
- La hoja de puesto solo tenía nombre, posiciones y sueldo base.
- Pregunta 1 decidida: el sueldo de referencia es un supuesto de venta y se cuenta como «sueldo cotizado».

## 3. Alcance
Entra: modelo, motor, capacidades con MCP y dryRun, hoja de puesto completa, sueldos de referencia en el catálogo. No entra (segundo PR): pantalla «Margen y finanzas» (editar margen, modo y parámetros financieros); sus capacidades (`cpq.versiones.parametros`) ya existen.

## 4. Arquitectura
- `@opai/domain`: `liquidoABruto` (búsqueda binaria entera sobre `costoEmpleadorPorPersona`; el líquido incluye gratificación).
- Supuestos del tenant con `defineAjustes` (`ajustesCpq`): colación, movilización, AFP, salud y contrato por defecto.
- Orden del sueldo (R20): manual de la línea, referencia del cargo, vacío (costo pendiente).
- `dryRun` real con `AjusteVistaPrevia` en memoria hacia `recalcularVersion`.

## 5. Archivos
`packages/domain/src/remuneraciones/liquido-bruto.ts`; `packages/db/prisma/schema/cpq.prisma`; `modules/cpq/persistencia/{supuestos,sueldos-referencia,instrumentos-version,proveedor,recalcular,mapear,version-copiar}.ts`; `modules/cpq/capabilities/{lineas*,sueldos-referencia,parametros,ficha*}.ts`; `apps/web/app/(erp)/cotizaciones/[id]/_componentes/{hoja-puesto,campos-puesto,puesto-form}`; `apps/web/app/(erp)/configuracion/_cpq/sueldos-referencia-cpq.tsx`.

## 6. Modelo de datos y migraciones (aditivas)
`20261103200000_cpq_puesto_referencia`: columnas nuevas en `cpq.lineas` (cargo, días, origen y modo de sueldo, líquido objetivo, colación, movilización, AFP, salud, contrato) y `cpq.versiones` (`instrumentos_json`, `meses_contrato`); tabla `cpq.sueldos_referencia` con RLS ENABLE+FORCE, política `tenant_isolation`, trigger `mismo_tenant`, CHECK y GRANT. Sección de reversión incluida. No aplicada.

## 7. Capacidades
`cpq.lineas.crear|actualizar` (campos nuevos), `cpq.sueldos_referencia.list|fijar`, `cpq.versiones.parametros`, `cpq.cotizaciones.ficha` (trae `parametros`). Todas con dryRun; montos solo con `cpq:costos.ver` (R59). Instantánea MCP e inventario de paridad actualizados.

## 8. Interfaz y responsive
Hoja única para agregar y editar puesto (Sheet del DS, una columna, 375 a 1280 px). Catálogo de CPQ: sección «Sueldos de referencia para cotizar».

## 9. Seguridad y tenant
RLS por tenant en la tabla nueva; cargo validado del mismo tenant (trigger); sin `cpq:costos.ver` no viajan sueldo, colación, movilización ni referencia.

## 10. Casos límite
Sueldo bajo el mínimo legal por jornada se rechaza; líquido inalcanzable devuelve diferencia y tope de 20 M; cargo sin referencia deja costo pendiente; cambiar la referencia no toca versiones enviadas.

## 11. Plan por bloques
1 dominio líquido a bruto · 2 esquema y migración · 3 motor, persistencia y capacidades · 4 hoja de puesto · 5 sueldos de referencia en catálogo · 6 pruebas de base · 7 brief y estado.

## 12. Tests
`liquido-bruto.test.ts` (6), `puesto-v4.test.ts` (8), `aprobacion.test.ts`, paridad, `cpq-sueldos-referencia.test.ts` (db, en CI).

## 13. Validación
Ver la descripción del PR (resultados reales).

## 14. Criterios de aceptación
Cotizar con sueldo de referencia y cargo; colación y movilización por persona cambian el costo; líquido objetivo calcula el bruto; AFP y salud por línea; MCP lista y fija referencias; sin permiso de costos no se ven montos.

## 15. Riesgos y rollback
Migración aditiva con reversión documentada. Riesgo: la referencia es supuesto de venta, no sueldo pagado (decisión de Carlos).

## 16. Reporte de ejecución
En la descripción del PR.
