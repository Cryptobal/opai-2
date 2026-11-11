# BRIEF · Hilo H1: interruptor de marco, marco Hilo en el ERP y piel de las pantallas por dentro (CAR-278)

Etapa H1 del plan `BRIEF-base-hilo.md` (ADR-090, CAR-274), más la parte de la etapa H2 que Carlos pidió adelantar el 11-nov-2026 (13:33): «las pantallas por dentro quiero que lleguen ahora». Sesión Hilo. Sin migración.

## 1. Objetivo

Que una persona del ERP pueda elegir el marco «Hilo» y trabajar con las mismas pantallas de hoy dentro de él: el hilo (lo que espera su decisión, lo que pasó y lo que viene), el lienzo (la pantalla de trabajo) y la barra al pie. Las pantallas por dentro (botones, campos, etiquetas de estado, tablas) toman el estilo del diseño aprobado solo dentro del marco Hilo. Quien sigue en el marco clásico no nota ningún cambio.

## 2. Estado actual (verificado en `main` 2266562, 11-nov-2026)

- El marco del portal es `MarcoShell` (cliente), montado por `PortalLayout` dentro de un `<Suspense>`; usa `AppShell` de `@opai/ds`.
- Las preferencias por usuario son ajustes de ámbito `usuario` (ADR-038); el Tema se guarda así y rige por navegador.
- `core.inicio.pendientes`, `core.actividad.list`, `core.actividades.tareas` y `core.resumen.contadores` ya existen, con herramienta MCP.
- El diseño aprobado está en `docs/2.0/design/export-base-hilo/`.

## 3. Alcance

Entra:

- Preferencia «Diseño» (Clásico o Hilo) en Mi cuenta → Preferencias y atajo en el menú de la cuenta. Solo en el ERP.
- Marco Hilo en el ERP: cabecera con empresa y portal, Pendientes reales, Actividad y Agenda en versión base, lienzo con todas las rutas actuales, Índice desde el manifiesto de navegación, Portales (portales, empresas y cuenta), hilo plegado en planillas y barra al pie.
- Piel de las pantallas por dentro, con alcance al marco Hilo: botón principal en tinta, controles con radio de 12 px, etiquetas de estado sin punto, tabla sin tarjeta, y el título de teléfono del patrón oculto (el lienzo ya lo muestra).
- Muestra sin sesión en `/ds/hilo` (fuera de producción), con sus estados y las piezas por dentro.

No entra (etapas siguientes del plan):

- La barra como agente con contexto de la pantalla, sugerencias y micrófono (H4). En H1 la barra abre la búsqueda actual, que donde hay agente también ofrece preguntarle.
- Actividad y Agenda como lecturas propias del hilo (H3), los demás portales (H5), propuestas y autonomía por agente (H6) y el marco por defecto por empresa (H7).
- Pantallas de Finanzas: no se tocan (CAR-266 a CAR-269 abiertas). Solo heredan la piel común del DS dentro del marco Hilo.

## 4. Arquitectura

- **Una aplicación, dos marcos.** `MarcoPortal` (cliente) monta `MarcoShell` o `MarcoHilo`. `MarcoHilo` se descarga con `next/dynamic`: quien usa el clásico no lo baja.
- **Sin parpadeo.** La preferencia se guarda con `core.config.set` (`core.preferencias_marco`) y además en la cookie `opai_marco` del navegador. El servidor lee la cookie en `ShellResuelto` y manda el marco correcto en el HTML. Cambiar de marco = guardar, fijar la cookie y recargar.
- **Por navegador, como el Tema.** No se sincroniza sola entre dispositivos: evita que una sesión cambie el marco de otra abierta por la misma persona.
- **Vista por ruta.** `inicio` (hilo abierto), `pantalla` (hilo abierto desde 1400 px; plegado en el riel entre 1024 y 1399) y `ancha` (planillas: `/pauta`, `/asistencia`, `/finanzas/flujo`; siempre riel). Bajo 1024 px se ve una pieza a la vez.
- **Piel con alcance.** Tokens `[data-marco="hilo"]` y la variante de Tailwind `marco-hilo:`. El marco copia `data-marco` a `<html>` para que diálogos y menús, que se pintan en `<body>`, usen la misma piel.
- **Datos del hilo.** Pendientes y avisos se piden una vez después de pintar y al volver a la pestaña con datos de más de 60 s; no por navegación (ADR-045). Actividad y Agenda se piden al abrir su segmento.

## 5. Archivos

- `packages/ds/src/tokens.css`, `styles.css`, `tokens.test.ts`: tokens, utilidades `t-hilo-*`, variante `marco-hilo:`, punto de quiebre `hilo` (1400 px).
- `packages/ds/src/shell/hilo/*`: `HiloShell` y sus piezas, con pruebas de marcado.
- `packages/ds/src/components/{button,input,select,badge,table,card}.tsx`, `patterns/{estado,split-screen}.tsx`: piel con alcance.
- `packages/capabilities/src/core/config/nucleo.ts`: ajuste `preferencias_marco`.
- `apps/web/lib/{marco,marco-servidor,tema}.ts`, `apps/web/app/_components/{marco-portal.tsx,hilo/*}`, `portal-layout.tsx`, menú de la cuenta, Preferencias e Inicio.
- `apps/web/app/ds/hilo/*`, `apps/web/e2e/{hilo.spec.ts,hilo-muestra.spec.ts,hilo-apoyo.ts,hidratacion.ts}`, `apps/web/test/{marco-hilo,datos-hilo,cargas-hilo,inicio-hilo}.test.ts`.
- `apps/web/presupuesto-js.json`, `docs/2.0/paridad/mcp-inventario.md`, novedad in-app.

