# BRIEF — Seguimiento comercial automático (CAR-67, PR 1)

Especificación: [`modulos/seguimiento-comercial.md`](../modulos/seguimiento-comercial.md). Encargo de Carlos del 3-nov-2026 («debe quedar hoy»). Rama `brief/car-67-seguimiento-comercial`.

## 1. Objetivo
Que cada negocio con cotización enviada tenga un plan de seguimiento configurable por empresa: pasos con canal (correo, WhatsApp, llamada, interno), plazos en días hábiles, quién ejecuta cada uno, y pausa automática cuando el cliente responde. Más el receptor del correo entrante `@respuestas.opai.cl`.

## 2. Estado actual (verificado)
- `main` no tiene seguimiento: solo `negocios.cotizacionEnviadaEn`, la actividad del núcleo (`core.actividades`) y el comunicable `comercial.*`.
- Calendario hábil en `packages/domain/src/calendario` (`sumarDiasHabiles`, feriados legales y del tenant). Trabajos `defineTrabajo` horarios y consumidores de eventos en el registro del núcleo. Correo por `correoDe(ctx)` (mide consumo).
- El webhook de Resend es de toda la cuenta (llegan también DTE, cartola y otros dominios).

## 3. Alcance (PR 1)
Modelo, dominio puro, motor (trabajo horario y consumidor de cierre), 11 capacidades con MCP, pestaña Seguimiento del negocio, iniciar, registrar paso, «El cliente respondió», pendientes, configuración de planes, receptor firmado del correo entrante. **Fuera (PR 2):** variantes y etiquetas del plan, tarjeta en Inicio, hoja al enviar desde CPQ (el disparo `cotizacion_enviada` hoy es manual o por MCP), cierre aplicado automático, mover etapa al responder, aviso comunicable al vendedor, lectura del texto de los correos entrantes en pantalla.

## 4. Arquitectura
Planes versionados (ADR-021): `config` JSON validada por `packages/domain`. Un seguimiento congela `planVersion`. El trabajo `comercial.seguimiento.vencer_pasos` (horario, ADR-029) pasa pasos vencidos a `por_hacer` (con tarea en la ficha), `por_preparar` (agente) o envía el correo automático. `comercial.seguimiento_cierre` termina el seguimiento al ganar o perder el negocio. Correo saliente con `Reply-To: <token>@respuestas.opai.cl` y el correo del vendedor; el token (128 bits) resuelve el tenant por una función SECURITY DEFINER.

## 5. Archivos
`packages/db/prisma/schema/comercial-seguimiento.prisma`, migración `20261103200000_comercial_seguimiento`, `packages/db/src/{catalogo-seguimiento,seguimiento-token}.ts`; `packages/domain/src/comercial/seguimiento*.ts`; `packages/capabilities/src/comercial/seguimiento*.ts` y `seguimientos-*.ts`; `apps/web/app/api/webhooks/resend/entrante/route.ts`, `lib/{firma-svix,correo-entrante}.ts`; `apps/web/app/(erp)/negocios/{_seguimiento,[id]/seguimiento,seguimiento}`; `configuracion/_comercial/*seguimiento*`.

## 6. Modelo de datos y migraciones (aditiva)
`comercial.seguimiento_planes`, `seguimiento_plan_versiones`, `seguimientos` (índice único parcial: un seguimiento vivo por negocio), `seguimiento_pasos`, `seguimiento_entrantes` (único por tenant+mensaje). RLS FORCE + `tenant_isolation`, triggers de mismo tenant, `lock_timeout`, función `comercial.seguimiento_resolver_token(text)`. Reversión documentada en el SQL. **No aplicada.**

## 7. Capacidades
`comercial.seguimiento_planes.{list,guardar,crear_base}`, `comercial.seguimientos.{list,get,iniciar,controlar,registrar_respuesta,registrar_paso,enviar_paso}` (todas con MCP; escrituras con `preview_…`; `enviar_paso` es irreversible y pide aprobación a agentes) y `comercial.seguimientos.recibir_correo` (interna, solo el receptor). Eventos `comercial.seguimiento.*` declarados en el manifest.

## 8. Interfaz y responsive
Pestaña **Seguimiento** del negocio (tarjetas y hojas `Sheet` del DS, 44 px táctil), `/negocios/seguimiento` (pendientes, enlace desde el tablero) y Configuración › Comercial › Seguimiento. Solo `@opai/ds`.

## 9. Seguridad y tenant
Tenant de sesión; el receptor lo saca del token. Firma Svix HMAC-SHA256 en tiempo constante con tolerancia de 5 min; firma inválida → 401; sin secreto → 401; todo lo que no vaya a `@respuestas.opai.cl` → 200 sin leer ni guardar contenido; rate limit; cuerpo ≤ 256 KB. El texto del cliente es dato externo: se guarda, nunca se interpreta ni habilita escrituras. Secretos en `RESEND_INBOUND_WEBHOOK_SECRET` y `RESEND_API_KEY`.

## 10. Casos límite
Feriados y horario de verano de Chile; reanudar reprograma al próximo día hábil; dos correos iguales (idempotente por id); cliente responde con el seguimiento ya terminado (se guarda sin pausar); contacto sin correo (el paso queda con error); negocio ganado o perdido (se termina); reemplazo explícito.

## 11. Plan por bloques
Un commit por bloque: modelo y migración → dominio → siembra y token → capacidades → trabajo y consumidor → receptor → UI negocio → UI configuración → instantáneas y etiquetas → docs.

## 12. Tests
Dominio (plazos hábiles, estados, token; 15); web (firma Svix válida, alterada, vencida, sin secreto, dominio ajeno, token desconocido; 9); base real (siembra, agenda, reemplazo, trabajo, respuesta, idempotencia, aislamiento y token; 6).

## 13. Validación
`tsc` de `capabilities` y `web`, `lint`, `vitest` por paquete, `test:db` de las suites tocadas con Postgres local, instantáneas MCP.

## 14. Criterios de aceptación
Plan por defecto sembrado por vertical; iniciar agenda en días hábiles; el trabajo crea tarea o envía el correo; «El cliente respondió» y el correo entrante pausan; un tenant no ve el seguimiento de otro; el receptor descarta todo lo ajeno con 200.

## 15. Riesgos y rollback
Migración aditiva (reversión en el SQL). El motor no corre sin planes ni seguimientos iniciados. Si el receptor falla, el seguimiento sigue funcionando con la acción manual.

## 16. Reporte de ejecución
Ver la descripción del PR.
