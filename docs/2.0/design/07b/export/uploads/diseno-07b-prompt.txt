# DESIGN PROMPT — BRIEF 07b · CAPAS DE SUELDO Y ANEXO DE CONTRATO (OPAI 2.0)

Para pegar completo en Claude Design, en un diseño nuevo **dentro del sistema de diseño «OPAI 2.0 · Design System (DS 2.0)» V2**, que ya está cargado en Claude Design (el mismo que usó el diseño aprobado de navegación del Brief 05, 53e9b74b). Fuentes del sistema en el repo: `packages/ds/src/tokens.css` y `docs/2.0/design/export-ds-2.0/`. **No crees colores, tipografías, radios ni sombras nuevos.** Compón con los componentes que ya existen (Button, IconButton, Field, Input, Select, Combobox, DateInput, Checkbox, Switch, Segmented, FilterChip, Table, Card, KpiTile, RowCard, SelectableRow, Timeline, Badge, Avatar, TenantMark, EmptyState, ErrorState, Forbidden, Loading, Skeleton, StatePanel, Tabs, Menu, Dialog, Sheet, Toast, ActionBar, DetailSection, FormSection, PageHeader, AppShell, Sidebar, TabBar, TopBar). Lo que falte se propone como pieza nueva en la pantalla final (§9), marcada «Nuevo en el DS: pendiente de aprobación».

Es el **diseño 3** del plan (`PLAN-desarrollo.md`, fila N3: «Sin diseño todavía (diseño 3: capas de sueldo y anexo de contrato)»). Sin este diseño aprobado por Carlos no se escribe el Brief 07b (`ROADMAP.md`, fila 07b y paso 3: «diseño de capas de sueldo y anexo → aprobación de Carlos → brief y PR»).

Resultado esperado: **export HTML standalone, una pantalla por archivo**, con los nombres de §8. Mismo formato que el export de navegación del Brief 05: cada pantalla lleva arriba una cabecera de anotación («OPAI 2.0 · Brief 07b · Capas de sueldo y anexo · NN · título»), una línea de qué muestra, el viewport y el tema («1280 · claro»), y al costado notas cortas con la regla y su fuente. Todo punto que no esté decidido en las fuentes se marca con la etiqueta **«Propuesta: decide Carlos»** (badge neutro o warning-muted, siempre visible, nunca escondido en un tooltip). Es la referencia de layout y jerarquía para el brief, no código a copiar.

---

## 1. Contexto

OPAI 2.0 es un SaaS operacional multi-tenant y agent-first para empresas intensivas en personal (seguridad, aseo, outsourcing, mantenimiento). Estas pantallas son del **portal ERP**: las usa RRHH y la administración en iPad y escritorio, y el dueño también desde el celular. Toda acción que aparece en pantalla existe igual en la API v1 y en el MCP, con los mismos permisos, vista previa (`dry_run`) y auditoría (ADR-048, punto 7; ADR-034). La UI no inventa flujos: muestra entidades, su estado, de dónde sale cada dato y acciones claras.

**Qué corrige el 07b (ROADMAP, fila 07b; ADR-036, actualización del 25-oct, «Consecuencias de la actualización»).** Hoy (`main`, Brief 02) el sueldo se resuelve en tres niveles **cargo → puesto → persona** con herencia por concepto: un nivel define solo lo que cambia y el resto lo hereda (la pantalla «Laboral» de la persona lo muestra como cascada, y «Cargos y sueldos» lista montos por cargo). Esa regla ya no vale. El 07b cambia la UI en cinco puntos:

1. Nueva **capa «instalación»** del sueldo, la capa por defecto.
2. **Resolución sin herencia** entre capas, mostrando de dónde sale cada monto.
3. **Retiro del nivel cargo** como capa de sueldo, **sin borrar datos**.
4. **Vínculo laboral** con instalación (y puesto) y **jornada pactada**.
5. **Anexo de contrato en borrador**, con la plantilla base del sistema y la marca del tenant, que aprueba RRHH.

