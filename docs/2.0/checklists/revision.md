# Checklist de revisión — «Revisor OPAI 2.0»

Lo usan el Revisor (con el modelo contrario al que construyó) y la autorrevisión del constructor antes de abrir el PR. Foco: **seguridad y aislamiento entre tenants**. Se responde ítem por ítem en la revisión. Un ✗ en las secciones 1 a 3 es «pedir cambios».

## 1. Tenants y datos
- [ ] Toda tabla nueva con `tenant_id` tiene `ENABLE ROW LEVEL SECURITY` y la política `tenant_isolation` estándar en la misma migración. `pnpm test:db` lo verifica en cualquier schema.
- [ ] Un schema nuevo trae `GRANT USAGE` y los privilegios por defecto para `opai_app`.
- [ ] Todo acceso a datos pasa por `forTenant(tenantId)` o `enTransaccion(tenantId, …)`. No hay `$queryRaw`, `$executeRaw` ni sus variantes `Unsafe` fuera de `enTransaccion`.
- [ ] `dbAdmin()` aparece solo en migraciones, seeds o scripts. Nunca en `apps/web`, `modules/*` ni capacidades.
- [ ] El `tenantId` sale de la sesión o de la key, nunca del input del usuario. Las capacidades de plataforma lo reciben explícito y usan `ctx.plataforma.paraTenant`.
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
- [ ] El presupuesto de JS no sube, salvo una excepción aprobada por Carlos.
- [ ] El diff no trae refactorizaciones fuera del alcance ni archivos generados o temporales.
- [ ] `ESTADO.md` y `ROADMAP.md` están actualizados, y el PR trae el resumen ejecutivo para Carlos.

## Veredicto
**APROBAR** o **PEDIR CAMBIOS**, con archivo:línea y la corrección propuesta. Durante los primeros módulos, el Revisor **no integra**: el merge lo hace Carlos (ADR-043).
