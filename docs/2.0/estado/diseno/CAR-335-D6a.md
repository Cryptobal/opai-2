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