**Tenant de ejemplo (ficticio):** «Seguridad Ejemplo SpA» (vertical seguridad; vocabulario: *guardia*, *instalación*, *puesto*). **Todos los datos son ficticios y se marcan «ejemplo»** en la anotación de cada pantalla: nombres, RUT, montos, instalaciones y cuentas. Nunca uses nombres, RUT, clientes, instalaciones ni montos reales de ninguna empresa. Nada de OPAI 1.0: ni pantallas, ni nombres de pantallas, ni flujos.

**Formatos:** español de Chile; fechas `dd-mm-aaaa`; horas `HH:mm`; CLP `$ 600.000` sin decimales; porcentajes `25 %`; RUT `12.345.678-5` en `t-mono`.

**Viewports:** celular **375**, iPad **1024** (apaisado) y escritorio **1280**. Modo **oscuro** donde se indica en §8 (al menos la resolución de capas, la capa instalación y el anexo en borrador). Desde 1024 se usa la barra lateral completa y plegable del escritorio (NAVEGACION §10, D9).

**Principios que mandan (ADR-014, ADR-017):** una acción principal por pantalla; jerarquía por tamaño, peso y espacio; **color solo para estado**; bordes finos, sin sombras salvo overlays; foco visible; skeleton con la forma del contenido; estado vacío con acción; overlays accesibles; movimiento 150–200 ms; touch targets ≥ 44 px. Si hay que elegir entre celular y escritorio, gana el celular (ADR-007).

**Navegación (NAVEGACION.md, ADR-046, diseño aprobado del Brief 05):** shell con áreas; el sueldo vive en el área **Personas**, entrada **«Cargos y sueldos»** (§2), y en las fichas (ADR-041): Instalación (Resumen → Puestos → … → Documentos → Actividad) y Persona (Resumen → Laboral → … → Documentos → Actividad). Lo que pertenece a una entidad es pestaña de su ficha, nunca entrada del menú (§1.3). Sin pestañas deshabilitadas ni avisos de «disponible pronto» (ADR-041.5). El nombre del área y de la entrada es siempre «Personas»; el vocabulario de la vertical («guardia») va solo en textos operativos (§6).

---

## 2. Reglas de negocio que el diseño debe mostrar (con su fuente)

No agregues reglas que no estén aquí. Si una pantalla necesita algo que no está, márcalo «Propuesta: decide Carlos».

**Capas de sueldo (ADR-036, actualización del 25-oct):**

- R1. Tres capas: **instalación** (por defecto), **puesto** (cuando el puesto tiene su propio sueldo) y **sueldo por RUT** (persona; la excepción, con **motivo obligatorio y auditoría**). (punto 1)
- R2. **Una sola capa por asignación.** No se combinan: rige la más específica que exista (**RUT, después puesto, después instalación**) y **su estructura se aplica completa**. **No hay herencia de conceptos entre capas.** (punto 2)
- R3. **El cargo deja de ser capa de sueldo.** Sigue como catálogo (nombre, descripción, **sensibilidad del sueldo**) y como atributo del puesto y del vínculo laboral, pero **no define montos**. (punto 3)
- R4. «Grupo de sueldo» queda **fuera de la v1** (backlog). No lo dibujes. (punto 4)
- R5. Las estructuras siguen **versionadas por vigencia, sin solapes en la misma capa y referencia**; la resolución **devuelve la capa que rigió**, para que liquidación y costeo la guarden. (punto 6)
- R6. El retiro del nivel cargo es **sin borrar datos**: las filas `cargo` existentes **se convierten o se archivan** según una decisión de Carlos sobre los datos de `dev` (Consecuencias de la actualización). → Cuál de las dos: **decide Carlos**.
- R7. Al ganar un negocio, cada línea de guardias se **ofrece** para crear su puesto con el **sueldo bruto cotizado**, y **RRHH lo confirma**; si la línea no tiene sueldo, el puesto **toma el sueldo de la instalación, que RRHH completa** (ADR-048, respuesta 3 de Carlos, 25-oct-2026 23:08–23:10, t263u–t265u; ADR-036, reglas del puesto, punto 10). El flujo de CPQ no es de este diseño; solo importa que un puesto puede nacer **sin sueldo propio** y que una instalación puede estar **sin sueldo definido** (estado a diseñar).

