# Anexo — Textos base de la plantilla de seguridad (ejemplo «Atlas Seguridad SpA»)

> Parte de `docs/2.0/modulos/documentos.md` (CAR-68). Textos base de la vertical seguridad para la biblioteca de secciones y las tres plantillas. Se construyeron mejorando las propuestas ganadas más recientes de un tenant real en OPAI 1.0 (revisadas el 29-10-2026, solo lectura); aquí van con la empresa ficticia **Atlas Seguridad SpA** y el cliente ficticio **Inmobiliaria Los Andes S.A.** Sin datos personales.
> `{{variable}}` = dato que el sistema rellena (R17). **[dato del tenant]** = el tenant debe completarlo antes de publicar su plantilla; si no lo completa, la variable vacía impide publicar o enviar (R17). Los números marcados «ejemplo» son ilustrativos para el diseño, no compromisos de ninguna empresa real.

## 1. Lo que estos textos corrigen respecto de 1.0

1. **Nada interno sale al cliente:** ni margen, ni sueldos por cargo, ni costo ítem por ítem fuera de la apertura `por_item`, ni notas del generador («Pendiente de completar», «Brechas detectadas…»). Lo que falta va a `ComprobacionesEnvio` y bloquea el envío (R14, R17, R24).
2. **La norma se cita bien y en un solo lugar:** Ley 21.659 sobre Seguridad Privada (vigente desde el 28-11-2025), su reglamento (DS 209) y la Subsecretaría de Prevención del Delito, solo en «Certificaciones y cumplimiento». Los textos por negocio no citan leyes.
3. **El emisor es siempre el tenant** (`{{empresa.nombre_comercial}}`); el texto por negocio habla en primera persona plural y nunca pone al cliente como oferente.
4. **Los textos no repiten cifras:** dotación, montos y vigencia salen de los bloques de datos (R11), así no hay dos precios distintos en el mismo documento.
5. **SLA medible:** siete indicadores con compromiso y forma de medirlos en OPAI.
6. **Plan con fechas** relativas a la aceptación, en vez de una Gantt de párrafos.
7. **El cliente primero:** resumen, comprensión, solución y valor antes de lo institucional; exclusiones y supuestos explícitos, nunca vacíos.
8. **Solo se promete lo cotizado:** sin certificados, clientes ni servicios que no estén en la biblioteca aprobada o en la cotización; la matriz de cumplimiento existe solo en licitaciones privadas, contra las bases del cliente.

## 2. Biblioteca de secciones

### 2.1 Quiénes somos
**{{empresa.nombre_comercial}}** es una empresa chilena de seguridad privada. Protegemos la continuidad operacional de nuestros clientes con guardias formados para cada instalación, supervisión en terreno y una plataforma que deja registro de cada turno, ronda e incidente.
Trabajamos con edificios corporativos, condominios, centros logísticos y obras de construcción desde [dato del tenant: año], con [dato del tenant: N.º] guardias en [dato del tenant: N.º] regiones.
**Cómo nos organizamos para su servicio** (cargos, sin nombres): Gerencia General → Gerencia de Operaciones → Jefatura de Operaciones → Supervisión de terreno → Guardias en instalación, con la Central de monitoreo 24/7.
Su contacto comercial es {{ejecutivo.nombre}}, {{ejecutivo.cargo}}; en la operación, su supervisor asignado y la Central 24/7.

### 2.2 Servicios
- **Guardias en puestos fijos:** control de acceso de personas y vehículos, registro de visitas y contratistas, rondas a pie, resguardo de activos; 24/7 o en horario definido, con reemplazo garantizado.
- **Rondín vehicular:** patrullaje en vehículo con recorridos y puntos de control registrados por GPS.
- **Control de acceso con registro digital:** bitácora digital de ingresos y salidas y reportes de quién entró, cuándo y a qué zona.
- **Seguridad para obras:** puestos y rondas según la etapa del proyecto, coordinados con prevención de riesgos y la administración de obra.
- **Refuerzos:** dotación adicional para eventos o contingencias, con aviso previo de [dato del tenant: horas].
*No prestamos:* transporte de valores, guardias armados, seguridad ejecutiva ni investigación privada.

### 2.3 Supervisión y contingencias
Cada instalación tiene un supervisor asignado que la visita al menos [ejemplo: 4] veces al mes en horarios distintos y sin aviso (una nocturna como mínimo), revisa a diario las marcaciones, rondas y novedades, y se reúne cada mes con el administrador del contrato.

