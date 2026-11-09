# PROPUESTA — CAR-218 · Prospecto con acceso limitado y ciclo archivar / enviar / ganar

**Estado:** propuesta para Carlos. No se escribe código ni migración hasta su OK. **Autora:** sesión «Comercial · Code». **Fecha:** 9-nov-2026.
**Insumos:** diseño «Portal B · Prospecto con acceso limitado» del lienzo (privado), `docs/2.0/briefs/BRIEF-16-portal-cliente.md` (§3, pantalla 13) y las decisiones ya cerradas (P1, ciclo del Portal).

## 1. Qué decidió Carlos (no se reabre)

- **P1:** el prospecto con acceso limitado ve **solo la propuesta recién enviada**: cotización en PDF y propuesta técnica en un PDF con capítulos por instalación. Sin menú de secciones.
- **Ciclo:** archivar bloquea el acceso; **enviar** (no crear) una propuesta lo restaura; ganar activa el acceso completo; el historial se conserva; **nunca** se reactivan accesos suspendidos o revocados a mano.

## 2. Qué hay hoy en `main` (verificado)

- `accesoDelActor` (`packages/capabilities/src/portal-cliente/comun.ts`) es la puerta de todas las capacidades del portal. Es **fail-closed**: sin fila `portal_cliente.accesos` en estado `activo`, o con la cuenta `cliente_inactivo`, niega todo.
- La fila de acceso no distingue «limitado» de «completo»: un acceso activo ve las instalaciones habilitadas y todo el portal.
- `portal_cliente.contactos.dar_acceso` ya vincula o invita a un contacto sin habilitar instalaciones (PR #432 trae su UI).
- No existe una capacidad que entregue «la propuesta recién enviada» a un usuario del portal ni un estado de acceso que dependa del ciclo de la propuesta.

## 3. Propuesta de servidor

### 3.1 Datos (migración **aditiva**, un solo PR)

1. `portal_cliente.accesos.alcance` `text not null default 'completo'` con `check in ('completo','limitado')`. Los accesos existentes quedan en `completo`: **sin cambio de comportamiento**.
2. Tabla nueva `portal_cliente.acceso_propuestas` (`tenant_id`, `acceso_id`, `cotizacion_id`, `enviada_en`, `vigente_hasta`, `estado` `vigente | reemplazada | archivada`, `created_at`, `updated_at`): historial de las propuestas visibles para ese acceso. Con RLS `ENABLE` + `FORCE`, política `tenant_isolation` y el trigger `mismo_tenant` que ya usa el módulo. La propuesta **vigente** es la última enviada; las anteriores quedan como historial, no se borran.

Rollback: ambas piezas son aditivas; basta con dejar de usarlas (el alcance por defecto es `completo`). Plan de migración: snapshot de `main` y rama de respaldo de `dev` por OPAI, `lock_timeout` corto, verificación posterior, como en #408.

### 3.2 Puerta y capacidades

- `accesoDelActor` pasa a devolver `alcance`. Un acceso `limitado` **no** habilita las capacidades del portal completo (resumen, cobertura, documentos…): solo la nueva lectura.
- **Nueva lectura** `portal_cliente.prospecto.propuesta` (portal `cliente`, alcance fail-closed): devuelve la propuesta vigente del acceso (cotización y propuesta técnica con URLs firmadas de corta vida), su fecha de envío y vigencia, y el estado (`vigente`, `vencida`, `pausada`). Contenido de terceros marcado como externo.
- Descarga por la capacidad de documentos del núcleo (ADR-019), con **lectura auditada** de los IDs revelados.
- Todas con espejo MCP (paridad, ADR-055).

### 3.3 Ciclo (sin tocar accesos suspendidos o revocados)

| Evento | Efecto en el acceso `limitado` |
|---|---|
| **Enviar** una propuesta a un contacto | Si el acceso está `activo`: registra la propuesta como vigente (la anterior pasa a `reemplazada`). Si el contacto no tiene acceso: se crea o se invita con alcance `limitado`. Si estaba **bloqueado por archivado**: se restaura. Si fue **suspendido o revocado a mano**: **no se toca**. |
| **Archivar** el negocio / propuesta | Marca la propuesta `archivada`; sin propuesta vigente el acceso muestra «Acceso pausado» (mensaje neutro, sin datos de la empresa). La fila de acceso no cambia de estado manual. |
| **Ganar** | La cuenta pasa a cliente activo y el acceso `limitado` se convierte en `completo`, solo para los accesos que estaban activos. |
| **Vencer** | El estado se calcula al leer (`vigente_hasta`): «Vencida», sin tarea programada. |

Distinguir «bloqueado por archivado» de «suspendido a mano» exige que el bloqueo **no** use el estado manual del acceso: por eso el bloqueo se deriva de `acceso_propuestas` y no de `accesos.estado`.

## 4. Pantallas

- **Portal (nuevo, tras el OK):** la pantalla del diseño «Portal B»: encabezado con la empresa, dos tarjetas con «Descargar PDF», mensaje «Tu acceso completo se activa cuando aceptes el servicio», estados Vencida, Acceso pausado, Cargando (skeleton) y Error con Reintentar. Mobile primero.
- **ERP:** sin pantalla nueva; la tarjeta «Contactos y acceso al portal» ya existente muestra el alcance.

## 5. Qué necesito de Carlos

1. **OK a la migración aditiva** de §3.1 (con el plan de snapshot de OPAI).
2. **¿«Enviar a un contacto sin acceso» crea la invitación sola, o solo se ofrece «Dar acceso»?** Recomiendo que cree la invitación con alcance `limitado`, porque es el flujo que el diseño asume; el envío real sigue sin hacerse en pruebas (solo `dryRun` o tu correo).
3. Confirmar que **ganar** convierte solo los accesos activos a `completo` (recomendado) y no reactiva ninguno suspendido o revocado.

## 6. Cortes sugeridos (cada uno comprobable)

1. Migración + puerta (`alcance`) + tests de base real con rol sin BYPASSRLS. Sin cambio visible.
2. Lectura `portal_cliente.prospecto.propuesta` + auditoría + espejo MCP.
3. Enganche del ciclo (enviar / archivar / ganar) con pruebas de que suspendido y revocado no se reactivan.
4. Pantalla del portal, con revisión visual en 375, 1024 y 1280, claro y oscuro, en un tenant de QA aislado.

## 7. Fuera de alcance

Valores por defecto del portal por cuenta (PR 2, otra propuesta), envíos reales, datos de Gard, OPAI 1.0.
