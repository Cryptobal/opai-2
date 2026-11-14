# CAR-335 D6a · El diseño nuevo, predeterminado

- **Sesión:** Sesión Diseño (Carlos le asignó D5 y D6 el 13-nov-2026, 23:02)
- **Estado:** En PR
- **Migración:** No

## Qué entra

- Sin cookie de marco se ve el diseño nuevo (`apps/web/lib/marco.ts`). El clásico y el Hilo se recuerdan con su cookie; el nuevo es la ausencia de la cookie.
- La preferencia `core.preferencias_marco` vale `nuevo` por defecto. En Preferencias el nuevo va primero y el clásico y el Hilo quedan como «diseño anterior».
- e2e: `playwright.config.ts` fija el clásico por defecto (cookie) para las pruebas escritas antes del cambio; las del nuevo y del Hilo ponen su propia cookie.

## Qué queda pendiente

- D6b: logo y color de la empresa en Configuración → Empresa → Marca.
- D6c: retirar el clásico y el Hilo del ERP y pasar las pruebas e2e al nuevo (quitar la cookie de `playwright.config.ts`).
- D5: agente dentro de la ficha.

## Riesgo

- Quien tenía guardado «clásico» en la preferencia pero sin cookie en su navegador ve el nuevo. Vuelve al clásico desde Preferencias o desde el menú de su cuenta.

## Sondeo e2e con el diseño nuevo (#727)

- `cabecera-estable` (CAR-12, CA1): en iPad el buscador se corría a la izquierda en las fichas con «Atrás» o acciones. Ahora va centrado sobre la barra (`position: absolute`) y la ruta se corta antes de llegar a él. En el teléfono la cuenta vive en «Yo» y la prueba la mide ahí.
- `ficha-un-panel`: a 1024 la lista ya no mide 360 px fijos; en el diseño nuevo la ficha toma el 58 % (CAR-336) y la prueba lo comprueba así.
- El resto de las e2e en rojo también fallan con el diseño clásico (#723) o pasan al reintento; no vienen del diseño nuevo.