**Conceptos de una estructura (los que ya existen en `main`, Brief 02; no agregues otros):** sueldo base, colación, movilización, gratificación (legal 25 % · monto fijo · ninguna) y bonos fijos o porcentuales con su marca de imponible. Como no hay herencia (R2), **toda estructura de cualquier capa define todos sus conceptos**; ya no existe «hereda» ni el valor vacío que hereda.

**Vínculo laboral (ADR-048 y ADR-036):**

- R8. La **jornada pactada** pasa a ser dato del **vínculo laboral** en el núcleo, porque es parte del contrato (ADR-036, «Jornada pactada»; ADR-048, Consecuencias). PIN y Face ID siguen en Asistencia: no van aquí.
- R9. El vínculo gana los campos **instalación, puesto y jornada pactada** (ADR-048, punto 7, «Aislamiento»); necesita la instalación (y el puesto, **opcional**) para resolver la capa de sueldo (ADR-048, Consecuencias). Uno vigente por persona (ADR-036, Decisión).
- R10. **Nómina exige Puestos (Operaciones I)**: el sueldo sale de la capa de instalación o de puesto (ADR-048, respuesta 1 de Carlos, t263u–t265u). Para este diseño basta con que la capa se resuelva desde la instalación y el puesto del vínculo.
- Qué campos forman la «jornada pactada» (horas semanales, días, horario, tipo de jornada…): **no está en las fuentes → decide Carlos.** Dibuja una propuesta con horas semanales y distribución, marcada.
- Si la instalación del vínculo es obligatoria u opcional: la recomendación original de ADR-048 (pregunta 1) era «instalación obligatoria, puesto opcional», pero la respuesta de Carlos cambió el enfoque (Nómina exige Puestos) sin repetir ese punto → **decide Carlos**. Dibuja «obligatoria» como propuesta, marcada.
- Cómo conviven el puesto del vínculo y la asignación de Operaciones cuando llegue la fase 3: **decide Carlos** (no lo dibujes más allá de una nota).

**Anexo de contrato (ADR-048, punto 5 y punto 7; ADR-036, actualización, punto 5; reglas del puesto, punto 8):**

