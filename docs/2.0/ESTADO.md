# ESTADO — OPAI 2.0

**Última actualización:** 22-oct-2026 (noche) · **Actualizado por:** Claude (arquitectura) · **Fase en curso:** 0 — Fundación

Este archivo es la fuente de verdad del avance. Cada brief lo actualiza al terminar. Si algo no está aquí, no está hecho.

## Hecho

- Decisión de construir OPAI 2.0 desde cero (ver `01-decisiones.md`, ADR-001 a ADR-013).
- Documento de arranque, registro de decisiones, contexto para agentes e instrucciones del proyecto Claude en `docs/2.0/`.
- Brief 00 (Fundación) escrito en `docs/2.0/briefs/BRIEF-00-fundacion.md` y ajustado a ADR-013 (tokens provisionales; no se porta nada de 1.0).
- Decisiones de Carlos del 22-oct registradas: dominios (ADR-011), historial financiero completo a migrar (ADR-010), Prisma sin alternativas (ADR-002), sueldo por RUT como excepción por persona (ADR-005), multi-vertical (ADR-006), Comercial primero (ADR-009), DS 2.0 nuevo y minimalista (ADR-013).
- Design Prompt de fundamentos del DS 2.0 escrito en `docs/2.0/design/DESIGN-PROMPT-ds-2.0-fundamentos.md`.

## En curso

- **Carlos:** preparar la máquina (Node LTS, pnpm, `gh`, `vercel`, `neonctl`, `wrangler` autenticados) y ejecutar el Brief 00 en Claude Code.
- **Carlos:** correr el Design Prompt en Claude Design y traer el export HTML aprobado.

## Pendiente (siguiente)

- Brief 00b — Tokens y estilo definitivos del DS 2.0 a partir del diseño aprobado (solo `tokens.css`, fuentes y variantes; sin tocar estructura).
- Brief 01 — Núcleo mínimo (auth, usuarios, roles y permisos, tenants y Plataforma mínima, módulos y entitlements, cuentas, contactos, instalaciones, cargos y estructuras, archivos y PDF, configuración declarativa, MCP con API keys, telemetría, selector de portal).
- Extracción de 1.0 para Comercial y CPQ → `docs/2.0/extraccion/`.
- Modelo de planes y facturación de suscripciones: cuando exista Opai SpA (en creación, próximos días).

## Versiones instaladas

(se completa en el Brief 00)

## Infraestructura

- Repositorio: `Cryptobal/opai-2`, rama `main`.
- Vercel: (se crea en el Brief 00, bloque 9, desde la máquina de Carlos)
- Neon: (se crea en el Brief 00, bloque 9, desde la máquina de Carlos)
- Dominio: `test.opai.cl` (construcción) · `app.opai.cl` (producción, futuro)
- Tenant de desarrollo: `gard` — id: (se completa en el Brief 00)

## Decisiones tomadas durante la ejecución

(ninguna aún)

## Riesgos y pendientes materiales

- El diseño del DS 2.0 aún no está aprobado; el Brief 00 avanza con tokens provisionales y el reemplazo es el Brief 00b. Ningún módulo de negocio se diseña hasta tener el DS aprobado.
