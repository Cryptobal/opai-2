# Export base «Hilo» (prototipo completo)

Diseño de la nueva base de OPAI 2.0: un marco centrado en el agente, igual en escritorio, iPad y iPhone y en todos los portales. Lo hizo Claude como prototipo interactivo en la sesión del proyecto (el proceso de ADR-076, que ADR-090 extiende a esta base) y **Carlos lo aprobó el 11-nov-2026 a las 11:55 CLT** en el chat del proyecto «Opai 2.0», con la instrucción de que lo construido sea «copia fiel» de este diseño. Decisión: [ADR-090](../../01-decisiones.md). Plan: [`BRIEF-base-hilo.md`](../../briefs/BRIEF-base-hilo.md). Tarea: CAR-274.

Prototipo en vivo (privado de Carlos): <https://claude.ai/artifact/EaJbdLP8XdLp6HEAHP3T6J>.

## Qué muestra

Tres piezas, las mismas en todos los portales:

- **Hilo**: Pendientes (lo que espera una respuesta), Actividad (lo que ya pasó) y Agenda (lo que viene).
- **Lienzo**: la pantalla de trabajo (lista, ficha, planilla, formulario).
- **Barra**: el agente. Muestra sobre qué pantalla se le pide («Sobre: Solicitudes») y sus sugerencias cambian con ella.

No hay barra lateral ni barra inferior. El Índice (todas las pantallas del portal) queda a un toque.

## Tableros

| Archivo | Tamaño | Qué es |
|---|---|---|
| `Acceso.dc.html`, `AccesoMovil.dc.html` | 1440 × 900, 390 × 844 | Acceso al sistema: equipo (correo, Google, empresa y portal), guardia (RUT y PIN o Face ID), cliente (enlace mágico o RUT y PIN) y emparejar dispositivo |
| `Main.dc.html`, `iPad.dc.html`, `iPhone.dc.html` | 1440 × 900, 1024 × 768, 390 × 844 | ERP completo |
| `Supervisor.dc.html` | 390 × 844 | Portal Supervisor |
| `Terreno.dc.html` | 1024 × 768 | Portal Terreno en la tablet de la instalación |
| `Guardia.dc.html` | 390 × 844 | Portal del guardia |
| `Cliente.dc.html`, `ClienteEscritorio.dc.html` | 390 × 844, 1440 × 900 | Portal del cliente |
| `Plataforma.dc.html` | 1440 × 900 | Plataforma |

Todos los tableros de la aplicación comparten la misma lógica; solo cambia el tamaño y el portal inicial. Dentro de cualquiera se puede cambiar de portal con el botón «Portales».

## Qué es referencia exacta y qué no

- **Referencia exacta («copia fiel»):** el marco (hilo, lienzo, barra, cabecera, Índice, portales), la piel (colores, tipografía, radios, filas sin borde, pestañas con subrayado, botones, avisos) y la estructura de cada patrón (lista, ficha con pestañas, planilla, formulario, decisión con «qué cambia»).
- **No es referencia del contenido de cada módulo:** las filas, columnas y campos son de ejemplo. La pantalla real conserva todos los campos y reglas de su especificación y de su diseño aprobado; solo cambia de piel. Las hojas de crear y editar del prototipo son genéricas.
- Mapas, cámara y PDF son marcadores de posición.
- **Textos del prototipo que la decisión dejó atrás:** el título del lienzo dice «(propuesta)» y el tablero «El agente en cada portal» dice que llevar la barra a los demás portales «necesita tu decisión». Carlos lo decidió después (ADR-090 §4); en Plataforma la barra solo busca. La lista «Nunca lo hace un agente solo» es más estricta que la norma vigente: manda ADR-032 (ADR-090 §5).
- En el prototipo el portal Trabajador aparece como «Guardia», que es el vocabulario de la vertical de seguridad.

## Datos

Todos los datos son ficticios: empresas, personas, RUT, teléfonos, correos y montos. En esta copia el nombre del dueño se reemplazó por uno inventado (CAR-121). «Gard Security» aparece solo como nombre de la empresa de ejemplo.

## Cómo se genera

`fuente/` trae lo necesario para regenerar los tableros:

- `app_logic.js`: datos, portales, vistas y lógica del prototipo.
- `gen.py`, `gen3.py`, `gen3_cola.py`: plantilla y ensamblado. `cat gen3.py gen3_cola.py > gen_app.py && python3 gen_app.py <carpeta>`.
- `rastreador.js`: el recorrido automático. El generador deja la lógica de cada tablero en `scratch/`; desde ahí, `node rastreador.js`.

Los `.dc.html` se abren en Claude Design. Como en los otros exports, no se copió `support.js`.

## Cómo se verificó

Un rastreador recorrió todas las pantallas alcanzables de cada portal y ejecutó cada acción sin errores (unas 1.350 combinaciones de pantalla, pestaña y registro). No hay verificación visual automática del prototipo: la comparación por capturas se hace en cada PR de construcción contra estos tableros (375, 1024 y 1280 px, más 390 y 1440 px).

## Actualización del 11-nov-2026: las pantallas por dentro (CAR-278)

Carlos pidió ver, antes de construir, cómo quedan por dentro las listas, fichas y formularios. El prototipo suma:

- **Listas** con búsqueda, filtros, conteo, monograma y etiqueta de estado por fila.
- **Fichas** con estado en la cabecera y acción «Editar».
- **Formularios** reales («Nueva cuenta», «Editar cuenta», «Nuevo contacto», «Nuevo negocio», «Nueva persona») con validación y vista previa antes de guardar.
- **Piezas y estados del diseño** (Índice → Configuración): controles, listas y tablas, estados (cargando, vacío, error, sin permiso) y avisos y diálogos.

El rastreador (`fuente/rastreador.js`) recorre 1.405 pantallas y 12.152 acciones del tablero principal sin errores. La piel de las piezas comunes del DS dentro del marco Hilo se construyó con esta referencia (`BRIEF-hilo-h1-marco.md`).
