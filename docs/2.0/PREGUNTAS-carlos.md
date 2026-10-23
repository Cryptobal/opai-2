# Preguntas para Carlos — aprobar ADR-041, 042, 044, 045 y 046

**23-oct-2026** · Respuestas cerradas; cada una trae la recomendación. Con estas respuestas los ADR pasan a «vigente» y se puede escribir la especificación y el Design Prompt de Comercial. Basta responder «de acuerdo con todas» o indicar el número que cambia.

## Fichas (ADR-041)

1. **¿Las notas pasan a ser actividades** (se escriben arriba de la pestaña Actividad, junto con llamadas, reuniones y tareas) **y las etiquetas van como chips bajo el título**, sin pestañas propias? — Recomendación: **sí**.
2. **¿El contacto tiene ficha propia** (Resumen, Cuentas con sus roles, Negocios, Documentos, Actividad), porque es una persona vinculada a varias cuentas? — Recomendación: **sí**.
3. **¿Ocultamos por completo las pestañas de módulos no contratados** (sin pestañas grises ni «disponible pronto»)? — Recomendación: **sí**; la venta de módulos se hace en Configuración → Módulos, no dentro de las fichas.

## CPQ (ADR-042)

4. **¿Qué cotizaciones reales de Gard usamos para validar el margen financiero al peso?** — Recomendación: **cinco cotizaciones enviadas en 2026**, elegidas por ti, que incluyan al menos una con póliza de garantía, una con varias instalaciones y una con margen bajo.
5. **¿Un precio con la guarda `k ≥ 0,35` (precio subvalorado) puede enviarse solo con aprobación de un rol con `cpq:aprobar`?** — Recomendación: **sí**, aprueban owner y admin.
6. **¿Cuál es el margen mínimo de Gard bajo el cual la cotización pide aprobación?** — Recomendación: **el que Gard usa hoy en la práctica** (indícalo en %); por defecto propondría 15 % sobre venta.
7. **¿El modo de margen por defecto es «margen sobre venta»** (`margin_on_sale`), como en 1.0? — Recomendación: **sí**.
8. **¿El modelo de costeo y el catálogo de ítems se editan en una pantalla del módulo CPQ («Modelo de costeo»), solo owner y admin?** — Recomendación: **sí**.
9. **¿La edición completa del cotizador es solo en iPad y escritorio**, y en el celular se ve, compara y aprueba? — Recomendación: **sí**.
10. **¿Entregamos en la v1 solo el modelo base de seguridad** y dejamos aseo y facility para cuando haya un tenant real de esos rubros? — Recomendación: **sí** (evita modelos sin validar).
11. **¿El correlativo `CPQ-AAAA-NNN` continúa desde el último número de 1.0** para no repetir códigos ante clientes? — Recomendación: **sí**.

## PWA y apps (ADR-044)

12. **¿Empaquetamos para tiendas con Capacitor** (iOS y Android, con GPS en segundo plano y push nativo) en vez de TWA o PWABuilder? — Recomendación: **sí, Capacitor**.
13. **¿Una sola app «OPAI» en las tiendas** que abre el portal según la persona (Trabajador, Supervisor, Cliente, Terreno), en vez de una app por portal? — Recomendación: **una sola app**; menos revisiones y una sola instalación. La versión con marca del tenant queda para después.
14. **¿Se permite marcar asistencia sin conexión**, como **marca diferida** (`offline_queue`) con hora del dispositivo, GPS y sello del servidor al sincronizar, identificada como tal ante la DT (distinta de la carga manual de contingencia)? — Recomendación: **sí**, con aviso visible al trabajador y al supervisor; la alternativa (exigir red) deja sin marca a instalaciones sin señal.

## Velocidad (ADR-045)

15. **¿Quitamos los contadores de la barra lateral** (Cuentas 12, Personas 340…) o los cargamos después de pintar? — Recomendación: **quitarlos de la barra lateral** y dejarlos en Inicio y en las listas; cada contador es una consulta en cada navegación.
16. **¿Aceptas que la sesión se valide contra la base cada 5 minutos** (caché de sesión) en vez de en cada clic? Una suspensión o cambio de rol se aplica al instante por invalidación; solo un cierre de sesión forzado desde otro dispositivo podría tardar hasta 5 minutos. — Recomendación: **sí**.

## Navegación (ADR-046, `NAVEGACION.md`)

17. **¿El término único es «Personas»** en el menú para todas las verticales (incluye guardias, supervisores y administrativos), dejando «guardia» para textos operativos como «guardias en turno»? — Recomendación: **sí**.
18. **¿Apruebas las áreas Inicio, Comercial, Clientes, Operaciones, Personas, Finanzas y Documentos, con Configuración al pie?** — Recomendación: **sí**.
19. **¿La barra inferior del celular cambia según el área principal de cada usuario** (por ejemplo, un supervisor ve Pauta y Personas; un vendedor, Negocios y Cuentas)? — Recomendación: **sí**, con Inicio y Buscar fijos.
