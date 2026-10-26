# Alcance · CRM PR 1 (Negocios y Contactos) — para revisar una sola vez

Fuentes verificadas el 26-oct-2026: código de 1.0 (copia del 24-sep, commit e3f267e0a), herramientas MCP de 1.0 en vivo y solo lectura, Page «Comercial OPAI 2.0: decisiones» (25-oct) y comercial.md (borrador). El export de Claude Design del CRM v2 **no lo revisé**: las mejoras salen de las decisiones del mockup v1 aprobado.

## 1. Qué pasa de 1.0 a 2.0 en este PR
| En 1.0 hoy | En 2.0 (test.opai.cl) |
|---|---|
| /crm/deals: tablero Kanban con arrastre (DealsBoard) y vista lista | /negocios: tablero con arrastre y lista, con filtros por etapa y responsable |
| 8 etapas fijas en Gard (Prospección … Adjudicado, Perdido, Activo) | Embudo configurable por tenant en Configuración → Módulos → Comercial, con 1 etapa ganada y 1 perdida |
| /crm/deals/[id]: monto, etapa, cuenta, instalaciones y contactos de la cuenta, Ganado/Perdido | /negocios/[id]: Resumen, Instalaciones, Contactos e Historial de etapas |
| Perder con motivo (precio, cobertura, plazo, sin respuesta, otro) | Perder con motivo de un catálogo editable. Reabrir con motivo |
| /crm/contacts: lista con filtros (activos, con o sin cuenta, principal) y ficha | /contactos: lista y ficha sobre el Contacto que ya existe en 2.0 |
| Pestaña Negocios en la ficha de cuenta y en la de instalación | Las dos pestañas, en /cuentas/[id] y en la ficha de instalación |

Las cuentas ya están en 2.0 (lista y ficha con contactos, instalaciones, documentos y actividad). En este PR solo ganan la pestaña Negocios.

## 2. Qué NO entra en este PR, y por qué
- **Solicitudes**: la bandeja, la entrada web y la conversión en un paso van en el PR 2. Es otro flujo, con su propia migración.
- **Cotizaciones y CPQ**: CPQ es otro módulo. La regla «ganar exige cotización enviada» queda configurada, pero apagada hasta que llegue CPQ.
- **Una sola persona en N cuentas** (contacto N–N): va en el PR 2, porque cambia el núcleo (Contacto.cuentaId).
- **Notas, tareas y reuniones** (actividad unificada): van en el PR 2.
- **Reportes y exportar a Excel**: van en el PR 3.
- **Etiquetas, campos personalizados, fusionar y transferir**: van en el PR 3.
- **Importar desde 1.0 y sincronizar 2.0→1.0**: van en un PR propio, porque necesitan la llave de 1.0 y una simulación previa.
- **No se migran**: el cliente de correo (/crm/correos), Drive, Slack por negocio, copiloto, checklist y PandaDoc. Lo dice la §11 de comercial.md.
- **Lo que 1.0 hace y no entra aquí sigue funcionando en opai.gard.cl.** 1.0 no se apaga hasta que cada pieza tenga su PR en 2.0.

## 3. Mejoras que se suman
1. **El negocio se vincula a 1..N instalaciones reales.** 1.0 copia los datos de la instalación como texto.
2. **El estado sale de la etapa, con requisitos al entrar**: monto, fecha de cierre, motivo de pérdida. Reemplaza el «negotiationIncomplete» y la lista de negocios por corregir de 1.0.
3. **Historial de etapas con los días que pasó en cada una.** Es la base de los reportes de conversión.
4. **El tablero sigue las decisiones del mockup v1.** Tiene scroll horizontal, cada columna con su propio scroll y cabecera fija, y en el teléfono se ve una columna a la vez. Se prueba a 375, 1024 y 1280 px.
5. **Los motivos, tipos y orígenes son catálogos por tenant.** En 1.0 están fijos en el código.
6. **Todo lo que se hace en la pantalla también se puede hacer por MCP**, con vista previa. Si el que gana el negocio es un agente, se detiene y pide aprobación humana.

> **Decide Carlos**
> 1. **¿Se puede ganar sin cotización mientras CPQ no exista en 2.0?** Recomiendo **sí, solo en test**, con un aviso «sin cotización». La exigencia se activa cuando llegue CPQ.
> 2. **¿Qué etapas trae el embudo por defecto?** Recomiendo **los 8 nombres de etapa de 1.0** como configuración inicial, sin copiar ningún negocio.
> 3. **comercial.md no coincide con la Page de decisiones del 25-oct**: SLA fuera, ganado = adjudicado, acuse configurable, campos personalizados. Recomiendo que **mande la Page** y que el brief del PR corrija comercial.md.
> 4. **Ventana fija para aplicar migraciones en Neon dev y main.** Para que la pantalla se vea el miércoles 28, la migración del CRM se aplica el martes 27 en la noche. Recomiendo **dos ventanas al día, a las 13:00 y a las 19:00**.
