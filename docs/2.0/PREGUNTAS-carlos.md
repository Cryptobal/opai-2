# Preguntas para Carlos — aprobar ADR-041, 042, 044, 045 y 046 · **RESPONDIDAS**

**23-oct-2026** · **Respondidas por Carlos el 23 y 24-oct-2026.** Con estas respuestas ADR-041, 042, 044, 045 y 046 pasan a «vigente» (cada ADR registra sus «Decisiones de Carlos»). Se conserva la pregunta original con su recomendación y, debajo, la respuesta.

## Fichas (ADR-041)

1. **¿Las notas pasan a ser actividades** (se escriben arriba de la pestaña Actividad, junto con llamadas, reuniones y tareas) **y las etiquetas van como chips bajo el título**, sin pestañas propias? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. Las notas son actividades y las etiquetas van como chips.
2. **¿El contacto tiene ficha propia** (Resumen, Cuentas con sus roles, Negocios, Documentos, Actividad), porque es una persona vinculada a varias cuentas? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. El contacto tiene ficha propia.
3. **¿Ocultamos por completo las pestañas de módulos no contratados** (sin pestañas grises ni «disponible pronto»)? — Recomendación: **sí**; la venta de módulos se hace en Configuración → Módulos, no dentro de las fichas.
   - **Respuesta de Carlos:** Sí. Se ocultan por completo.

## CPQ (ADR-042)

4. **¿Cómo elegimos las cotizaciones reales de Gard para validar el margen financiero al peso?** (a) Tú eliges cinco enviadas en 2026; (b) Claude toma las cinco últimas enviadas en 1.0; (c) Claude toma cinco enviadas en 2026 que cubran póliza de garantía, varias instalaciones y margen bajo, y tú las confirmas. — Recomendación: **(c)**.
   - **Respuesta de Carlos:** (c). Claude elige cinco cotizaciones reales y variadas de 2026 y Carlos las confirma.
5. **¿Un precio con la guarda `k ≥ 0,35` (precio subvalorado) puede enviarse solo con aprobación de un rol con `cpq:aprobar`?** — Recomendación: **sí**, aprueban owner y admin.
   - **Respuesta de Carlos:** Sí. Aprueba un owner o admin con `cpq:aprobar`.
6. **¿Cuál es el margen mínimo sobre venta bajo el cual la cotización pide aprobación?** (a) 10 %; (b) 15 %; (c) 20 %; (d) otro (indícalo). — Recomendación: **(b) 15 %**, salvo que Gard use hoy otro en la práctica.
   - **Respuesta de Carlos:** **(a) 10 %** (no el 15 % recomendado). Bajo 10 % de margen sobre venta la cotización pide aprobación.
7. **¿El modo de margen por defecto es «margen sobre venta»** (`margin_on_sale`), como en 1.0? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí, `margin_on_sale`.
8. **¿El modelo de costeo y el catálogo de ítems se editan en una pantalla del módulo CPQ («Modelo de costeo»), solo owner y admin?** — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. Pantalla «Modelo de costeo» de CPQ, solo owner y admin.
9. **¿La edición completa del cotizador es solo en iPad y escritorio**, y en el celular se ve, compara y aprueba? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí.
10. **¿Entregamos en la v1 solo el modelo base de seguridad** y dejamos aseo y facility para cuando haya un tenant real de esos rubros? — Recomendación: **sí** (evita modelos sin validar).
   - **Respuesta de Carlos:** Sí. Solo el modelo de seguridad.
11. **¿El correlativo `CPQ-AAAA-NNN` continúa desde el último número de 1.0** para no repetir códigos ante clientes? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. Continúa desde la numeración de 1.0.

## PWA y apps (ADR-044)

12. **¿Empaquetamos para tiendas con Capacitor** (iOS y Android, con GPS en segundo plano y push nativo) en vez de TWA o PWABuilder? — Recomendación: **sí, Capacitor**.
   - **Respuesta de Carlos:** Sí, Capacitor.
13. **¿Una sola app «OPAI» en las tiendas** que abre el portal según la persona (Trabajador, Supervisor, Cliente, Terreno), en vez de una app por portal? — Recomendación: **una sola app**; menos revisiones y una sola instalación. La versión con marca del tenant queda para después.
   - **Respuesta de Carlos:** Sí. Una sola app «OPAI» para todos (personal de la empresa, terreno con código y clientes), que abre a cada persona su portal.
14. **¿Se permite marcar asistencia sin conexión**, como **marca diferida** (`offline_queue`) con hora del dispositivo, GPS y sello del servidor al sincronizar, identificada como tal ante la DT (distinta de la carga manual de contingencia)? — Recomendación: **sí**, con aviso visible al trabajador y al supervisor; la alternativa (exigir red) deja sin marca a instalaciones sin señal.
   - **Respuesta de Carlos:** Sí. Marca diferida (`offline_queue`), informada a la DT y visible para el trabajador y su supervisor.

## Velocidad (ADR-045)

15. **¿Quitamos los contadores de la barra lateral** (Cuentas 12, Personas 340…) o los cargamos después de pintar? — Recomendación: **quitarlos de la barra lateral** y dejarlos en Inicio y en las listas; cada contador es una consulta en cada navegación.
   - **Respuesta de Carlos:** Sí. Se quitan los contadores del menú lateral.
16. **¿Aceptas que la sesión se valide contra la base cada 5 minutos** (caché de sesión) en vez de en cada clic? Una suspensión o cambio de rol se aplica al instante por invalidación; solo un cierre de sesión forzado desde otro dispositivo podría tardar hasta 5 minutos. — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. Caché de sesión de 5 minutos.

## Navegación (ADR-046, `NAVEGACION.md`)

17. **¿El término único es «Personas»** en el menú para todas las verticales (incluye guardias, supervisores y administrativos), dejando «guardia» para textos operativos como «guardias en turno»? — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí. «Personas» es el único término.
18. **¿Apruebas las áreas Inicio, Comercial, Clientes, Operaciones, Personas, Finanzas y Documentos, con Configuración al pie?** — Recomendación: **sí**.
   - **Respuesta de Carlos:** Sí.
19. **¿La barra inferior del celular cambia según el área principal de cada usuario** (por ejemplo, un supervisor ve Pauta y Personas; un vendedor, Negocios y Cuentas)? — Recomendación: **sí**, con Inicio y Buscar fijos.
   - **Respuesta de Carlos:** Sí. Se adapta al área principal, con Inicio y Buscar fijos.