- R11. Un cambio de **rol, de capa de sueldo, de monto o de instalación** de una persona **genera solo el borrador** del anexo; en particular, **todo cambio de la capa vigente o del monto**. (ADR-036 punto 5; ADR-048 punto 5) — Que «rol» sea el rol de turno (días del patrón, ADR-036 reglas del puesto, punto 3) es lectura nuestra: **decide Carlos** si confirma.
- R12. El borrador usa la **plantilla base del sistema** con la **marca del perfil del tenant** (ADR-028: logo, colores de marca, nombre comercial, datos legales). La plantilla editable por el tenant **llega con el Brief 09**: aquí no hay editor de plantilla. (ADR-048 punto 5)
- R13. **RRHH lo aprueba**; el rol que aprueba es **configurable**; **un agente no lo aprueba** (ADR-036, reglas del puesto, punto 8). Para agentes, aprobar pide aprobación humana (`APPROVAL_REQUIRED`). (ADR-048 punto 7)
- R14. Generar el borrador, **aprobarlo y rechazarlo** son capacidades con vista previa (`dry_run`) y clave de idempotencia, disponibles igual en UI, API y MCP; toda escritura real queda en auditoría. (ADR-048 punto 7)
- R15. Aprobado, el documento queda en **`core.documentos` con su bitácora** (ADR-048 punto 5; ADR-039: integridad verificada por SHA-256). El anexo vive en el núcleo y funciona aunque el tenant no tenga Nómina (ADR-048 punto 5).
- Qué rol aprueba por defecto (los roles base son owner, admin, gerente, supervisor y viewer, ADR-016; no existe un rol «RRHH» base): **decide Carlos**.
- Si rechazar pide motivo: **decide Carlos** (propuesta: sí, como el rechazo de Aprobaciones).
- Firma del anexo (electrónica, en papel, por quién): **no está en las fuentes → decide Carlos.** El diseño termina en «Aprobado y guardado en Documentos».
- Texto y cláusulas de la plantilla base: **decide Carlos**. Dibuja la estructura (encabezado con marca, partes, qué cambia, desde cuándo, firmas) con texto de relleno marcado «texto de ejemplo».
- Cuando cambia la capa **instalación** o la de un **puesto**, cambia el monto de todas las personas que la usan. Si eso genera **un borrador por persona** afectada y cómo se revisan en lote: **decide Carlos** (propuesta en la pantalla 06).
- Dónde se ven los anexos pendientes (Bandeja de Inicio, que ya reúne aprobaciones según NAVEGACION §2; pestaña Documentos o Laboral de la persona; una lista propia en «Cargos y sueldos»): **decide Carlos**. Propón la Bandeja más la ficha de la persona, marcado.

**Permisos (ADR-016, NAVEGACION §5):**

- Los montos de sueldo los ven **owner y admin** (bloqueo financiero, ADR-016). NAVEGACION §5: el gerente ve Personas «sin Nómina ni montos de sueldo»; el viewer, «lectura sin montos»; el supervisor, lectura con alcance y sin Nómina.
- El cargo conserva la **sensibilidad del sueldo** (R3). Cómo se combina esa marca por cargo con la regla general de §5 (por ejemplo, si el gerente ve montos de cargos no sensibles): **decide Carlos.** Dibuja la variante «sin permiso» con montos reemplazados por «••••» y la nota «Solo owner y admin ven los montos».
- Quién puede crear o cambiar capas (instalación, puesto, RUT) y editar el vínculo: los permisos finos llegan con el Brief 07c (ADR-022, nota del 26-oct) → **decide Carlos** el permiso exacto; el diseño solo muestra el estado «sin permiso».

---

## 3. Capa «instalación» (ficha de Instalación)

Dónde vive: ADR-041.9 fija las pestañas de Instalación (Resumen → Puestos → Contactos → Negocios → Documentos → Actividad) y no tiene una de sueldo. **Decide Carlos** entre: (a) nueva pestaña propia **«Sueldo»** después de Puestos (propuesta), (b) sección dentro de Resumen, o (c) solo desde «Cargos y sueldos». Dibuja (a) y anota las otras dos.

- **Estructura vigente** (DetailSection): badge «Capa instalación · por defecto», «Vigente desde 01-03-2026 (ejemplo)», tabla de conceptos con montos; gratificación; bonos con su marca de imponible. Arriba, una línea de uso: «La usan 3 puestos sin sueldo propio y 12 personas (ejemplo)», con enlace a la lista de personas afectadas.
- **Versiones** (Timeline): vigente, anteriores con rango, futuras («Rige desde 01-01-2027»). R5.
- Acción principal **«Nueva versión»** (Sheet lateral en 1024/1280, inferior en 375): DateInput de inicio, todos los conceptos (sin «heredar», R2), validación de solape inline («La vigencia se solapa con la versión del 01-03-2026», R5), y **vista previa del impacto** antes de guardar (R14): personas y puestos afectados, diferencia por concepto, y aviso «Este cambio genera borradores de anexo» (R11; lote → decide Carlos).
- **Confirmación** (Dialog): resumen antes/después y número de borradores que se generarían; botones «Guardar versión» y «Cancelar».
- **Vacío:** instalación sin sueldo definido («Esta instalación todavía no tiene sueldo. Los puestos sin sueldo propio y las personas de esta instalación quedan sin sueldo resuelto.», acción «Definir sueldo»). Si eso bloquea algo más (por ejemplo, confirmar puestos): **decide Carlos**.

