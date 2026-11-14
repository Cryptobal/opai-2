# BRIEF CAR-307 (segunda entrega) · Desempeño: pantalla de indicadores propios

[Sesión Desempeño] · ADR-094 · rama `brief/car-307-desempeno-propios`, apilada sobre la primera entrega (PR #553).

## 1. Objetivo
Que la empresa arme desde el ERP un indicador que el catálogo no trae, lo pruebe con sus datos del mes y lo publique para usarlo en el scorecard de un cargo. Hasta ahora solo se podía por MCP.

## 2. Estado actual (verificado en la rama)
Capacidades listas desde CAR-313: `desempeno.hechos.list`, `desempeno.propios.list`, `.guardar` (con vista previa y `dryRun`) y `.archivar`. Sin pantalla. La primera entrega dejó la lista de cargos sin pestañas.

## 3. Alcance
Entra: pestañas «Cargos» e «Indicadores propios» en Desempeño; lista de indicadores propios; hoja para crear o cambiar uno (nombre, qué mide, forma de cálculo, hechos, monto o unidad según la forma, qué es mejor, meta sugerida), botón «Probar con los datos de este mes», guardar borrador, publicar y archivar.
No entra: filtros por atributo del hecho (se siguen armando por MCP; la pantalla los conserva al editar), catálogo navegable por módulo, «ver como», elegir otro mes, posición en el equipo, propuestas del agente (CAR-312).

## 4. Arquitectura
Página de servidor con `ListScreen`; la hoja es cliente y se descarga al abrirla (ADR-037). La definición se arma en un módulo puro (`definicion.ts`) y la valida la capacidad. La prueba usa `dryRun` de `desempeno.propios.guardar`: no guarda nada y devuelve el resumen agregado, sin nombres.

## 5. Archivos
- `apps/web/app/(erp)/desempeno/indicadores/page.tsx` y `_componentes/{editar-propio,hoja-propio,campos-definicion}.tsx`, `definicion.ts`
- `apps/web/app/(erp)/desempeno/_componentes/{pestanas.tsx,tipos.ts,datos.ts}`, `page.tsx`
- `apps/web/e2e/desempeno.spec.ts`, `desempeno-preview.spec.ts`
- Novedad `2026-11-12-desempeno-indicadores-propios.md`

## 6. Modelo de datos y migraciones
Sin migración.

## 7. Capacidades
La pantalla usa las de CAR-313, con tres ajustes tras la revisión:
- `desempeno.propios.list` devuelve además `pendiente`: el cambio guardado que rige más adelante (borrador o ya publicado). La lista lo muestra y el editor parte de él, para no pisarlo sin aviso.
- Los mensajes de `erroresDePropio` usan «» y el de permiso ya no muestra el código del permiso: así llegan a la pantalla en vez del mensaje genérico.
- El rechazo de un borrador cuando ya hay un cambio publicado nombra el mes en palabras.

«Probar con los datos de este mes» llama a `guardar` con `publicar: true` y `dryRun`: no guarda nada y no choca con la regla del borrador.

## 8. Interfaz y responsive
Solo `@opai/ds`. Tabla en escritorio, tarjetas en teléfono; hoja lateral o inferior. Estados de carga, vacío, error y sin permiso. Consultas por navegación (ADR-045): 2 (indicadores propios y hechos).

## 9. Seguridad y tenant
Sin acceso directo a datos. «Nuevo indicador» y «Editar» solo con `desempeno:scorecards.manage`; solo se ofrecen los hechos que quien edita puede usar (`puedeUsar`) y la capacidad lo vuelve a exigir. La prueba no revela valores de una persona: con menos de tres personas solo dice cuántas hay.

## 10. Casos límite
Empresa sin hechos disponibles (botón deshabilitado); «sumar» sobre un hecho sin montos (se avisa); «tiempo» solo entre hechos de la misma cosa; nombre repetido (error de la capacidad); indicador en uso al archivar (lo rechaza la capacidad y se muestra el motivo).

## 11. Plan por bloques
1. Pantalla, pestañas, pruebas, novedad y documentación (un commit).

## 12. Tests
`desempeno.spec.ts` (arma, prueba y publica un indicador propio), `desempeno-preview.spec.ts` (captura de la pestaña), inventario de paridad.

## 13. Validación
Gate completo; e2e locales contra base sembrada; capturas revisadas.

## 14. Criterios de aceptación
- Se arma, prueba y publica un indicador propio desde la pantalla.
- El indicador publicado aparece para elegir en el editor del scorecard.
- Quien no administra el módulo ve la lista sin botones de edición.

## 15. Riesgos y rollback
Sin datos nuevos: revertir quita la pantalla.

## 16. Reporte de ejecución
Ver el PR.
