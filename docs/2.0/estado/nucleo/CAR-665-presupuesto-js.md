# CAR-665 · Presupuesto JS de prerregistros y usuarios

## Corrección focal de carga inicial · sesión dot · 18-nov-2026

Preparada sobre main `651d208a8`, sin cambios de capacidad, base ni migración:

- La hoja de prerregistro se carga al primer clic y permanece montada después; conserva estado abierto/cerrado y limpieza original. La confirmación de cancelación se carga al solicitarla.
- `rutaAccesos` se separa sin cambiar su lógica: importar ese helper desde la lista arrastraba `acciones-registro` al manifiesto cliente de prerregistros aunque no se usaba allí.
- Los controles de ajustes de texto no importan el Switch Radix innecesariamente. Switch conserva props, valor, etiqueta y disabled cuando se usa.
- Medición con el mismo script y topes, sin modificaciones del presupuesto: lista de prerregistros 180.58 → 166.03 KB (tope168); detalle 169.57 → 167.10 KB (168); usuarios 177.50 → 171.86 KB (177).
- Ocho pruebas unitarias de render inicial, contrato Switch y rutas/filtros/cursor pasan. No equivalen a interacción de navegador: apertura, cierre, Escape y retorno de foco siguen pendientes, además del e2e de preview y revisión visual sobre el head publicado.
- La compilación y TypeScript finalizan, pero el comando build devuelve error por `SecurityFatalError` de la versión instalada de Next. No se oculta ni se modifica ese control. El presupuesto global sigue rojo por Rendiciones lista/detalle y propuesta técnica CPQ, fuera del correctivo focal.
- Referente seguido y en qué se aparta: mismo flujo Envoy/Eptura existente y patrón de carga diferida ADR-037 del DS; no se modifica el flujo funcional ni autorización.

La prueba e2e existente ahora exige Escape, botón Cerrar, retorno del foco al disparador externo, reapertura por Enter y limpieza del campo antes de seguir su recorrido original. Se usa `Sheet.onRestaurarFoco`, sin cambiar el DS. `playwright --list` reconoce los tres tamaños; no es ejecución visual.

El error de seguridad también aparece en el build baseline: proviene de `next/dist/lib/upgrade/nudge.js`, que consulta los advisories npm y permite un reintento sin apagar el control. Next 16.4.5 publica correcciones oficiales (https://github.com/vercel/next.js/releases/tag/v16.4.5). La versión local 16.4.2 figura en rangos afectados; no se ha probado explotabilidad específica en OPAI. Auditoría y actualización de framework quedan separadas de este cambio de carga, sin rebajar comprobaciones.
