# BRIEF — CPQ: desbloqueo de la primera cotización (CAR-162)

## 1. Objetivo
Que un tenant nuevo pueda crear su primera cotización y llegar a un costo calculado y a la vista previa del PDF sin chocar con rutas rotas, mensajes genéricos ni bloqueos que sobran. Origen: video de QA de Carlos del 3-nov-2026 y `docs/2.0/auditoria-cpq-2026-11.md` §1.

## 2. Estado actual (verificado en `main` `70bfeef`)
Ver la tabla de la auditoría §1, con archivo y línea por síntoma. Resumen:
- **Ruta rota:** `bloqueo-cotizacion.tsx:5` usa `/configuracion/grupo/operacion/remuneraciones` (404). Hay seis enlaces a `/configuracion/grupo/remuneraciones` en `lib/cpq-presentacion.ts`.
- **Mensaje genérico:** el texto oculta la causa real (`resuelto.pendiente`).
- **Mutual sin valor por defecto:** la mutual pendiente bloquea todo el costo.
- **Enlace equivocado:** «Ver cargos» manda a `/personas/cargos`.
- **Bucle de render:** en `use-capacidad.ts`, `ejecutar` no es estable, lo que deja «Generando PDF…» infinito y se traga el error.
- **Margen y costos pendientes:** se muestra 0 % en rojo y 8 filas «Pendiente».

## 3. Alcance
**Entra:**
- **(a) Rutas.** Una sola constante `RUTA_REMUNERACIONES = "/configuracion/remuneraciones"` en `cpq-presentacion.ts`, usada en todos los enlaces.
- **(b) Causa concreta.** La ficha muestra la causa real de lo pendiente: falta el juego legal, falta la mutual o falta el sueldo de la línea X.
- **(c) Mutual adicional sin confirmar (decisión de Carlos, 3-nov).**
  - El cálculo usa adicional 0 % y agrega una advertencia («Mutual adicional sin confirmar: se calcula con 0 %»).
  - **Enviar al cliente queda bloqueado** hasta confirmarla, con una acción que abre la confirmación.
  - La huella del juego de valores distingue «0 % supuesto» de «0 % confirmado», para que al confirmar la cotización quede marcada desactualizada si cambia.
- **(d) Aviso de sueldo faltante.** Su acción abre la hoja de edición de esa línea (acción local, no `href`). Se retira «Ver cargos».
- **(e) Estabilizar `ejecutar`.** En `apps/web/.../use-capacidad.ts`, `ejecutar` pasa a `useCallback`. La vista previa del PDF corre una vez por cotización, muestra el error y ofrece «Reintentar»; si pasan 20 s, muestra el mensaje y «Reintentar».
- **(f) Resumen sin cálculo.** Con costo pendiente: venta «—», margen «—» sin semáforo y una sola fila «Costos pendientes».
- **(g) Recalcular.** Al terminar dice qué cambió o «Sin cambios: falta …».
- **(h) Plurales.** «1 persona» en `detalle-cargo.tsx` e `impacto-sueldo.tsx`.
- **(i) e2e de tenant vacío.**

**No entra:**
- automatización de indicadores (PR B);
- sueldo de referencia por cargo y hoja de puesto completa (PR C, con diseño v4);
- parámetros financieros (PR D);
- rediseño visual: los componentes nuevos de v4 esperan el diseño, y aquí solo se corrige la lógica y el texto sobre la UI existente.

## 4. Arquitectura
- La regla de la mutual va en dominio y persistencia de CPQ (`persistencia/valores-legales.ts`, `publicaciones.ts`), no en la UI.
- La advertencia y el bloqueo de envío salen del servidor (`calcular`, `enviar-validar`) para que valgan igual en pantalla, `/api/v1` y MCP.
- La UI solo presenta `pendiente` y las advertencias tipadas. La detección deja de comparar textos («mutual adicional», «valores legales») y pasa a usar códigos.

