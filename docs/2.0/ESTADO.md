# ESTADO — OPAI 2.0

**Foto de código verificada en `origin/main`: `45f19cf58d576a2f03c3d074aac7017ce7462793`** (30-oct-2026). Un PR citado acredita su integración en el historial de esa referencia, no el estado de despliegues ni de migraciones en Neon. `main` puede avanzar: actualizar esta foto en cada PR (ADR-054). Linear es referencia de tareas. El plan está en [ROADMAP](ROADMAP.md), las decisiones en [ADR](01-decisiones.md) y el flujo en [OPERACION-agentes](OPERACION-agentes.md).

## Integrado y pendiente

- **Paridad B1 — bloqueo de login persistente:** Brief 07c PR 1 (#46) y endurecimiento CAR-16 (#57); rate limit compartido en Postgres y MCP por cabecera (#64), con respaldo en memoria si falla la base salvo mutaciones sensibles cerradas. No confundir este B1 con el seguimiento de conexiones de Neon (#134–#138 y #142). Rastro de seguridad de identidad: #131. El resultado operativo en vivo del último ajuste requiere comprobación; integrar código no demuestra su despliegue.
- **B2 — roles y permisos:** roles personalizados (#47), equivalencias y matriz de roles/excepciones (#106). La equivalencia para migración y sus límites se documentan en [paridad/equivalencia-roles.md](paridad/equivalencia-roles.md).
- **B3 — alcance:** filtro del supervisor por instalación (#51), vínculo laboral con instalación (#89), pantalla de asignación (#105) y alcance de Negocios (#110). El positivo de supervisor con vínculo ya no está aplazado: #89 y #93. El alcance de los portales Cliente y Trabajador sigue sujeto a sus briefs; no se declara cerrada toda la paridad de portales.
- **B4 — Ley 21.719:** DPA/RAT, consentimientos y solicitudes (#56), retención y cifrado (#61), pantallas y cierre del §21 (#107). Quedan limitaciones y validaciones identificadas en el [brief 07d](briefs/BRIEF-07d-ley-21719.md) y su inventario; la integración no acredita cumplimiento legal ni activación operativa. Confirmar el plazo mínimo con el abogado antes de activar retención.
- **Sueldos y CAR-19:** capas de sueldo PR 1 y corrección de rendimiento (#80), protección de cargos sensibles y bonos (#83, #84, #86), retiro del nivel cargo (#87), vínculo laboral (#89), anexo en borrador (#91) y seguimiento (#93). #86 corrigió permisos, auditoría de rechazos y regresiones de sueldos y navegación; #93 trató pendientes del anexo y del vínculo. El detalle histórico y las limitaciones de cada entrega se conservan en el [archivo](ESTADO-archivo.md); no implican que todo el motor de sueldos o la firma estén terminados.
- **Navegación, rendimiento y DS:** Brief 05 aprobado y documentado (#37), cabecera (#40), navegación por áreas (#75), permisos efectivos D2 (#78); rendimiento Brief 03 PR 2 (#42 y #88); PWA base (#45), con cola offline y push diferidos al módulo de terreno. Menu, Dialog, Switch y UserMenu usan primitivas Radix: DS del Brief 02 (commit `c85a92a9`), ajuste visual #54. La configuración de ESLint prohíbe elementos interactivos crudos en `app` y `components` como error.
- **MFA y agente:** TOTP y recuperación (#65, #74, #131); OTP por correo y SSO no se infieren terminados. ADR-049 integrado (#38) y aceptado (#139); proveedores y orquestación del agente (#62, #73). La especificación de pantalla (#121) requiere diseño aprobado y brief; no se presume una UI integrada.
- **Núcleo y plataforma:** auditoría atómica y encadenada (#71), FORCE RLS (#79), lecturas sensibles (#76), cola y auditoría global de plataforma (#109), saneado de errores (#130), calendario (#139, #143). Las verificaciones de feriados señaladas en ADR-059 y los pendientes de seguridad de [auditoría](auditoria-nucleo.md) requieren seguimiento; el archivo anterior conserva riesgos y diagnósticos originales, no constituye una lista vigente de tareas.
- **Comercial, Rondas y firma:** Negocios y Contactos (#97, #99, #104, #110); Rondas backend y configuración ERP (#137, #141); firma núcleo PR 1, datos y configuración (#140). Son entregas parciales, no módulos completos. Ver [PLAN-desarrollo](PLAN-desarrollo.md), especificaciones y briefs para el alcance pendiente.
- **CPQ PR 10.1 en construcción** (rama `feat/cpq-pr1-datos`, Brief 10): schema `cpq` (cotizaciones, versiones, secciones, líneas, aprobaciones) con RLS y migración `20261030150000_cpq_cotizaciones` pendiente de aplicar por el bot con respaldo; capacidades `cpq.cotizaciones.list/get/create/ajustar`, correlativo `CPQ-AAAA-NNN` atómico (R54) y `cpq:costos.ver` en el servidor (R59). Pendiente: pantallas (PR 10.2), motor de cálculo del Brief 08 (los totales quedan en null), pólizas a la espera del corredor (R66) y los PR 10.3 a 10.8.
- **Decisiones y diseños pendientes:** motor de sueldos: fuentes oficiales, validación contable y diseño (especificación #126); formatos de salida: aprobación de especificación y diseño (#127). P10 de firma está resuelta en [firma.md §15](modulos/firma.md): complemento Cumplimiento DT de Nómina, no integración automática de Firma (#128, #139). No se crean decisiones de negocio en CAR-59.
- **Operación por confirmar:** no hay evidencia en esta revisión de la revocación de la key `*` de Gard (I-17/CAR-56) ni del resultado del seguimiento de e2e señalado en I-21/CAR-60; no asumir resueltos ni afirmar que siguen fallando sin verificación externa.

## Trazabilidad de I-20

Las líneas refieren a la auditoría sobre `f60a88d`; se conservan como evidencia histórica, no como estado actual.

| Entrada de I-20 | Resolución en esta foto |
|---|---|
| :18 07b PR 1 | Integrado #80; límites en Sueldos. |
| :20 cargos sensibles | Integrados #83, #84, #86. |
| :22 hash antiguo | Sustituido por el hash completo de esta foto. |
| :560 navegación PR B | Integrado #75. |
| :577 MFA | Integrado #65; seguimientos #74 y #131. |
| :578 CAR-16 | Integrado #57. |
| :579 07c PR 1 | Integrado #46. |
| :590 rendimiento PR 2 | Integrado #42 y #88. |
| :596 ADR-049 | Integrado #38; aceptado #139. |
| :604 Brief 05 | Documentado #37 y construido #40/#75. |
| :605 B2 | Integrado #47; matriz #106. |
| :606 PWA | Integrada #45; offline y push posteriores. |
| :686 capas de sueldo | PR 1–4 #80/#87/#89/#91, con seguimiento #93. |
| :700 B1–B3 | Integrados por alcance descrito arriba: #46/#47/#51 y seguimientos. |
| :702 memoria por instancia | Bloqueo persistente #46 y limitador compartido #64; respaldo delimitado arriba. |
| :704 B3 contradictorio | Alcance implementado #51/#89/#105; portales aún pendientes. |
| :705 B4 PR 3 | Integrado #61; pantallas #107 y límites arriba. |
| :707 D2 positivo | Reactivado con vínculo #89 y seguimiento #93. |
| :714 y :748 PR integrados | 07b PR 1 integrado #80; protección de versiones de cargo y bonos #83/#84. |
| :828 CAR-19 sin detalle | Detalle y referencias de correcciones #86 y #93 en Sueldos y archivo. |
| DS provisional | Radix en `c85a92a9` y #54; sustituido arriba. |
| Regla ESLint | Corregida en [REGLAS-codigo](REGLAS-codigo.md), contrastada con `apps/web/eslint.config.mjs`. |

## Archivo histórico

[ESTADO-archivo.md](ESTADO-archivo.md) conserva íntegro el estado anterior a CAR-59, incluidas decisiones, riesgos, validaciones y referencias. Es una **instantánea histórica**, con afirmaciones que pudieron quedar obsoletas o contradictorias; no usarla para inferir el estado vigente sin contrastar con `main`.
