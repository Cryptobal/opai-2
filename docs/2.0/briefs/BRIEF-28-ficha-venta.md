# BRIEF-28 · Finanzas: ficha de venta operable (F2 · CAR-155)

**Origen:** [auditoría de Finanzas y Rendiciones](../auditoria-finanzas-rendiciones-2026-11.md) §1.3 y §6 (F2). La ficha de un documento emitido era de solo lectura: para anular, enviar al SII, ceder o mandar la factura al cliente había que ir por MCP.
**Rama:** `brief/car-155-finanzas-ficha-venta` (apilada sobre `brief/car-159-finanzas-recurrentes`, #243) · **Tarea:** `Fixes CAR-155`.

## 1. Objetivo
Que desde la ficha de `/finanzas/ventas/[id]` se pueda descargar el PDF, enviar al SII, emitir una nota de crédito (total o parcial), ceder con simulación previa y **enviar el documento al cliente por correo** con PDF y XML, dejando historial.

## 2. Estado actual (verificado)
- Capacidades ya expuestas: `finanzas.ventas.pdf|enviar_sii|emitir_nota_credito|cesion_simular|cesion_ceder`. La pantalla no las llamaba.
- No existía envío al cliente ni el mailer aceptaba adjuntos ni copia.
- Contactos con `roles` (incluye `facturacion`), `esPrincipal` y `estado`.

## 3. Alcance
**Entra:** capacidad `finanzas.ventas.enviar_cliente` (irreversible, con `dryRun`, aprobación para agentes) y `finanzas.ventas.envios` (lectura); tabla `finanzas.documentos_emitidos_envios`; evento comunicable `finanzas.venta.enviada_cliente` (transaccional); adjuntos y copia en el mailer; acciones y historial en la ficha.
**No entra:** plantilla de correo editable por pantalla (usa la de ADR-020), envío automático al emitir, portal del cliente.

## 4. Arquitectura
- Destinatarios: contactos activos de la cuenta con rol `facturacion` y correo. El principal (o el más antiguo) va en «para»; los demás, en copia. Sin contactos, error con instrucción. Correos deduplicados en minúsculas.
- Solo documentos emitidos con folio y timbre en estado `enviado` o `aceptado`. Un segundo envío exige `reenviar: true`.
- Si el correo falla queda un registro `fallido` con el motivo; el documento no cambia.
- PDF compartido con `finanzas.ventas.pdf` (`pdfDeDocumento`). El XML sale del almacenamiento, o el de prueba con el SII simulado.

## 5. Archivos
`packages/capabilities/src/finanzas/ventas-enviar-cliente.ts`, `ventas-envios.ts`, `ventas-pdf-doc.ts`; `packages/domain/src/comunicaciones/finanzas.ts`; `packages/integrations/src/email/*`; migración `20261104120000_finanzas_documentos_envios_cliente`; `apps/web/app/(erp)/finanzas/ventas/_componentes/{acciones-venta,hoja-nota-credito,hoja-ceder,historial-envios}.tsx`.

## 6. Modelo de datos
`finanzas.documentos_emitidos_envios` (tenant_id, documento_id, destinatarios[], adjuntos[], estado enviado|fallido, error, enviado_por). Aditiva, RLS FORCE, política `tenant_isolation`, trigger `mismo_tenant`.

## 7. Capacidades
`finanzas.ventas.enviar_cliente` (+ `preview_`), `finanzas.ventas.envios`. Paridad MCP actualizada (instantánea e inventario).

## 8. Interfaz
Botones según estado; hojas laterales para nota de crédito y cesión; diálogo de confirmación de reenvío; historial con estado. Solo componentes de `@opai/ds`.

## 9. Seguridad y tenant
RLS en la tabla nueva; todas las lecturas por `ctx.db`; el permiso es `finanzas:ventas.manage` para enviar y `finanzas:read` para el historial; test de aislamiento entre dos empresas.

## 10. Casos límite
Borrador; sin contactos de facturación; reenvío; correo caído; nota de crédito (no se cede); documento de otra empresa (NOT_FOUND).

## 11. Plan por bloques
1) mailer con adjuntos; 2) evento comunicable; 3) migración y modelo; 4) capacidades; 5) paridad MCP; 6) UI de la ficha; 7) test de base; 8) brief y ESTADO.

## 12. Tests
`email.test.ts` (adjuntos y copia), `finanzas-ventas-envio-cliente-db.test.ts` (4 casos), paridad MCP.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`. Capturas 375/1024/1280 quedan para la QA en vivo (sin ventana redimensionable en esta sesión).

## 14. Criterios de aceptación
Se envía con PDF y XML; copia solo a facturación; el reenvío pide confirmación; el historial muestra éxitos y fallos; otra empresa no ve nada; paridad en verde.

## 15. Riesgos y rollback
Migración aditiva (reversión documentada en el SQL). Riesgo: contactos sin rol `facturacion` no reciben nada hasta que se cargue el rol. Revertir el PR deja la tabla sin uso.

## 16. Reporte de ejecución
Ver la descripción del PR.
