# BRIEF 00-INFRA — INFRAESTRUCTURA DE test.opai.cl

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `main` · **Fecha:** 23-oct-2026 · **Duración estimada:** 20–30 minutos la primera vez (instalaciones y logins), 10 después

> **Cómo ejecutarlo (Carlos, desde el Mac, sin saber nada de terminales):** la opción más simple es la app de escritorio de Claude, que ya incluye Claude Code: ábrela, entra a la pestaña **Code**, elige una carpeta (por ejemplo `Code` dentro de tu usuario; créala si no existe) y pega el texto de abajo. La alternativa es la Terminal: escribe `claude` y Enter (si no está instalado, antes `curl -fsSL https://claude.ai/install.sh | bash`). En cualquiera de las dos, pega esto tal cual:
>
> *"Prepara mi Mac para OPAI 2.0: instala lo que falte (Homebrew, Node 22, pnpm, gh, vercel, neonctl), haz login en gh, vercel y neonctl deteniéndote para que yo apruebe en el navegador, clona el repo privado Cryptobal/opai-2 en ~/Code/opai-2 y luego lee y ejecuta completo docs/2.0/briefs/BRIEF-00-infra.md."*
>
> Claude Code se detiene en cada login para que apruebes en el navegador (tres veces) y una vez más para el registro DNS en Cloudflare. No tienes que escribir ningún comando.

## 1. Objetivo

Dejar `test.opai.cl` en línea sobre un proyecto Vercel y un proyecto Neon propios de 2.0, con el rol de aplicación `opai_app` y el tenant `gard` creados, sin que ningún secreto pase por chats ni archivos versionados (ADR-011). El código ya existe y pasa el gate (ver `ESTADO.md`); este brief solo configura infraestructura.

## 2. Estado actual del repo (verificado)

El Brief 00 (Fundación) está ejecutado: monorepo, `apps/web` con `/api/health`, `/api/v1` y `/ds`, `packages/db` con migración inicial (rol `opai_app`, RLS), CI en verde. Falta únicamente el bloque de infraestructura, que requiere las cuentas de Carlos.

## 3. Paso 0 · Herramientas y logins (lo hace Claude Code; Carlos solo aprueba en el navegador)

1. Homebrew: `brew --version`. Si falta, **STOP**: pedir a Carlos que pegue en Terminal el comando de instalación de https://brew.sh (pide su contraseña del Mac) y avise cuando termine.
2. Node 22 y pnpm: `brew install node@22 pnpm`; agregar `node@22` al PATH del shell (`~/.zshrc`) y verificar `node --version` (22.x) y `pnpm --version`.
3. CLIs: `brew install gh` y `npm install -g vercel neonctl`. Verificar `gh --version`, `vercel --version`, `neonctl --version`.
4. Login GitHub: `gh auth login --web --git-protocol https`. **STOP:** mostrar a Carlos el código de un solo uso que imprime el comando; él lo ingresa en la página que se abre y autoriza. Confirmar con `gh auth status`.
5. Login Vercel: `vercel login`. Se abre el navegador. **STOP** hasta que Carlos confirme; verificar con `vercel whoami` y `vercel teams ls` (debe aparecer `gard-security`).
6. Login Neon: `neonctl auth`. Se abre el navegador. **STOP** hasta que Carlos confirme; verificar con `neonctl me`.
7. Repo: `mkdir -p ~/Code && gh repo clone Cryptobal/opai-2 ~/Code/opai-2 && cd ~/Code/opai-2 && pnpm install`. Verificar que `pnpm typecheck` pasa.

`wrangler` no se usa en este brief (R2 llega con el Brief 01).

## 4. Plan

Todo desde CLIs autenticadas. Ningún secreto se imprime ni se escribe en archivos versionados. Las URLs de conexión viven solo en variables del shell y en `.env.local` (ignorado por git).

### Paso 1 · Neon

