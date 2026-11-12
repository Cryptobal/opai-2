# DISENO-hilo — reglas verificables de la piel Hilo

**Fuente única:** «OPAI 2.0 Design System · Hilo» en Claude Design (<https://claude.ai/artifact/NySPx8Tq4LRChyYVadAnFa>, privado de Carlos) y su copia en el repo: el prototipo aprobado `docs/2.0/design/export-base-hilo/` y `packages/ds` ([ADR-102](01-decisiones.md), [ADR-105](01-decisiones.md)). V1, V2 y el «OPAI Design System» antiguo quedan solo como referencia de lo ya construido. Este archivo complementa `DISENO.md` (§3b) y no lo reemplaza: aquí están las reglas que se comprueban solas, y quién las comprueba.

## 1. Tokens

Los valores viven en `packages/ds/src/hilo/tokens-hilo.ts` (importable como `@opai/ds/hilo`), copia exacta de `tokens.json` del sistema Hilo. `tokens-hilo.test.ts` resuelve el valor efectivo de cada variable dentro del marco Hilo en `tokens.css`, en claro y oscuro, y lo compara. **Si cambia Hilo en Claude Design, se cambia `tokens-hilo.ts` y `tokens.css` en el mismo PR; si alguien cambia solo uno, el test falla.**

| Hilo | Variable del DS | Clase de Tailwind |
|---|---|---|
| `bg`, `surface`, `fill`, `line` | `--ds-bg`, `--ds-surface`, `--ds-fill`, `--ds-border` | `bg-bg`, `bg-surface`, `bg-fill`, `border-border` |
| `fg`, `muted` | `--ds-fg`, `--ds-fg-muted` | `text-fg`, `text-fg-muted` |
| `agente`, `agente-bg`, `agente-fg` | `--ds-accent`, `--ds-accent-muted`, `--ds-accent-fg` | `bg-accent`, `bg-accent-muted`, `text-accent-fg` |
| `ok`/`warn`/`bad` y `*-bg` | `--ds-success-fg`/`--ds-warning-fg`/`--ds-danger-fg` y `*-muted` | `text-success-fg`, `bg-success-muted`… |
| `radius-md` (12) | `--ds-radius-md` | `rounded-md` |
| `shadow-overlay` | `--ds-shadow-overlay` | `shadow-overlay` |

**Diferencias conocidas (a resolver en la fase 2, no en módulos):** la escala de radios de Tailwind no es la de Hilo fuera de `md` (`rounded-lg` = 16 y `rounded-xl` = 20, mientras Hilo pide 14 para ícono de estado y búsqueda, 16 para avisos y 20 para diálogos); el texto de control de Hilo es 16/22 y `text-md` es 16/24. Hasta corregirlo en el DS, las piezas Hilo usan las utilidades `ds-*` de `styles.css`.

## 2. Reglas de uso

Cada regla dice qué pide Hilo y quién la verifica. «Trinquete» quiere decir: lo que ya existía queda en `apps/web/test/reglas-diseno/base.json` y no puede crecer; todo archivo nuevo parte en cero.

| Id | Regla | Verifica |
|---|---|---|
| **R1** | **Un solo botón primario por vista.** El primario (tinta en Hilo) es la acción de la persona; lo demás es secundario o fantasma. Un diálogo abierto es otra vista y puede tener el suyo | Auditoría (`ds-primario` visibles fuera de diálogos ≤ 1); el `Button` primario lleva la clase marcadora `ds-primario` |
| **R2** | **Ubicación de las acciones.** En iPad y escritorio la acción principal va en la cabecera del patrón, a la derecha del título; en teléfono, abajo y a todo el ancho. «Editar» en la ficha; nunca la misma acción dos veces en la misma vista (cabecera y pie) | Auditoría (nombres de botón repetidos en la vista) |
| **R3** | **Índigo solo para el agente.** Ningún botón de una persona en `accent` dentro del marco Hilo | DS (el primario pasa a tinta con `marco-hilo:`) y auditoría |
| **R4** | **Estados completos.** Toda pantalla con datos tiene cargando (esqueleto con la forma), vacío (qué falta y su acción), error (en lenguaje de usuario, con «Reintentar») y sin permiso (sin datos parciales) | Patrones del DS (`state`), `estados-hilo.test.tsx` y auditoría (pantallas en blanco) |
| **R5** | **Formatos chilenos.** RUT `12.345.678-5`; fecha `12-11-2026`; fecha y hora `12-11-2026 16:20`; CLP `$ 31.750.000`; UF `UF 380,00`; porcentaje `98,6 %`. Siempre con `formatearRut`, `formatearFecha`, `formatearFechaHora`, `formatearClp`, `formatearUf`, `formatearPorcentaje` y `formatearNumero` de `@opai/domain` | Trinquete `F1-formato-propio` (sin `toLocale*` ni `Intl` en pantallas) y auditoría (fechas `aaaa-mm-dd` o con barra visibles) |
| **R6** | **Botones que dicen lo que hacen.** «Guardar cambios», «Pedir renovación»; nunca «OK», «Aceptar», «Enviar» a secas ni textos en inglés | Trinquete `B1-boton-generico` y auditoría (palabras en inglés visibles) |
| **R7** | **Tipografía de la escala.** Solo los estilos `t-*`, la escala de Tailwind o tamaños de `TIPOGRAFIA_HILO` | Trinquete `T1-tamano-fuera-de-escala` |
| **R8** | **Sin estilos en línea** de color, fondo, tamaño o radio | Trinquete `C1-estilo-en-linea` y el lint de hex de `REGLAS-codigo.md` |
| **R9** | **Todo se toca con el dedo:** 44 px o más en botones, campos, filas y pestañas en teléfono | Auditoría a 390 px |
| **R10** | **Sin desborde horizontal** de la página en teléfono | Auditoría a 390 px |
| **R11** | **Accesible:** sin violaciones serias o críticas de axe (contraste, nombres, etiquetas) | Auditoría (axe) y, en la fase 3, CI |
| **R12** | **Español de Chile y de tú**, oraciones cortas, sin tecnicismos ni errores de consola visibles | Auditoría y revisión |

## 3. Cómo se audita

`apps/web/e2e/auditoria-diseno.spec.ts` (`@auditoria`) recorre las rutas de los cuatro portales con la empresa ficticia `qa-e2e` (nunca Gard), en el marco Hilo, a 1440 y 390 px. Guarda una captura por pantalla y un informe JSON con las mediciones de R1, R2, R6, R9, R10, R11 y los errores de consola. Lo corre el workflow `auditoria-diseno` en el PR con la etiqueta `auditoria-diseno` o a mano. Las capturas y el índice quedan en `docs/2.0/auditoria-diseno/`; cada hallazgo es un issue en Linear («21 · Diseño y experiencia») con su prioridad:

- **Alta:** rompe un flujo o confunde al cliente.
- **Media:** incoherente con Hilo.
- **Baja:** pulido.

Lo repetido en varias pantallas va en un solo issue transversal. Primera corrida: [auditoria-diseno/2026-11-12](auditoria-diseno/2026-11-12/README.md). Lo que vive dentro de un módulo se asigna a la sesión dueña del módulo; lo transversal (DS, marco, navegación, tipografía, botones, textos) lo corrige la Sesión Diseño.