## 4. Capa «puesto» (pestaña Puestos de Instalación)

El modelo del puesto (1 puesto = 1 posición, patrones, tramos, colación…) se fija en el Brief 11 (ADR-036, reglas del puesto): **no rediseñes el puesto**, solo su bloque de sueldo.

- En la fila de cada puesto, un badge que diga qué capa usa: «Sueldo propio» o «Usa el de la instalación».
- En la hoja del puesto, sección **«Sueldo»** con Segmented o Switch: «Usa el sueldo de la instalación» / «Sueldo propio del puesto». Con sueldo propio: estructura completa, versiones y «Nueva versión» igual que en §3 (R2, R5). Al pasar de una opción a la otra, vista previa y aviso de anexo para las personas del puesto (R11).
- Nota fija: «Las capas no se combinan: si el puesto tiene sueldo propio, se usa completo y la instalación no aporta ningún concepto» (R2).

## 5. Resolución sin herencia (ficha de Persona)

Hoy la persona tiene las pestañas Laboral y Sueldo (`main`). Si el sueldo queda como pestaña propia o dentro de Laboral: **decide Carlos** (propuesta: se mantiene la pestaña «Sueldo»).

- **Las tres capas, de la más específica a la más general**: Sueldo por RUT → Puesto → Instalación. La que **rige** va resaltada (fill + barra de acento a la izquierda, badge «Rige»); las que existen pero no rigen van atenuadas con la razón («No se usa: hay una capa más específica»); las que no existen dicen «No definida».
- **De dónde sale cada monto:** la tabla de conceptos muestra, por fila, la capa y la versión de origen («Puesto · Planta Norte (ejemplo) · Guardia noche · versión del 01-03-2026»). Como rige una sola capa, todas las filas dicen lo mismo: deja que se vea, es la prueba visual de que no hay mezcla. Nunca muestres «hereda» ni montos de dos capas en la misma estructura.
- Fecha de resolución arriba («Al 26-10-2026», con DateInput para ver otra fecha) y vínculo usado (instalación y puesto del vínculo vigente).
- Acción principal **«Definir sueldo por RUT»** (Sheet): motivo obligatorio (Textarea; el botón no se activa sin motivo, R1), vigencia (DateInput desde/hasta), estructura completa. Si la estructura parte prellenada con la capa que rige hoy (solo como punto de partida, sin herencia): **decide Carlos**. Antes de guardar: vista previa antes/después y aviso «Se generará el borrador del anexo de contrato» (R11). Confirmación con Dialog y Toast «Sueldo por RUT guardado · borrador de anexo creado».
- Terminar o anular un sueldo por RUT: también pide motivo y genera borrador (R1, R11).
- **Sin capa:** ninguna capa definida para la persona («Sin sueldo resuelto: la instalación Planta Norte (ejemplo) no tiene sueldo y el puesto no tiene sueldo propio», acciones a la capa que falta).
- **Sin permiso:** montos «••••», el origen de la capa sí se ve; nota «Solo owner y admin ven los montos» (ADR-016). Si el origen de la capa también se oculta: **decide Carlos**.
- Actividad: cada cambio de capa en el Timeline de la persona, con actor (persona o «agente vía persona responsable»), motivo y enlace al borrador.

## 6. Retiro del nivel cargo (Cargos y sueldos)

