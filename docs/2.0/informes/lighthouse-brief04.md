# Informe Lighthouse — Brief 04 (base PWA)

**Tarea:** CAR-18 · **Rama:** `brief/04-pwa` · **Fecha:** 26-oct-2026 · **Herramienta:** Lighthouse 11.7.1 (emulación móvil, Moto G por defecto), ejecutado contra el **build de producción local** (`pnpm --filter @opai/web build` + `next start -p 3144`) sobre el head de la rama.

Cumple **D3 (b)** del Brief 04 (resuelta por Carlos el 26-oct-2026 13:45 CLT, t332u) como **informe, no como gate**, por decisión de OPAI 2.0 bajo la delegación de Carlos del 26-oct-2026 (16:54/16:59 CLT, t365u y t366u) a decidir todo el Núcleo. El gate equivalente de CI lo cubre Playwright (`e2e/pwa.spec.ts`: manifest, registro/control del service worker, cascarón sin red) más el presupuesto de JS (ADR-037). Lighthouse pasa a **gate** (≥ 90 rendimiento y accesibilidad) cuando el primer módulo de terreno tenga pantallas reales (ADR-044.7 enmendado).

## Alcance de la medición

Los portales de terreno (`/terreno`, `/trabajador`, `/supervisor`) exigen sesión y **hoy son placeholders** (solo Inicio y 404 dentro del shell). Por eso la medición se hace sobre el **cascarón público** de la PWA, que no requiere sesión y es lo que un dispositivo de terreno ve al abrir sin credenciales:

- `/login` — entrada al flujo de terreno (y a todo portal).
- `/sin-conexion` — la página offline neutra del DS que sirve el service worker cuando falla la red.

La instalabilidad (manifest válido, íconos que existen, `start_url` dentro del `scope`, service worker que registra y controla) se verifica además, de forma determinista y en cada corrida, en `apps/web/e2e/pwa.spec.ts`.

## Puntajes (0–100)

| Ruta            | Rendimiento | Accesibilidad | Prácticas recomendadas | SEO | PWA |
| --------------- | ----------- | ------------- | ---------------------- | --- | --- |
| `/login`        | **98**      | **100**       | **100**                | 92  | **100** |
| `/sin-conexion` | **96**      | **100**       | **100**                | 92  | **100** |

Rendimiento y accesibilidad quedan **por encima del umbral de 90** de ADR-029.14/ADR-044.7 en ambas rutas. La categoría **PWA = 100** en Lighthouse 11 (instalable, service worker, offline). Nota: Lighthouse 12 **quitó** la categoría PWA; se usó la 11 para dejar ese puntaje en el informe, y la validación continua la hace Playwright (ADR-044.7).

## Métricas de rendimiento (móvil emulado)

| Métrica                   | `/login` | `/sin-conexion` |
| ------------------------- | -------- | --------------- |
| First Contentful Paint    | 0,8 s    | 1,2 s           |
| Largest Contentful Paint  | 1,7 s    | 2,3 s           |
| Total Blocking Time       | 140 ms   | 170 ms          |
| Cumulative Layout Shift   | 0        | 0               |
| Speed Index               | 0,8 s    | 1,2 s           |

## Hallazgos

1. **`robots.txt is not valid` (SEO, ambas rutas).** No existe `apps/web/public/robots.txt`, así que Lighthouse lo marca; baja SEO a 92. No afecta a la PWA ni a terreno y queda fuera del alcance del Brief 04 (la app es privada tras sesión). Se evalúa con el SEO público del sitio, no aquí.
2. **JavaScript sin usar / recursos que bloquean el render (rendimiento).** Peso del **shell compartido** del ERP (paleta ⌘K, menús, selector de portal), no de esta base PWA; es el mismo motivo por el que el presupuesto de terreno está hoy en ~159 KB y no en 150 KB. Baja con los arreglos de rendimiento del shell (Brief 03, PR 2) y con el contenido real de terreno. Aun así el rendimiento queda en 96–98.
3. **Trabajo en el hilo principal / tiempo de arranque de JS (`/sin-conexion`).** La página offline carga el mismo runtime del shell; como es un placeholder sin datos, el impacto real en terreno se medirá con pantallas reales. Sin regresión de CLS (0) ni de LCP respecto a `/login`.

No hay hallazgos de accesibilidad ni de prácticas recomendadas (100/100 en ambas).

## Reproducción

```
pnpm --filter @opai/web build
pnpm --filter @opai/web exec next start -p 3144
# Lighthouse 11 en emulación móvil sobre /login y /sin-conexion,
# usando el Chromium de Playwright, categorías performance/accessibility/best-practices/seo/pwa.
```

La medición es informativa (no bloquea CI) y se repetirá sobre las rutas de terreno reales cuando lleguen Rondas o Asistencia, momento en que Lighthouse pasa a gate (ADR-044.7 enmendado).
