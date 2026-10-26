# PLAN de desarrollo por módulo — OPAI 2.0

**Actualizado:** 25-oct-2026 · **Tarea:** CAR-10 · **Base verificada:** `main` en `6b2b662`

**Fuentes.** Las decisiones del 25-oct citadas aquí como «Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)» son, con la hora (CLT) de sus mensajes: el Núcleo primero (05 → 04 → 07b) y las fases en orden (19:09, 19:17, 22:04 y 22:10); el DS oficial V2 en Claude Design (20:08); en los 7 choques entre el export y el código manda el código (21:24); el proceso por módulo y **Puestos primero** (12:42). Las reglas de Puestos son reglas definidas por Carlos el 25-oct-2026 (12:30 y 16:53; Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación. **Nómina en la fase 6:** no es una decisión explícita, se deduce: Carlos, 25-oct-2026 ~21:20, chat con OPAI 2.0: «no tengo clientes que comprarían solo payroll». Como el ROADMAP solo permitía adelantar Nómina si un cliente la compraba sola, Nómina queda en la fase 6. Además, desde las 23:10 Nómina exige Puestos (respuesta 1 de ADR-048), lo que también impide venderla sola. **Orden CPQ antes que Comercial:** el registro del bot OPAI 2.0 de las 12:42 lo menciona, pero el Revisor no encontró ese mensaje de Carlos en el chat (lo dijo el bot a las 18:13), así que queda como **propuesta pendiente de confirmar**. La dependencia de construcción (Briefs 06 y 07 antes del 10) es un **requisito** de ADR-040 y ADR-048, no una decisión. Lo demás que no tiene fuente en el repo dice **propuesta pendiente de confirmar**; las extracciones de 1.0 en Pages privadas de Carlos dicen **extracción hecha fuera del repo, sin verificar; se sube en un PR aparte**.

Esta es la vista que revisa Carlos: **cada módulo y en qué etapa está**. No reemplaza a `ROADMAP.md` (plan por fases con semanas y criterios de corte de Gard) ni a `ESTADO.md` (foto técnica). El estado de cada tarea vive en Linear (equipo CAR). Si este archivo no coincide con el repositorio, manda el repositorio y se corrige este archivo.

## 1. Las cinco etapas de cada módulo

Proceso por módulo (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)): reglas en una Page, diseño en Claude Design, aprobación de Carlos y recién entonces el brief.

1. **Reglas cerradas.** Extracción de 1.0, ADR y especificación `modulos/<modulo>.md` (ADR-047), o las reglas que Carlos cierra en una Page.
2. **Diseño en Claude Design**, con el sistema de diseño DS 2.0 cargado.
3. **Aprobación de Carlos** del diseño (y prueba, cuando aplica).
4. **Brief** en `docs/2.0/briefs/`.
5. **Construido en `main`:** PR → Revisor → QA → merge con squash del bot «OPAI 2.0» (ADR-043 v3).

Valores de cada etapa: **hecho**, **en curso**, **falta**, **no aplica**. Cada celda lleva su evidencia: ruta del repo, PR, ID de Linear o «Page de Carlos (fuera del repo)». Lo que no se pudo comprobar en el repo dice **sin verificar**.

## 2. Tabla por módulo, en orden de trabajo

Primero se cierra el Núcleo; después Puestos; luego CPQ y Comercial (su orden es propuesta pendiente de confirmar); después el resto en el orden de `ROADMAP.md`.