| Situación | Qué hacemos | Plazo |
|---|---|---|
| Ausencia o atraso de un guardia | Reemplazo con un guardia ya inducido en la instalación | Máximo 4 horas |
| Incidente crítico | Protocolo del sitio, llamado a la autoridad que corresponda, aviso a la Central y al cliente | Aviso ≤ [ejemplo: 15 min] · informe ≤ [ejemplo: 24 h] |
| Corte de energía o comunicaciones | Vía alterna de radio o teléfono con la Central | Inmediato |
| Cambio de guardia titular | Inducción en sitio y aviso al cliente | Antes del primer turno |

Escalamiento: guardia → supervisor → Central → Jefatura de Operaciones → Gerencia de Operaciones; queda escrito en el protocolo de la instalación que se entrega al iniciar.

### 2.4 Capacitación
Ningún guardia asume un puesto sin (1) formación habilitante vigente según la Ley 21.659 y su reglamento; (2) inducción en la instalación antes del primer turno (accesos, zonas críticas, consignas, contactos de emergencia, normas del cliente); (3) entrenamiento en la plataforma (marcación, rondas, novedades, incidentes). Capacitación continua cada [dato del tenant: periodicidad] en control de acceso, emergencias y evacuación, trato al público y manejo de conflictos. Cada capacitación queda registrada con fecha y asistentes, auditable por el cliente.

### 2.5 Uniformes y EPP
Uniforme corporativo completo e identificación visible. Base: camisa, pantalón, polar, chaqueta, calzado de seguridad y chaleco de alta visibilidad; en obras, casco y el EPP que exija el reglamento del cliente. Equipamiento del puesto: radio o teléfono con la plataforma y linterna. Reposición cada [dato del tenant: periodicidad] o antes si se daña. El uniforme y el EPP nunca los paga el guardia.

### 2.6 Certificaciones y cumplimiento
- Autorización como empresa de seguridad privada (Ley 21.659): [dato del tenant: resolución y vigencia].
- Seguro de responsabilidad civil: [dato del tenant: monto en UF y vigencia].
- Seguro de accidentes del trabajo (Ley 16.744): [dato del tenant: mutualidad].
- Certificado de cumplimiento laboral y previsional (F30-1) disponible cada mes.
- Ejemplo de diseño: «OS-10 vigente hasta 03-2027» e «ISO 9001 vencida 08-2026» (para mostrar el aviso de R20).
Cada línea enlaza su documento con vencimiento (R20).

### 2.7 Tecnología y control
Operamos cada turno en la plataforma. Para usted significa: **asistencia verificada** (marcación con geolocalización), **rondas con evidencia** (cada punto con hora y ubicación; las incumplidas alertan al supervisor), **libro de novedades digital**, **incidentes en tiempo real** con foto, **portal cliente** con cobertura, rondas, novedades e informes, e **informe mensual** con indicadores y acciones de mejora.

### 2.8 Indicadores de servicio (SLA)
| Indicador | Compromiso (ejemplo) | Cómo se mide |
|---|---|---|
| Cobertura de turnos | ≥ 99 % de las horas contratadas | Horas marcadas / contratadas, mensual |
| Reemplazo por ausencia | ≤ 4 horas | Aviso vs. marcación del reemplazo |
| Rondas cumplidas | ≥ 95 % de los puntos programados | Puntos marcados / programados |
| Aviso de incidente crítico | ≤ 15 min | Reporte vs. aviso al cliente |
| Informe escrito de incidente | ≤ 24 h | Fecha del informe |
| Visitas de supervisión | ≥ 4 al mes, una nocturna | Registro con geolocalización |
| Informe mensual | Primeros 5 días hábiles | Fecha de publicación en el portal |
Si un indicador queda bajo el compromiso dos meses seguidos, presentamos un plan de acción en la reunión mensual.

### 2.9 Clientes de referencia
Solo cuentas marcadas como referencia y autorizadas por el cliente (R8). Por cliente: nombre o logo · sector · servicio · desde (año). En el diseño, 6 logos genéricos. Si hay menos de 3 autorizados, el bloque se oculta.

## 3. Orden de bloques

**Presentación de empresa:** Portada · Quiénes somos · Servicios · Tecnología y control · Supervisión y contingencias (solo la tabla) · Indicadores de servicio · Capacitación y Uniformes y EPP (opcionales) · Certificaciones y cumplimiento · Clientes de referencia · Contacto del ejecutivo.

**Propuesta estándar (`por_instalacion`):** Portada · Resumen ejecutivo (Texto fijo, una página) · Comprensión del servicio · Instalaciones + Dotación por instalación · «Incluye» y exclusiones · Resumen económico · Condiciones comerciales · Indicadores de servicio · Supervisión y contingencias · Tecnología y control · Plan de implementación (Texto fijo) · Quiénes somos (corto) · Certificaciones · Clientes de referencia · Contacto del ejecutivo · Aceptación.

