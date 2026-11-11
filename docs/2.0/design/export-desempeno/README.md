# Export «Desempeño» (mockup interactivo, propuesta)

**No es un diseño aprobado.** Es el mockup que Claude armó el 11-nov-2026 en el chat del proyecto «Opai 2.0» para explicar cómo cada empresa configura los indicadores de cada cargo. Carlos lo vio y pidió registrar el tema; no lo aprobó como diseño. Las pantallas se construyen solo con diseño aprobado (CAR-307).

Alcance: [`diseño/alcance-desempeno.md`](../../diseño/alcance-desempeno.md). Decisión: [ADR-094](../../01-decisiones.md). Tarea madre: CAR-303.

Prototipo en vivo (privado de Carlos): <https://claude.ai/artifact/A5TbL6twM8SeTqUJ3RiDwQ>.

## Tableros

| Archivo | Tamaño | Qué es |
|---|---|---|
| `Main.dc.html` | 1440 × 900 | ERP en escritorio |
| `iPhone.dc.html` | 390 × 844 | ERP en teléfono |

Los dos comparten la misma lógica; solo cambia el tamaño. Usan el marco y la piel de la base «Hilo» ([`export-base-hilo`](../export-base-hilo/README.md)): hilo, lienzo y barra del agente.

## Qué muestra

- Dos empresas de ejemplo con cargos distintos (seguridad y aseo).
- Scorecard del cargo: indicadores, meta y peso, con el equipo recalculado al instante.
- Catálogo de indicadores por módulo, con qué mide cada uno y de qué hechos sale.
- Resultado de una persona, con la parte hecha por su agente.
- Propuestas del agente en el hilo (aceptar o rechazar) y sugerencias en la barra.

## Límites

- Todos los datos son ficticios: empresas, personas, valores, indicadores y pesos. «Gard Security» aparece solo como nombre de la empresa de ejemplo.
- En el mockup un cambio de meta recalcula al instante; en el producto rige desde el período siguiente.
- La lógica se probó con un recorrido automático de todos los botones. No hubo revisión visual de los tableros.
- Los `.dc.html` se abren en Claude Design. No se copió `support.js`.
