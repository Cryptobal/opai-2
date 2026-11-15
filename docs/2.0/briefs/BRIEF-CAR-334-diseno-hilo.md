# BRIEF · CAR-334 · Diseño y experiencia: reglas Hilo verificables y auditoría de los 4 portales

**Sesión:** «Sesión Diseño» (dueña de Diseño y experiencia; proyecto de Linear «21 · Diseño y experiencia») · **Encargo:** Carlos, 12-nov-2026 16:20 · **Referencia única:** «OPAI 2.0 Design System · Hilo» de Claude Design (ADR-102), copia en el repo: `docs/2.0/design/export-base-hilo/` y `packages/ds` · **Obsoletos:** V1, V2 y el «OPAI Design System» antiguo, solo como referencia de lo ya construido.

## 1. Objetivo

Que los cuatro portales (ERP, Cliente, Guardia/Trabajador y Terreno), en escritorio y celular, sean coherentes con Hilo y funcionen bien: pantallas consistentes, botones sin duplicar, tipografía y textos correctos en español de Chile, flujos sin errores.

## 2. Estado actual (verificado en `main` `59e9d72`, 12-nov-2026)

- La piel Hilo vive en `@opai/ds` con alcance `[data-marco="hilo"]` (`tokens.css`), la variante `marco-hilo:` y utilidades `ds-*` (`DISENO.md` §3b). El marco Hilo es opcional por usuario (Mi cuenta › Preferencias › Diseño); el clásico sigue por defecto hasta H7 (ADR-090).
- La **Sesión Hilo** construye el marco por etapas (H1–H7, `BRIEF-base-hilo.md`); hoy tiene abierto #582 (H3). H5 (portales Cliente, Trabajador, Terreno) no está construida: esos portales siguen con el marco clásico.
- Diferencias de tokens ya vistas entre el sistema Hilo de Claude Design (`tokens.json`) y `tokens.css`: la escala de radios (Hilo: 6/8/10/12/14/16/20; Tailwind hoy: `sm` 6, `md` 12 en Hilo, `lg` 16, `xl` 20), los textos de estado (`ok`, `warn`, `bad`) no se fijan en el bloque Hilo, y no hay token para `agente-bg`, el monograma ni el texto de control (16/22).
- La sesión de prueba de `preview-e2e` es el dueño de la empresa ficticia `qa-e2e` (ERP). Para Cliente existe un contacto prospecto opcional (`E2E_PROSPECTO_*`). No hay identidad de trabajador ni dispositivo emparejado de `qa-e2e` en los secretos.
- 222 rutas con `page.tsx` (más los comodines por portal).

## 3. Alcance

**Entra:** reglas Hilo verificables (tokens, reglas de uso, formatos chilenos) con pruebas; `DISENO-hilo.md` y su ADR; la auditoría completa con capturas e issues; las correcciones transversales (componentes de `@opai/ds`, layout, navegación, tipografía, botones, textos); pruebas visuales de referencia, axe y el workflow de revisión con `claude-code-action`.

**No entra:** cambiar decisiones de producto ni flujos de negocio; tocar lo que vive dentro de un módulo (se asigna a su sesión); rehacer el marco Hilo (es de la Sesión Hilo); datos o tenant de Gard; producción; OPAI 1.0. Si Hilo y una pantalla aprobada se contradicen, o falta una definición, se pregunta a Carlos.

## 4. Plan por fases

| Fase | Entrega | PR |
|---|---|---|
| **0 · Reglas** | Tokens Hilo completos en `@opai/ds` con prueba que los compara contra la fuente (`hilo-tokens.ts`); reglas de uso verificables (un solo botón primario por vista, ubicación de acciones, estados vacío/carga/error, formatos de RUT, fechas y montos) como pruebas y lint; `docs/2.0/DISENO-hilo.md`; ADR «Hilo, fuente única de diseño» | Este PR |
| **1 · Auditoría** | Spec `@auditoria` que recorre todas las rutas de los 4 portales con `qa-e2e` a 1440 y 390 px, en el marco Hilo, con capturas y un chequeo automático de reglas (primarios por vista, desbordes, textos en inglés, errores de consola, axe). Capturas en `docs/2.0/auditoria-diseno/` con índice por portal y módulo. Un issue por hallazgo en «21 · Diseño y experiencia» (Alta/Media/Baja), los repetidos en uno transversal | Este PR |
| **2 · Correcciones** | Lo transversal, un tema por PR, con antes y después a 1440 y 390 px. Lo de cada módulo se asigna a su sesión | PRs chicos `[Sesión Diseño] CAR-n …` |
| **3 · Que no retroceda** | Capturas de referencia de pantallas clave y axe en CI; workflow con `claude-code-action` que compara preview y `main` y comenta contra Hilo; se salta sin `ANTHROPIC_API_KEY` | PR propio |

**Medición de la experiencia:** clics y pantallas antes y después en tareas clave (emitir una factura, cotizar, marcar asistencia, hacer una ronda), en el índice de la auditoría.

## 5. Archivos (fase 0 y 1)

`packages/ds/src/hilo-tokens.ts` (+ test), `packages/ds/src/tokens.css` (bloque Hilo), `packages/ds/src/reglas/*` (reglas de uso y su prueba), `docs/2.0/DISENO-hilo.md`, `docs/2.0/01-decisiones.md`, `apps/web/e2e/auditoria-diseno*.ts`, `.github/workflows/auditoria-diseno.yml`, `docs/2.0/auditoria-diseno/`, `docs/2.0/ESTADO.md`.

## 6. Modelo de datos y migraciones

Ninguno.

## 7. Capacidades

Ninguna nueva. La auditoría solo lee pantallas.

## 8. Interfaz y responsive

1440 y 390 px en la auditoría; 375, 1024 y 1280 en `preview-e2e`, como siempre.

## 9. Seguridad y tenant

Solo la empresa ficticia `qa-e2e`; nunca Gard ni datos reales. Los secretos viven en GitHub Actions y no se imprimen. La auditoría no escribe datos de negocio; si necesita una identidad de prueba (trabajador, dispositivo), se crea en `qa-e2e` y se reporta.

## 10. Casos límite

Rutas con `[id]` se resuelven abriendo el primer registro de su lista; si no hay, se captura el estado vacío y se anota. Rutas de portales sin identidad de prueba se capturan en su pantalla de acceso y se anotan como brecha de la auditoría.

## 11. Commits

`docs: plan`, `ds: tokens Hilo completos`, `ds: reglas de uso verificables`, `docs: DISENO-hilo y ADR`, `e2e: auditoría de diseño`, `ci: workflow de auditoría`, `docs: capturas e índice`, `docs: ESTADO`.

## 12–15. Tests, validación, aceptación y riesgos

- Gate completo en verde; `hilo-tokens.test.ts` y las reglas fallan si alguien cambia un token o rompe una regla.
- Aceptación: todas las rutas alcanzables capturadas a 1440 y 390; un issue por hallazgo con captura, lo que pide Hilo y prioridad.
- Riesgo: choque con la Sesión Hilo en `packages/ds`. Mitigación: tokens nuevos solo aditivos y con alcance Hilo; aviso en sus PR antes de tocar un archivo que tengan abierto.

## 16. Reporte de ejecución

Se completa al cerrar cada fase.
