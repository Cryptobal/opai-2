# Contexto para agentes — OPAI 2.0

Para pegar en la configuración o memoria de Grokbot o de cualquier agente que trabaje con OPAI. Versión vigente: la de este archivo en el repositorio.

---

## Decisión (22-oct-2026)

Carlos decidió construir **OPAI 2.0 desde cero**: un SaaS modular, multi-tenant, agent-first y multi-vertical (seguridad, aseo, outsourcing, mantenimiento) para empresas intensivas en personal. Se construye en el repositorio `Cryptobal/opai-2`, se despliega en `test.opai.cl` mientras está en construcción y en `app.opai.cl` cuando entre en producción.

**OPAI 1.0** (opai.gard.cl, repositorio `Cryptobal/opai`) sigue siendo el sistema en producción de Gard y **queda congelado**: solo correcciones críticas. Todo lo que hoy haces en 1.0 vía MCP sigue igual hasta nuevo aviso.

## Cómo se trabaja

- Claude (proyecto "OPAI 2.0" en claude.ai) guía la construcción y escribe los briefs en `docs/2.0/briefs/`.
- Carlos ejecuta los briefs en Claude Code sobre `opai-2` y decide el negocio.
- El estado real del proyecto vive en `docs/2.0/ESTADO.md`. Es la única referencia de avance; no asumas nada que no esté ahí.
- Las decisiones viven en `docs/2.0/01-decisiones.md`.

## Qué va a cambiar para ti

- 2.0 nace agent-first: cada capacidad de negocio se declara una vez y se expone igual en pantalla, en API `/api/v1/` y como herramienta MCP, con los mismos permisos y auditoría. Las escrituras tendrán `dry_run` (vista previa) antes de ejecutar y aceptarán clave de idempotencia.
- Tendrás una **API key propia con scopes por módulo**, vinculada a Carlos como usuario responsable. Tus acciones quedarán registradas como "agente vía Carlos".
- **El MCP de 2.0 está en línea** (Brief 01, 23-oct-2026): `https://test.opai.cl/api/mcp` (Streamable HTTP, sin estado). Autenticación con la cabecera `Authorization: Bearer <API key>` (forma recomendada). Para clientes que no permiten cabeceras existe `https://test.opai.cl/api/mcp/k/<API key>`, menos segura porque la key queda en la URL. La key la crea Carlos en ERP → Configuración → API keys y te la entrega por un canal seguro; nunca se escribe en este repositorio. Formato `opai_<empresa>_<32 caracteres>`.
- Herramientas: una por capacidad visible para tu key (`core_me`, `core_users_list`, `core_users_invite`, …); las que escriben tienen además `preview_<nombre>`, que muestra el efecto sin guardar. Usa siempre la vista previa y confirma con Carlos antes de la escritura real. Empieza con `core_me` para ver empresa, rol y permisos. Con scope `*` no ves herramientas de plataforma.
- La API HTTP equivalente es `https://test.opai.cl/api/v1/<modulo>/<entidad>/<verbo>` con la misma key.

## Arquitectura, en una línea cada punto

- Base compartida con aislamiento por tenant a nivel de base de datos (RLS).
- Núcleo siempre encendido: tenants y plataforma, usuarios y permisos, cuentas (clientes), contactos, instalaciones, personas, cargos y estructuras de sueldo (tres niveles: cargo, puesto en instalación, persona), documentos, notificaciones, configuración, auditoría, telemetría.
- Módulos vendibles por separado: Comercial, CPQ, Licitaciones, Operaciones, Rondas, Portales (Trabajador, Terreno, Cliente, Supervisor), Asistencia con reportes DT, Finanzas (con factoring y adaptadores por proveedor), Nómina. Un módulo apagado no rompe a otro.
- No se portan de 1.0: inventario, cámaras, ATS, alertas y cobertura, incidentes, conocimiento, onboarding, comunicaciones, gamificación, psicolaboral, chat, Slack como módulo, Productividad.
- Misma UX en todos los módulos; mobile e iPad first.

## Orden de construcción

Fundación → Núcleo mínimo → Comercial y CPQ (Gard empieza a vender en 2.0) → Licitaciones → Núcleo completo → Operaciones, Rondas y portales → Asistencia y DT → Finanzas (1.0 pasa a solo lectura) → Nómina.

## Reglas para ti

1. No mezcles datos ni supuestos entre 1.0 y 2.0.
2. No propongas cambios en 1.0 salvo bugs críticos de operación de Gard.
3. Si Carlos te pregunta por 2.0, responde desde `docs/2.0/ESTADO.md`; si no tienes acceso al repo, dilo.
4. Las claves, secretos e infraestructura las maneja Carlos desde su máquina; nunca las pidas ni las guardes.
