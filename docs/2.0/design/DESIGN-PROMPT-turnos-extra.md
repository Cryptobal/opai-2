# Design Prompt · Turnos extra (CAR-96)

**Estado:** listo para Claude Design; **no aprobado**. Lo prepara la sesión «Operaciones · Auditoría» (6-nov-2026) con las decisiones de Carlos registradas en ADR-083 y en la §16 de [`BRIEF-CAR-96-turnos-extra.md`](../briefs/BRIEF-CAR-96-turnos-extra.md). Carlos lo lanza en Claude Design cuando autorice el bloque B; el export aprobado va a `docs/2.0/diseño/export-turnos-extra/` y recién entonces empieza el código del PR 2.

```
Diseña con el Design System OPAI 2.0 V2 (tokens, componentes y patrones del DS 2.0; nunca el estilo de OPAI 1.0). Mobile e iPad primero: 375, 1024 y 1280 px. Touch targets ≥ 44 px, foco visible, contraste AA y modo claro y oscuro. Usa solo datos ficticios: nombres, RUT y montos inventados.

Contexto: OPAI 2.0 es un ERP multiempresa para empresas de seguridad privada. En la Pauta, todo reemplazo o refuerzo pagado es un «turno extra»:
- lo registra el supervisor;
- lo aprueban owner, admin, gerente o el rol Operaciones (nunca quien lo registró);
- el monto sale de una tarifa fija por instalación, con excepción por puesto;
- el supervisor ve el monto sugerido pero NO lo edita; quien aprueba puede editarlo con un motivo obligatorio;
- el turno lo hace un trabajador propio o un externo que cobra con boleta;
- el cliente nunca ve montos.

Parte de los diseños aprobados existentes y mantén su lenguaje:
- Pauta: docs/2.0/diseño/export-pauta (P01 Mensual por instalación, P03 Hoja Excepción de un día);
- ficha de persona: docs/2.0/diseño/export-ficha-persona;
- patrones ListScreen, DetailScreen y FormScreen y el AppShell del DS.

Pantallas:

1. Pauta · Hoja «Excepción de un día» (variante de P03) con reemplazo o refuerzo:
   - bloque «Turno extra»: tipo de trabajador (Propio / Externo), monto sugerido de solo lectura con el origen visible («Tarifa del puesto» o «Tarifa de la instalación») y aviso «Quedará por aprobar»;
   - caso «Sin tarifa»: monto $0 con advertencia; no se puede aprobar hasta fijar una tarifa;
   - versión teléfono y versión iPad o escritorio.

2. Pauta · Celda del calendario (variante de P01): badge del turno extra en tres estados, «Por aprobar», «Aprobado» y «Rechazado». Debe leerse en una celda chica y no depender solo del color.

3. Turnos extra · «Por aprobar» (ListScreen, pestaña dentro de Pauta):
   - filtros de estado, instalación, persona y rango de fechas, con el total en CLP del filtro;
   - fila: fecha, instalación · puesto, persona y tipo, origen (reemplazo o refuerzo), monto y quién registró;
   - acciones Aprobar, Rechazar (motivo obligatorio), Editar monto (motivo obligatorio, muestra el antes y el después) y Devolver a pendiente;
   - aprobación de varios a la vez desde iPad o escritorio;
   - teléfono: lista de tarjetas con las acciones en una hoja;
   - estados: carga (skeleton), vacío con acción, error y sin permiso.

4. Instalación · Tarifas de turno extra (en la ficha de la instalación):
   - monto por instalación y excepciones por puesto, con «Vigente desde» y el historial de cambios;
   - aclara que un cambio no altera los turnos ya registrados.

5. Personas · Externo:
   - alta rápida de externo: nombre, RUT, correo y datos bancarios (banco, tipo de cuenta, número). Los datos bancarios se muestran enmascarados después de guardar;
   - en la ficha de persona: chip de estado y acciones de transición permitidas según el estado, con confirmación y motivo;
   - historial de estados (de → a, fecha, quién, motivo);
   - pestaña o sección «Turnos extra» con los turnos de esa persona.

Modelo de estados por persona (exacto; solo estas transiciones):
- Postulante → Rechazado | Externo | Activo
- Externo → Activo
- Activo → Inactivo
- Inactivo → Activo | Externo
Solo «Activo» tiene contrato. «Externo» no tiene contrato y solo hace turnos extra. Muestra en una lámina el diagrama del modelo y cómo se ve cada estado (chip y acciones disponibles).

Entrega:
- un índice;
- una hoja de componentes nuevos (badge de turno extra, chip de estado de persona, bloque de monto con origen);
- las 5 pantallas en las tres anchuras;
- los estados de cada una.
Textos en español de Chile, cortos y en lenguaje de negocio.
```