## 6. Modelo de datos y migraciones

Ninguna. La preferencia es un ajuste de ámbito usuario (ADR-038).

## 7. Capacidades

Ninguna nueva. El marco usa `core.inicio.pendientes`, `core.resumen.contadores`, `core.actividad.list`, `core.actividades.tareas` y `core.config.set`, todas con herramienta MCP. El inventario de paridad suma el par `app/_components` → `core.inicio.pendientes`.

## 8. Interfaz y responsive

Referencia exacta: `docs/2.0/design/export-base-hilo/`. Tres tamaños: 375, 1024 y 1280 px (más 390 y 1440 en la verificación local). Toques de 44 px y foco visible. Pendientes tiene estados cargando, vacío y error con «Reintentar»; Actividad y Agenda suman el de sin permiso.

## 9. Seguridad y tenant

Sin superficie nueva. La cookie `opai_marco` solo elige qué marco se pinta y solo vale en el ERP con acceso y empresa actual; no da acceso a nada. Los datos del hilo salen de capacidades ya existentes, con sus permisos, alcance y auditoría. La preferencia se escribe con `core.config.set` (ámbito usuario).

## 10. Casos límite

- Cookie con un valor desconocido o portal distinto del ERP: marco clásico.
- Falla al guardar la preferencia: aviso y no cambia nada (ni cookie ni recarga).
- Falla o falta de permiso en Pendientes: el hilo muestra el estado y «Reintentar»; el lienzo sigue funcionando.
- Rutas de configuración: «volver» lleva al padre de Configuración.
- Sin agente contratado: la barra busca y va en tinta.

## 11. Plan por bloques

1. `ds:` tokens y utilidades de la piel Hilo.
2. `ds:` marco Hilo.
3. `core:` preferencia de diseño.
4. `web:` interruptor y marco Hilo en el ERP.
5. `ds:` piel de las pantallas por dentro.
6. `web:` muestra `/ds/hilo`, e2e y capturas.
7. `docs:` brief, decisiones, estado, novedad y presupuesto de JS.

## 12. Tests

