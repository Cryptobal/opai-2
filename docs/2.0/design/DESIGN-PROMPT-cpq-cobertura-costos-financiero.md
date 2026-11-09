# Design Prompt · CPQ: cobertura (CAR-212), costos predefinidos (CAR-213) y RC/financiero por cotización (CAR-214)

**Estado:** preparado para revisión de Carlos; **no aprobado**. Lo prepara «Comercial · Code» (9-nov-2026) tras el OK de Carlos a preparar los diseños (P4). No se construye ninguna pantalla ni se ejecuta nada hasta el diseño aprobado y la autorización de ejecución (P5). El servidor de las tres ya está integrado (#380, #381, #386): estas pantallas solo lo operan.

**Regla de este prompt: reutiliza lo aprobado y dibuja solo las ampliaciones.** Lo aprobado y vigente no se redibuja: CPQ v3 (29-oct) y v4 (3-nov, 15 pantallas a 375/1024/1280, ficha B del 4-nov), con `PlanillaCotizacion`, `DetalleInstrumentos`, `CampoSueldo`, `FuenteValor`, `ChecklistRequisitos`, hoja de puesto, hoja de ítem/paquete, «Margen y finanzas» y la configuración del CPQ.

```
Diseña con el Design System de OPAI 2.0 V2 (tokens, componentes y patrones del DS 2.0; nunca el estilo de OPAI 1.0), en el mismo proyecto del export CPQ v4. Mobile e iPad primero: 375, 1024 y 1280 px. Touch targets ≥ 44 px, foco visible, contraste AA, claro y oscuro. Datos ficticios (tenant «Atlas Seguridad SpA»); nunca datos de Gard.

Contexto: en OPAI 2.0 cada empresa cotiza servicios de guardias. Ya está aprobado el cotizador (planilla, hoja de puesto, paquetes, resumen, «Margen y finanzas») y la configuración del CPQ en SOLO 3 pestañas: Catálogo, Pólizas y finanzas y Márgenes (decisión de Carlos, 29-oct; no agregues una cuarta). El servidor ya soporta tres ampliaciones que faltan en pantalla. Dibuja únicamente lo nuevo, mostrando alrededor la pantalla aprobada en gris para dar contexto.

AMPLIACIÓN A · COBERTURA (CAR-212)
La unidad de cotización pasa a ser el patrón completo, p. ej. «24/7» = 2 puestos 4x4 de día + 2 puestos 4x4 de noche. Cada empresa define esquemas de cobertura formados por tramos que reutilizan los ciclos de turno del núcleo (no se duplican patrones ni cargos).

A1. Configuración › Catálogo › nueva sub-sección «Esquemas de cobertura» (iPad y escritorio, solo owner y admin, como el resto de la configuración del CPQ; junto a Categorías y Paquetes, con el mismo patrón de tarjetas editables):
 - Lista de esquemas con nombre, resumen («4 puestos · 24/7») y estado (activo/archivado). Acciones: «Agregar esquema», editar, archivar (nunca borrar).
 - Editor (hoja o panel): nombre (único), y una lista de tramos. Cada tramo: nombre («Día 4x4»), ciclo (Combobox con los ciclos del núcleo: 4x4, 7x7, continuo…), horario (inicio–fin, p. ej. 08:00–20:00 o 20:00–08:00 que cruza medianoche), días de la semana (chips) y cantidad de puestos. Resumen vivo del total de puestos. Ejemplos a dibujar: 24/7 (2 puestos 4x4 de día + 2 de noche), 7x7, 4x4, y «continuo lunes a domingo 12 h».
 - Errores en línea: nombre repetido, ciclo inexistente, tramo sin puestos.
 - Estados: cargando, vacío con acción («Crea tu primer esquema»), error, sin permiso, guardando.

A2. Cotizador › botón «Agregar cobertura» (junto a «Agregar puesto» y «Agregar ítem», en la ficha a 375/1024/1280; hoja en el teléfono):
 - Paso 1: elegir esquema (tarjetas con su resumen). Paso 2: sección de destino (instalación o «Común») y cargo: un cargo para todos los puestos o uno distinto por tramo (Combobox). Con el cargo elegido, el sueldo se completa con el sueldo de referencia (chip «Referencia del cargo», `CampoSueldo`); el sueldo solo se ve con `cpq:costos.ver`.
 - Vista previa antes de confirmar: «Se crearán 4 puestos en Instalación Norte», lista de puestos con ciclo, horario y días, y, si la empresa tiene costos predefinidos por puesto, la línea «+ costos predefinidos por puesto» con su monto (ver ampliación B). «Confirmar» crea todo de una vez; si algo falla no queda nada a medias.
 - Estados: sin esquemas (vacío con enlace a Configuración solo para owner/admin; para otros, «Pídele a un administrador que cree esquemas»), sin cargo elegido, sin permiso de costos (no se muestra sueldo), creando, error.

A3. Tarjeta de puesto con horario y sueldo bruto visibles (hoja de puesto y fila de la planilla/lista en 375): hoy el puesto muestra patrón y posiciones; agrega horario (08:00–20:00), días y sueldo bruto con su chip de origen. Sin `cpq:costos.ver` el sueldo no se dibuja (ni vacío ni asteriscos).

AMPLIACIÓN B · COSTOS PREDEFINIDOS (CAR-213)
Cada empresa define costos que se cargan solos en cada cotización (p. ej. el uniforme): una categoría del modelo de costeo con un monto mensual, una vez por cotización (global) o en cada puesto (por puesto). No pisan lo ya editado y no se duplican.

B1. Configuración › Catálogo › nueva sub-sección «Costos predefinidos» (iPad y escritorio, owner/admin): lista editable; cada fila: categoría (Combobox con las categorías del modelo; «Feriados» NO aparece, es fija), monto mensual en CLP, alcance (`Segmentado`: «Una vez por cotización» / «En cada puesto»), activo y orden (arrastrar). Validaciones en línea: categoría repetida con el mismo alcance, monto negativo. «Guardar» reemplaza la lista, con vista previa del efecto («Se cargarán 2 costos en cotizaciones nuevas») y la nota fija: «No cambia las cotizaciones que ya existen». Estados: vacío con acción, cargando, error, sin permiso, guardando.

B2. En la cotización (planilla, hoja de puesto y «Costos por categoría»): los costos cargados por la empresa llevan el chip «Predefinido»; si la persona los edita pasan a «Editado» y no se vuelven a pisar. Botón «Cargar costos predefinidos» en una cotización en borrador (para las ya existentes) con resultado claro: «Se cargaron 2 costos» o «Sin cambios: ya estaban cargados». Una cotización enviada o en aprobación no muestra el botón.

AMPLIACIÓN C · RC Y COSTO FINANCIERO POR COTIZACIÓN (CAR-214)
Hoy la hoja «Margen y finanzas» solo enciende o apaga los tres instrumentos (costo financiero, póliza de garantía o cumplimiento, y responsabilidad civil). Lo aprobado en v3 (`DetalleInstrumentos`, R57/R60) ya define los campos, el interruptor y la marca «Sobrescrito»; falta llevarlo a la ficha y a la hoja del teléfono.

C1. «Margen y finanzas» (hoja a 375; sección en 1024/1280): cada instrumento con su `Switch` y un bloque plegable con sus campos de valor, partiendo de los valores de Configuración:
 - Costo financiero: tasa mensual.
 - Póliza de garantía o fiel cumplimiento: % garantizado, tasa anual, gasto administrativo y meses del contrato; o monto fijo en UF.
 - Responsabilidad civil: prima anual en UF y % asignado, o tasa sobre el monto asegurado; plazo: 12 meses, anual, plazo del contrato o N meses.
 - Todo valor distinto del de Configuración lleva la marca «Sobrescrito» y «Volver al valor por defecto» (por campo y por instrumento). Cambiarlo afecta solo esta cotización: no cambia Configuración ni otras cotizaciones (nota visible).
 - Efecto mensual de cada instrumento en tiempo real y la traza («activo · valor sobrescrito» / «valor de Configuración»).
 - Las fórmulas de pólizas con prima mínima y gastos de emisión están pendientes del corredor: NO dibujes esos dos campos. Los valores que se editan usan la fórmula provisional vigente; deja un `FuenteValor` o nota discreta «Fórmula provisional» sin alarmar.
 - Estados: instrumento desactivado (atenuado, vale $ 0), valor inválido, guardando, versión enviada (solo lectura), sin `cpq:costos.ver` (la sección no se muestra).

Entrega: una pantalla por archivo (.dc.html) con capturas a 375, 1024 y 1280 en claro y oscuro: «EsquemasCobertura», «AgregarCobertura», «PuestoHorarioSueldo», «CostosPredefinidos», «CostosPredefinidosEnCotizacion», «MargenFinanzasValores». Lista de componentes nuevos que falten al DS (idealmente ninguno).
```

## Propuestas de diseño que Carlos puede cambiar (no bloquean el prompt)

1. **Sin cuarta pestaña:** esquemas y costos predefinidos como sub-secciones de «Catálogo» (la configuración del CPQ está fijada en 3 pestañas, R58). Alternativa: una pestaña «Cobertura y costos»; exige reabrir esa decisión.
2. **Edición de esquemas y costos predefinidos solo en iPad y escritorio**, como la configuración del CPQ (v3 §4.12); en el teléfono solo se usan («Agregar cobertura») y se consultan.
3. **«Agregar cobertura» para quien puede editar cotizaciones**; los sueldos solo con `cpq:costos.ver`.

## Datos que el servidor ya entrega (referencia, no es parte del diseño)

`cpq.esquemas_cobertura.list/guardar`, `cpq.lineas.agregar_esquema`, `cpq.costos_predefinidos.list/guardar`, `cpq.costos_categoria.cargar_predefinidos` y `cpq.versiones.parametros` (con `instrumentos` y `restablecerInstrumentos`). **Límite técnico conocido (se resuelve al construir, no en el diseño):** la vista previa de la venta al crear puestos todavía no suma los costos predefinidos; el diseño de A2 la muestra como debe quedar.
