# DESIGN PROMPT — DS 2.0 FUNDAMENTOS (OPAI 2.0)

Para pegar completo en Claude Design. Define el sistema de diseño de todos los módulos de OPAI 2.0: fundamentos, shell, cinco patrones de pantalla y cuatro estados, en tres viewports y dos modos. Lo que se apruebe aquí se traduce a tokens y componentes en `packages/ds` (Brief 00b) y ningún módulo podrá desviarse.

---

## 1. Qué es y quién lo usa

OPAI 2.0 es un SaaS operacional para empresas intensivas en personal y servicios distribuidos: seguridad privada, aseo, outsourcing, mantenimiento. Multi-tenant: cada empresa cliente ve su propio espacio; la identidad visual es de OPAI, el logo del tenant aparece como marca secundaria pequeña.

Lo usan tres tipos de personas, en este orden de prioridad:

1. **Trabajadores y supervisores en terreno**, en teléfono, con una mano, a veces de noche o con sol directo, con conectividad irregular. Portales Trabajador, Terreno y Supervisor.
2. **Administrativos y gerentes**, en iPad y desktop: ERP (comercial, operaciones, finanzas, personas).
3. **Clientes finales de la empresa**, en teléfono y desktop, para consultar y aprobar. Portal Cliente.

Idioma: español de Chile. Formatos: fechas `dd-mm-aaaa`, horas `HH:mm`, montos CLP con punto de miles y sin decimales (`$ 1.850.000`), RUT con puntos y guion (`16.234.567-8`).

## 2. Dirección estética

**Moderno, muy minimalista, de nivel mundial.** Sensación de referencia (no copiar): la claridad de Linear, el dashboard de Vercel, Things 3, Apple Health. Aire, tipografía que hace el trabajo, color solo donde significa algo.

**Lo que no queremos:** nada de la estética de OPAI 1.0 (paleta slate con acento teal, tono "industrial"); dashboards cargados; gradientes decorativos; sombras pesadas; iconos multicolor; tarjetas dentro de tarjetas; barras y encabezados redundantes.

**Principios:**

- Una acción principal por pantalla, siempre visible.
- Jerarquía por tamaño, peso y espacio, no por color.
- Color = estado (éxito, alerta, peligro) o acción. Nunca decoración.
- Bordes finos antes que sombras. Superficies planas.
- Densidad ajustable: cómoda en teléfono, compacta en planillas.
- Movimiento solo para continuidad, 150–200 ms, nunca para adornar.
- Legible a la luz del sol y de noche: contraste alto en modo claro, modo oscuro verdadero (no gris lavado).

## 3. Fundamentos a definir con valores exactos

**Color.** Una escala de neutros de 10 pasos para fondo, superficie, borde y texto. Un acento primario único, distinto de teal y slate, que funcione sobre claro y oscuro. Semánticos: success, warning, danger, info, cada uno con variante de fondo suave y de texto. Contraste WCAG AA en todo texto y AAA en texto de cuerpo. Entregar los dos modos como variables CSS con estos nombres:

`--ds-bg`, `--ds-surface`, `--ds-surface-raised`, `--ds-border`, `--ds-border-strong`, `--ds-fg`, `--ds-fg-muted`, `--ds-fg-subtle`, `--ds-accent`, `--ds-accent-fg`, `--ds-accent-muted`, `--ds-success`, `--ds-success-fg`, `--ds-success-muted`, `--ds-warning` (+ `-fg`, `-muted`), `--ds-danger` (+ `-fg`, `-muted`), `--ds-info` (+ `-fg`, `-muted`), `--ds-focus`.

**Tipografía.** Una familia sans moderna, de alto rendimiento en pantalla, con cifras tabulares para montos y horas (candidatas: Inter, Geist Sans, Manrope; elegir una y justificar). Una monoespaciada para RUT, folios y montos en planillas. Escala: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 px con line-height y peso por estilo: `display`, `title`, `heading`, `body`, `label`, `caption`, `numeric`.

**Espaciado.** Base 4 px; escala 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Gutters: 16 px teléfono, 24 px iPad, 32 px desktop. Ancho máximo de contenido 1280 px.

**Forma.** Tres radios (por ejemplo 6 / 10 / 16). Bordes de 1 px. Sin sombra en reposo; una sola sombra suave solo para overlays (sheet, dialog, menú).

**Iconografía.** Un set lineal monocromo (Lucide): 20 px en teléfono, 16 px en densidad compacta. Nada específico de seguridad (escudos, guardias) como identidad: el producto sirve a varias industrias.

**Accesibilidad.** Touch targets ≥ 44 px; safe-area iOS (notch y barra inferior); foco visible por teclado; estados de hover solo donde hay puntero.

## 4. AppShell, en tres viewports

Diseñar a **375 px** (teléfono), **1024 px** (iPad apaisado) y **1280 px** (desktop). Desktop es el mismo diseño con más espacio, no otra interfaz.

