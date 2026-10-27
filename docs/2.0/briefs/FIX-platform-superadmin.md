# Corrección urgente: acceso global a Plataforma

## Encargo y alcance

Encargo de Carlos entregado en esta sesión: revisar H1–H3 del informe
`/workspace/qa/pr59/informe-live.md`, tras el merge del PR #59. Continuación
en `fix/platform-superadmin`, sin cambiar `autorizacion.ts` (trabajo paralelo
`core/portal-sesion`). El encargo no incluye un ID de Linear; no se inventa.

## Implementación y criterios de aceptación

- **H1:** guarda compartida de servidor y shell: Plataforma admite únicamente
  `owner` o `support` globales (ADR-016), con o sin empresa. El rol del tenant
  y una entrada `platform` en la membresía no conceden acceso. Un rol ausente
  o desconocido se deniega antes de cargar datos, opciones o hijos.
- **Pruebas obligatorias:** e2e con sesión real para Empresas y rechazo sin rol
  global en 375, 1024 y 1280; comprueba cabecera, navegación y «Más» en móvil.
- **H2:** el DS aprobado sitúa el título móvil en el contenido, no en TopBar
  (`DISENO.md` §4, ADR-014/050). Empresas usa `ListScreen`; Inicio conserva el
  saludo. No se cambia la TopBar ni se introduce un diseño nuevo.
- **H3 (parcial, opcional):** con acceso a Trabajador se conserva Inicio y se
  agrega cobertura e2e. El estado vacío del DS se evaluó, pero se difiere:
  su importación directa excedió el presupuesto de 15 rutas y con carga
  diferida aún excedió el de Laboral (165,1/165 KB). No se suben topes ni se
  amplía este arreglo urgente con optimizaciones de otras pantallas.

## Límites y decisiones técnicas

OpenCode aplica el encargo y los ADR existentes, sin nuevas decisiones de
negocio. En `origin/main`, la guarda de servidor ya distinguía Plataforma;
por eso no se da por demostrada la hipótesis sobre la causa de producción.
Este cambio endurece la validación de roles y elimina la duplicación con el
shell. La reproducción local verifica el resultado con datos reales, pero
no sustituye la QA posterior en `test.opai.cl` con la sesión afectada.

No se cambian consultas, escrituras, permisos de capacidades, migraciones,
topes de JS ni workflows. No depende de integrar otra rama.

## Verificación

Gate requerido: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`,
`pnpm build`, `pnpm presupuesto` y e2e `platform-superadmin.spec.ts` /
`portales-riel.spec.ts`. Resultado final y riesgos en `PR-BODY.md` local.
Servidor propio en puerto 3107, con directorio del proceso verificado.
Verificación final tras el merge de `main` (#62): 775 tests y `test:db`
(63 + 49 + 6) en verde; build y presupuesto en verde, sin subir topes.
Los e2e finales se ejecutan contra `next start` propio en 3108, con el
directorio del proceso confirmado y el servidor de desarrollo detenido.
Resultado: 18/18 e2e en verde contra el build de producción local.
Evidencia de Empresas y rechazo sin rol global en
`docs/2.0/qa/platform-superadmin/` (375/1024/1280 según la captura).
