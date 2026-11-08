# Brief · CAR-138 — Propuesta técnica personalizada por instalación, contexto comercial y catálogo único de campos

Autorizado por Carlos el 7-nov-2026 10:15 (America/Santiago). Issue: CAR-138 (Linear). Sesión: «Comercial · Code».
Base verificada: `main` `ad4ab913`. Este brief se entrega **por etapas y PR pequeños**; completar una etapa no cierra la evolución.

## Qué existe (verificado en el repositorio, no se reconstruye)

- `packages/domain/src/plantillas.ts` (ADR-020): sintaxis `{{ruta.variable}}`, `variablesUsadas`, `validarPlantilla`, `escaparHtml`, `renderizar`. Lo usan Comunicaciones y los anexos. **El catálogo extiende esta sintaxis; no abre otra.**
- `packages/domain/src/formato.ts` (R4): formateador único (CLP, UF, %, fecha). Todo valor de campo se presenta con él.
- Propuesta técnica v2 (CAR-144, #218): biblioteca de bloques, armador, plantilla por tenant, PDF (`pdf-lib`, sin HTML) y envío/congelado. Formatos por tenant (CAR-68).
- `docs/2.0/modulos/documentos.md` R17-R18 define variables de lista cerrada, pero **no hay código** que las resuelva: no existe módulo `documentos` ni resolvedor por entidad. CAR-127 (Documentos v4) solo tiene la rama de diseño `docs/diseno-documentos-v4`.
- El renderer actual no convierte HTML: la importación HTML (etapa 4) requiere resolver la compatibilidad de forma explícita.

## Secuencia de PR (uno por fila; cada uno actualiza `ESTADO.md`)

| PR | Contenido | Superficie compartida | Migración |
|---|---|---|---|
| 1 | **Catálogo único de campos** (contrato, versión, alias, sensibilidad por finalidad), validador y render puros | `packages/domain` (archivos nuevos) | No |
| 2 | Resolvedor con contexto autorizado: valores por entidad, tenant, permisos, alcance y finalidad; lectura auditada | `packages/capabilities` (Núcleo) — acordar con Documentos | No |
| 3 | CPQ y propuestas consumen el catálogo; congelado del contrato de tokens al enviar | `modules/cpq` (propio) | Aditiva propuesta |
| 4 | Contexto comercial del negocio (fuentes, fechas, permisos; confirmado vs inferencia) | CRM/Actividad | Aditiva propuesta |
| 5 | IA por sección (sin sobrescribir lo manual; fuentes y faltantes) | adaptador de IA del Núcleo | No |
| 6 | Capítulo por instalación (servidor y PDF); el editor en pantalla espera diseño aprobado | `modules/cpq` | Aditiva propuesta |
| 7 | Referencias de clientes activos con opt-in | Cuentas | Aditiva propuesta |
| 8 | Prompt exportable generado desde el catálogo | `modules/cpq` | No |
| 9 | Importación HTML sanitizada y versionada por tenant | por definir con el renderer | Aditiva propuesta |

Migraciones: solo se proponen, aditivas, para ejecución por el responsable autorizado con respaldo previo. Este brief no ejecuta ninguna.

## Dependencias y concurrencia

- **Documentos (CAR-127, en curso) y Núcleo** son dueños naturales del contrato transversal. El PR 1 solo agrega archivos nuevos en `packages/domain/src/campos/` y una línea de exportación; **no toca** `plantillas.ts`, `formato.ts` ni nada de Documentos. Si Documentos ya trabaja un catálogo propio, se converge sobre este contrato antes del PR 2.
- Pantallas (editor, capítulo por instalación): requieren diseño aprobado y presentación visual a Carlos (A2.10); no se construyen sin ello.
- Fuera de alcance: Portal Cliente/archivo, CAR-218 PR 2, Face ID, infraestructura, datos y envíos reales de Gard.

## PR 1 — alcance y archivos

Nuevos (todos ≤150 líneas) en `packages/domain/src/campos/`: `tipos`, `grupos`, `catalogo-{empresa,cuenta,contacto,personas,lugares,negocio}`, `catalogo` (índice, alias y versión), `formatos` (sobre `formato.ts`), `plantilla` (analizador), `validar`, `render` e `index`, más `catalogo.test.ts` y `render.test.ts`. Modificado: `packages/domain/src/index.ts` (una línea de exportación), `ESTADO.md`.

Reglas del contrato:
- Cada campo declara `clave` (`entidad.campo`), alias, tipo y formato, fuente, **sensibilidad** y **finalidades** permitidas (`propuesta`, `contrato`, `documento`, `correo`). Un campo sensible permitido en `contrato` no se resuelve en `propuesta`.
- Datos económicos solo con fuente `cpq`; nunca se piden a la IA.
- Sintaxis compatible: `{{clave}}`, `{{clave | formato}}`, `{{#cada coleccion}}…{{/cada}}` y `{{#si clave}}…{{/si}}`.
- Se rechazan: tokens desconocidos, no autorizados para la finalidad, formatos inválidos y estructuras mal cerradas. Los valores faltantes se informan, no se completan.
- Versión del catálogo y mapa de alias para compatibilidad.

## Responsable y archivos del contrato transversal (autorizado por Carlos el 7-nov-2026 21:49)

Documentos (CAR-127) no tiene código ni PR abierto sobre campos (solo la rama de diseño `docs/diseno-documentos-v4`) y Núcleo no tiene un catálogo propio: **el contrato vigente es el integrado en #387**. No se crea un catálogo alterno ni se espera una elección técnica adicional. Regla para evitar solapes:

| Pieza | Responsable | Archivos |
|---|---|---|
| Catálogo, sintaxis, validador y render (contrato) | Comercial · Code (CAR-138); Documentos y CPQ lo consumen y proponen cambios por PR | `packages/domain/src/campos/**` |
| Autorización por finalidad y permiso, mapeo de maestros | Comercial · Code (PR 2) | `campos/autorizacion.ts`, `campos/mapeo-maestros.ts` |
| Capacidades `core.campos.catalogo` y `core.campos.resolver` | Comercial · Code (PR 2); Núcleo revisa permisos y auditoría | `packages/capabilities/src/core/campos/**` |
| Fuentes aún sin resolvedor (empresa/marca, persona, negocio, cotización) | Se suman por entidad, cada una por quien es dueño del dato: marca = Núcleo, persona = Personas (solo contrato), negocio = CRM, cotización = CPQ | un archivo por entidad en `core/campos/` o en el módulo dueño |

Un campo nuevo o un cambio de clave sube `VERSION_CATALOGO_CAMPOS` y mantiene el alias antiguo. Documentos v4 debe consumir `core.campos.resolver`; no leer cuentas, contactos ni instalaciones por su cuenta para llenar variables.