- **Teléfono:** barra superior mínima (título de pantalla, selector de portal o tenant, avatar); navegación inferior de hasta 5 ítems con etiqueta; acción principal en la cabecera o flotante, nunca ambas.
- **iPad apaisado:** riel lateral compacto (icono + etiqueta corta); contenido en dos columnas cuando aplica (lista a la izquierda, detalle a la derecha).
- **Desktop:** barra lateral expandida con los módulos activos del tenant agrupados; el resto igual.
- **Selector de portal:** ERP, Trabajador, Terreno, Cliente, Supervisor. Mostrar cómo se cambia de portal y cómo se nota en qué portal se está.
- **Estados globales:** sin conexión (banner discreto, no bloqueante); notificaciones (icono con contador y panel); búsqueda global (`⌘K` en desktop, icono en teléfono).

## 5. Cinco patrones de pantalla, con datos reales

Vertical de ejemplo: seguridad privada. El vocabulario es genérico (persona, instalación, puesto); cambiar "guardia" por "operario" no debe romper nada.

1. **ListScreen — "Personas".** 24 filas. En teléfono, tarjetas con nombre, RUT, cargo, instalación y estado (Activa, Licencia, Finiquitada); en iPad y desktop, tabla con las mismas columnas más fecha de ingreso. Búsqueda, filtros como chips removibles, paginación, acción principal "Nueva persona". Fila de ejemplo: *María Fernanda Soto · 16.234.567-8 · Guardia · Edificio Costanera Center · Activa · ingreso 03-03-2025*.
2. **DetailScreen — "Instalación: Planta Quilicura".** Cabecera con nombre, cliente (*Logística Andina SpA*), dirección, estado; tabs Resumen / Puestos / Personas / Documentos; secciones de pares etiqueta–valor; acciones secundarias en menú. En iPad, la lista de instalaciones a la izquierda y este detalle a la derecha.
3. **FormScreen — "Nueva cotización".** Secciones: Cliente, Instalación, Puestos (cargo, cantidad, turno, monto CLP por puesto), Condiciones. Barra de acciones fija abajo en teléfono ("Guardar borrador", "Enviar"); validación inline; totales en vivo: *Subtotal $ 5.550.000 · IVA $ 1.054.500 · Total $ 6.604.500*.
4. **PlanillaScreen — "Pauta mensual · Noviembre 2026 · Planta Quilicura".** Filas = puestos y personas, columnas = días 1 a 30; celdas con código de turno (D, N, L, V) y color semántico suave; cabeceras de fila y columna fijas; scroll interno. En teléfono no se muestra la grilla completa: vista por día o por persona, con el día actual destacado. En iPad y desktop, la grilla completa con celda ampliada al tocar.
5. **DashboardScreen — "Finanzas · Octubre 2026".** Cuatro tiles de indicador (*Saldo banco $ 48.300.000 · Por cobrar $ 112.450.000 · Por pagar $ 63.200.000 · Flujo 30 días +$ 9.100.000*), un gráfico de líneas (flujo semanal), una lista corta (facturas vencidas). Tiles sin color de fondo: el color solo en la variación respecto del mes anterior.

## 6. Cuatro estados

Para cada patrón mostrar al menos uno; para ListScreen mostrar los cuatro:

- **Loading:** skeletons con la forma del contenido; nunca un spinner de página completa.
- **Vacío:** ilustración mínima construida con los tokens, una línea de texto, una acción.
- **Error:** qué pasó, qué hacer, botón "Reintentar".
- **Sin permisos:** explicación breve y a quién pedir acceso.

## 7. Componentes base a definir

Button (primary, secondary, ghost, destructive; tamaños md y lg), Input, Select, Combobox con búsqueda, Date y Time, Checkbox, Switch, Chip de filtro, Badge de estado, Tabs, Card, fila de tabla y su tarjeta equivalente en teléfono, Sheet (inferior en teléfono, lateral en desktop), Dialog, Toast, Avatar, KPI tile, Skeleton, ilustración de vacío y error.

## 8. Entregables esperados

1. Tokens como variables CSS, modo claro y oscuro, con los nombres de la sección 3.
2. Especificación tipográfica y de espaciado con valores.
3. AppShell en los tres viewports, ambos modos.
4. Los cinco patrones a 375 y 1024; Planilla y Dashboard también a 1280. Modo claro completo; modo oscuro al menos en ListScreen y Dashboard.
5. Los cuatro estados.
6. Export HTML standalone: será la referencia de layout y jerarquía para Claude Code, no código a copiar.

## 9. Supuestos explícitos

- El logo de OPAI se rediseña aparte; usar un wordmark tipográfico "OPAI" como placeholder.
- No hay restricción de marca heredada: la paleta se elige de cero.
- Si una decisión tipográfica o de color obliga a elegir entre teléfono y desktop, gana el teléfono.
