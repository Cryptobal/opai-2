# Personas — auditoría contra Rippling · Deel · BambooHR

**Recomendación: ajustar.** La ficha es sólida. Falta tratar el ingreso y la salida como procesos.

## Qué hace hoy

- **Persona única** en el Núcleo con ficha, previsión, datos de pago, uniformes, jornada y OS-10 (`Persona*`, `packages/db/prisma/schema/maestros.prisma`).
- **Vínculo laboral** con cargo, tipo y estado, uno vigente por persona (`VinculoLaboral`; `core.vinculos.create`, `update`, `terminar`, `previsualizar`).
- **Estructuras de sueldo por capas** con fecha de vigencia (`vigenteDesde` en `maestros.prisma` y `remuneraciones.prisma`).
- **Cambios de datos de pago por solicitud y aprobación de otra persona**, solo humanos (`core.personas.pago_solicitar_cambio`, `pago_aprobar_cambio`, con `soloPersonas`).
- **Lecturas sensibles separadas y auditadas** (`pago_ver`, `prevision_ver`, `laboral_ver`, `no_recontratar_ver`).
- **Jefatura por cargo y jefe directo** (`core.cargos.set_jefatura`, `core.personas.asignar_jefe`, `list_a_cargo`).
- **Vencimientos de documentos** con informe, semáforo por persona y aviso diario (`core.documentos.vencimientos`, `core.documentos.matriz`). Falta solo el vencimiento de contratos a plazo, que no es un documento.
- **Anexos con aprobación** (`core.anexos.*`), documentos y firma en el Núcleo.
- **Usuario vinculado a la persona** a mano (`core.personas.vincular_usuario`).
- **Portal del trabajador**: mis datos, exportar mis datos y solicitudes ARCO (`portal_trabajador.*`).
- **Desempeño** por cargo con indicadores (módulo `desempeno`).

## Qué hace el referente

Rippling: un registro del que cuelga todo, cambios con vigencia, ingreso y salida como procesos que disparan tareas en todas las áreas, y acceso que sigue al cargo. Deel y BambooHR: documentos con vencimiento, autoservicio y organigrama.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| H-1 | **Ingreso y salida no son procesos.** Se crea la persona y su vínculo, y se termina el vínculo, pero no hay una lista de pasos con responsable (documentos, firma, uniforme, acceso, curso OS-10) ni su equivalente al salir (devolución, finiquito, corte de acceso). | Sin capacidades de ingreso, salida o lista de pasos en `packages/capabilities/src/core/` | Alta | Ajustar: plantilla de pasos por empresa y vertical, sobre Tickets o Actividades, disparada al crear o terminar un vínculo |
| H-2 | **Terminar el vínculo no corta todo el acceso.** `core.vinculos.terminar` marca el vínculo, deja la persona inactiva si no quedan vigentes y emite un evento que nadie consume. El ingreso por PIN sí se corta (exige persona activa); la membresía sigue activa, así que una sesión abierta o un acceso por correo continúan. | `packages/capabilities/src/core/maestros/vinculos-terminar.ts`; `packages/auth/src/pin-verificacion.ts` | Media | Ajustar dentro de H-1: suspender la membresía y la credencial de terreno en el mismo acto |
| H-3 | **Sin cambios programados ni historia de cargo.** El vínculo tiene un solo cargo, una instalación, inicio y término. Solo las estructuras de sueldo tienen vigencia. | `VinculoLaboral` en `schema/maestros.prisma` | Media | Ajustar: historia con vigencia para cargo, jefatura y lugar de trabajo |

## Qué se mantiene tal cual

Persona única, capas de sueldo con vigencia, solicitud y aprobación para datos de pago, lecturas auditadas, jefatura y anexos.
