# <Módulo> — Especificación funcional

**Estado:** borrador | en revisión | **aprobada por Carlos el dd-mmm-aaaa** · **Fase:** N · **Insumos:** `extraccion/<archivo>.md`, ADR-NNN · **Autor:** Claude

> Se escribe en lenguaje de negocio, sin código. Carlos la aprueba antes del Design Prompt (ADR-047). El diseño y el brief la citan por número de regla (R1, R2…) y de criterio (CA1, CA2…). Si cambia después de aprobada, se anota en el historial del final.

## 1. Objetivo

Qué problema de la empresa resuelve, para quién y cómo se nota que funciona (una o dos métricas de uso o de negocio).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive (núcleo o módulo) |
|---|---|---|---|
| | | | |

Diagrama simple de relaciones si ayuda (cuenta 1–N instalación, etc.).

## 3. Pantallas y pestañas

| Pantalla | Ruta | Portal | Patrón (lista, ficha, formulario, planilla, tablero) | Entrada en el menú (área de `NAVEGACION.md`) o pestaña de qué ficha |
|---|---|---|---|---|
| | | | | |

Para cada ficha: pestañas en el orden de ADR-041 y qué muestra el Resumen. Qué se hace en el celular y qué solo en iPad y escritorio.

## 4. Campos y validaciones

Por entidad:

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente o el trabajador |
|---|---|---|---|---|---|
| | | | | | |

## 5. Reglas de negocio

Numeradas y verificables. Cada una se convertirá en al menos un test.

- **R1.** …
- **R2.** …

## 6. Estados y transiciones

| Desde | Hacia | Quién (rol, agente) | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| | | | | | |

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador | Agente (scope) |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

Alcance de filas (qué ve cada uno; ADR-022) y lo que pide aprobación humana a los agentes.

## 8. Eventos y notificaciones

| Evento | Cuándo ocurre | Quién se entera por defecto | Canal | Plantilla |
|---|---|---|---|---|
| | | (silencio por defecto, ADR-020) | | |

## 9. Herramientas MCP

| Herramienta | Qué hace (lenguaje de negocio) | Lectura, escritura o irreversible | Con vista previa | Aprobación humana |
|---|---|---|---|---|
| | | | | |

Flujos típicos de un agente (qué llama, en qué orden, cuándo se detiene) para el manual de `docs/2.0/agentes/`.

## 10. Integraciones

Servicios externos (DTE, banco, mapas, correo, WhatsApp, biometría, IA), modalidad (de plataforma o propia del tenant, ADR-027) y consumo medido (ADR-031).

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| | | |

**No se porta:** …

## 12. Casos borde

- …

## 13. Criterios de aceptación

Verificables por Carlos en `test.opai.cl` y por el bot de Diseño y QA.

- **CA1.** …

## 14. Preguntas abiertas

Cerradas, con recomendación.

1. ¿…? Recomendación: …

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
