# Finanzas · Ventas (DTE) — especificación PR 1

Refs CAR-137, CAR-102, Brief 22 (encargo Linear), diseño `docs/2.0/diseño/export-finanzas-ventas-banca-v3/` (#177).

## Alcance PR 1 (entra)

| # | Entrega |
|---|---------|
| 1 | Emisión DTE factura afecta (33), exenta (34) y nota de crédito (61) con referencia, desde cuenta o instalación y, si está, cotización CPQ aceptada |
| 2 | Folios (CAF) por tenant y tipo: carga, consumo atómico sin repetir; aviso si quedan ≤ umbral % del rango (20 % por defecto, `dte_config.umbral_folios_pct`) o si el CAF vigente vence dentro de N días (30 por defecto, `dte_config.aviso_caf_dias`); no emitir con CAF vencido |
| 3 | Adaptador SII detrás de interfaz; firma con certificado del tenant (secreto cifrado); envío y consulta; certificación por defecto; SII simulado en tests |
| 4 | Libro de ventas, estados DTE (borrador, enviado, aceptado, rechazado, anulado_nc) y cobro básico (pendiente, pagada_parcial, pagada) |
| 5 | PDF del DTE con timbre PDF417 (representación en PDF mínimo PR 1) y DS 2.0 en pantallas |
| 6 | Contrato `IngresoProyectadoDesdeDte` para flujo de caja (CAR-136 consume) |
| 7 | Modelo cesión (AEC) reservado en columnas, sin construir factoring |

## Fuera de PR 1

Programación/cierre de mes, cobranza, banca, factoring, integraciones UI, nota de débito 56, envío de correo (Comunicaciones), RCV compras, asientos contables.

## Permisos (ADR-016)

| Permiso | owner/admin | gerente/supervisor/viewer |
|---------|-------------|---------------------------|
| `finanzas:read` (libro ventas) | sí | no |
| `finanzas:ventas.manage` | sí | no |

## Capacidades

`finanzas.ventas.{listar,obtener,libro_resumen,crear_borrador,emitir,enviar_sii,emitir_nota_credito,proyeccion_flujo,pdf}`, `finanzas.folios.{listar,cargar_caf}`, `finanzas.dte_config.{obtener,actualizar}` — todas con `preview_` en escrituras.

Emitir y enviar al SII: `dryRun`, `exigeAprobacion` para agentes.

## Migración

`20261102170000_finanzas_ventas_pr1` — aditiva, reversible, **no aplicada** en este PR.

## TODO(decisión Carlos)

- Certificado digital del tenant y postulación al ambiente de certificación del SII (credenciales reales).
- Activar ambiente `produccion` en configuración DTE.
- Adaptador SII productivo (SimpleAPI u otro) tras certificación.
