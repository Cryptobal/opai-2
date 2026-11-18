# CAR-58 · Texto legal del anexo de contrato

**Sesión:** Cursor Personas · 17-nov-2026.

## Qué entró

- Texto legal aprobado en `packages/capabilities/src/core/anexos/plantilla.ts` (`TEXTO_LEGAL_ANEXO_APROBADO`), con `PLANTILLA_ANEXO.esEjemplo = false`.
- Mapeo de cada `{{campo}}` a datos del perfil de empresa, la persona, el vínculo vigente y el detalle del cambio (`plantilla-valores.ts`).
- Condicional `{{#fecha_termino}}…{{/fecha_termino}}` resuelto en `rellenarTextoLegalAnexo` sin quitar el bloque del texto fuente.
- Al aprobar, el PDF sale de la plantilla publicada del tenant o del texto legal base; el guard `esEjemplo` sigue bloqueando si vuelve a activarse sin plantilla publicada.

## Qué queda

- Integración a `main` (revisión / preview-e2e si aplica).
- Linear CAR-58 sigue **In Progress** hasta cierre del ticket padre.

## Qué cambia para Gard

- Los anexos se pueden aprobar con el texto legal base del sistema si el tenant tiene el perfil de empresa y la ficha de la persona completos; también puede publicar su propia plantilla en Documentos › Plantillas.

## Referente seguido y en qué se aparta

- **Referente:** plantillas laborales de Documentos (CAR-127) y PDF con `generarPdfLaboral`.
- **Apartamiento:** el texto base usa marcadores `{{campo}}` (aprobados por abogado) en lugar de `{grupo.clave}` del editor; el relleno es específico del anexo, no del catálogo general.