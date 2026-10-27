# NÚCLEO-E2 · Agente interno del tenant (PR 2)

Encargo de Carlos: 26-oct-2026 20:47 CLT, chat con OPAI 2.0 (t457u),
con decisión de adelanto del 26-oct-2026 21:07, respuesta al widget t461s2118.
Implementación: OpenCode / openai/gpt-6.1-sol, rama `core/agente-interno-pr2`.
El encargo no incluye un ID de Linear; no se inventa uno. No se abre PR.

## Bloques y criterios de aceptación

0. Merge normal de `origin/main`: sin cambios, base `5c18a92`; E1 (#62) y C (#70)
   integrados. A (#71) no está integrada; es recomendada, no obligatoria en el encargo.
1. Manifest vendible `agente`, permisos `agente:usar` y `agente:configurar`, sin navegación
   ni dependencias de negocio. Activación por el mecanismo existente `tenant_modules`;
   el ejecutor común deniega las capacidades del módulo inactivo. Prueba negativa de
   licencia y permiso, y positiva con licencia activa. No activa la licencia por defecto.
2. Herramientas derivadas de `herramientasMcp`, con licencia, permiso de uso,
   módulos activos, permisos de cada capacidad y portal. Las lecturas pasan por
   `executeCapability` con el mismo alcance del usuario, y su resultado se marca
   externo. Prueba con registro dinámico y esquema de escritura idéntico al MCP.
   No se publican gobierno humano, plataforma ni herramientas recursivas del agente.
   El bloqueo de escrituras sin confirmación se completa en el bloque 3.
3. Bucle servidor: 12 pasos, 128.000 tokens medidos, escrituras primero en dryRun;
   planes firmados y confirmación humana completa o paso a paso. Rechazo y
   concurrencia protegidos por idempotencia persistida. Irreversibles a la cola
   humana; el plan se detiene allí. Actor agent interno vía usuario, sin API key;
   presupuesto opcional conjunto por tenant con el ledger atómico de C y aviso 80 %.
4. Modelos derivados de proveedores conectados; el servidor valida proveedor,
   modelo y clase, sin entregar credenciales. No elige modelos arbitrarios.
5. No hay memoria ni conversaciones persistentes nuevas. El caché existente de
   idempotencia conserva temporalmente la respuesta (24 h, purga diaria), con RLS;
   las confirmaciones están ligadas al tenant/usuario/portal/acceso y vencen en 1 h.
   Migración `20261028120000_agente_interno`: identidad sin key en aprobaciones y
   ledger, constraints de identidad exclusiva e índice único del contador interno.
   Inventario 07d ampliado para las tres tablas reutilizadas. Prueba BD del mismo
   usuario en dos empresas y prueba de 20 cargos concurrentes contra un tope de 10.
6. POST /api/agente: sesión y MFA, origen propio, rate limit cerrado, portal ERP
   fijado en servidor, SSE iniciado/resultado/error. Capacidades de modelos,
   preparación, confirmación e historial de metadatos; preparación y confirmación
   son solo personas, las otras tienen MCP. Manual y enmienda ADR-049 publicados.

## Adaptaciones técnicas y límites materiales (OpenCode)

- No se guarda un chat durable: se reutiliza el caché de idempotencia. La firma
  usa BETTER_AUTH_SECRET ya existente, nunca una key de IA ni una clave nueva.
- API de sesión solo ERP; otros portales y la UI esperan su PR de diseño aprobado.
  El catálogo de herramientas sí filtra el portal del contexto, sin asumir ERP.
- SSE transmite eventos completos, no fragmentos del texto del proveedor.
- Presupuesto sin tope por defecto; configurarlo es solo humano, por defecto
  owner/admin; un rol personalizado requiere permiso explícito. El gasto ya
  incurrido siempre se registra.
- El límite de tokens usa consumo informado: si una respuesta lo supera, se mide,
  falla el turno y no se continúa; no es una reserva anticipada del costo exacto.
- Un fallo tras un efecto no libera la reserva: antes de solicitar otra acción
  se consulta auditoría. No se declara una ejecución distribuida atómica del plan.
- El encargo no trae ID CAR-n: falta vincularlo cuando se prepare el PR.
- Merge final normal de `origin/main` f60803c (07d PR 3), conservando ambos
  inventarios y agregando las reglas de retención de las tablas reutilizadas.
- Autorrevisión independiente: corregidos y re-revisados sin bloqueantes el
  gobierno solo humano del presupuesto y la reserva sin recuperación automática.
  Prueba de corte tras efectos y reintento a los 11 minutos incluida.
- La prueba de rate limit comprueba ahora la ventana reciente concreta, en lugar
  de contar ventanas ajenas que otra prueba pudo envejecer; no se omiten tests.
- Continuación tras ECONNRESET: OpenCode conserva el árbol heredado y empuja primero
  `a59ab2faddc0c3463cd7dac6e3d3ac7865e7354f`, según el encargo de resguardo.
- Corrección de autorrevisión: la confirmación aprueba capacidad y argumentos firmados,
  no la igualdad de toda la salida del dryRun (puede contener fechas calculadas).
  Se revalidan permisos y reglas en cada llamada; no se promete atomicidad entre
  vista previa y escritura ni un snapshot del estado. La capacidad sigue siendo
  responsable de sus precondiciones de negocio. Pruebas con `core.cuentas.archive`
  real: avance del reloj permitido y nueva instalación activa rechazada.
- La respuesta de confirmación conserva `aprobacionId` asociado al índice del paso,
  también al reintentar, para consultar la solicitud pendiente sin enumerarla.
- Las capturas heredadas se preservan en `/tmp/opencode/e2-capturas-heredadas.tar`;
  el e2e espera contenido visible antes de regenerarlas. No se cambia el diseño.

## Límites

No hay pantallas nuevas ni cambios de diseño. La UI posterior exige export aprobado,
siempre con el Design System de OPAI 2.0. No se aplica ninguna migración en Neon.
Las adaptaciones técnicas de implementación corresponden a OpenCode; no se atribuyen
decisiones nuevas de negocio a Carlos.

## Verificación

Corrección de la revisión 5665413229: selección de proveedor propio sin respaldo a
plataforma y con aviso; «Probar» registra su propio estado y evento, sin duplicar
el aviso del resolvedor. Adaptación técnica de OpenCode según el encargo.

Continuación final: `pnpm typecheck`, `pnpm lint` (advertencias preexistentes),
`pnpm test` **1.009/1.009**, `pnpm test:db` **96 + 86 + 24**, `pnpm build`
(build web nuevo, no caché) y `pnpm presupuesto` verdes, sin subir topes.
E2E `agente-modulo.spec.ts configuracion-acceso.spec.ts --workers=1`: **7 aprobados**
y **2 omisiones preexistentes** (la escritura se ejecuta solo en iPad), a
375/1024/1280. Servidor de producción propio lanzado desde este worktree en **3286**,
con `BASE_URL` explícita; no se reutilizó otro servidor. Capturas regeneradas y
comprobadas visualmente, incluida la de Agentes/iPad que estaba en blanco.
Autorrevisión independiente final y re-revisión de las correcciones: sin bloqueantes
restantes; no sustituye aprobación externa sobre el SHA final ni CI.
El primer intento del gate falló por timeout de un hook BD; se repitió sin omitir
pruebas ni aumentar límites. Los logs finales están en
`/tmp/opencode/e2-continuacion-gate-final.log` y `/tmp/opencode/e2-e2e-3286.log`.
Consultas directas en ambas bases locales confirmaron RLS, `tenant_isolation`,
NOBYPASSRLS y constraints de identidad; no se aplicó nada en Neon.

Evidencia histórica del bloque 1 (antes de completar el conjunto):

Bloque 1: typecheck, lint (solo advertencias preexistentes), 934 tests unitarios,
test:db (90 + 64 + 24) y build/presupuesto en verde. E2E de oferta del módulo en
servidor propio en el puerto 3186: 3/3 (375, 1024 y 1280 px), capturas en
`/tmp/opencode/agente-modulo-*.png`. Autorrevisión parcial independiente del manifest y
de la derivación de herramientas: dos observaciones de herramientas corregidas;
la autorrevisión final del conjunto se completó en la continuación descrita arriba.
Los logs locales del gate se guardan en `/tmp/opencode/agente-interno-bloque*.log`.
