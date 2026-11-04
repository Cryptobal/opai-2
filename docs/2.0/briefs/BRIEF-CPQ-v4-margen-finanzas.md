# BRIEF · CPQ v4 parte 2 — «Margen y finanzas», catálogo editable y hoja de envío (CAR-162, PR D)

Sigue a `BRIEF-CPQ-v4-puesto-margen.md` (PR C). Diseño de referencia: export CPQ v4 (`docs/2.0/diseño/export-cpq-v4/`), capturas `MargenFinanzasMovil-*`, `Enviar-*` y `ConfigSueldosReferencia-*`.

## 1. Objetivo
Que Comercial ajuste el margen y los parámetros financieros de una versión sin salir de la ficha, que el administrador mantenga el catálogo de CPQ desde Configuración, y que enviar al cliente muestre de un vistazo qué bloquea (mutual sin confirmar) antes de salir el correo.

## 2. Estado actual (verificado)
- `cpq.versiones.parametros` ya existe (PR C): margen, modo, meses de contrato e instrumentos por versión, con `dryRun` real y solo con `cpq:costos.ver`. La ficha ya devuelve `parametros`. No había pantalla.
- `cpq.versiones.margen`: su `dryRun` devolvía la venta actual sin aplicar el cambio pedido (la vista previa no previsualizaba nada).
- Catálogo: existían crear, editar y archivar ítems y crear, editar y desactivar categorías, pero la pestaña Catálogo de Configuración era una lista de solo lectura y no había forma de restaurar lo archivado.
- Envío: un diálogo simple (contacto, asunto, mensaje) sin vista previa ni aviso de mutual; la mutual la rechazaba el servidor al enviar, con un error.

## 3. Alcance
Entra: hoja «Margen y finanzas» y su tarjeta en la ficha; catálogo editable (ítems y categorías: crear, editar, archivar, restaurar); hoja de envío fiel al diseño (bloqueos y avisos, vista previa del PDF, adjuntos, destinatario, mensaje).
No entra: compartir y WhatsApp, crear puestos al ganar, actividades y seguimiento (otros PR). Tampoco los tres escenarios de margen (mínimo, actual, objetivo) con precio, la «Validez de la oferta» y las condiciones comerciales de la hoja de diseño (ver sección 15), ni las filas «UF del día» y «Colación y movilización» de Bloqueos y avisos (la ficha no entrega ese dato por separado todavía).

## 4. Arquitectura
- Sin capacidades nuevas: se completan las existentes. `cpq.catalogo_items.update` acepta `activo` (restaurar) y `unidad`; `cpq.catalogo_categorias.update` acepta `activa` (restaurar). `cpq.versiones.margen` aplica el cambio en memoria en el `dryRun`.
- Hoja «Margen y finanzas»: la vista previa llama a `cpq.versiones.parametros` con `dryRun` (con 350 ms de espera) y solo vale para el estado que la pidió; guardar llama a la misma capacidad sin `dryRun`.
- Hoja de envío: reemplaza el diálogo. La mutual se confirma en línea con el diálogo existente de Remuneraciones (`core.remuneraciones.confirmar_mutual`); el botón queda inactivo mientras tanto, igual que la regla del servidor.

## 5. Archivos
Ficha (`apps/web/app/(erp)/cotizaciones/[id]/_componentes/`): `hoja-margen-finanzas.tsx`, `margen-instrumentos.tsx`, `margen-form.ts`, `tarjeta-margen-finanzas.tsx`, `hoja-enviar-cotizacion.tsx` (reemplaza `dialogo-enviar-cotizacion.tsx`), `enviar-bloqueos.tsx`, `enviar-vista-previa.tsx`, `use-contactos-envio.ts`, `meta-ficha.ts`, y cambios en `ficha-cotizacion*.tsx` y `_componentes/datos.ts`.
Catálogo (`apps/web/app/(erp)/configuracion/_cpq/`): `seccion-catalogo.tsx`, `catalogo-editable.tsx`, `hoja-item-catalogo.tsx`, `hoja-categoria-catalogo.tsx`, `catalogo-tipos.ts`.
Capacidades: `modules/cpq/capabilities/{catalogo,catalogo-items,margen}.ts`; prueba `catalogo-editable.test.ts`.

## 6. Modelo de datos y migraciones (aditivas)
Ninguna. No hay migración en este PR (el prefijo reservado `20261105110000` no se usó).

## 7. Capacidades
`cpq.versiones.parametros` (sin cambios), `cpq.versiones.margen` (dryRun corregido), `cpq.catalogo_items.update` (+`activo`, +`unidad`), `cpq.catalogo_categorias.update` (+`activa`). Todas con `dryRun` e `idempotencyKey`; MCP e inventario de paridad sin herramientas nuevas.

## 8. Interfaz y responsive
Hojas del DS (`Sheet`): inferior en teléfono (375 px), lateral de 420 px desde 768 px. Interruptores y botones de 44 px. Tarjeta «Pólizas y finanzas» en la ficha, bajo las líneas, solo con `cpq:costos.ver`; el botón «Margen y finanzas» solo si la versión es editable. Catálogo: lista por categoría con «Ver archivados», «Nueva categoría» y «Nuevo ítem». Estados: carga (generando PDF), error con «Reintentar», vacío (sin categorías), sin permiso (sin montos).

## 9. Seguridad y tenant
Sin `cpq:costos.ver` no se ve ni se pide ningún monto ni margen (la ficha no trae `parametros`, la lista del catálogo omite el costo, la hoja de envío no muestra el margen). Editar el catálogo exige `cpq:modelo.manage` (la pantalla oculta los botones; la capacidad vuelve a autorizar). Archivar no toca líneas ya cotizadas.

## 10. Casos límite
Meses de contrato fuera de 1–120 bloquea «Listo»; margen entre 0 y 99,9999 %; versión no editable (enviada, aprobada) no abre la hoja; mutual sin confirmar bloquea el envío pero no «Solicitar aprobación»; cuenta sin contactos con correo o sin cuenta; PDF que tarda más de 20 s ofrece «Reintentar»; catálogo vacío se siembra al crear la primera categoría o ítem.

## 11. Plan por bloques
1 capacidades (restaurar, dryRun del margen) y prueba · 2 hoja y tarjeta «Margen y finanzas» · 3 catálogo editable · 4 hoja de envío · 5 brief, instantánea de paridad y ESTADO.

## 12. Tests
`catalogo-editable.test.ts` (3): crear, archivar y restaurar; dryRun sin escribir; margen sin escribir. Paridad e inventario regenerados.

## 13. Validación
Ver la descripción del PR (resultados reales). La verificación visual a 375, 1024 y 1280 px queda indicada allí.

## 14. Criterios de aceptación
Se cambia el margen, el modo, un instrumento y los meses y la hoja muestra la venta resultante antes de guardar; guardar actualiza la ficha; sin permiso de costos no se ve nada de eso; el catálogo permite crear, editar, archivar y restaurar ítems y categorías; la hoja de envío muestra la mutual sin confirmar como bloqueo con «Confirmar» en línea y no deja enviar hasta confirmarla.

## 15. Riesgos y rollback
Sin migración: revertir el PR basta. Pendientes de diseño: los tres escenarios de margen con precio, validez de la oferta, condiciones comerciales y las filas UF y colación del envío. La vista previa dentro de la hoja de envío es el PDF completo en un visor, no las miniaturas de página del diseño (la capacidad entrega el PDF entero, no páginas sueltas).

## 16. Reporte de ejecución
En la descripción del PR.
