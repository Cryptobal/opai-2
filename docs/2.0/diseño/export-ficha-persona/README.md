# Export ficha-persona v1

Diseño en Claude Design de la **Persona Detalle 360** (cabecera, Tabs Resumen · Laboral · Sueldo · Anexos · Documentos · Privacidad · Actividad) con lo que falta migrar de OPAI 1.0: previsión, pago, tallas, jornada DT, OS-10 y datos personales. Versión v1.

Aprobado por Carlos el 30-oct-2026 a las 21:19 CLT.

Prompt de origen: `alcance/design-prompt-ficha-persona.md` (en el computador del operador, no en el repo).

Los `.dc.html` referencian el DS OPAI 2.0 V2 (`https://claude.ai/design/p/44e4d7b9-7464-4771-bff8-07fcff4d573d`) por sus rutas relativas `_ds/...`; este export no incluye la carpeta `_ds/` (paquete del DS con datos reales) ni `uploads/` (prompts con datos reales), así que los archivos no renderizan de forma standalone sin abrirlos en el proyecto de Claude Design.

## Pantallas

- `Ficha persona v1 · Resumen.dc.html` — Resumen ampliado, con las tarjetas Previsión, Pago, Uniforme, Jornada DT y OS-10.
- `Ficha persona v1 · Previsión.dc.html` — Laboral › Previsión, con estados normal, enmascarado (sin permiso de lectura sensible) y Forbidden.
- `Ficha persona v1 · Pago.dc.html` — Pago › Cuentas bancarias y anticipo.
- `Ficha persona v1 · Secciones.dc.html` — Uniforme y tallas, Jornada DT y contrato, OS-10 y acreditaciones, Contacto y datos personales (prop `seccion`), con estados normal, cargando, vacío, error y sin permiso.
- `Ficha persona v1 · Láminas.dc.html` — Propuestas B1 (cuenta pendiente de validación) y B2 (lista negra), Vista por rol, Comparación con OPAI 1.0 y el Índice (prop `lamina`).
- `Ficha persona v1 · Hoja de componentes.dc.html` — variantes y estados; no propone ninguna pieza nueva del DS.

## Pendientes para la construcción

1. **QUITAR el rol «Inspector DT»** (decisión de Carlos; el fiscalizador entra por el portal de Reportería DT): ya se sacó de la lámina de roles de este export (`Ficha persona v1 · Láminas.dc.html`, lámina `roles`).
2. Gerente sin isapre, plan ni banco visibles.
3. Agregar los estados cargando, vacío y error en Resumen y Pago (hoy solo `Secciones` los tiene).
