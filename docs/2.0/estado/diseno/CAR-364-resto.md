# CAR-364 · Zonas con desplazamiento y campos sin nombre (resto)

**Sesión:** Diseño · **Rama:** `fix/car-364-foco-resto` · Refs CAR-364, CAR-334 · **Estado:** En revisión

## Qué entra

Los hallazgos de axe de la corrida 2 de la auditoría que no cubre `Table` (PR #599):

- Tablero de Negocios: la fila de etapas con desplazamiento horizontal es una región con nombre («Etapas del tablero»), alcanzable con el teclado y con anillo de foco.
- Configuración › Agentes › Conectar tu IA: el bloque de código se alcanza con el teclado y tiene nombre.
- `Uploader` del DS (Importar datos, Nueva rendición de compra): el campo de archivo tiene nombre; en el teléfono la zona de arrastre, que era su `label`, se oculta.

## Qué queda pendiente

- Confirmar en la próxima corrida de la auditoría que axe ya no los marca.

## Qué se decidió

- Nada nuevo; se sigue la regla R11 (accesibilidad AA) de `DISENO-hilo.md`.