1. `neonctl regions list`; elegir `aws-sa-east-1` si existe, si no `aws-us-east-1`.
2. `neonctl projects create --name opai-2 --region <region>`; crear la rama `dev` además de `main`.
3. Para cada rama (`main` y `dev`): obtener la URL **directa** del rol propietario con `neonctl connection-string` y aplicar la migración inicial: `DATABASE_URL_MIGRATE=<url> pnpm db:deploy`.
4. Generar la contraseña del rol de aplicación: `export OPAI_APP_DB_PASSWORD=$(openssl rand -base64 32)` y fijarla en cada rama: `DATABASE_URL_MIGRATE=<url> pnpm --filter @opai/db role:password`.
5. Construir la URL **pooled** del rol `opai_app` para cada rama (mismo host con `-pooler`, usuario `opai_app`, la contraseña generada, misma base) y guardarla en el shell como `OPAI_DB_URL_MAIN` y `OPAI_DB_URL_DEV`.
6. Crear el tenant de desarrollo en ambas ramas: `DATABASE_URL_MIGRATE=<url> pnpm --filter @opai/db seed:dev-tenant` (imprime `DEV_TENANT_ID`; no es secreto).
7. Verificar el aislamiento contra `dev`: `DATABASE_URL_TEST=<url directa de dev> pnpm test:db` debe quedar en verde.
8. Escribir `.env.local` en la raíz con `DATABASE_URL=$OPAI_DB_URL_DEV`, `DATABASE_URL_MIGRATE=<url directa dev>`, `DATABASE_URL_TEST=<url directa dev>`, `DEV_TENANT_ID=<id>`, `OPAI_APP_DB_PASSWORD=<contraseña>`. Confirmar que `git status` no lo muestra.

### Paso 2 · Vercel

1. Desde `apps/web`: `vercel link` creando el proyecto `opai-2` en el equipo `gard-security`; root directory `apps/web`. Luego `vercel git connect` a `Cryptobal/opai-2`.
2. Variables (leídas desde el shell por stdin, nunca por argumento): `DATABASE_URL` en `production` y `preview` con `$OPAI_DB_URL_MAIN`; `DEV_TENANT_ID` en `preview` con el id del tenant. **No** agregar `DATABASE_URL_MIGRATE` a Vercel.
3. `vercel deploy --prod` desde `apps/web`. Verificar `https://<url-del-deploy>/api/health`.

### Paso 3 · Dominio

1. `vercel domains add test.opai.cl`. El comando indica el registro DNS necesario.
2. **STOP:** imprimir el registro exacto (nombre, tipo, valor) y pedir a Carlos que lo agregue en Cloudflare como **DNS only** (nube gris). `opai.cl` está en Cloudflare (`amy`/`julian.ns.cloudflare.com`) y `www.opai.cl` ya apunta a Vercel de la misma forma.
3. `vercel domains inspect test.opai.cl` hasta que esté activo. Verificar `https://test.opai.cl/api/health` y que `https://test.opai.cl/` muestra el shell; `/ds` debe responder 404 en producción.

### Paso 4 · Estado

Actualizar `docs/2.0/ESTADO.md`: sección Infraestructura (proyecto Vercel, región Neon, ramas, id del tenant `gard`), pendientes y cualquier decisión tomada. Commit `infra: test.opai.cl en línea sobre Vercel y Neon` y push.

## 5. Criterios de aceptación

- [ ] Neon `opai-2` con ramas `main` y `dev`, migración aplicada en ambas, rol `opai_app` sin `BYPASSRLS` con contraseña fijada.
- [ ] `pnpm test:db` en verde contra `dev`.
- [ ] Vercel `opai-2` conectado al repo, root `apps/web`, `DATABASE_URL` (opai_app, pooled) en production y preview.
- [ ] `https://test.opai.cl/api/health` responde `ok: true`; `/` muestra el shell; `/ds` 404.
- [ ] Ningún secreto en el repo ni en la salida de la consola; `.env.local` ignorado.
- [ ] `ESTADO.md` actualizado.

## 6. Riesgos

- Si `vercel link` pregunta por un proyecto existente, no reutilizar el de OPAI 1.0: crear `opai-2`.
- Si la rama `dev` de Neon no existe, crearla con `neonctl branches create --name dev` antes del paso 1.3.

## 7. Instrucción final para Claude Code

Ejecuta este brief paso a paso. No imprimas secretos ni los escribas en archivos versionados. Detente solo en los puntos marcados **STOP**. Al terminar informa: qué quedó creado (proyecto Vercel, proyecto y ramas Neon, dominio), el id del tenant `gard`, las verificaciones realizadas y qué pendiente queda.
