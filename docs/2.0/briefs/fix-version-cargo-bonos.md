# Corrección de versiones de cargo y bonos

Encargo: impedir la pérdida de bonos al versionar un cargo con montos ocultos.

Decisión técnica de Codex: rechazar la creación y la vista previa de estructuras de cargo sensible cuando falta `core:estructuras.read_sensible`. Es más simple que copiar montos que el actor no puede revisar. La comprobación se hace bajo bloqueo de la fila del cargo en la misma transacción que la escritura. La pantalla oculta la acción y explica el permiso faltante.

Criterios: protección en servidor, explicación en pantalla y pruebas de rechazo y creación autorizada. La verificación de pantalla con distintos permisos y tamaños queda pendiente si no se dispone de una sesión adecuada; su resultado se registra en PR-BODY.md.

La autorrevisión detectó que cambiar la privacidad permitía obtener acceso indirecto. Codex decidió exigir también el permiso sensible para modificar esa marca y ocultar el interruptor sin él. La prueba de concurrencia con Postgres queda pendiente.
