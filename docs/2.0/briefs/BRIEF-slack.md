# Brief · Slack ↔ OPAI 2 (CAR-290 a CAR-296)

**Decisión:** [ADR-093](../01-decisiones.md) (Carlos, 11-nov-2026, 15:20) · **Sesión dueña:** «Sesión Núcleo» (delegación de Carlos del 11-nov-2026, 15:32) · **Tarea madre:** CAR-290.

Slack pasa a ser el canal del **supervisor** para las anomalías de terreno. OPAI sigue siendo la fuente de verdad, los guardias nunca usan Slack y, sin Slack conectado, OPAI se comporta exactamente igual que hoy.

## Condición de Carlos: no romper nada

- **Apagado por defecto.** Sin Slack conectado no se envía nada, no se crea ningún trabajo y no cambia ninguna pantalla fuera de Configuración › Integraciones.
- **Ningún flujo depende de Slack.** Marcaciones, rondas, incidentes, pánico y notificaciones se registran igual. Slack se alimenta de **eventos de dominio que ya existen** (outbox, ADR-029) mediante consumidores propios; si Slack falla, el consumidor registra el error, reintenta con límite y nunca revierte ni bloquea el hecho original.
- **Migraciones solo aditivas** (tablas o columnas nuevas; nada de `DROP` ni `RENAME`), con RLS `tenant_isolation` y `FORCE`. Las aplica la «Sesión Núcleo» con respaldo, `dev` y luego `main`, después de la revisión final sin bloqueos y con aviso en el PR (excepción acotada de ADR-093 §12 a ADR-070 y A2.3).
- **Sin tocar** archivos de Comercial, Personas, Documentos ni Finanzas, ni los del PR de MFA (#499) mientras siga abierto. Cuando haga falta engancharse a otro módulo, el punto de extensión es mínimo (un consumidor de un evento ya publicado, o un evento nuevo emitido en la misma transacción) y el PR lo explica.
- `main` se trae a la rama **con merge**, nunca con rebase ni force-push (`AGENTS.md`; el pedido de «rebasar» del encargo se cumple con merge).
- **Pruebas:** Slack siempre con mocks en unitarias; e2e con `qa-e2e` y `preview-e2e`. Nunca el Slack de Gard ni datos de Gard.
- **Secretos:** `SLACK_CLIENT_SECRET` y `SLACK_SIGNING_SECRET` solo en variables de entorno (las carga Carlos); tokens por tenant cifrados (ADR-027). Nada de eso en logs, PRs, capturas ni el repo.

## La app «OPAI»

Manifiestos en [`packages/integrations/src/slack/manifiesto/`](../../../packages/integrations/src/slack/manifiesto/): `opai.json` (app distribuida, `app.opai.cl`) y `opai-pruebas.json` (app del espacio de pruebas, `test.opai.cl`). Tienen los mismos scopes, eventos y ajustes; solo cambian el nombre y las URLs. La prueba `manifiesto.test.ts` lo verifica y falla si aparece un scope fuera de la lista mínima, un scope de usuario, una URL que no sea HTTPS de OPAI o algo con forma de secreto. Cómo crear la app desde el manifiesto: [`README.md`](../../../packages/integrations/src/slack/manifiesto/README.md).

## Fases (un PR por fase, en orden)

| Fase | Tarea | Alcance | Migración |
|---|---|---|---|
| **F0** | CAR-290 | ADR-093, este plan y los manifiestos con su prueba. Solo documentación y configuración. | No |
| **F1** | CAR-291 | OAuth v2 «Conectar con Slack» (solo owner o admin) en Configuración › Integraciones; token cifrado con `team_id` y nombre del espacio; «Desconectar» con `auth.revoke`; ruta `eventos` mínima (firma, `url_verification`, `app_uninstalled`, `tokens_revoked`) para poder registrar la app; un espacio ligado a un solo tenant; configuración por tenant; auditoría; capacidades y MCP para leer estado y configuración y cambiar la configuración. | Sí (aditiva) |
| **F2** | CAR-292 | Vínculo usuario OPAI ↔ usuario Slack con `users.lookupByEmail` (al conectar, al dar de alta un usuario y con un trabajo diario para los pendientes); vista de vinculados y sin vincular; mensajes directos para avisos personales. Solo usuarios internos y miembros completos del mismo `team_id` (sin invitados, externos ni desactivados). | Sí (aditiva) |
| **F3** | CAR-293 | Consumidores de eventos de terreno → Slack: solo anomalías, un hilo por instalación y día, botón «Tomar», resumen opcional editado con `chat.update`, pánico con escalamiento. Envío asíncrono con reintentos y límites de Slack. | Sí (aditiva) |
| **F4** | CAR-294 | Endpoint de interactividad con firma verificada y antirrepetición; «Tomar», «Responder», «Cerrar» y «Pedir refuerzo» como capacidades del usuario vinculado; el mensaje se actualiza; efímero para quien no está vinculado o no tiene permiso. | Posible |
| **F5a** | CAR-295 | Events API: la respuesta del supervisor en el hilo llega al guardia (conversación en OPAI y push en la app de terreno); se ignoran bots, no vinculados y otros espacios; se descarta sin guardar todo mensaje que no sea respuesta en el hilo de un aviso de OPAI; deduplicación. | Sí (aditiva) |
| **F5b** | CAR-296 | Módulo «Comunicación» en la app de terreno: chat del guardia con su supervisor o la central, con texto, foto y ubicación, cola sin conexión; **botón de pánico** (decisión de Carlos), que funciona igual sin Slack; `@preview` a 375, 1024 y 1280 px. | Posible |

## Configuración por tenant (valores por defecto aprobados por Carlos el 11-nov-2026)

Todo apagado hasta que el tenant conecte Slack **y** elija un canal. Al conectar:

| Ajuste | Por defecto |
|---|---|
| Atraso sobre el margen | Encendido, margen **15 min** |
| Ausencia (sin marca de inicio) | Encendido |
| Fuera de zona | Apagado |
| Sin relevo | Apagado |
| Incidentes y mensajes de guardias | Apagado |
| Pánico al canal | Encendido |
| Pánico: mensaje directo al supervisor zonal | Apagado |
| Pánico: escalar a un grupo de usuarios o a personas (se elige en cada tenant) | Apagado; si se enciende, **5 min** |
| Resumen por turno y zona | Apagado |
| Canales | Uno para todo; opcionalmente uno por zona o por tipo. Nunca uno por instalación. |

## Enganches a otros módulos (puntos de extensión)

| Aviso | Origen en 2.0 hoy | Enganche previsto |
|---|---|---|
| Atraso, fuera de zona | `asistencia.marca.registrada` (Asistencia calcula atraso y geocerca) | Consumidor nuevo en el núcleo de Slack; si el payload no trae el dato, un campo aditivo en el payload |
| Ausencia | `asistencia.alerta.sin_marca_inicio` | Consumidor nuevo |
| Sin relevo | Sin evento propio | Evento nuevo emitido por Asistencia o Pauta en F3 (punto mínimo) |
| Incidentes | Libro de novedades / Tickets | Consumidor del evento existente, si lo hay, en F3 |
| Pánico | **No existe en 2.0** | Botón en la app de terreno (F5b) que emite un evento de pánico nuevo por outbox; F3 lo consume |

## Respuestas de Carlos (11-nov-2026)

1. **Pánico:** se aprieta en la app de terreno (la del guardia). El botón entra con F5b («Comunicación», app de terreno) y emite un evento de pánico por outbox; F3 lo consume (aviso al canal, mensaje directo y escalamiento).
2. **Espacio Slack de pruebas:** sí. Se registran las apps cuando F1 esté desplegado, porque Slack valida la URL de eventos al guardar el manifiesto. Hasta entonces, mocks.
3. **Canales de supervisión:** públicos. Sin `groups:*`.
4. **Valores por defecto:** aprobados los de la tabla.
5. **Escalamiento del pánico:** a un grupo de usuarios (CAR-251) o a personas, configurable en cada tenant.