## 5. Archivos (principales)
- `modules/cpq/persistencia/{valores-legales,proveedor,recalcular}.ts`
- `modules/cpq/capabilities/{calcular,enviar-validar}.ts`
- `apps/web/lib/cpq-presentacion.ts`
- `apps/web/app/(erp)/cotizaciones/[id]/_componentes/{bloqueo-cotizacion,acciones-cotizacion-logica,acciones-cotizacion,resumen-cotizacion,linea-cotizacion,dialogo-vista-previa-pdf}.tsx|ts`
- el hook `use-capacidad`
- `cargos/_componentes/detalle-cargo.tsx`, `packages/ds/src/components/impacto-sueldo.tsx`
- tests y e2e
- `docs/2.0/ESTADO.md`

## 6. Modelo de datos y migraciones
Sin migración. El 0 % supuesto se resuelve en el código, sin escribir en `core.remuneraciones_perfil`. La tasa sigue `null` y `pendiente` hasta que alguien la confirme.

## 7. Capacidades
Sin capacidades nuevas.
- `cpq.cotizaciones.calcular` y la lectura de la ficha devuelven advertencias con código: `mutual_sin_confirmar`, `sueldo_faltante` con id de línea, `juego_legal_faltante`.
- La validación de envío agrega el bloqueo `mutual_sin_confirmar`.
- Se actualizan la instantánea MCP y el inventario si cambian los esquemas de salida.

## 8. Interfaz y responsive
Solo componentes del DS existentes. Verificar en 375 y 1280: aviso compacto, hoja del puesto abierta desde el aviso y vista previa con error visible.

## 9. Seguridad y tenant
Sin cambios de RLS ni de permisos. `cpq:costos.ver` se respeta: la advertencia de sueldo faltante no revela montos.

## 10. Casos límite
- Mutual confirmada en 0 %.
- Mutual confirmada después de calcular, con la cotización desactualizada.
- Juego legal ausente: fecha anterior a la semilla.
- Línea con sueldo bajo el ingreso mínimo.
- Usuario sin `cpq:costos.ver`.
- Versión enviada en solo lectura.
- PDF que falla en el servidor.

## 11. Plan por bloques (un commit cada uno)
1. `docs:` auditoría, Design Prompt v4 y este brief.
2. `cpq:` mutual 0 % supuesta con advertencia y bloqueo de envío, más advertencias con código (dominio y tests).
3. `web:` rutas, causa concreta, aviso que abre la hoja del puesto y resumen sin cálculo.
4. `web:` `use-capacidad` estable y vista previa del PDF con error, reintento y tiempo máximo.
5. `web:` Recalcular informativo y plurales.
6. `test:` e2e de tenant vacío y `ESTADO.md`.

## 12. Tests
- Unitarios: juego con mutual pendiente (calcula y advierte), envío bloqueado y huella.
- Tests de presentación: `cpq-acciones-cotizacion.test.ts` actualizado.
- e2e `cpq-tenant-vacio.spec.ts`, en un tenant sin mutual:
  - crear la cotización y agregar un puesto sin sueldo;
  - comprobar que el aviso no navega a un 404 y que su acción abre la hoja;
  - ingresar el sueldo y comprobar costo calculado con el aviso de la mutual;
  - abrir la vista previa y esperar PDF o error en menos de 20 s;
  - comprobar el margen «—» antes de calcular.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`, más el e2e de los specs tocados.

## 14. Criterios de aceptación
1. Ningún enlace de CPQ lleva a 404.
2. Una cotización con sueldo y la mutual sin confirmar calcula costo y venta, y muestra el aviso.
3. Enviar exige confirmar la mutual, con la misma regla por MCP.
4. La vista previa del PDF termina siempre: muestra el documento o un error con «Reintentar».
5. Sin cálculo, no aparecen «0,0 %» ni el semáforo rojo.
6. El gate y el e2e nuevo están en verde.

## 15. Riesgos y rollback
- Cotizar con 0 % de adicional subestima el costo si la mutual real es mayor; lo mitigan el aviso y el bloqueo de envío.
- Rollback: revertir el PR. No hay datos ni migraciones.

## 16. Reporte de ejecución
(Se completa al abrir el PR.)
