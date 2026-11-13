# BRIEF CAR-337 · Botones de alta en todas las listas

1. **Objetivo:** la acción principal de alta va en el mismo lugar y con el mismo estilo en todas las listas, y Contactos tiene alta directa.
2. **Estado actual (verificado en local, diseño nuevo, 1280 px):**
   - Cuentas, Instalaciones, Personas y Ventas muestran el botón arriba de la columna de la lista.
   - Cotizaciones y Solicitudes lo muestran en la barra superior en escritorio y en la lista solo en teléfono. Esto rompe la regla del README del diseño nuevo («+ Nuevo» siempre arriba a la derecha de la lista).
   - Contactos no tiene alta: el texto dice que se agregan desde la cuenta.
   - Negocios (tablero, pantalla completa) y Tickets usan la barra superior porque no tienen columna de lista.
3. **Alcance:**
   - Cotizaciones y Solicitudes pasan al botón sobre la lista en todos los tamaños, sin repetirlo en la barra superior.
   - Contactos gana «Nuevo» en la lista y «Nuevo contacto» en la ficha (como Cuentas), con una hoja que pide elegir la cuenta.
4. **Arquitectura:** se reutiliza `HojaContacto`; sin `cuentaId` muestra el selector de cuenta (`CuentaVinculo`, búsqueda en el servidor). El permiso es el mismo del alta desde la cuenta (`core:cuentas.manage`).
5. **Archivos:**
   - `contactos/page.tsx`, `contactos/[id]/page.tsx`, `contactos/_componentes/{datos.ts,lista-contactos.tsx}`
   - `cuentas/_componentes/hoja-contacto.tsx`
   - `cotizaciones/page.tsx`, `cotizaciones/_componentes/lista-cotizaciones.tsx`
   - `solicitudes/page.tsx`, `solicitudes/_componentes/lista-solicitudes.tsx`
   - e2e `botones-alta-preview.spec.ts`
6. **Datos:** sin cambios. Sin migración.
7. **Capacidades:** se usa `core.contactos.create` (ya existe en el MCP), sin cambios.
8. **Interfaz:**
   - Botón primario con «+» arriba de la columna en Contactos, Cotizaciones y Solicitudes.
   - En las fichas en vista dividida, el alta queda en la barra superior solo en escritorio, como ya hacían Cuentas, Instalaciones, Cargos y Cotizaciones.
9. **Seguridad:** el botón y la hoja solo aparecen con permiso; la capacidad valida igual.
10. **Casos límite:** sin cuenta elegida, «Crear contacto» queda deshabilitado. Una empresa sin cuentas muestra el aviso del buscador.
11. **Plan:** un commit.
12. **Tests:** e2e `@preview` del botón y la hoja de Contactos, y de un solo botón de alta en Cotizaciones y Solicitudes.
13. **Validación:** gate local, presupuesto de JS, e2e local y `preview-e2e` con capturas revisadas.
14. **Criterios:**
    - Contactos crea un contacto eligiendo la cuenta.
    - Cotizaciones y Solicitudes tienen un solo botón de alta, sobre la lista.
    - El resto de las listas no cambia.
15. **Riesgos:** ninguno de datos. Rollback: revertir el PR.
16. **Reporte:** en `docs/2.0/estado/diseno/CAR-337.md`.
