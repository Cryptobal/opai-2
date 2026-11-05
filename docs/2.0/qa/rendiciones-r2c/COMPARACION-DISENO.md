# Rendiciones · comparación con el diseño aprobado (CAR-200, punto 3)

Diseño: `docs/2.0/diseño/export-rendiciones-v3/` («Rendiciones OPAI 2.0 — módulo completo», tablero «Teléfono · quien rinde»). Construido en #332; capturas de la corrección en esta carpeta (375 px).

## Qué difería y qué se corrigió
| Pantalla | Diseño | Construido (#332) | Corregido |
|---|---|---|---|
| Lista, tarjeta | Línea secundaria por estado: «Hoy · borrador», «Revisa Carolina Muñoz», «Devuelta/Aprobada/Pagada el dd-mm-aaaa» | «Compra · fecha · Revisa: X» igual en todas | Sí (`lineaEstado`) |
| Devuelta | «Devuelta por Carolina Muñoz: «motivo.» Corrígela y reenvíala.» | «Te la devolvieron: motivo» | Sí |
| Botón «Nueva rendición» (teléfono) | Botón flotante abajo a la derecha | En la cabecera | Sí (flotante en teléfono; en cabecera desde 768 px) |
| Vacío | «Aún no has rendido gastos» / «Saca una foto de la boleta y envíala a aprobación.» | Texto distinto en la segunda línea | Sí |
| Sin permiso | «No tienes acceso a Rendiciones» / «Necesitas el permiso Rendir. Pídele acceso a <administrador>, administrador de <empresa>.» + «Pedir acceso» | Título y texto distintos, sin administrador ni botón | Parcial: título y texto; ver pendientes |
| Elegir tipo | «Compra con boleta» / «Kilometraje» (hoja con «Cancelar») | «Una compra» / «Kilometraje» (página) | Texto sí; sigue siendo página |
| Aviso de duplicado | «**Esta boleta ya fue rendida en REN-12.** Puedes continuar si es otra compra; el aprobador verá el aviso.» | «…Puedes continuar, pero revisa…» | Sí |
| Lista de gastos | «Gastos en esta rendición (n)», total y «+ Agregar otro gasto» | Sin título; «Agregar otro gasto» | Sí |
| Aprobador | «Asignado por tu empresa. No puedes elegirte a ti mismo.» | «No puedes aprobar tus propias rendiciones.» | Sí (selector solo si hay más de uno) |
| Kilometraje | «Cómo se calculó», «Total a rendir», «El monto lo calcula el sistema; no se puede escribir a mano.» | «Total a reembolsar», sin la nota | Sí |
| Confirmación de envío | «¿Enviar a aprobación?» con Aprobador, Total y Gastos; «Confirmar y enviar» / «Seguir editando» | Texto corrido; «Enviar a aprobación» / «Volver» | Sí |

## Diferencias que NO se corrigieron (decisión de Carlos)
- **Estructura de la compra:** el diseño es una sola pantalla con la foto arriba («1 · Foto de la boleta») y los campos debajo; lo construido son dos pasos (foto y tipo, luego datos) más un resumen, como pedía la descripción del encargo. Convertirlo es un cambio de estructura, no de textos.
- **Interruptor «No tengo boleta»:** aparece en el diseño; no se construye (decisión del 5-nov-2026: las excepciones van en una etapa posterior).
- **Origen y destino del kilometraje:** el diseño muestra «Ruta calculada: 48 km» como bloque aparte; se muestra dentro del desglose («N km por ruta / en línea recta»).
- **Error de carga:** el diseño dice «No pudimos cargar tus rendiciones… código R-5021»; se usa el estado de error común del portal («No pudimos cargar esta página»).
- **Sin permiso:** el diseño nombra a la persona administradora y trae «Pedir acceso»; falta una capacidad que entregue ese dato a quien no tiene el permiso.
- Lupa de búsqueda en la cabecera de la lista: no está en el alcance de R2.
- Pantallas de escritorio del diseño (aprobador, pagos, configuración, Plataforma): son R3/R4/CAR-188; no se tocaron.
