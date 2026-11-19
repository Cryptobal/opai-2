# Next.js 16.4.5 · actualización de seguridad

Base auditada: main 651d208a845c0465a23921742bb38762437df7bd, 18-nov-2026.
Se actualizan next y eslint-config-next en web, next de desarrollo en auth,
16.4.2 → 16.4.5, y su lockfile.
No se desactiva SecurityFatalError, ni se modifican flags de seguridad, auth,
permisos, base de datos o migraciones. No cambia React 19.3 ni Node 22 del proyecto.

## Evidencia oficial

[Release oficial v16.4.5](https://github.com/vercel/next.js/releases/tag/v16.4.5),
publicado el 3-nov-2026, corrige siete advisories Moderate. No implica que
las siete condiciones sean explotables en OPAI. 16.4.2 está en los rangos afectados.

- [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h): cache entre root params al combinar use cache y unstable_cache.
- [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8): dependencias tardías de root params en caches anidadas.
- [GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj): colisión de claves con argumentos binarios en use cache.
- [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf): shells fallback compartidos en self-hosted con Cache Components y sin Partial Prefetching.
- [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385): framing de respuestas upstream reenviadas en self-hosted tras proxy HTTP/1.1.
- [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2): bypass del rechazo SVG del optimizador de imágenes self-hosted.
- [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2): cookies HttpOnly expuestas por cabecera interna en rutas Edge.

## Aplicabilidad observada (inspección estática, no prueba de explotación)

`apps/web/next.config.ts` activa cacheComponents y partialPrefetching. La segunda
opción ya satisface el workaround indicado para vvgp; no se cambia.
Búsqueda en código TS/TSX/JS/MJS de apps/packages/modules no encontró directivas
use cache, unstable_cache, next/root-params, imports de next/image ni runtime Edge.
Los tres escenarios use cache y el de cookies Edge no tienen un camino identificado.
El despliegue habitual es Vercel; las condiciones self-hosted de pc58/7qx7 no están
confirmadas. La ausencia de imports next/image no demuestra que el endpoint no exista.
Se actualiza igualmente el framework vulnerable, sin afirmar inmunidad ni usar la
inspección como sustituto del parche o de los controles de integración.

## Validación

- Instalación frozen-lockfile y generación de cliente Prisma: correctas, sin migraciones ni BD.
- 25 pruebas dirigidas en cinco archivos de proxy, cabeceras y caché: correctas.
- ESLint dirigido sobre proxy, configuración y helpers de seguridad/caché: correcto.
- Next 16.4.5 admite Node >=20.9 y React 19; compatible con los pins Node 22/React 19.3 del proyecto. El entorno local de pruebas usó Node 24.22.3.
- Advertencias de peers ESLint 10 de plugins import/react/jsx-a11y ya existían con 16.4.2; no se amplía el alcance para modificarlas.
- Build local arrancó con Next 16.4.5, pero el proceso fue terminado (Killed) durante la compilación. No es un build aprobado.
- Typecheck, test:db, E2E y QA de preview no validados localmente. La suite web amplia no tiene un resultado completo confirmado.
- Revisión independiente de manifests y lockfile: sin cambios de paquetes ajenos al upgrade ni bloqueantes de alcance.

El PR permanece en borrador pendiente de CI/build del SHA publicado y validación de
runtime/preview. No declarar listo, saltar controles ni encolar sin esos resultados.
