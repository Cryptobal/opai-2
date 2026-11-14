# CAR-335 D6b · Logo y color de la empresa en el menú

- **Sesión:** Sesión Diseño
- **Estado:** En PR
- **Migración:** No

## Qué entra

- El selector de empresa del diseño nuevo muestra el logo de la marca (isotipo; si no hay, el logo principal) que entrega `core.marca.get`. Sin logo, la inicial va con el color de la empresa (`[data-marco="nuevo"] [data-monograma]`).
- `Monograma` del DS acepta `logo`; `Tenant` suma `logo` opcional.
- Configuración → Marca (logo y colores) ya existía (`/configuracion/marca`, grupo Empresa): no se agregan capacidades.

## Qué queda pendiente

- D6c: retirar el clásico y el Hilo. D5: agente en la ficha.
