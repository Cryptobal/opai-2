# CAR-360 · Vista dividida: a lo más un botón principal

**[Sesión Diseño] · 14-nov-2026**

- **Qué entró:** en Cuentas, Contactos, Cargos, Cotizaciones, Instalaciones y Personas:
  - Con una ficha abierta, el «Nueva/Nuevo» de la lista pasa a secundario. Sin ficha abierta sigue primario.
  - La cabecera de la ficha ya no repite «Nueva cuenta», «Nuevo contacto», «Nueva cotización» ni «Nueva instalación». El alta queda solo en la lista, en el mismo lugar con o sin ficha abierta.
- **Prueba:** `apps/web/e2e/vista-dividida-un-primario-preview.spec.ts` (`@preview`).
- **Fuera de alcance:** Finanzas (ADR-090 §8; CAR-370 lo tiene la Sesión Finanzas en #782) y las pestañas de ficha con acción propia y un segundo primario. Por ejemplo, «Ganar» junto a «Nueva cotización» en Negocios queda para un PR aparte.
- **Decisión de la sesión (reversible):** quité el botón de la cabecera y dejé el de la lista, porque la lista lo tiene en las dos situaciones (con y sin ficha abierta), que es lo que pide el ticket.
- **Cargos:** solo cambia la lista: con la ficha abierta, «Nuevo» de la lista queda secundario. La cabecera sigue con «Nuevo cargo» como único primario. No toqué `pagina-cargo.tsx` porque #850 (Sesión Núcleo, CAR-319) lo está editando.
