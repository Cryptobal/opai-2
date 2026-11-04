# Brief — Movimientos del banco en línea vía Web4Leads

**Rama:** `brief/car-web4leads-bancos` · **Autor:** Claude · **Fecha:** 4-nov-2026 · **Migración:** `20261105150000_finanzas_banco_web4leads` (aditiva)

## 1. Objetivo
Que los movimientos del banco lleguen solos a Finanzas › Bancos, sin subir cartolas, usando Web4Leads (que administra Carlos y ya se conecta a Fintoc) como puente. OPAI no guarda credenciales del banco ni integra Fintoc directo (ver ADR-064).

## 2. Estado actual (verificado)
- Bancos hoy solo importa cartolas (Santander o CSV) con deduplicación por huella `fecha|monto|GLOSA` y saldo posterior.
- 1.0 recibe el webhook de Web4Leads en `/api/inbound/web4leads/[key]` con firma HMAC-SHA256 (`x-web4leads-timestamp`, `x-web4leads-signature`, ventana de 300 s).
- El catálogo de integraciones marcaba «Fintoc» como próximamente.

## 3. Alcance
Entra: receptor firmado por empresa, capacidad de sincronización idempotente, dedupe compatible con la cartola, saldo y hora de la última sincronización, indicador en pantalla, integración «Banco (Web4Leads)» con secreto cifrado por empresa.
No entra: aviso al administrador por cuenta no reconocida (hoy se ignora y se responde 200), pantalla de revisión de sospechosos, cartola por correo, adaptador Fintoc directo.

## 4. Arquitectura
Web4Leads → `POST /api/t/<slug>/banco/web4leads` (misma carga y firma que 1.0) → capacidad interna `finanzas.bancos.recibir_web4leads` (verifica firma con el secreto cifrado de la empresa) → `finanzas.bancos.sincronizar` (también herramienta MCP, con `dryRun`) → una transacción: inserta con `skipDuplicates`, actualiza cuenta y emite `finanzas.banco.movimientos_sincronizados`.

## 5. Archivos
`packages/domain/src/finanzas/bancos/web4leads.ts` (firma, normalización, plan de dedupe) · `modules/finanzas/capacidades/bancos/{sincronizar,sincronizar-aplicar,recibir-web4leads}.ts` · `apps/web/app/api/t/[slug]/banco/web4leads/route.ts` · `packages/integrations/src/catalogo-extra.ts` · pantalla Bancos (indicador) · listas de paridad y snapshot MCP.

## 6. Modelo de datos y migraciones
`finanzas.movimientos_bancarios.id_externo` (único por tenant+cuenta+id_externo), `finanzas.cuentas_bancarias.ultima_sync_en` y `saldo_banco`. Todo aditivo, con `lock_timeout`; RLS ya vigente en ambas tablas.

## 7. Capacidades
`finanzas.bancos.sincronizar` (escritura, permiso `finanzas:bancos.gestionar`, dryRun, idempotencyKey) y `finanzas.bancos.recibir_web4leads` (interna, solo la invoca la ruta con actor de sistema). `finanzas.bancos.listar` suma `ultimaSyncEn` y `saldoBanco`.

## 8. Interfaz
Una línea bajo el nombre de la cuenta en Bancos: «Sincronizado con el banco el <fecha> · saldo <monto>». Sin diseño nuevo; usa los estilos `t-*` existentes.

## 9. Seguridad y tenant
El tenant sale del slug de la URL y la firma se verifica con el secreto de esa empresa (cifrado, nunca sale por API). Rate limit por slug+IP que falla cerrado, cuerpo máx. 1 MB, ventana anti-replay de 300 s. Firma inválida = 401 sin importar nada. Mismo número de cuenta en dos empresas no se cruza (test).

## 10. Casos límite
Cuenta no reconocida → 200 `skipped`. Número duplicado entre bancos → desempata por código de banco; si sigue ambiguo, error de negocio. Remuneraciones → estado `por_autorizar`. Movimiento ya cargado por cartola → duplicado (huella + saldo como árbitro). Misma huella con otro saldo → se marca sospechoso, no se descarta en silencio.

## 11. Plan por bloques
1 dominio (firma y dedupe) · 2 capacidades + ruta + migración · 3 pruebas de base y MCP · 4 indicador en pantalla · 5 brief, ADR y ESTADO.

## 12. Tests
8 unitarios de dominio; 5 de base (firma inválida, importación + idempotencia + aislamiento, dedupe contra cartola, sospechoso/cuenta desconocida, remuneración y dryRun); paridad e inventario MCP.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build` + `pnpm presupuesto`.

## 14. Criterios de aceptación
Webhook firmado importa y es idempotente; firma inválida no importa nada; no hay cruce entre empresas; la cartola posterior no duplica; el indicador aparece tras sincronizar.

## 15. Riesgos y rollback
Riesgo: Web4Leads sigue apuntando a 1.0 hasta que Carlos cambie la URL y cree el secreto en Integraciones (no se toca el webhook de producción de 1.0). Rollback: quitar la URL en Web4Leads; las columnas son aditivas y quedan inertes.

## 16. Reporte de ejecución
Ver la descripción del PR.
