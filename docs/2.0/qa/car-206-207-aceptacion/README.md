# Aceptación de CAR-206 y CAR-207 (asignar titular y trasladar)

Rutas de aceptación para validar **asignar titular** (CAR-206, #358) y **trasladar guardia** (CAR-207, #363 y su arreglo #371) con **datos sintéticos**. Las valida «OPAI 2.0» en `preview.opai.cl`; no se espera el OK visual de Carlos. **Sin pagos, sin datos reales, sin ejecutar el backfill.**

## Reglas de esta aceptación
- Solo una empresa de QA propia (slug `qa-<nombre>`) y personas inventadas: nombres «… QA Ficticia» y RUT de la serie `90.000.00x-1` (inexistentes). Nada de RUT, sueldos ni datos de guardias reales (Ley 21.719).
- **El backfill de cobertura no se aplica.** Solo se puede **simular** (ver D1). `--apply` queda para cuando Carlos lo pida, con tenant explícito.
- Lo que no entra: columna Función de la lista de Puestos (pendiente de UI), turnos extra (CAR-96, espera diseño aprobado) y todo lo de pagos.

## Preparación
1. En la empresa de QA: dos instalaciones (**QA Norte** y **QA Sur**), cargo «Guardia», patrón 4×4 activo, tres puestos con patrón y horario 08:00–20:00 (**Norte · Día 1**, **Norte · Día 2**, **Sur · Día 1**) y tres guardias con vínculo vigente y jornada pactada (44 h, «4x4»): **Ana** y **Beto** en Norte, **Sur** en Sur. El módulo Pauta debe estar activo.
2. Tres usuarios: owner, supervisor (solo con alcance sobre Norte) y viewer.
3. Una segunda empresa de QA con un puesto y un guardia, para el aislamiento.

## Rutas (cada una tiene su prueba sintética automática)
Las pruebas son `packages/capabilities/test/puestos-aceptacion-db.test.ts` (`pnpm test:db`; ruta completa con dos empresas y tres roles) más `titular-asignar-db.test.ts`, `titular-trasladar-db.test.ts` y los e2e `puestos-titular-car206.spec.ts` y `puestos-trasladar-car207.spec.ts`.

| Id | Ruta (como owner, ficha del puesto › Titular) | Resultado esperado |
|---|---|---|
| A1 | Abrir «Norte · Día 1». | «Sin titular · puesto por cubrir»; en «Asignar titular» solo aparecen Ana y Beto (no Sur ni la otra empresa). |
| A2 | Asignar a Ana con «Rige desde» y «Inicio de ciclo»; antes, ver la vista previa. | La vista previa no escribe. Al confirmar: el puesto pasa a «Cubierto», Ana queda con ese puesto en su vínculo y el historial muestra «Ana asignada» con quién y cuándo. |
| A3 | Asignar a Ana también en «Norte · Día 2». | Se rechaza: ya es titular de otro puesto (para moverla se usa Trasladar). |
| B1 | Ficha de «Día 1» › Trasladar › destino «Norte · Día 2», desde hoy, motivo. | Vista previa visible y botón habilitado. Al confirmar: «Día 1» por cubrir, «Día 2» cubierto, **sin borrador de anexo**. |
| B2 | Trasladar a «Sur · Día 1» (otra instalación), desde hoy. | Vista previa con «su vínculo termina el día anterior y se crea uno nuevo, con borrador de anexo». Al confirmar: vínculo anterior terminado, vínculo nuevo en Sur con la misma jornada, borrador de anexo para RR. HH. Fecha futura se rechaza (rige desde hoy). |
| B2b | Repetir B2 con un guardia cuyo vínculo no tiene jornada pactada. | La vista previa **se ve igual** y pide horas semanales y distribución; «Trasladar» se habilita al completarlas (arreglo #371). |
| B3 | «Sur · Día 1» › Quitar titular desde hoy. | Puesto «por cubrir»; los turnos esperados de Ana no siguen en ese puesto. |
| C1 | Repetir como viewer y como supervisor sin alcance. | Viewer: ve el historial, no ve los botones y por API recibe `FORBIDDEN`. Supervisor sin Norte: «No encontrado». |
| C2 | Con la otra empresa: pedir el puesto, asignar o trasladar por id. | Siempre «No encontrado»; nada cambia en ninguna de las dos. |
| D1 | **Simular** el backfill de cobertura (`pnpm --filter @opai/db backfill:cobertura -- --tenant <slug>`, sin `--apply`). | Con el flujo A–B hecho, «Puestos por actualizar: 0». En una empresa con series anteriores a CAR-206 lista los puestos que hoy dicen «Por cubrir» con titular. **No se escribe.** |

## Tamaños y estados (OPAI 2.0, en la preview)
- 375, 1024 y 1280 px, claro y oscuro: sin scroll horizontal, hoja legible, botones a 44 px.
- Estados: puesto sin titular, con titular, sin patrón (botón deshabilitado con aviso), error de «no se puede doblar», vista previa en carga, error con «Ver vista previa» para reintentar.
- MCP: `tools/list` incluye `pauta_titular_asignar`, `pauta_titular_trasladar`, `pauta_titulares_listar` y sus `preview_`; probar con una key de QA que `trasladar` pide aprobación (irreversible).

## Pendientes que esta aceptación no cubre
- UI: columna Función de la lista de Puestos («—» si nadie eligió función; propuesta: mostrar el cargo), marcador no solo por color en la vista de 14 días, «hoy» desde el servidor y tope de 300 destinos.
- Backfill: sin ejecutar; lo corre quien Carlos indique, primero en simulación.
- CAR-96 (turnos extra): sin pantallas ni código hasta el diseño aprobado.
