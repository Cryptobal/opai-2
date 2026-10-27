# NÚCLEO-G2 · FORCE RLS y acceso global acotado

## Encargo y alcance

Carlos, 26-oct-2026 20:47 CLT, t457u: «ponlo entonces en el plan de desarrollo
para que todo se haga y lo que debamos hacer en el nucleo lo hagamos altiro».
La adenda de OPAI 2.0 indica apilar `fix/force-rls` sobre
`brief/11-puestos-pr1` (#49, `8f62b77`) y luego incorporar `origin/main`.
No se abre PR desde esta sesión. No se toca Neon. El encargo no trae CAR-n:
el orquestador debe completar el vínculo real antes de abrir el borrador.
Comercial no bloquea: el test obliga las mismas garantías en tablas futuras.

## Adaptaciones técnicas del constructor

Construido con: OpenCode gpt-6.1-sol: sesiones iniciales; Codex gpt-6.1-sol: continuación y esta revisión.

Adaptaciones dentro de este encargo (no nuevas decisiones de Carlos): se elimina `globales()` del API público y se mantiene `ctx.plataforma`
como puerto de operaciones con nombre, solo construido para humanos con rol
global. Identidad selecciona columnas mínimas; Plataforma no recibe el perfil
legal/DPO ni delegados arbitrarios. Se conserva la autorización, auditoría y
semántica de las capacidades existentes; no se crean permisos ni pantallas.

Los scripts cross-tenant no pueden suponer bypass por propiedad: `dbAdmin()`
conecta con `row_security=off`, que **falla**, no evita RLS, si una consulta sería
filtrada. Para operarlos se necesita una credencial de mantenimiento explícita
BYPASSRLS, nunca `opai_app`. Solo Carlos gestiona ese rol en Neon. Los tests
locales/CI usan su superusuario efímero existente. No se concede ningún bypass.

Los triggers `verificar_mismo_tenant`, `puesto_ciclo_del_patron` y
`patron_en_uso_inmutable` pasan a SECURITY INVOKER: consultan referencias del
tenant actual con los permisos del llamador. Una referencia invisible se rechaza
igual que una inexistente; el rol de mantenimiento sigue pudiendo ejecutar seeds.
Las funciones de login/rate-limit no consultan tablas con tenant_id y no cambian.

## Auditoría de accesos administrativos

| Usos | Resultado con FORCE |
|---|---|
| `packages/db/scripts/seed-{dev-tenant,e2e,maestros-demo,roles-base,staging}.ts` | Escriben datos de tenant; requieren mantenimiento BYPASSRLS explícito; fallan cerrados sin él. |
| `packages/db/scripts/dividir-dotacion.ts` | Migración manual de puestos; mismo requisito. |
| `packages/db/scripts/diagnostico-portales.ts` | Lectura cross-tenant; mismo requisito, no informa falsamente «sin incoherencias». |
| `packages/auth/scripts/seed-{platform-owner,inspector-e2e,multiempresa-e2e,e2e-mfa}.ts` | Identidad sin RLS y, según script, membresías: mismo requisito para datos de tenant. |
| `packages/capabilities/scripts/rotar-kek.ts` | Recorre secretos cross-tenant: requiere mantenimiento explícito, nunca app. |
| `packages/db/scripts/set-app-role-password.ts` y Prisma migrate | DDL con propietario/administrador; las migraciones de datos requieren BYPASSRLS confirmado o verificar filas afectadas. |
| Entornos de tests DB/auth/capabilities y fixtures E2E con `DATABASE_URL_MIGRATE` | Solo PostgreSQL local/CI, superusuario de prueba existente; no despliegue remoto. |
| Crons trabajos/programador, jobs, outbox, consumos, retención y auditoría | Enumeran `tenantsOperables()` (tabla global) y operan mediante forTenant/enTransaccion; no dbAdmin ni bypass. |
| `migrar-https` | No existe en esta rama; no se afirma verificación de un script externo. |

## Migración y preflight (Carlos)

Aplicar solo vía PR con etiqueta **migracion-pendiente**, pendiente de aplicación
por Carlos en Neon dev/main. La migración recorre pg_policies con identificadores
escapados y es idempotente; no borra filas, políticas ni migraciones. Puede tomar
locks de tablas: planificar aplicación fuera de escrituras largas.

Antes de correr scripts de mantenimiento, comprobar en esa conexión:

```sql
SELECT current_user, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname = current_user;
-- Para scripts cross-tenant: rolbypassrls=true (o superusuario local de tests).
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'opai_app';
-- Deben ser ambos false.
```

Verificación después de aplicar (cero filas):

```sql
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname !~ '^pg_'
  AND n.nspname <> 'information_schema'
  AND EXISTS (SELECT 1 FROM information_schema.columns a
    WHERE a.table_schema = n.nspname AND a.table_name = c.relname
      AND a.column_name = 'tenant_id')
  AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity OR NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname
      AND p.tablename = c.relname AND p.policyname = 'tenant_isolation'));
```

No se automatiza reversión: retirar FORCE requiere autorización humana y reabre
el riesgo del dueño. El código anterior que dependía del dueño sin bypass no es
compatible con scripts cross-tenant; usar el preflight, no desactivar RLS.

## Criterios de aceptación

- Bloque 0: merges normales del padre y main, sin reescritura.
- Bloque 1: inventario anterior; compatibilidad condicionada al rol explícito de
  mantenimiento, configuración remota pendiente de Carlos, no verificada en Neon.
- Bloque 2: migración FORCE para todas las políticas existentes, reaplicación
  e aislamiento del dueño probados en PostgreSQL local.
- Bloque 3: sin API `globales()` ni delegados públicos; funciones mínimas y lint.
- Bloque 4: barrido de todos los esquemas, exige ENABLE + FORCE + política;
  `test:db` falla sin base (script existente y guard adicional del entorno).
- Documentación: nota ADR-002, reglas y estado; ROADMAP sin cambio de plan.
- Gate y autorrevisión: evidencia final en PR-BODY.md local (sin commit). CI,
  revisión externa y aplicación remota no se declaran completadas por el constructor.

## Riesgos que no cambia este encargo

La atomicidad global de Plataforma y la actualización concurrente de versiones
de precios/ajustes siguen con las limitaciones existentes; este cambio no añade
un flujo de escritura ni pretende resolverlas. Ninguna UI, permiso, pantalla,
presupuesto de JS ni diseño cambia. El DS de OPAI 2.0 permanece intacto.

## Continuación y autorrevisión con Codex

Codex conserva las 19 capturas de teléfono heredadas sin commitearlas: no hay
cambio visual intencional en este encargo. Corrige el harness de ESLint para que
los casos válidos también se evalúen y separa las suites de Postgres de los
unitarios: `pnpm test:db` mantiene db, capacidades DB y auth completos;
`pnpm test` conserva el descubrimiento de paquetes y prueba las lecturas globales
sin conexión. Se limita a dos workers para reducir presión de memoria local.
La prueba FORCE prepara explícitamente su base y no depende del orden de archivos.
Estas son adaptaciones técnicas de Codex, sin nuevas decisiones de Carlos.


## Revisión 5672596436

Codex incorpora reversión comentada desde pg_policies, preservando FORCE previo
de gasto_agente_mes y auditoria_cabezas; restaura las tres funciones DEFINER con
search_path original. La prueba contrasta una lista fija de 50 tablas y verifica la reversión.
La prueba existente ya usa un dueño temporal miembro de opai_app, NOBYPASSRLS.
Se precisa BYPASSRLS de neondb_owner y la regla de migraciones de datos, según el
encargo, sin nuevas decisiones de negocio. Los CA anteriores conservan su alcance;
CI, revisión externa y aplicación en Neon siguen pendientes.

## Revisión 5672843372

Codex renombra la migración a `20261028170000_force_rls` para situarla después
de la migración del #76 y fija en la prueba las 50 tablas de la reversión histórica.
La lista no depende de futuras tablas. Son correcciones técnicas del encargo.
