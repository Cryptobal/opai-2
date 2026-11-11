# Novedades de producto (changelog in-app)

Cada **cambio visible o de diseño** que se integra a `main` —aunque todavía solo esté en `test.opai.cl` y no vaya a producción— debe traer un archivo Markdown en
`packages/domain/src/novedades/entradas/`, con nombre `YYYY-MM-DD-slug.md`.

## Frontmatter obligatorio

```yaml
---
id: slug-unico-estable
fecha: 2026-11-09
modulo: core # o comercial, finanzas, cpq, documentos, pauta, tickets, plataforma…
titulo: Título corto para el usuario
destacada: false # true solo si merece un aviso al entrar (con moderación)
car: CAR-123 # opcional, referencia Linear
permiso: finanzas:cobranza.read # opcional; si falta, cualquier usuario del módulo la ve
ruta: /finanzas/cobranza # opcional; botón «Ver en OPAI»
imagen: /changelog/ejemplo.png # opcional; archivo en apps/web/public/changelog/
---
```

Debajo del cierre `---` va el texto para usuarios **no técnicos**: qué cambió y para qué les sirve (Markdown simple: párrafos y negritas; **no** hay una ficha aparte por entrada como en Notion).

En la app, cada ítem aparece como **tarjeta en la página Novedades** (fecha, módulo, título y cuerpo completo). Si el frontmatter trae `ruta`, el botón **Ver en OPAI** lleva a esa pantalla; no se abre otra página de detalle.

## Qué no publicar

- Refactors internos, CI, migraciones sin pantalla, cambios solo MCP sin impacto visible.
- Funciones que aún no están en `main`.

## Flujo

1. El PR que integra el cambio visible **añade o actualiza** el `.md` en el mismo PR y corre `pnpm --filter @opai/domain gen:novedades-embed` (actualiza `entradas/embed.ts` para el despliegue en Vercel).
2. Al desplegar, las entradas aparecen solas; el estado «leído» es por usuario en base de datos.
3. El gate de tests valida ids únicos y frontmatter mínimo. Dentro del mismo día las `destacada: true` salen arriba (la fecha no tiene hora).
4. El CI (`.github/scripts/ci-novedad-visual.sh`) avisa, sin bloquear, si el PR toca pantallas o el DS y no agrega ni cambia un `.md` aquí. Si el cambio es solo interno, se ignora el aviso.

El texto debe **describir el cambio visual**: qué botones, hojas o menús aparecen o cambian y dónde.

Ver también `AGENTS.md` (convenciones) y `docs/2.0/CONTEXTO-agentes.md`.
