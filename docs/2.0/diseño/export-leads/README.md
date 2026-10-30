# Leads — export de diseño (Claude Design) · v2

**Módulo:** Comercial · Leads (canales de entrada y paso a CPQ)
**Versión:** v2
**Revisado por el operador:** 30-oct-2026 ~12:20 CLT, contra el prompt de origen `alcance/design-prompt-leads.md` y su ajuste `alcance/design-prompt-leads-ajuste-v2.md` (ambos en el computador del operador, no en el repo).

## Qué es

Módulo liviano: recibe solicitudes por correo, agente, formulario web o registro manual, las muestra, las procesa y las pasa a negocio o a la **Cotización rápida** de CPQ.

## Pantallas

| # | Pantalla |
|---|----------|
| 00 | Índice |
| 01 | Bandeja con canal |
| 02 | Detalle solicitud correo |
| 03 | Detalle solicitud agente |
| 04 | Procesar y convertir |
| 05 | Ficha del negocio |
| 06 | Registrar solicitud |
| 07 | Canales de entrada (Configuración › Módulos › Leads › Ajustes, `/configuracion/modulo/leads`) |
| 08 | Estados del canal |
| 09 | Propuesta B |
| 10 | Hoja de componentes |

**Componentes fuente:** `Bandeja`, `Solicitud`, `Negocio` y `Canales` son los componentes que usan esas pantallas.

## Cambios del v2

- Canales movidos a **Configuración › Módulos › Leads**: migas, lista de módulos a la izquierda en 1024/1280; a 375 la lista pasa a entrada con «‹ Módulos».
- Reglas en tarjetas apiladas a 375.
- Índice v2.

## Puntos «Propuesta B, a confirmar por Carlos» (abiertos)

- Asignación automática por reglas.
- Que el agente pueda convertir (con confirmación).
- Formulario web alojado por OPAI.

## Menores para la próxima vuelta

- El rótulo superior de 07 y 08 dice «OPAI 2.0 · Comercial · Leads» (es la familia del módulo, no un grupo de Configuración). Se puede dejar o cambiar a «Configuración · Módulos · Leads».