- DS: contraste de los tokens Hilo en claro y oscuro, radio de controles, marcado de `HiloShell` en cada vista y estado.
- Web: cookie y portal, rutas anchas, tema, atajo del menú, datos del hilo, Inicio sin duplicados.
- Capacidades: ajuste `preferencias_marco` (defecto, cambio, valor inválido).
- Web: las cargas del hilo no quedan colgadas sin red (pasan a error) y la regla única que decide el marco.
- e2e: `hilo-muestra.spec.ts` recorre la muestra `/ds/hilo` (segmentos, Índice, Portales, estados, planilla y piezas con estilos calculados). `hilo.spec.ts`, marcada `@preview`, recorre con sesión: elegir Hilo en Preferencias, HTML del servidor con el marco, Inicio sin duplicados, Índice → Cuentas, búsqueda desde la barra, `/pauta` ancha y vuelta al clásico comprobada en positivo.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`, `pnpm --filter @opai/web build` y `pnpm presupuesto`. e2e del marco en 375, 1024 y 1280 px, contra `pnpm dev` y contra la compilación de producción. Capturas comparadas con el export del diseño.

## 14. Criterios de aceptación

1. Con el marco clásico nada cambia.
2. Con Hilo, todas las rutas del ERP abren dentro del lienzo.
3. Sin parpadeo: el HTML del servidor ya trae el marco elegido.
4. El hilo no agrega consultas por navegación.
5. Botones, campos, etiquetas y tablas se ven como en el diseño dentro del marco Hilo, con contraste AA.
6. JS dentro del tope de cada ruta, o con la subida justificada.

## 15. Riesgos y vuelta atrás

- **Vuelta atrás:** «Volver al diseño clásico» en Portales o en Preferencias. Si hiciera falta para todos, basta con que `portalAdmiteHilo` devuelva `false`: el layout, Inicio y Preferencias deciden con la misma regla (`marcoDeLaPeticion`).
- **Peso de JS:** el marco Hilo va en una descarga aparte; las rutas de portal suben entre 0,3 y 0,5 KB (ver §16).
- **Desvíos respecto del diseño:** ver §16.

## 16. Reporte de ejecución

**Qué se hizo (11-nov-2026).** Los siete bloques del plan, sobre `main` traído con merge (incluye `preview-e2e`, ADR-092).

**Diferencias con el plan.**

- La piel de las piezas comunes del DS (parte de H2) entró aquí por pedido de Carlos. Queda para H2 lo que no es común a todas las pantallas: alineación de los estados vacíos, avisos, `KpiTile` y los ajustes finos de cada patrón.
- El radio de los controles pasó a ser un token del DS (`--ds-radius-md`), porque el tema de Tailwind va «inline» y no se podía cambiar con alcance. En el marco clásico sigue en 10 px.
- Inicio usa en el marco Hilo dos columnas con colocación automática: sin el bloque de decisión, la rejilla clásica dejaba una columna vacía.
- El botón de tema del hilo aparece solo cuando la columna mide 440 px (desde 1400 px); bajo eso está en Portales y en el riel. Con 370 px el nombre de la empresa quedaba cortado a dos letras.

**Presupuesto de JS.** Medido contra la base (`2266562`) con la misma compilación local: las rutas de portal suben entre 0,3 y 0,5 KB (el contenedor que elige el marco, el atajo del menú y las clases de la piel). El marco Hilo completo va en una descarga aparte que el marco clásico no baja, y el cambio de marco se descarga al elegirlo; con eso la subida bajó de 1,8 KB a 0,4 KB. Como `main` vive a menos de 0,5 KB de sus topes, 18 rutas quedaban entre 0,0 y 0,7 KB arriba: se sube 1 KB el tope de cada una (`/(erp)`, `contactos/[id]`, `cotizaciones/[id]/propuesta-tecnica`, `finanzas/bancos`, `finanzas/ventas/[id]`, `finanzas/ventas/programacion/nueva`, `instalaciones/[id]/dispositivos`, `instalaciones/[id]/negocios`, `mi-cuenta/preferencias`, `negocios/[id]`, `negocios/[id]/cotizaciones`, `tareas`, `supervisor/personas/[id]`, `supervisor/rendiciones/[id]`, `supervisor/rendiciones/nueva/compra`, `terreno/porteria`, `terreno/rondas` y `trabajador/mis-datos`). El costo desaparece cuando se retire el marco clásico (H7).

**Errores de hidratación solo con `pnpm dev`.** En teléfono, la prueba fallaba al ir de Inicio a Cuentas por el Índice. Lo investigado:

- Con `pnpm dev`, a menos de 1024 px, navegar antes de que hidrate el contenido de la página (cerca de 1 s después del marco) deja a React de desarrollo con «Unexpected Fiber popped», «multiple renderers» y miles de errores de hidratación; a veces la página cae. Se reprodujo en 6 de 8 intentos; esperando la hidratación, 0 de 8. A 1280 px no se reprodujo (0 de 8).
- Se descartó que lo causaran ocultar el lienzo con `display: none` y cerrar el panel al hacer clic (los dos experimentos siguieron fallando).
- Con la compilación de producción no ocurre: 10 de 10 intentos limpios a 375 y a 1280 px, y otros 10 de 10 con la CPU seis veces más lenta, navegando siempre antes de la hidratación.
- No quedó identificado por qué depende del ancho. La prueba ahora espera a que hidrate el contenido antes de navegar (`contenidoHidratado`), igual que ya se esperaba la hidratación de los controles.

**Desvíos declarados respecto del export.**

1. Borde de los campos: se mantiene el del DS (contraste 3:1) en vez del borde tenue del export.
2. Entre 1024 y 1399 px, en una pantalla de trabajo el hilo queda plegado en el riel: las páginas usan puntos de quiebre de la ventana y no caben en el lienzo que deja el hilo abierto.
3. La barra abre la búsqueda actual; el contexto de la pantalla, las sugerencias y el micrófono llegan en H4.
4. Actividad y Agenda usan las lecturas actuales (H3 les da las propias).
5. Los estados vacíos siguen centrados (el export los alinea a la izquierda).

**Autorrevisión (subagente que no participó).** Sin bloqueos en seguridad, RLS/tenant, permisos, migraciones ni datos. Se corrigió antes de abrir el PR: «Tus accesos» y «Fijar» de la ficha no funcionaban en el marco Hilo (faltaba la isla de preferencias); Inicio y Preferencias leían la cookie sin la regla del layout (ahora hay una sola, y una pestaña que quedó con el marco anterior se recarga al volver a ella); sin red, Actividad y Agenda quedaban cargando para siempre; afirmaciones débiles del e2e (la vuelta al clásico ahora se prueba en positivo y el filtro de ruido de `next dev` no se aplica contra un sitio desplegado); y las capturas con sesión dejaron de versionarse: mostraban el usuario y la empresa de la siembra local, y la evidencia visual es el artefacto de `preview-e2e` con `qa-e2e`. Quedan como observaciones: el nombre de la empresa se corta en la cabecera del hilo a 1024 y 1280 px; el texto de la barra se corta a 375 px; cada cambio de marco o de tema queda en Actividad como «realizó un cambio» (igual que el tema hoy); el marco se recuerda por navegador, no por usuario; y las pestañas del hilo no se recorren con las flechas del teclado.

**Validación.** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm --filter @opai/web build` y `pnpm presupuesto` en verde. e2e del marco: 12 de 12 con `pnpm dev` (375, 1024 y 1280 px) y las pruebas `@preview` contra la compilación de producción. Capturas en `apps/web/e2e/__screenshots__/hilo-*.png`.