- **Lista de cargos** (`/cargos`, entrada «Cargos y sueldos» del área Personas): ya **sin columnas de montos** (R3). Columnas: Cargo, Clase, Personas, Puestos, Sueldo sensible (candado), Estado. Si la entrada sigue llamándose «Cargos y sueldos» cuando el cargo ya no define montos: **decide Carlos**.
- Aviso arriba (StatePanel info, una vez): «Desde el Brief 07b el cargo no define sueldo. El sueldo sale de la instalación, del puesto o del RUT.» (ADR-036 punto 3).
- **Detalle de cargo:** datos (nombre, descripción, clase, Switch «Sueldo sensible»). Debajo, sección plegada **«Estructuras antiguas del cargo»**: las versiones que existían, en solo lectura, con badge neutro «Archivada · ya no se usa para pagar» y su rango de vigencia. Sin acciones de edición. R6: dibuja las dos variantes, **(a) archivadas** y **(b) convertidas** («Convertida en capa instalación de Planta Norte (ejemplo) el dd-mm-aaaa», con enlace), y marca **«decide Carlos»**. No dibujes ningún botón de borrar.
- En la ficha de la persona, si hubo un periodo pagado con la capa cargo, el historial lo muestra como «Capa cargo (retirada)» en solo lectura, para no perder la trazabilidad (R5: la resolución guardó la capa que rigió).

## 7. Vínculo laboral y anexo de contrato

**Vínculo laboral (pestaña Laboral de la persona):**

- Vínculo vigente (DetailSection con pares): cargo, tipo de contrato, inicio, término, **instalación**, **puesto** (opcional: «Sin puesto»), **jornada pactada** (propuesta: «45 h semanales · lunes a viernes (ejemplo)», marcada decide Carlos). R8, R9.
- Historial de vínculos (Timeline corto).
- **Editar vínculo** (Sheet): instalación (Combobox), puesto (Combobox filtrado por la instalación elegida; opción «Sin puesto»), jornada pactada (campos propuestos, decide Carlos), DateInput «desde». Validaciones inline: «El puesto no pertenece a la instalación elegida»; «Ya hay un vínculo vigente» (uno vigente por persona, ADR-036). Al cambiar instalación o puesto, **vista previa de cómo cambia la capa que rige** (antes/después) y aviso de borrador de anexo (R11).
- Error de guardado: alerta danger arriba del formulario; guardando: botón «Guardando…» y controles deshabilitados.

**Anexo de contrato en borrador:**

- **Vista del borrador** (1280 con panel lateral; 375 a pantalla completa): documento con la **plantilla base del sistema** y la **marca del tenant** (TenantMark o logo del perfil de marca, razón social y RUT ficticios del tenant de ejemplo, colores de marca solo en el documento; la UI de OPAI no cambia de color, ADR-028). Marca de agua o banda «BORRADOR». Bloques: partes; **qué cambia, antes y después** (capa, montos por concepto, instalación, rol); desde cuándo rige; espacio de firmas. Texto «texto de ejemplo».
- Panel lateral: estado (Badge «Borrador»), qué cambio lo generó, con enlace (R11), quién y cuándo, y si lo generó un agente («Generado por Agente de RRHH (ejemplo) vía la persona responsable»). Acciones de RRHH en ActionBar: **«Aprobar»** (principal) y **«Rechazar»**.
- **Aprobar** (Dialog con vista previa, R14): «Se guardará en Documentos de la persona y quedará en la bitácora». Toast de éxito. Después: el anexo aparece en la pestaña Documentos de la persona con Vigencia y «SHA-256 verificado» (R15, ADR-039).
- **Rechazar** (Dialog): motivo (si es obligatorio: decide Carlos). Estado «Rechazado» en el Timeline.
- **Agente:** variante en la que un agente intenta aprobar: aviso «Requiere aprobación de una persona» (`APPROVAL_REQUIRED`, R13). Ningún agente ve el botón «Aprobar» como acción directa.
- **Pendientes:** propuesta de lista de anexos por aprobar (en la Bandeja de Inicio y en la ficha de la persona), con persona, cambio, fecha y quién lo generó — ubicación: **decide Carlos**.
- **Lote** (propuesta, decide Carlos): cuando una nueva versión de capa instalación o puesto genera varios borradores, una vista de lote con la lista de personas y «Revisar uno por uno».

