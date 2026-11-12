# Personas — auditoría contra Rippling · Deel · BambooHR

**Recomendación: ajustar.** La ficha es sólida. Falta tratar el ingreso y la salida como procesos.

## Qué hace hoy

- **Persona única** en el Núcleo con ficha, previsión, datos de pago, uniformes, jornada y OS-10 (`Persona*`, `packages/db/prisma/schema/maestros.prisma`).
- **Vínculo laboral** con cargo, tipo y estado, uno vigente por persona (`VinculoLaboral`; `core.vinculos.create`, `update`, `terminar`, `previsualizar`).
- **Estructuras de sueldo por capas** con fecha de vigencia (`vigenteDesde` en `maestros.prisma` y `remuneraciones.prisma`).
- **Cambios de datos de pago por solicitud y aprobación de otra persona**, solo humanos (`core.personas.pago_solicitar_cambio`, `pago_aprobar_cambio`, con `soloPersonas`).
- **Lecturas sensibles separadas y auditadas** (`pago_ver`, `prevision_ver`, `laboral_ver`, `no_recontratar_ver`).
- **Jefatura por cargo y jefe directo** (`core.cargos.set_jefatura`, `core.personas.asignar_jefe`, `list_a_cargo`).
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
| H-2 | **Terminar el vínculo no corta el acceso.** Como usuario y persona se vinculan a mano, no se confirmó que terminar el vínculo suspenda la membresía o la credencial de terreno. | `core.vinculos.terminar`; por verificar | Media, por verificar | Verificar con prueba; si falta, cortarlo en el mismo acto (va dentro de H-1) |
| H-3 | **Cambios programados a futuro.** El sueldo tiene vigencia; no se confirmó que cargo, jefatura o lugar de trabajo se puedan programar con fecha futura y consultar a una fecha. | `VinculoLaboral`; por verificar | Media, por verificar | Ajustar si falta |
| H-4 | **Vencimientos de documentos como tablero.** Hay documentos y OS-10, pero no se encontró un informe único de lo que vence (contratos a plazo, OS-10, licencias). | Por verificar en `core/documentos/` | Media, por verificar | Ajustar: informe y aviso de vencimientos |

## Qué se mantiene tal cual

Persona única, capas de sueldo con vigencia, solicitud y aprobación para datos de pago, lecturas auditadas, jefatura y anexos.
