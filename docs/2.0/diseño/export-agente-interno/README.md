# Export agente-interno v1 (Claude Design)

Diseño en Claude Design del **Agente interno** de OPAI 2.0 (el asistente de IA de cada empresa): lanzadores, panel del agente, tarjeta de plan, adjuntos y todos sus estados. Versión v1. Aprobado por Carlos el 30-oct-2026 a las 21:19 CLT.

Prompt de origen: `uploads/05-agente-interno.md` (en el computador del operador, no en el repo), a partir de `docs/2.0/modulos/agente.md` §15.

Los `.dc.html` referencian el DS **OPAI 2.0 Design System V2**; no se copió el paquete `_ds/` (trae datos reales) ni `uploads/` (prompts con datos reales) de la exportación original.

## Pantallas

- `agente-indice-v1.dc.html` — Índice
- `agente-telefono-375.dc.html` — Teléfono 375: 1 Inicio, 2 Vacío, 3 Conversación, 3b Adjuntar, 3c, 3d, 4 Pasos en vivo, 5 Plan «Paso a paso», 6 Ejecución, 7 Irreversible en aprobación, 8 Sin conexión, 9 oscuro de (5)
- `agente-ipad-1024.dc.html` — iPad 1024: 10 Ficha de cuenta con plan «Aprobar todo», 11 Error del proveedor, 12 Sin permiso, 12b Buscador «Documento de OPAI», 13 oscuro de (10)
- `agente-escritorio-1280.dc.html` — Escritorio 1280: 14 Ficha de instalación con panel acoplado, 15 Plan con error, 15b Zona de soltado, 15c Adjuntos en el hilo, 16 ⌘K, 17 Historial, 18 Configuración › Agentes › Agente interno, 19 oscuro de (14)
- `agente-estados.dc.html` — Estados: cargando, sin key propia, límite de frecuencia, presupuesto, sin conexión, corte de red, plan vencido, adjuntos rechazados, sin permiso
- `agente-hoja-componentes.dc.html` — Hoja de componentes: Panel lateral (acoplado/superpuesto/pantalla completa), Tarjeta de plan en todos sus estados, Tarjetas de adjunto, Loading «hilo», Banda y BarraProgreso

## Pendientes para la construcción

1. Viene en 4 archivos por ancho y los estados de error van aparte; en el código, una pantalla por ruta con sus estados.