## 8. Pantallas a entregar

Estados obligatorios en cada superficie: **vacío** (con acción), **cargando** (skeleton con la forma del contenido), **error** (ErrorState con «Reintentar»), **sin permiso** (Forbidden compacto o montos «••••») y **confirmación** (Dialog con vista previa y Toast). Donde no haya una pantalla propia para un estado, va en las pantallas de estados (31 y 32).

| # | Archivo | Qué muestra |
|---|---|---|
| 01 | `01_Instalacion_sueldo_1280` | Capa instalación vigente, uso y versiones (pestaña propuesta, decide Carlos) |
| 02 | `02_Instalacion_sueldo_1280_oscuro` | La misma en oscuro |
| 03 | `03_Instalacion_sueldo_375` | La misma en celular |
| 04 | `04_Instalacion_sueldo_vacio_1024` | Instalación sin sueldo definido, con «Definir sueldo» |
| 05 | `05_Instalacion_nueva_version_1024` | Sheet de nueva versión con solape inline y vista previa de impacto |
| 06 | `06_Instalacion_confirmar_lote_375` | Dialog de confirmación: antes/después y borradores que se generan (lote, decide Carlos) |
| 07 | `07_Puestos_capa_1024` | Pestaña Puestos con el badge de capa por puesto |
| 08 | `08_Puesto_sueldo_propio_1024` | Hoja del puesto: «Usa el de la instalación» / «Sueldo propio» |
| 09 | `09_Puesto_sueldo_propio_375` | La misma en celular, con aviso de anexo al cambiar |
| 10 | `10_Persona_resolucion_1280` | Tres capas, la que rige resaltada, origen por monto |
| 11 | `11_Persona_resolucion_1280_oscuro` | La misma en oscuro |
| 12 | `12_Persona_resolucion_375` | La misma en celular |
| 13 | `13_Persona_resolucion_1024_otra_fecha` | Resolución a otra fecha, con una capa futura o una pasada |
| 14 | `14_Sueldo_por_RUT_1024` | Sheet con motivo obligatorio (botón inactivo sin motivo), vigencia y estructura completa |
| 15 | `15_Sueldo_por_RUT_confirmar_375` | Vista previa antes/después + aviso de borrador + Toast |
| 16 | `16_Persona_sin_capa_375` | Ninguna capa definida, con acciones a la capa que falta |
| 17 | `17_Persona_sueldo_sin_permiso_375` | Montos «••••» y nota de permisos |
| 18 | `18_Cargos_lista_1280` | Lista sin montos, aviso del cambio, candado de sensible |
| 19 | `19_Cargo_detalle_archivadas_1024` | Estructuras antiguas archivadas, solo lectura (variante a) |
| 20 | `20_Cargo_detalle_convertidas_375` | Variante b, convertidas en capa (R6, decide Carlos) |
| 21 | `21_Persona_historial_capa_cargo_1024` | Historial con «Capa cargo (retirada)» en solo lectura |
| 22 | `22_Vinculo_laboral_1024` | Vínculo vigente con instalación, puesto y jornada pactada; historial |
| 23 | `23_Vinculo_laboral_375` | El mismo en celular |
| 24 | `24_Vinculo_editar_375` | Sheet de edición con vista previa de cambio de capa y aviso de anexo |
| 25 | `25_Vinculo_editar_errores_1024` | Validaciones inline, guardando y error de guardado |
| 26 | `26_Anexo_borrador_1280` | Documento con plantilla base y marca del tenant + panel de RRHH |
| 27 | `27_Anexo_borrador_1280_oscuro` | La misma en oscuro (el documento conserva su fondo claro de papel; decide Carlos si se invierte) |
| 28 | `28_Anexo_borrador_375` | El borrador en celular, con Aprobar/Rechazar fijos al pie |
| 29 | `29_Anexo_aprobar_rechazar_375` | Dialogs de aprobar y rechazar, Toast, y el anexo ya en Documentos con SHA-256 verificado |
| 30 | `30_Anexos_pendientes_1024` | Lista de pendientes (Bandeja / ficha; ubicación decide Carlos), variante de agente con `APPROVAL_REQUIRED` |
| 31 | `31_Estados_1024` | Cargando, vacío, error y sin permiso de: capa instalación, resolución de persona, vínculo y anexo |
| 32 | `32_Estados_375` | Los mismos en celular |
| 33 | `33_Decide_Carlos_resumen_1280` | Tablero con todos los puntos «decide Carlos» de §2 a §7, cada uno con su propuesta y la pantalla donde aparece |
| 34 | `34_Componentes_nuevos` | Las piezas nuevas del DS (§9), claro y oscuro |

