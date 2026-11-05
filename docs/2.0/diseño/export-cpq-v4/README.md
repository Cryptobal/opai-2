# Export CPQ v4: flujo completo en el teléfono

- **Prompt:** `docs/2.0/design/DESIGN-PROMPT-cpq-v4-modulo-completo.md`.
- **Auditoría:** `docs/2.0/auditoria-cpq-2026-11.md` (CAR-162).
- **Aprobación:** Carlos, 3-nov-2026 a las 11:44, en el chat del proyecto: «ok avanza con eso».
- **Alcance aprobado:** el prototipo navegable a 375 px.
- **Complemento (3-nov, 12:45):** Carlos subió el export completo: 15 pantallas a 375, 1024 y 1280, con modo oscuro, `ConfigSueldosReferencia`, `RequisitosRemuneraciones`, `Cotizaciones` con archivar y `AgenteCPQ`. La tabla «Lo que falta» de abajo queda cubierta; se conserva como historial.

**Contenido:** `FlujoCompletoCPQ.dc.html`, un prototipo navegable de 12 pasos en el teléfono con el tenant nuevo «Vigía Sur SpA», más `shots/step01–12.png`, capturas a 375 px tomadas del prototipo:

1. Negocio sin cotización (vacío con «Cotización rápida»).
2. Cotización rápida.
3. Ficha con requisitos: venta y margen «—», `FuenteValor` y barra «2 pendientes».
4. Hoja de puesto: cargo, patrón, días, tramo y personas sugeridas, y en el pie el costo y la venta en vivo.
5. Hoja de ítem: Catálogo, Paquetes, Incluye.
6. Margen y finanzas: margen ±, tres escenarios, instrumentos, meses de contrato y condiciones.
7. Resumen calculado con el aviso de la mutual sin bloqueo.
8. Pedir aprobación y decidir.
9. Enviar: bloqueo «Confirma la mutual» con acción en línea y vista previa con estados.
10. Compartir: enlace, WhatsApp, correo y revocar.
11. Seguimiento: vistas del cliente y registrar la aceptación.
12. Ganado → Crear puestos, con el origen del sueldo.

## Lo que falta del prompt (pedirlo antes del PR que lo necesite)

| Falta | Lo necesita |
|---|---|
| Versiones a 1024 y 1280 de las hojas nuevas (puesto, ítem, enviar con vista previa, compartir) | PR C y D en escritorio |
| `ConfigSueldosReferencia` (sub-sección del Catálogo) | PR C |
| `RequisitosRemuneraciones` (indicadores con fuente, cambio propuesto, mutual) | PR B |
| `Cotizaciones` con filtro de requisitos, archivar y archivadas | PR E |
| `AgenteCPQ` (cuarto momento) | Agente interno |
| Modo oscuro de la ficha, la hoja de puesto y enviar | QA |
| Hoja de puesto completa con el scroll: `CampoSueldo` (bruto o líquido), colación, movilización y `SupuestosPrevisionales`. Están en el HTML, pero el prototipo no los muestra sin desplazar | PR C |

## Ajustes al implementar
- Los chips `FuenteValor` largos («IMM … vigente desde 01-07-2026») se parten en dos líneas. Al implementar se acorta el texto: «IMM $ 539.000 · Previred · jul-2026».
- Margen y finanzas ofrece dos modos (sobre la venta y sobre el costo). El v3 y la especificación tienen tres (sobre la venta, markup y sobre la mano de obra): se implementan los tres con el mismo `Segmentado`.
- En el teléfono, los instrumentos son solo interruptores. Tocar la fila abre el `DetalleInstrumentos` de v3 en una hoja.
- Los datos de ejemplo no son consistentes entre pasos (margen 12 % en el paso 7 y 9 % en el 9). No tiene efecto en la implementación.