**Propuesta detallada (`por_categoria`):** la estándar más **Ítems y costos** por categoría (mano de obra, uniformes y EPP, equipamiento y tecnología, vehículos y logística, supervisión) y **Servicios comunes** después de la dotación, y **Capacitación** y **Uniformes y EPP** después de Tecnología. La variante licitación privada (`por_item`) suma la matriz de cumplimiento contra las bases del cliente.

**Cotización simple (una hoja):** encabezado (logo, cliente, código, fecha) · tabla de instalaciones con valor mensual · Resumen económico · «Incluye» en una línea · Condiciones en dos líneas · Validez · Aceptación · Contacto del ejecutivo.

**Resumen ejecutivo (Texto fijo):** «{{cliente.nombre}} necesita [necesidad en una frase]. Proponemos {{instalaciones.cantidad}} instalaciones con [servicio], por {{cotizacion.total_mensual}} + IVA al mes, desde {{cotizacion.inicio}}. Tres razones: supervisión en terreno con visitas nocturnas, reemplazo en máximo 4 horas y control en línea de cada turno en su portal.»

**Plan de implementación (Texto fijo):** D0 aceptación · D+3 reunión de inicio y levantamiento en terreno · D+7 protocolo de cada instalación aprobado por el cliente · D+10 selección e inducción del personal · D+15 inicio del servicio · D+45 primera revisión de indicadores.

**«Incluye» en una línea (simple):** «Incluye guardias con formación vigente, supervisión en terreno, reemplazo en máximo 4 horas, uniformes y EPP, y control en línea de cada turno.»

## 4. Ejemplo de «Comprensión del servicio» (Seguridad Torres Los Andes)

> Inmobiliaria Los Andes necesita controlar el acceso a sus dos torres de oficinas de Av. Apoquindo y resguardar de noche los estacionamientos, donde se han concentrado los daños a vehículos. Las torres reciben visitas y proveedores todo el día, y el control de quién sube a cada piso hoy depende del papel.
> Proponemos tres puestos 24/7 y uno diurno en la Torre A y la Torre B, que registran a cada visita y proveedor en la bitácora digital, y un guardia nocturno en los estacionamientos con rondas marcadas por GPS. El supervisor asignado visita las tres instalaciones de día y de noche.
> Lo que van a ver distinto: el registro de visitas disponible en su portal, cada ronda nocturna con evidencia, y un informe mensual con los indicadores comprometidos.

Reglas de escritura (persona o agente): 120–220 palabras; usar lo que el cliente contó; nombrar la instalación y sus riesgos concretos; no citar leyes; no repetir montos; no prometer lo que no está cotizado; terminar con lo que el cliente verá distinto.

## 5. Condiciones comerciales (texto base)

1. Valores en UF, netos, más IVA; se facturan en pesos al valor de la UF de [dato del tenant: día].
2. Facturación mensual, mes vencido; pago a 30 días desde la recepción de la factura.
3. Duración de 12 meses desde el inicio, renovable por períodos iguales salvo aviso con 30 días de anticipación.
4. Inicio a 15 días de la aceptación o en la fecha acordada en la reunión de inicio.
5. Reajuste: los valores en UF se reajustan con la UF; si una ley cambia el costo de la mano de obra (ingreso mínimo, cotizaciones del empleador, jornada), el valor se ajusta en la misma proporción con 30 días de aviso.
6. Cambios de dotación al mismo valor unitario por puesto; refuerzos puntuales se facturan aparte.
7. Término anticipado con aviso escrito de 30 días.
8. El cliente aporta: espacio para el puesto con energía, baño y agua; acceso a la instalación; un contacto responsable; reglamentos internos.
9. Seguros: responsabilidad civil por [dato del tenant: UF]; accidentes del trabajo según Ley 16.744.
10. Validez: {{cotizacion.valida_hasta}}.

**Exclusiones base:** transporte de valores; servicios armados; seguridad ejecutiva; investigación privada; atención médica y rescate (el guardia activa el protocolo y llama a emergencias); monitoreo de CCTV de terceros; daños causados por terceros; funciones ajenas a seguridad (conserjería, aseo, caja).
**Supuestos base:** el cliente avisa cambios de horario o acceso con 48 h; la instalación cuenta con lo del punto 8; los requisitos de ingreso del cliente se informan antes de aceptar y, si suman costo, se cotizan.

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Primera versión: textos base de la vertical seguridad (CAR-68, pregunta 14) | Carlos |