| # | Módulo (briefs) | 1 · Reglas | 2 · Diseño en Claude Design | 3 · Aprobación de Carlos | 4 · Brief | 5 · En `main` |
|---|---|---|---|---|---|---|
| D1 | **Sistema de diseño (DS 2.0) en Claude Design** | Hecho: `packages/ds/src/tokens.css` y export DS 2.0 aprobado el 23-oct (`docs/2.0/design/export-ds-2.0/`, ADR-014) | **En curso: completando componentes.** Oficial: [OPAI 2.0 Design System V2](https://claude.ai/design/p/44e4d7b9-7464-4771-bff8-07fcff4d573d) (predeterminado de la organización; DS oficial por Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)). El [V1](https://claude.ai/artifact/GCwmGtXZ9WXjVgsnayhr6Y) queda solo de referencia. En los 7 choques entre el export y el código, manda el código | Falta: Carlos revisa y publica el V2 | No aplica | Hecho: `packages/ds` (el sistema en código ya está en `main`) |
| N0 | **Núcleo 00–02** (fundación, identidad, maestros y servicios) | Hecho: ADR-001 a 048, `extraccion/maestros.md` | Link de Claude Design **por confirmar**. Export en el repo: `design/export-ds-2.0/`, `design/export-acceso/`, `design/export-maestros/` | Hecho: export DS y acceso aprobados el 23-oct (`ESTADO.md`) | Hecho: `briefs/BRIEF-00-*`, `BRIEF-01-*`, `BRIEF-01c-*`, `BRIEF-02-*` | A–C hecho (PR #2, #5 y siguientes). **Sesión D en curso:** seeds, secretos de previews y verificación guiada en el Mac de Carlos (`ESTADO.md`, «En curso» 1–3) |
| N1 | **Núcleo · paso 1 · 05 Navegación por áreas** | Hecho: ADR-046, `NAVEGACION.md` | **Sin diseño todavía** (diseño 2, con el sistema cargado). Falta el Design Prompt | Falta (aprobación y prueba) | Falta | Falta |
| N2 | **Núcleo · paso 2 · 04 PWA** | Hecho: ADR-044 | No aplica (no necesita diseño propio) | Falta (aprueba el brief) | Falta: no está en `docs/2.0/briefs/` | Falta: sin manifest ni service worker en `apps/web` (verificado) |
| N3 | **Núcleo · paso 3 · 07b Capas de sueldo** | Hecho: ADR-036 (actualización del 25-oct) y ADR-048, PR #34 (CAR-9). Las 4 preguntas de ADR-048 están **respondidas** (Decisión de Carlos, 25-oct-2026 23:10, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)); ya no bloquean el brief | **Sin diseño todavía** (diseño 3: capas de sueldo y anexo de contrato) | Falta | Falta | Falta: `core.estructuras_sueldo` sigue con el modelo viejo `cargo \| puesto \| persona` (ADR-036, consecuencias) |
| N4 | **Núcleo · en paralelo · 03 Rendimiento** | Hecho: ADR-045 | No aplica | No aplica | **Falta el texto en el repo:** no hay `BRIEF-03-*` en `docs/2.0/briefs/` | PR 1 integrado (#33, `f96317a`). **Falta el PR 2** (shell en el layout, contadores, `forTenant` por capacidad, pooling, gate obligatorio). CAR-7 está en Done en Linear aunque falta el PR 2 |
| M1 | **Puestos y guardias** (Operaciones I, Brief 11) | Hecho: reglas definidas por Carlos el 25-oct-2026 (Page «Puestos y guardias OPAI 2.0: propuesta»); mockup pendiente de aprobación; resumidas en `modulos/operaciones.md` (borrador, CAR-10); extracción: esqueleto en `extraccion/operaciones.md` (CAR-10, con partes sin verificar) | Hecho, v1 con CAR-8 corregido: [Puestos y guardias v1](https://claude.ai/design/p/4cb4b749-4284-48b5-8e9b-4209f4c86715). Falta ajustarlo al sistema cargado si difiere (diseño 4). Sin export en el repo | **Falta** (Carlos puede darla en paralelo al Núcleo). CAR-8 en Backlog en Linear (consultado el 25-oct) | Falta | Falta |
| M2 | **CPQ** (Briefs 08 y 10) | En curso: propuesta en una Page de Carlos (fuera del repo) con **8 preguntas abiertas**; `modulos/cpq.md` en **borrador**: solo la regla de puestos y sueldos al ganar el negocio (respuesta 3 de ADR-048, 23:10); el resto espera las 8 respuestas; insumos: `extraccion/comercial-y-cpq.md`, ADR-042 | **Sin diseño todavía** | Falta | Falta | Falta |
| M3 | **Comercial** (Briefs 06 y 07) | En curso: `modulos/comercial.md` en borrador (§14 con 11 preguntas); la Page de Comercial del 25-oct (fuera del repo) es una **propuesta pendiente de confirmar**; ADR-040 y 041 vigentes | **Detenido, 2 páginas:** [Comercial CRM](https://claude.ai/design/p/5edf6b8b-95b2-4a38-b68d-988d782c6f1f). Falta terminar la v2. Sin export | Falta | Falta | Falta |
| M4 | **Documentos** (Brief 09) | Falta: `modulos/documentos.md` pendiente (ADR-019, ADR-039) | Sin diseño todavía | Falta | Falta | Servicio del núcleo hecho (`core.documentos`, Brief 02); módulo (explorador, editor, plantillas, firma simple): falta |
| M5 | **Portales Supervisor y Trabajador** (Brief 15) | **Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte.** Falta `modulos/portales.md`; hoy solo las entradas de `NAVEGACION.md` §4 | Parcial: login Trabajador con RUT, PIN y teclado (`design/export-acceso/06`, `07`) y selector de portal (`design/export-ds-2.0/pantallas/ShellPhonePortal.html`). Sin pantallas propias del portal ni proyecto en Claude Design | Falta | Falta | Supervisor: Hoy (documentos pendientes), Instalaciones y Personas. Trabajador: solo Inicio de relleno. Login de Trabajador: «Próximamente» (verificado) |
| M6 | **Portales Cliente y Terreno** (Brief 16; nativo con Capacitor en el 17) | **Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte**. Falta `modulos/portales.md`. Control de acceso físico en Terreno (decisión del 24-oct) | Parcial: login Cliente (`export-acceso/08`, `09`), emparejar dispositivo de Terreno (`10`, `11`), shell de teléfono de Terreno claro, oscuro y sin conexión (`export-ds-2.0/pantallas/ShellPhone.html`, `ShellPhoneDark.html`) | Falta | Falta | Solo Inicio de relleno y su 404. Login de Cliente: «Próximamente» (verificado) |
| M7 | **Operaciones II** (turnos extra, supervisión, novedades; Brief 12) | Falta, salvo `extraccion/operaciones.md` (esqueleto) y ADR-022 | Sin diseño todavía | Falta | Falta | Falta |
| M8 | **Tickets** (Brief 13) | Parcial: `extraccion/rondas-y-tickets.md`, ADR-025; falta `modulos/tickets.md` | Sin diseño todavía (el export DS 2.0 trae `TicketsPhone`/`TicketsTablet` solo como ejemplo de patrón) | Falta | Falta | Falta |
| M9 | **Rondas** (Brief 14) | Parcial: `extraccion/rondas-y-tickets.md`, ADR-024; falta `modulos/rondas.md` | Sin diseño todavía (`RondaPhone`, `RondasPanelDesktop` del export DS son ejemplos de patrón) | Falta | Falta | Falta |
| M10 | **Asistencia y DT** (Briefs 18 y 19) | Parcial: `extraccion/dt-normativa.md`, ADR-023; faltan `extraccion/asistencia.md` y `modulos/asistencia.md` | Sin diseño todavía | Falta | Falta | Falta |
| M11 | **Finanzas · Flujo de caja al centro** (Brief 20) | Reglas base en ADR-026. **Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte** (`extraccion/flujo-de-caja.md`, desde el flujo v3 de 1.0). Falta `modulos/finanzas.md` | Sin diseño todavía. Sin Design Prompt: «Finanzas · octubre 2026» del export DS 2.0 es solo un ejemplo del patrón Dashboard, no el diseño del módulo | Falta | Falta | Falta. Es el flujo de caja de 2.0, no el bot «Flujo de caja» de 1.0 |
| M12 | **Finanzas · Banca y conciliación, DTE y factoring, rendiciones, contabilidad** (Briefs 21–24) | Falta: `extraccion/finanzas.md` y `modulos/finanzas.md`. Según ADR-048 depende solo del núcleo; Comercial, CPQ y Nómina son fuentes opcionales | Sin diseño todavía | Falta | Falta | Falta (en el núcleo solo está el bloqueo de `finanzas:*` por rol) |
| M13 | **Nómina / Payroll I y II** (Briefs 25–26; fase 6, deducido de lo que dijo Carlos ~21:20 y de que exige Puestos; ver «Fuentes») | **Exige Puestos (Operaciones I)**: el sueldo sale de la capa de instalación o de puesto; los días trabajados salen de Asistencia (Face ID o marca manual) y la pauta no la alimenta (Decisión de Carlos, 25-oct-2026 23:10, chat con OPAI 2.0 (registrada por el bot OPAI 2.0); ADR-048, respuestas 1 y 2). Sin Asistencia: entrada manual o Excel (ADR-048; detalle abierto). Capas en ADR-036. **Extracción hecha fuera del repo, sin verificar; se sube en un PR aparte**. Falta `modulos/nomina.md` | Sin diseño todavía | Falta | Falta | Falta. Las estructuras de sueldo del núcleo usan el modelo viejo, que corrige el 07b |
| M14 | **Licitaciones** (Brief 27) | Falta: `extraccion/licitaciones.md` y `modulos/licitaciones.md` | Sin diseño todavía | Falta | Falta | Falta |
| M15 | **Firma electrónica avanzada** (Brief 28) | Falta | No aplica | Falta | Falta | Falta |
| M16 | **Apagado de 1.0** (Brief 29) | Falta | No aplica | Falta | Falta | Falta |
| — | **Empaquetado nativo Capacitor** (Brief 17) | Parcial: ADR-044 | No aplica | Falta | Falta | Falta |

## 3. Orden vigente

1. **Cerrar el Núcleo antes de abrir los módulos** (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 19:09–22:10 CLT): 05 Navegación por áreas → 04 PWA → 07b Capas de sueldo (las 4 preguntas de ADR-048 ya están respondidas). En paralelo: PR 2 del Brief 03 y sesión D del Brief 02.
2. **Después, los módulos.** **Puestos y guardias (Operaciones I) primero** (Decisión de Carlos, 25-oct-2026, chat con OPAI 2.0 (registrada por el bot OPAI 2.0), 12:42 CLT). Después CPQ por vertical y Comercial (CRM) en reglas y diseño, en ese orden como **propuesta pendiente de confirmar**. Orden de **construcción:** Puestos (Brief 11) → Comercial (Briefs 06 y 07) → CPQ (Briefs 08 y 10), porque el cotizador necesita los negocios.
3. **Después**, el resto en el orden de fases de `ROADMAP.md` (Operaciones II, Tickets, Rondas, Portales, Asistencia, Finanzas, Nómina y Licitaciones).

**Por qué el 07b va antes de Puestos.** El 07b es parte del Núcleo y va antes del brief de Puestos (Operaciones I), porque el puesto usa la capa «sueldo propio del puesto» (ADR-036, actualización del 25-oct).

**Dependencia CPQ ↔ Comercial (requisito, no recomendación).** Según ADR-048 (punto 1) y ADR-040, **CPQ depende de Comercial**: no hay cotización sin negocio. Por eso **los negocios (Briefs 06 y 07) se construyen antes del cotizador (Brief 10)**. Comercial no depende de CPQ. **Recomendación para que Carlos confirme (solo orden de diseño):** diseñar CPQ antes que Comercial, porque el cotizador es lo que más pesa en la venta de Gard.

**Orden de diseño (propuesta pendiente de confirmar):** (1) cargar el DS 2.0 en Claude Design desde el repo (`tokens.css` y `design/export-ds-2.0/`), en curso; (2) navegación del Brief 05 con ese sistema; (3) capas de sueldo y anexo del Brief 07b; (4) ajustar el mockup de Puestos al sistema si difiere. La PWA (Brief 04) no necesita diseño propio. CPQ y Comercial se diseñan cuando cierren sus reglas.

**Mapa de dependencias de módulos (ADR-048, con la nota del 25-oct 23:10).** Dependencias duras: CPQ → Comercial; Licitaciones → CPQ; **Nómina → Puestos (Operaciones I)** (Decisión de Carlos, 25-oct-2026 23:10, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)). Todo lo demás depende solo del núcleo y usa los otros módulos como fuentes opcionales. Para Nómina, Asistencia es la fuente de los días trabajados y la pauta no la alimenta.

## 4. Próximos pasos, en orden

El orden de los pasos 6 (CPQ) y 7 (Comercial) es **propuesta pendiente de confirmar**; la construcción respeta el requisito de §3 (los Briefs 06 y 07 antes del 10).

| Paso | Qué | Responsable |
|---|---|---|
| 0 | **Diseño 1:** cargar el DS 2.0 en Claude Design desde el repo; revisarlo y publicarlo | Claude y operador OPAI 2.0 (carga) · Carlos (revisa y publica) |
| 1 | **05 Navegación:** Design Prompt → diseño en Claude Design → aprobación y prueba → brief → PR → revisión → QA → merge | Claude (Design Prompt, brief y PR) · Carlos (aprueba y prueba) · Revisor · QA · bot «OPAI 2.0» (merge) |
| 2 | **04 PWA:** brief → aprobación → construcción en `main`. Termina cuando la app se instala desde el celular y el CI prueba manifest, service worker y modo sin conexión | Claude · Carlos · Revisor · bot «OPAI 2.0» |
| 3 | **07b Capas de sueldo:** diseño de capas y anexo (preguntas de ADR-048 ya respondidas) → aprobación → brief y PR | Claude · Carlos · Revisor · QA · bot «OPAI 2.0» |
| 4 | **En paralelo:** el PR de este plan (CAR-10); PR 2 del Brief 03; sesión D del Brief 02 en su Mac; aprobación del mockup de Puestos | Claude · Revisor · bot «OPAI 2.0» · **Carlos** (sesión D y aprobación de Puestos) |
| 5 | **Puestos:** ajustar el mockup al sistema si difiere → brief (Brief 11) | Claude · Carlos |
| 6 | **CPQ** (se diseña cuando cierren sus reglas): 8 respuestas de Carlos → `modulos/cpq.md` → diseño → brief | Carlos (respuestas y aprobación) · Claude |
| 7 | **Comercial** (ídem): v2 del mockup → `modulos/comercial.md` aprobado → Briefs 06 y 07, que se construyen antes del Brief 10 (cotizador) | Carlos · Claude |
| 8 | **QA y merge por PR** de cada brief | QA · Revisor · bot «OPAI 2.0» |

## 5. Cuándo se pulen los portales

**Lo que dice el repositorio.**

- El pulido va **en cada brief de pantallas**, no en una fase aparte: revisión a 375, 1024 y 1280 px en claro y oscuro contra el export aprobado, auditoría AA y Lighthouse ≥ 90 en las pantallas principales de cada portal (ADR-017 §5), y presupuesto de bundle por portal (ADR-029 §14; topes en ADR-037).
- `ESTADO.md` deja pendiente el contraste de `--ds-border-strong` (1,5:1) en el portal Trabajador a pleno sol.
- Los portales se construyen en la fase 3 (Briefs 15, 16 y 17) sobre la PWA (Brief 04) y la navegación (Brief 05).

**Propuesta (para que Carlos decida; no es decisión todavía).**

- Subir la extracción de portales al repo (en un PR aparte) durante la fase 2 y diseñar los portales en Claude Design con el DS V2 antes del Brief 15.
- Hacer una **pasada de pulido de terreno antes del Brief 17**: prueba en el celular a pleno sol y sin conexión, contraste del Trabajador, Lighthouse y bundle por portal.
- Subir en paralelo las extracciones de flujo de caja y de nómina durante las fases 2 y 3.
- Nómina queda en la fase 6 (no es propuesta; se deduce: Carlos, 25-oct-2026 ~21:20, chat con OPAI 2.0: «no tengo clientes que comprarían solo payroll». Como el ROADMAP solo permitía adelantar Nómina si un cliente la compraba sola, Nómina queda en la fase 6). Además, desde las 23:10 Nómina exige Puestos (respuesta 1 de ADR-048), lo que también impide venderla sola.

## 6. Diferencias abiertas entre el plan y el repositorio

- **CAR-7 en Done, Brief 03 sin terminar:** Linear lo marca hecho y falta el PR 2; el texto del Brief 03 no está en `docs/2.0/briefs/`.
- **Puestos (25-oct) frente a ADR-040 §3 y `modulos/comercial.md` R18:** el puesto ya no se crea al ganar. Quedó como nota fechada en ambos, sin editar el texto original; la recomendación de la pregunta 8 de Comercial (crear en 1.0 al ganar) queda superada en su disparador y **falta que Carlos decida cuándo se replican en 1.0** los puestos creados en 2.0.
- **ADR-048, pregunta 3:** resuelta (Decisión de Carlos, 25-oct-2026 23:10, chat con OPAI 2.0 (registrada por el bot OPAI 2.0)): el disparador es ganar el negocio; cada línea de guardias se ofrece para crear su puesto y RRHH lo confirma. `modulos/operaciones.md` (R10), ADR-036 (punto 10), ADR-040 (nota del punto 3) y `modulos/comercial.md` (R18) quedan alineados.
- **ADR-036 (modelo de puesto):** el texto original tiene dotación y jornada `dia | noche | rotativa`; la regla del 25-oct fija 1 puesto = 1 posición y separa rol, horario por tramos y horas semanales. Además, ADR-036 decía que el patrón «va en el puesto, no en una entidad aparte», y la regla nueva crea un catálogo de patrones por tenant. Anotado con fecha; el modelo de datos se define en el brief de Puestos.

## Historial

| Fecha | Cambio | Tarea |
|---|---|---|
| 25-oct-2026 | Primera versión: tabla por módulo y etapa, orden vigente (Núcleo primero), próximos pasos y pulido de portales | CAR-10 |
