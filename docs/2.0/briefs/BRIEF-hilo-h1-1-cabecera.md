# Brief · Hilo H1.1: cabecera del hilo corregida y pendientes de H1 (CAR-317)

Rama `brief/car-317-hilo-cabecera`, apilada sobre H1 (`brief/car-278-hilo-h1-marco`, PR #509). Sin migración.

## 1 · Objetivo

Llevar la cabecera del hilo a la versión que Carlos pidió en la maqueta (11-nov-2026) y cerrar los pendientes que dejó H1: dos hallazgos verificados de la revisión automática de #509 y dos observaciones de las capturas de `preview-e2e`.

## 2 · Estado actual (verificado en la rama de H1)

- `packages/ds/src/shell/hilo/cabecera.tsx` muestra la identidad, un botón «Portales» que hace lo mismo que tocar la identidad, Inicio, Índice y el tema (este solo desde 1400 px). Con 1024 y 1280 px el nombre de la empresa queda cortado.
- `useHilo` pide Agenda y Actividad una sola vez mientras vive el marco (`pedido.current`).
- `EstadoEnlace` sube la ventana tras el esqueleto (CAR-231); en el marco Hilo lo que se desplaza es el `<main>` del lienzo.
- Preferencias usa `tituloSiempre`: dentro del marco Hilo el título sale dos veces (lienzo y página).
- A 375 px el texto de la barra se corta («Pide, pregunta o busca una …»).

## 3 · Alcance

Entra: cabecera del hilo, texto corto de la barra en teléfono, título de Preferencias en Hilo, refresco de Agenda y Actividad al reabrir el segmento, scroll del lienzo tras el esqueleto, export del diseño sincronizado. No entra: nada de H2 en adelante.

## 4 · Arquitectura

- La identidad de la cabecera es el selector que abre Portales (sin botón aparte). Estilos con nombre `t-hilo-sujeto` y `t-hilo-monograma` (sin tamaños sueltos).
- `BarraHilo` acepta `textoCorto` (bajo 640 px).
- `Cabecera` del DS acepta `tituloComoShell`: con `tituloSiempre`, el título se oculta solo dentro del marco Hilo.
- `conservarSiFalla` (cargas del hilo): un refresco sin lista no borra la que se veía. `onSegmento` vuelve a pedir Actividad o Agenda cada vez que se abren (una consulta por clic, nunca por navegación, ADR-045).
- `contenedorDeScroll` y `SELECTOR_LIENZO` (`main[data-lienzo]`): tras el esqueleto se sube el lienzo si existe; si no, la ventana.

## 5 · Archivos

`packages/ds/src/shell/hilo/{cabecera,barra,iconos,lienzo,props}.tsx|ts`, `packages/ds/src/patterns/estado.tsx`, `packages/ds/src/styles.css`, `apps/web/app/_components/{estado-enlace.tsx,hilo/use-hilo.ts,hilo/cargas-hilo.ts,hilo/textos-marco.ts}`, `apps/web/lib/scroll-tras-esqueleto.ts`, `apps/web/app/(erp)/mi-cuenta/preferencias/page.tsx`, `apps/web/app/ds/hilo/muestra-hilo.tsx`, pruebas y capturas `hilo-ds-*`, `docs/2.0/design/export-base-hilo/`.

## 6 · Modelo de datos y migraciones

Ninguno.

## 7 · Capacidades

Ninguna nueva. El hilo sigue leyendo `core.actividad.list` y `core.actividades.tareas` con id literal.

## 8 · Interfaz y responsive

Igual a la maqueta versión `1794432186-973b`: a 375 px Inicio e Índice a la derecha; desde 1024 px también el tema.

## 9 · Seguridad y tenant

Sin cambios de acceso. El refresco de segmentos usa las mismas capacidades, con el tenant de la sesión.

## 10 · Casos límite

Refresco que falla (se conserva la lista), primer pedido que falla (error con «Reintentar»), marco clásico (el scroll sigue en la ventana), nombre de empresa largo (se corta con puntos al final, pero ya no compite con «Portales»).

## 11 · Plan por bloques

1. `ds:` cabecera, barra, título de página y marca del lienzo. 2. `web:` refrescos, scroll, textos y Preferencias. 3. `docs:` export, brief, novedad y ESTADO.

## 12 · Tests

`cabecera.test.tsx`, `barra.test.tsx`, `estado.test.tsx`, `hilo.test.tsx` (marca del lienzo), `cargas-hilo.test.ts` (`conservarSiFalla`), `scroll-tras-esqueleto.test.ts` (`contenedorDeScroll`), e2e `hilo.spec.ts` y `hilo-muestra.spec.ts`. Cada prueba nueva se vio fallar antes del cambio.

## 13 · Validación

e2e del Hilo 12/12 en local a 375, 1024 y 1280 px; capturas comparadas con la maqueta; `preview-e2e` en el PR.

## 14 · Criterios de aceptación

Cabecera igual a la maqueta y sin textos cortados por «Portales»; sin título repetido en Preferencias; barra legible a 375 px; Agenda muestra una tarea hecha en otra pantalla al reabrirla; tras una navegación lenta el lienzo queda arriba.

## 15 · Riesgos y rollback

Bajo: solo el marco Hilo, que es optativo por usuario. Se revierte el PR.

## 16 · Reporte de ejecución

- Gate local: typecheck y lint (45 tareas), `pnpm test` (618 archivos, 3955 pruebas), build y `pnpm presupuesto`, e2e del Hilo 12/12 a 375, 1024 y 1280 px.
- **Presupuesto de JS:** cinco rutas quedaron a menos de 0,05 KB sobre su tope (`agente/historial`, `supervisor`, `supervisor/[...ruta]`, `supervisor/instalaciones`, `terreno/[...ruta]`) por el ajuste del scroll en el enlace del menú, que va en todas las rutas. Se sube 1 KB cada tope, como en H1.
- **Autorrevisión (subagente):** sin bloqueos. Se corrigieron tres hallazgos: el refresco de Actividad y Agenda quedó en una función probada (`refrescoDeSegmentos`), descarta respuestas viejas y muestra «sin permiso» en vez de conservar la lista. Quedan como menores: el selector no declara `aria-expanded` (tampoco lo hacía el botón «Portales»; va con H4) y dos radios con valores sueltos (`rounded-[14px]`, `px-[7px]`) iguales a los que ya usa el marco.
- **Intermitente de H1:** dos veces, en iPad, elegir «Hilo» en Preferencias no cambió el marco en 60 s (el reintento pasó). Se sigue con la traza de Playwright si vuelve a aparecer.