## 9. Piezas nuevas del DS (pantalla 34)

Construidas solo con los tokens y componentes existentes. Cada una con **reposo, hover (solo puntero), foco por teclado, deshabilitado y error** cuando aplique, en **claro y oscuro**, y la etiqueta «Nuevo en el DS: pendiente de aprobación». Si un componente existente ya sirve, úsalo y dilo en vez de crear uno nuevo.

| Pieza (nombre propuesto) | Qué es |
|---|---|
| `BadgeCapa` | Badge de capa: Instalación · Puesto · Sueldo por RUT · Cargo (retirada). Neutro; el color se reserva para estado (ADR-014). |
| `PilaCapas` | Las tres capas apiladas de más específica a más general, con «Rige», «No se usa: hay una capa más específica» y «No definida». |
| `OrigenMonto` | Línea secundaria o celda que dice de qué capa y versión sale un monto. |
| `TablaEstructura` | Tabla de conceptos (base, colación, movilización, gratificación, bonos con imponible) con montos, origen y variante «••••» sin permiso. |
| `VersionesVigencia` | Variante de Timeline para versiones vigente, pasadas y futuras, con el error de solape. |
| `AntesDespues` | Comparación por concepto entre la estructura actual y la nueva (capa, montos, instalación). |
| `AvisoAnexo` | Aviso informativo «Este cambio genera el borrador del anexo de contrato», con enlace al borrador cuando ya existe. |
| `ImpactoCambio` | Resumen de afectados: «3 puestos · 12 personas · 12 borradores», con lista desplegable. |
| `DocumentoBorrador` | Marco de vista de documento con la marca del tenant y la banda «BORRADOR». |
| `PanelAprobacion` | Panel o ActionBar de RRHH con estado, origen del cambio y Aprobar/Rechazar; variante de agente con `APPROVAL_REQUIRED`. |
| `DatoArchivado` | Estilo de solo lectura para estructuras antiguas del cargo (archivada o convertida), sin acciones de edición. |
| `MarcaDecideCarlos` | La etiqueta «Propuesta: decide Carlos» usada en las anotaciones (igual que en el export de navegación del Brief 05). |

## 10. Supuestos y límites

- Solo portal ERP. Portales Trabajador, Supervisor y Cliente no cambian en este diseño (el trabajador verá su anexo cuando llegue su portal, fase 3; no lo dibujes).
- Sin flujo de CPQ ni de Puestos (Brief 11): solo el bloque de sueldo del puesto.
- Sin editor de plantillas (Brief 09) y sin «grupo de sueldo» (R4).
- Datos ficticios y marcados «ejemplo» en todas las pantallas. Nada de OPAI 1.0.
- Si algo de este prompt contradice una fuente citada, manda la fuente: márcalo «decide Carlos» en la pantalla 33 en vez de elegir.
