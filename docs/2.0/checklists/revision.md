# Checklist de revisión — sesión constructora y «Revisor OPAI 2.0»

Lo usan la **revisión final** de la sesión de Claude Code (comentario con SHA + `sin bloqueos` o bloqueos concretos; `OPERACION-agentes.md` A2.2) y, **solo si Carlos lo pide o hay riesgo grave**, el bot Revisor (modelo contrario al constructor). Foco: **seguridad y aislamiento entre tenants**. Un ✗ en las secciones 1 a 3 es bloqueo para integrar.

## 1. Tenants y datos
- [ ] Toda tabla nueva con `tenant_id` tiene `ENABLE ROW LEVEL SECURITY` y la política `tenant_isolation` estándar en la misma migración. `pnpm test:db` lo verifica en cualquier schema.
- [ ] Un schema nuevo trae `GRANT USAGE` y los privilegios por defecto para `opai_app`.
- [ ] Todo acceso a datos pasa por `forTenant(tenantId)` o `enTransaccion(tenantId, …)`. No hay `$queryRaw`, `$executeRaw` ni sus variantes `Unsafe` fuera de `enTransaccion`.
- [ ] `dbAdmin()` aparece solo en migraciones, seeds o scripts. Nunca en `apps/web`, `modules/*` ni capacidades.
- [ ] El `tenantId` sale de la sesión o de la key, nunca del input del usuario. Las capacidades de plataforma lo reciben explícito y usan las operaciones con nombre de `ctx.plataforma.empresa(id)` (CAR-40; nunca un delegado libre) y dejan su rastro en la auditoría global (`core.auditoria_global`, CAR-36/41).
- [ ] Las referencias entre tablas del mismo tenant están protegidas con el trigger `core.verificar_mismo_tenant`, o con su equivalente para vínculos polimórficos.
- [ ] El alcance de filas (supervisor, cliente, persona) se filtra en la consulta de la capacidad, no en la UI. Hay test.
- [ ] Un id inexistente o de otro tenant responde 404 o `NOT_FOUND`, sin revelar si existe en otro tenant.
- [ ] Las migraciones son aditivas. Lo destructivo viene separado, con plan de reversa y aprobación de Carlos.

## 2. Permisos y agentes
- [ ] Cada capacidad declara el permiso `<modulo>:<accion>` y su efecto (`lectura`, `escritura`, `irreversible`). Los roles base respetan el bloqueo financiero de ADR-016.
- [ ] Toda escritura acepta `dryRun` e `idempotencyKey`. Lo irreversible pide aprobación humana a los agentes.
- [ ] Lo que gobierna agentes, keys, secretos o aprobaciones lleva `soloPersonas: true`.
- [ ] El texto de terceros (correos, formularios, documentos) vuelve marcado como externo y nunca habilita una escritura irreversible.
- [ ] Paridad: la pantalla, `/api/v1` y el MCP usan la misma capacidad. Si cambian las herramientas, cambia la instantánea `herramientas-mcp.txt`. Las excepciones van en `paridad-excepciones.ts`, con motivo.

## 3. Secretos y entradas
- [ ] No hay secretos, tokens, contraseñas ni URLs con credenciales en el diff, los tests, los logs ni la descripción del PR. El job `secretos` (gitleaks) está en verde.
- [ ] Ningún módulo lee credenciales de servicios del tenant desde `process.env`: usa el catálogo de integraciones (ADR-027).
- [ ] Toda entrada se valida con Zod en el borde: tamaños, formatos (RUT, correo, teléfono E.164) y listas cerradas.
- [ ] Las rutas públicas (`/verificar`, webhooks, crons) validan firma, token o `CRON_SECRET`, y tienen límite de uso si corresponde.
- [ ] Los archivos suben por `core.documentos` con URL firmada y huella SHA-256. No hay URLs públicas de R2.
- [ ] No se imprimen datos personales sensibles en logs (RUT completo, sueldos, salud).

## 4. Calidad y contrato
- [ ] Cumple el brief y sus criterios de aceptación. Las diferencias están reportadas.
- [ ] Respeta `docs/2.0/REGLAS-codigo.md`: TypeScript estricto sin `any`, archivos de hasta 150 líneas, dominio puro, dinero en enteros y tiempo en UTC.
- [ ] Trae los tests de la regla nueva: dominio, autorización y auditoría de capacidades, y RLS si toca base.
- [ ] El check `build · presupuesto de JS` está en verde. Si el PR sube un tope, la justificación está en el PR (sin excepción de Carlos: ADR-043 v3).
- [ ] El diff no trae refactorizaciones fuera del alcance ni archivos generados o temporales.
- [ ] El PR está vinculado a su tarea de Linear (`Fixes CAR-123`), `ROADMAP.md` está actualizado si cambia el plan, y el PR trae el resumen ejecutivo para Carlos.

## Veredicto

**Sesión constructora (A2.2):** comentario en el PR con el **SHA completo** del head y **`sin bloqueos`** o **bloqueos concretos** numerados (seguridad, RLS/tenant, permisos, migraciones, datos). Integra la sesión con squash cuando cumple `AGENTS.md` («Integración a `main`», ADR-077): cuatro checks en verde, sin veto, migración aplicada por el bot si corresponde, revisión final sobre el head y, si hay cambio visual, OK o delegación explícita de Carlos (A2.10).

**Revisor OPAI 2.0 (solo bajo demanda):** **APROBAR** o **PEDIR CAMBIOS**, con archivo:línea, citando el SHA. Puede usar la línea **Revisor OPAI 2.0: sin bloqueos**; **no integra**. No escribe `VETO` ni maneja `migracion-pendiente`. Tras un push, solo revisa el delta si sigue activo el encargo de revisión.
