# Rondas — Especificación funcional

**Estado:** **borrador**, pendiente de aprobación de Carlos (ADR-047) · **Tarea:** CAR-72 (pedido de Carlos del 29-oct-2026, 08:18 CLT) · **Fase:** 3, Brief 14 (y la parte nativa en el Brief 17) · **Insumos:** `extraccion/rondas-y-tickets.md` (1.0 es el piso), ADR-021, ADR-023, ADR-024, ADR-027, ADR-029, ADR-031, ADR-044, ADR-047, ADR-048, ADR-049, ADR-055; patrones `design/export-ds-2.0/pantallas/RondaPhone.html` y `RondasPanelDesktop.html`; CAR-70 (central de monitoreo, consumidora de los eventos de §8) · **Benchmark:** [`referencias/benchmark-rondas.md`](../referencias/benchmark-rondas.md) · **Autor:** Claude

> Lenguaje de negocio, sin código (ADR-047). El diseño y el brief citan las reglas por número (R1, R2…) y los criterios por CA1, CA2… Lo que todavía no está decidido va en §14, cada pregunta con su recomendación. El Design Prompt (§15) se usa **solo después** de que Carlos apruebe esta especificación.

## 1. Objetivo

Que la empresa y su cliente puedan **creer** que la ronda se hizo: quién pasó por cada punto, a qué hora, en qué orden y con qué grado de certeza, aunque no haya señal. 1.0 ya marca puntos con QR, NFC o GPS y calcula un trust score; 2.0 iguala eso y lo mejora en tres frentes: (1) reglas de GPS explícitas y configurables (precisión, radio, permanencia), (2) señales de integridad honestas según lo que cada dispositivo permite detectar, y (3) un trust score que explica por qué dio lo que dio.

**Métricas:**

- **Cumplimiento:** porcentaje de puntos obligatorios marcados a tiempo sobre los programados, por instalación y período.
- **Confianza:** porcentaje de marcas en banda verde (≥ 80) y número de rondas con señales de integridad comprometida por cada 100 rondas.
- **Reclamos del cliente** sobre rondas no hechas (meta: que cada reclamo se responda con el informe de la ronda en menos de 5 minutos).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Punto de control | Lugar físico de una instalación que el guardia debe visitar. Tiene **modo de verificación** (R1), coordenadas, radio, precisión mínima, permanencia, etiqueta QR (y NFC si aplica), instrucciones y si exige foto | Instalación, plantillas, marcas | Módulo Rondas |
| Plantilla de ronda | Secuencia de puntos (obligatorios u opcionales) con orden (estricto, sugerido o aleatorio, R12), tiempo máximo total y por tramo | Instalación, puntos, programaciones | Módulo Rondas |
| Programación | Cuándo se debe hacer una plantilla (horarios, días, ventana de tolerancia) y a quién se asigna (personas, o «quien esté de turno» si Operaciones está activo; §14, pregunta 18) | Plantilla, personas, puestos (fuente opcional) | Módulo Rondas |
| Ejecución (ronda) | Una vuelta concreta de una plantilla: programada o ad hoc. Tiene estado (§6), responsable, dispositivo, inicio, cierre, trust score y rastro | Plantilla, persona, dispositivo, marcas, novedades | Módulo Rondas |
| Marca de punto | **Hecho inmutable** (ADR-023): el guardia pasó por un punto. Lleva método, evidencias, hora del dispositivo, sello del servidor, señales y su puntaje | Ejecución, punto, documentos (fotos) | Módulo Rondas, encadenada en la bitácora del núcleo |
| Rastro | Secuencia de posiciones tomadas **solo mientras la ronda está en curso** (R9), con precisión, velocidad, batería y origen | Ejecución | Módulo Rondas |
| Señal | Observación sobre una marca o una ejecución que suma o resta confianza (geocerca, permanencia, movimiento, ubicación simulada…), con su fuente (PWA o app nativa) | Marca, ejecución | Módulo Rondas |
| Anomalía | Señal grave que pide revisión humana (velocidad imposible, salto, ubicación simulada, reloj alterado, QR leído lejos de su punto, etiqueta reemplazada), con **severidad** baja, media o alta como en 1.0 | Ejecución, marca | Módulo Rondas |
| Revisión | Lo que un supervisor concluye sobre una anomalía o una ronda (justificada, confirmada, sin conclusión), con comentario. **No modifica la marca**: es un hecho nuevo | Anomalía, ejecución | Módulo Rondas |
| Modelo de confianza | Pesos, umbrales y bandas del trust score, **versionado** por tenant (ADR-021); cada marca guarda la versión con que se calculó | Tenant, marcas | Configuración del núcleo, evaluado en `packages/domain` |
| Dispositivo | Teléfono o tableta que ejecuta la ronda (personal del guardia o emparejado a la instalación) | Ejecuciones, marcas | Núcleo (ADR-029.10; **todavía no construido**, ver §10) |
| Novedad | Observación del guardia durante la ronda (texto, foto), con **gravedad**; una novedad grave es el **incidente de terreno** de 1.0 (ADR-024) y emite su evento (§8) | Ejecución, punto | Libro de novedades (Operaciones II, Brief 12) o propio de Rondas si Operaciones no está activo (ADR-048) |

Relaciones: instalación 1–N puntos · instalación 1–N plantillas · plantilla N–N puntos (con orden) · plantilla 1–N programaciones · programación 1–N ejecuciones · ejecución 1–N marcas · ejecución 1–1 rastro · marca 1–N señales.

## 3. Pantallas y pestañas

| Pantalla | Ruta (indicativa) | Portal | Patrón | Entrada |
|---|---|---|---|---|
| Mis rondas de hoy | `/trabajador/rondas` · `/terreno/ronda` · `/supervisor/rondas/mias` | Trabajador, Terreno y Supervisor (cuando el supervisor hace la ronda) | Lista | Trabajador: «Más → Rondas asignadas»; Terreno: botón «Ronda» de la pantalla de tarea única (`NAVEGACION.md` §4) |
| Ronda en curso | `/trabajador/rondas/[id]` | Trabajador, Terreno | Ficha de tarea (como `RondaPhone`) | Desde «Mis rondas» |
| Lectura de punto (QR, NFC o GPS) | capa sobre la ronda en curso | Trabajador, Terreno | Hoja a pantalla completa | Acción principal «Marcar punto» |
| Cierre de ronda | capa sobre la ronda | Trabajador, Terreno | Resumen | Al marcar el último punto o «Terminar ronda» |
| Cola sin conexión | indicador permanente + hoja | Trabajador, Terreno | Hoja | Indicador «N pendientes de enviar» |
| Rondas de hoy (supervisor) | `/supervisor/rondas` | Supervisor | Lista con filtros por estado | Barra inferior «Visitas y rondas» |
| Control de rondas (en vivo) | `/rondas` | ERP | Tablero + lista dividida (como `RondasPanelDesktop`) | Área Operaciones → «Rondas» |
| Ficha de la ejecución | `/rondas/ejecuciones/[id]` | ERP, Supervisor | Ficha | Desde el control o la lista |
| Puntos de control | `/instalaciones/[id]/rondas` (pestaña) | ERP | Lista + drawer | Pestaña «Rondas» de la ficha de instalación |
| Plantillas y programación | `/instalaciones/[id]/rondas/plantillas` | ERP | Lista + formulario | Misma pestaña, segmentado «Puntos · Plantillas · Programación» |
| Etiquetas QR para imprimir | acción en Puntos | ERP | Documento PDF (core.documentos, marca del tenant) | Acción «Imprimir etiquetas» |
| Informes de rondas | `/rondas/informes` | ERP | Tablero | Área Operaciones → «Rondas» → pestaña «Informes» |
| Rondas del cliente | `/cliente/reportes/rondas` | Cliente | Tablero + lista | «Reportes» del Portal Cliente |
| Modelo de confianza y ajustes | Configuración → Rondas | ERP | Formulario de ajustes del núcleo (ADR-018, ADR-038) | Centro de Configuración (nunca una página propia del módulo) |

**Ficha de la ejecución**, pestañas en el orden de ADR-041: **Resumen** (estado, avance, trust score con su explicación, mapa estático con el recorrido y los puntos, línea de tiempo de marcas) → **Marcas** (cada punto con método, hora, distancia, precisión, señales y fotos) → **Rastro** (tramos, velocidad, huecos sin rastro) → **Anomalías y revisión** → **Documentos** → **Actividad**.

**Qué se hace en cada dispositivo:** en el celular se **ejecuta** (guardia), se **vigila y revisa** (supervisor) y se **consulta** (cliente). La configuración de puntos en mapa, plantillas, programación, modelo de confianza e informes largos es de iPad y escritorio; en el celular el supervisor puede **crear un punto en el lugar** (toma la posición actual, R4) porque ahí es donde está físicamente.

## 4. Campos y validaciones

### Punto de control

| Campo | Tipo | Obligatorio | Validación | Quién lo edita | Visible para el cliente o el trabajador |
|---|---|---|---|---|---|
| Nombre | texto | sí | 2–80 caracteres, único dentro de la instalación | admin, gerente, supervisor (sus instalaciones) | ambos |
| Instalación | referencia | sí | del mismo tenant y dentro del alcance del usuario | — (fijo al crear) | ambos |
| Modo de verificación | `QR`, `GPS`, `QR + GPS`, `NFC`, `NFC + GPS` | sí | por defecto el de la instalación, que hereda del tenant (R1) | admin, gerente, supervisor | trabajador |
| Coordenadas | lat/lng | si el modo incluye GPS | dentro del radio de la dirección de la instalación (aviso si está a más de 2 km) | idem | cliente (en el mapa) |
| Radio de geocerca | metros | si incluye GPS | 5–200 m; defecto del tenant (R3) | idem | no |
| Precisión mínima aceptada | metros | si incluye GPS | 5–100 m; defecto del tenant (R3) | idem | no |
| Permanencia mínima | segundos | no | 0–300 s; defecto 0 con QR/NFC y 15 s con solo GPS (R5) | idem | trabajador (lo ve como cuenta regresiva) |
| Etiqueta QR | código | si incluye QR | generado por OPAI, único por tenant, no adivinable, reemplazable (R7) | admin, gerente | no (se imprime) |
| Etiqueta NFC | identificador | si incluye NFC | único por tenant | admin, gerente | no |
| Exige foto | sí/no | no | defecto no | admin, gerente, supervisor | trabajador |
| Instrucciones | texto | no | ≤ 500 caracteres | idem | trabajador |
| Estado | activo / archivado | sí | un punto con marcas nunca se borra, se archiva | admin, gerente | no |

### Plantilla

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | sí | único por instalación |
| Puntos | lista ordenada | sí | ≥ 1 punto activo de la misma instalación; cada uno obligatorio u opcional |
| Orden | `sugerido`, `estricto`, `aleatorio por ejecución` | sí | defecto `sugerido` (R12) |
| Tiempo máximo total | minutos | sí | 5–480 |
| Tiempo máximo por tramo | minutos | no | menor que el total |
| Umbral de incompleta | % de puntos obligatorios sin marcar | sí | defecto 20 % (piso de 1.0) |

### Programación

Horarios (lista de horas o «cada N minutos entre A y B»), días de la semana, vigencia, ventana de tolerancia para iniciar (defecto ± 15 min), responsables (personas, o «quien esté de turno en el puesto X» si Operaciones está activo), y si se permiten rondas ad hoc en la instalación.

### Marca de punto (la escribe el dispositivo; nadie la edita)

Método usado, hora del dispositivo, **sello de hora del servidor** al recibirla, desfase del reloj (R14), posición, precisión, distancia al punto, tiempo de permanencia, foto (vía `core.documentos`), origen (`PWA` o `app nativa`, con versión), `idempotencyKey`, número de secuencia dentro de la ejecución, si llegó por la cola sin conexión, señales calculadas, puntaje y versión del modelo de confianza.

## 5. Reglas de negocio

### Modo por punto y configuración

- **R1. Modo por punto, heredado en cascada.** Cada punto se verifica por `QR`, `GPS`, `QR + GPS`, `NFC` o `NFC + GPS`. El valor sale, en este orden, del punto → de la instalación → del tenant → de la plantilla de la vertical (que se **copia** al tenant al activarlo, ADR-021/P13). Cambiar el defecto del tenant no cambia los puntos que ya tienen un valor propio.
- **R2. Qué significa «QR + GPS».** Por defecto el QR (o NFC) **identifica** el punto y el GPS **suma confianza**: la marca vale aunque el GPS falle, pero sin geocerca validada pierde esos puntos del trust score y queda la señal «sin GPS» (como en 1.0 y ADR-023: el GPS es evidencia, nunca bloquea). El tenant puede elegir el modo **estricto** por punto o instalación: entonces una lectura de QR fuera de la geocerca queda como marca «fuera de geocerca» y dispara anomalía (§14, pregunta 2).
- **R3. Radio y precisión.** Una lectura GPS cuenta como **dentro** del punto si su distancia al centro es ≤ al radio **y** su precisión informada es ≤ a la precisión mínima aceptada; **dudosa** si la distancia es ≤ radio + precisión pero no cumple lo anterior; **fuera** en otro caso. Defectos propuestos: radio 20 m y precisión mínima 25 m (1.0 usaba 5 m de radio, que es menor que el error típico de un teléfono; §14, pregunta 1).
- **R4. Crear un punto en el lugar.** El supervisor puede fijar las coordenadas de un punto parado en él: OPAI toma varias lecturas durante al menos 20 s, descarta las de peor precisión y guarda el promedio con su precisión. Si la mejor precisión es peor que 30 m, advierte que el punto quedará impreciso y sugiere QR.
- **R5. Permanencia.** Con modo solo `GPS`, el punto se da por visitado cuando hay **al menos dos lecturas dentro** separadas por la permanencia mínima (defecto 15 s). Con QR o NFC la permanencia es opcional (defecto 0).
- **R6. Todo es configurable por tenant, con defecto de la vertical.** Radios, precisiones, permanencias, modos, pesos y bandas del trust score, umbrales de anomalía, tolerancias, cierres automáticos y alertas son ajustes declarados por el módulo (`defineAjustes`) en los ámbitos plataforma → tenant; el valor propio de una instalación o de un punto se guarda como dato de esa instalación o punto en el módulo, porque hoy el centro de Configuración no tiene ámbito «instalación» (ámbitos plataforma, tenant y usuario, ADR-038; ver §10). Nada es igual para todos.

### Etiquetas QR y NFC

- **R7. Etiqueta QR no adivinable.** El QR contiene un identificador opaco y firmado por OPAI (no el nombre ni el ID interno del punto), único por tenant. Se puede **reemplazar** (por ejemplo si se sospecha que alguien la fotografió): la etiqueta anterior queda inválida desde ese momento y su lectura posterior dispara la anomalía «etiqueta reemplazada».
- **R8. QR leído lejos de su punto.** Si un QR se lee con una posición válida a más de 100 m de su punto (umbral configurable), se registra la marca con la anomalía «QR leído lejos de su punto»: es la señal típica de una etiqueta fotocopiada o fotografiada.

### Rastro y fidelidad del GPS

- **R9. Rastro solo durante la ronda.** OPAI toma posiciones **solo entre el inicio y el cierre de la ronda**, nunca fuera de ella (Ley 21.719 y privacidad del trabajador; §14, pregunta 16). Frecuencia por defecto: cada 15 s o cada 10 m, lo que ocurra primero, adaptada a la batería (R11).
- **R10. Huecos honestos.** Cuando no hay posiciones (pantalla apagada en la PWA, sin señal GPS, permiso revocado), el rastro muestra un **tramo sin rastro** con su duración y causa probable; nunca se dibuja una línea inventada entre dos puntos. Un tramo sin rastro largo (defecto > 5 min) es una señal, no una anomalía, porque en la PWA es normal (§10).
- **R11. Batería.** Si el dispositivo informa batería, se registra en el rastro. Bajo 20 % se reduce la frecuencia a la mitad; bajo 10 % se toma posición solo al marcar un punto. El guardia ve un aviso. Si el dispositivo **no informa** batería (Safari no lo permite), la señal «batería» queda «no disponible» y su peso se reparte entre las demás: **no castiga** al guardia (R17).
- **R12. Orden de los puntos.** `sugerido` (cualquier orden, se muestra el siguiente recomendado), `estricto` (marcar fuera de orden queda como señal «fuera de orden») o `aleatorio por ejecución` (OPAI sortea el orden al iniciar, para que la ronda no sea predecible; se muestra uno a uno).
- **R13. Velocidad, saltos y teletransporte.** Entre dos posiciones o marcas consecutivas se calcula la velocidad. Sobre la velocidad máxima a pie configurada (defecto 3 m/s sostenidos; 8 m/s en instalaciones marcadas «con vehículo») se emite «velocidad imposible»; un desplazamiento > 500 m en < 10 s es «salto». Ambas son anomalías.
- **R14. Hora del servidor manda.** Toda marca guarda la hora del dispositivo y el **sello del servidor** al recibirla. Con conexión, la diferencia mayor a 2 min es la señal «reloj del dispositivo desfasado». Sin conexión, la app guarda el desfase medido en la última sincronización y el tiempo transcurrido desde entonces según el reloj interno que el usuario no puede cambiar; al sincronizar, OPAI estima la hora real y, si difiere de la declarada en más de 5 min, emite la anomalía «reloj alterado». Limitación declarada: en la PWA ese reloj interno se reinicia si la app se cierra; entonces la estimación queda «no verificable» (señal neutra, no anomalía). El comportamiento exacto de ese reloj en cada navegador se prueba en el brief.
- **R15. Ubicación simulada, root y emulador: solo lo que se puede probar.** OPAI registra estas señales **solo cuando el dispositivo las entrega de verdad**: en la app nativa de Android, la marca de ubicación simulada del sistema y el veredicto de integridad del dispositivo (Play Integrity); en la de iOS, el indicador de ubicación simulada por software y la certificación de la app (App Attest). En la PWA no existen esas señales: la ficha lo dice («integridad del dispositivo: no verificable desde el navegador») y solo se aplican heurísticas (R16). Una señal positiva de ubicación simulada **limita el trust score de la marca a rojo** (máximo 40) y emite la anomalía «ubicación simulada», con revisión humana.
- **R16. Heurísticas que sí funcionan en la PWA.** Precisión idéntica en lecturas sucesivas, coordenadas que no varían nada estando «en movimiento», posiciones con hora anterior a la lectura, velocidad imposible (R13), lectura fuera de la ronda en curso y ausencia total de movimiento del teléfono (acelerómetro) mientras el GPS dice que camina. Cada heurística es una **señal** con su peso; ninguna sola es prueba de fraude, por eso ninguna sola llega a anomalía salvo R13.
- **R17. Señales no disponibles no castigan.** Si una fuente no existe en el dispositivo (batería en iOS, acelerómetro sin permiso, integridad en la PWA, redes cercanas en iOS), la señal queda «no disponible» y su peso se reparte proporcionalmente entre las disponibles. La ficha muestra qué faltó.
- **R18. Redes cercanas y balizas: solo en la app nativa.** La huella de redes Wi-Fi y Bluetooth cercanas al punto (capturada al crearlo y comparada al marcar) solo existe en la app nativa: Wi-Fi solo en Android (el navegador no tiene API y iOS lo restringe) y Bluetooth en la app nativa de Android e iOS (el navegador de iOS no tiene Web Bluetooth) (benchmark §B). Las balizas Bluetooth (BLE) como tipo de punto quedan fuera del Brief 14 (§14, pregunta 10).

### Trust score

- **R19. Trust score por marca y por ronda, explicado.** Cada marca tiene un puntaje 0–100, suma de las señales disponibles según el modelo de confianza vigente del tenant; la ronda es el promedio de sus marcas obligatorias (cambio frente a 1.0, que promediaba todas: un punto opcional no marcado no castiga), con las bandas de 1.0 (verde ≥ 80, amarillo ≥ 60, rojo < 60). La ficha muestra **el desglose** («geocerca 30/30, foto 0/15 porque no se pidió, movimiento 15/15…»).
- **R20. Pesos de 1.0 como piso y modelo versionado.** El modelo inicial se llama «OPAI 1.0» y usa los pesos de 1.0: geocerca 30, velocidad bajo umbral 20, movimiento real 15, foto 15, mismo dispositivo 10, batería > 10 % 10. El tenant puede crear versiones nuevas (por ejemplo «Seguridad 2026», §14, pregunta 4); una versión nueva aplica a las marcas siguientes y nunca recalcula las ya hechas, salvo un **recálculo explícito** que queda en la auditoría y deja ambas versiones visibles.
- **R21. El trust score nunca bloquea la marca.** La marca es un hecho; el puntaje es una evaluación. Un puntaje rojo emite un evento y pide revisión, pero no impide marcar, cerrar ni pagar.

### Ejecución, sin conexión y cierre

- **R22. Ronda sin conexión.** Iniciar, marcar, sacar fotos, registrar novedades y cerrar funcionan sin red (ADR-044.3). Cada hecho entra en una cola local con su `idempotencyKey` generada en el dispositivo, su número de secuencia y su evidencia. El guardia ve siempre cuántos hechos están **pendientes de enviar** y no puede cerrar sesión ni desemparejar el dispositivo con pendientes sin una advertencia explícita.
- **R23. Reconciliación.** Al volver la red, la cola se envía por las **mismas capacidades** que se usan con conexión. El servidor acepta los hechos en cualquier orden, ignora los duplicados (misma clave, mismo resultado) y sella la hora de recepción; los muestra en el orden de su secuencia en el dispositivo, pero un conflicto (dos hechos sobre lo mismo) se resuelve por el sello del servidor (ADR-029.9). Una marca que llega después de un cierre automático **se agrega** a la ronda con la etiqueta «sincronizada después del cierre», el estado se recalcula y queda evento y auditoría; nunca se descarta en silencio.
- **R24. La cola sobrevive.** La app pide almacenamiento persistente al navegador (Safari puede borrar datos tras 7 días sin uso —la app instalada en la pantalla de inicio lleva su propio contador— y concede la persistencia por criterios propios, benchmark §B); si el sistema no lo concede, avisa que con poco espacio el teléfono podría borrar marcas sin enviar. Fotos pendientes se guardan comprimidas (ADR-044.5). Una versión nueva de la app nunca se activa a mitad de una ronda ni con hechos pendientes en la cola (ADR-044.2).
- **R25. Estados y cierres automáticos de 1.0.** Se conservan los estados de 1.0 (§6) y los cierres automáticos: «no realizada» si no se inicia dentro de la ventana; «cerrada automáticamente» si sigue en curso pasado su tiempo máximo más la tolerancia; «incompleta» si al cerrar faltan más puntos obligatorios que el umbral (1.0 contaba todos los puntos; 2.0 solo los obligatorios). Las rondas ad hoc abiertas («libres» en 1.0) también se cierran solas pasado su tiempo máximo. Al cerrar se guarda una **instantánea del recorrido** (rastro simplificado y puntos), como `route_snapshot` en 1.0, para informes rápidos. Los crons solo encolan trabajos (ADR-029).
- **R26. Rondas ad hoc.** El guardia puede iniciar una ronda no programada de una plantilla de su instalación si la instalación lo permite; queda marcada «ad hoc» y no cuenta para el cumplimiento de las programadas.
- **R27. Una ronda, un responsable, un dispositivo.** Una ejecución tiene un responsable y se ejecuta en un dispositivo. Si se continúa en otro dispositivo (teléfono descargado), queda la señal «cambio de dispositivo» con hora; nunca dos dispositivos marcan la misma ejecución a la vez.
- **R28. Hechos inmutables y encadenados.** Marcas, inicio y cierre de la ronda son hechos inmutables con sello del servidor, hash y bitácora encadenada del núcleo (ADR-023 y REGLAS-codigo, «Hechos regulados»). Una corrección (por ejemplo invalidar una marca hecha por error) es un **hecho nuevo** con motivo, que hace un rol autorizado y que el agente solo puede proponer con aprobación humana (R34).

### Vistas, alertas e informes

- **R29. Alcance por filas.** El supervisor ve solo las instalaciones a su cargo; el cliente solo las de su cuenta; el trabajador solo sus rondas. El filtro va en la consulta (ADR-022).
- **R30. Lo que ve el cliente.** Cumplimiento, rondas con sus horas y puntos, recorrido en el mapa y las novedades que el tenant marque como visibles. No ve los desgloses del trust score ni las anomalías internas, salvo que el tenant active «mostrar banda de confianza al cliente» (§14, pregunta 7).
- **R31. Eventos para la central (CAR-70).** Rondas emite eventos de dominio por outbox (§8) y **no** decide a quién llamar ni escala: eso es de la central y de Comunicaciones (silencio por defecto, ADR-020).
- **R32. Informes desde los hechos.** Todo informe (cumplimiento, puntos omitidos, confianza, anomalías, recorridos, mapa de calor de puntos) se calcula desde las marcas y su sello del servidor. El informe al cliente sale en PDF por `core.documentos` con la marca del tenant (ADR-028) y su envío programado es opcional por cuenta.

### Agentes

- **R33. Agent-first con límites físicos.** Todo lo que se hace en pantalla de configuración, vigilancia, revisión e informes existe como capacidad y herramienta MCP para agentes externos y el agente interno (ADR-049, ADR-055), con los permisos y el alcance del usuario. **Marcar un punto, iniciar y cerrar la propia ronda** exigen presencia física y solo se aceptan desde una sesión de trabajador o un dispositivo emparejado, con evidencia; para un agente quedan en la lista de excepciones de paridad con ese motivo (§9 y §14, pregunta 11).
- **R34. Lo irreversible va a aprobación humana.** Cerrar una ronda como administrador, invalidar una marca, reemplazar una etiqueta QR, recalcular puntajes con otro modelo y publicar un modelo de confianza nuevo piden `APPROVAL_REQUIRED` a los agentes, con vista previa.
- **R35. Emergencia aunque no haya central.** La ronda en curso tiene un botón «Emergencia» (como las alertas de pánico de 1.0) que funciona sin conexión en cuanto vuelve la señal y emite `rondas.emergencia`. Con la central (CAR-70) activa, ella la atiende y escala; **sin central** (Rondas vendido solo, ADR-048), Comunicaciones la entrega por push y correo al supervisor de la instalación y a los responsables que el tenant elija, que la reconocen en su portal (§14, pregunta 21).

## 6. Estados y transiciones

Estados de la ejecución (los de 1.0): `pendiente → en_curso → completada | incompleta | no_realizada | cerrada_auto | cerrada_admin`.

| Desde | Hacia | Quién | Condición | Efecto | ¿Reversible? |
|---|---|---|---|---|---|
| — | pendiente | trabajo programado | llega la hora de la programación | se asigna al responsable y aparece en «Mis rondas» | — |
| pendiente | en_curso | guardia (sesión o dispositivo) | dentro de la ventana de tolerancia | empieza el rastro (R9) | no (es un hecho) |
| — | en_curso (ad hoc) | guardia | la instalación permite ad hoc (R26) | ídem | no |
| pendiente | no_realizada | trabajo `rondas.cierres` | pasó la ventana sin iniciar | evento `rondas.ejecucion.no_realizada` | nadie la revierte a mano; si luego llegan marcas sin conexión (R23), el sistema la recalcula a `completada` o `incompleta` con la etiqueta «sincronizada después del cierre» |
| en_curso | completada | guardia | marcó todos los obligatorios o cierra con faltantes ≤ umbral | se detiene el rastro; trust score de la ronda | no |
| en_curso | incompleta | guardia o trabajo | cierre con faltantes > umbral | evento `rondas.ejecucion.incompleta` | no |
| en_curso | cerrada_auto | trabajo `rondas.cierres` | tiempo máximo + tolerancia vencido | ídem; si llegan marcas tardías (R23), el sistema la recalcula a `completada` o `incompleta` con la etiqueta «sincronizada después del cierre» | solo por ese recálculo automático |
| en_curso / pendiente | cerrada_admin | admin, gerente, supervisor (alcance); agente con aprobación | motivo obligatorio | evento y auditoría | **irreversible** (R34) |

Las anomalías tienen su propio ciclo: `abierta → revisada (justificada | confirmada | sin conclusión)`; la revisión es un hecho nuevo y se puede complementar, no borrar.

## 7. Permisos por rol y portal

Permisos `rondas:<accion>` (ADR-016). Alcance de filas por ADR-022 (R29).

| Acción | owner | admin | gerente | supervisor | viewer | Portal Cliente | Portal Trabajador / Terreno | Agente (scope) |
|---|---|---|---|---|---|---|---|---|
| Ver control, ejecuciones e informes | ✓ | ✓ | ✓ | ✓ (sus instalaciones) | ✓ | ✓ (su cuenta, R30) | solo las propias | `rondas:read` |
| Crear y editar puntos | ✓ | ✓ | ✓ | ✓ (sus instalaciones) | — | — | — | `rondas:configurar`, con vista previa |
| Reemplazar etiqueta QR | ✓ | ✓ | ✓ | — | — | — | — | ídem + aprobación humana |
| Plantillas y programación | ✓ | ✓ | ✓ | ✓ (sus instalaciones) | — | — | — | `rondas:configurar`, con vista previa |
| Ejecutar ronda y marcar puntos | — | — | — | ✓ (si hace la ronda) | — | — | ✓ | **no** (R33) |
| Revisar anomalías | ✓ | ✓ | ✓ | ✓ (sus instalaciones) | — | — | — | `rondas:revisar`, con vista previa |
| Cerrar como administrador, invalidar marca | ✓ | ✓ | ✓ | ✓ (sus instalaciones) | — | — | — | `rondas:administrar` + aprobación humana |
| Modelo de confianza y ajustes | ✓ | ✓ | — | — | — | — | — | `rondas:confianza.manage` (permiso propio, como `cpq:modelo.manage`) + aprobación humana para publicar |

Todos los permisos son asignables a roles personalizados (ADR-022).

## 8. Eventos y notificaciones

Todos se emiten por outbox en la misma transacción (ADR-029). **Silencio por defecto** (ADR-020): el tenant decide en Configuración → Comunicaciones quién se entera y por qué canal; la central (CAR-70) se suscribe a los que necesite.

| Evento | Cuándo ocurre | Quién se entera por defecto | Canal sugerido | Plantilla |
|---|---|---|---|---|
| `rondas.ejecucion.iniciada` / `.completada` | inicio y cierre | nadie | — | — |
| `rondas.ejecucion.atrasada` | en curso y fuera del tiempo máximo, o tramo vencido | nadie (la central y el supervisor si el tenant lo activa) | push | «Ronda {plantilla} en {instalación} va {minutos} min atrasada» |
| `rondas.ejecucion.no_realizada` | ventana vencida sin iniciar | ídem | push, correo | «No se inició la ronda de las {hora}» |
| `rondas.ejecucion.incompleta` | cierre con faltantes | ídem | push | «Ronda cerrada con {n} puntos sin marcar» |
| `rondas.punto.omitido` | el tramo de un punto obligatorio vence | ídem | push | — |
| `rondas.anomalia.detectada` | R7, R8, R13, R14, R15 | ídem | push | «Revisar ronda: {tipo de anomalía}» |
| `rondas.ronda.sin_movimiento` | ronda en curso sin desplazamiento ni movimiento del teléfono por N min (defecto 10) | la central si está activa | push | Es insumo de la central para «hombre caído»; Rondas no escala (R31) |
| `rondas.ronda.sin_rastro` | tramo sin rastro > umbral | nadie | — | — |
| `rondas.marca.sincronizada_tarde` | R23 | nadie | — | — |
| `rondas.emergencia` | botón «Emergencia» (R35) | la central; sin central, el supervisor de la instalación (excepción al silencio por defecto, §14, pregunta 21) | push, correo | «Emergencia en {instalación}: {persona} durante la ronda {plantilla}» |
| `rondas.novedad.grave` | novedad con gravedad alta (incidente de terreno) | nadie (la central si está activa) | push | «Incidente en {instalación}: {resumen}» |
| `rondas.informe.cliente` | informe programado por cuenta | contactos del cliente que el tenant elija | correo con PDF | plantilla editable con marca del tenant |

## 9. Herramientas MCP

**Paridad (ADR-004, ADR-055):** cada acción de pantalla de este módulo es una capacidad, y la pantalla, `/api/v1` y el MCP invocan la **misma** capacidad con los mismos permisos, alcance y auditoría; lo que hace el agente interno queda auditado como «agente interno vía <usuario>» (ADR-049 punto 5). Las tablas que nazcan de esta especificación llevan `tenant_id` con RLS y la política `tenant_isolation`, con su prueba de dos empresas (AGENTS.md, «Multi-tenant»). Capacidades `rondas.<entidad>.<verbo>` (REGLAS-codigo); el nombre de la herramienta MCP se genera en minúsculas con guiones bajos (por ejemplo `rondas_plantillas_crear` y su `preview_rondas_plantillas_crear`). Cada escritura acepta `dryRun` (`preview_…` en MCP) e `idempotencyKey`, y queda auditada.

| Herramienta | Qué hace (lenguaje de negocio) | Tipo | Con vista previa | Aprobación humana |
|---|---|---|---|---|
| `rondas.control.leer` | Estado en vivo de las rondas de hoy por instalación (programadas, en curso, atrasadas, omitidas, cumplimiento) | lectura | — | — |
| `rondas.ejecuciones.listar` / `.leer` | Rondas de un período o una ronda con sus marcas, señales, rastro resumido y desglose del trust score | lectura | — | — |
| `rondas.anomalias.listar` | Anomalías abiertas por instalación, tipo y antigüedad | lectura | — | — |
| `rondas.informes.cumplimiento` | Cumplimiento y confianza por instalación, plantilla, persona y período | lectura | — | — |
| `rondas.puntos.crear` / `.actualizar` / `.archivar` | Configura puntos (modo, coordenadas, radio, precisión, permanencia, foto) | escritura | sí | no (archivar: no, porque no borra) |
| `rondas.puntos.reemplazar_etiqueta` | Invalida la etiqueta QR actual y genera una nueva | irreversible | sí | **sí** |
| `rondas.plantillas.crear` / `.actualizar` | Arma la secuencia de puntos, orden y tiempos | escritura | sí | no |
| `rondas.programaciones.fijar` / `.pausar` | Define o pausa cuándo y a quién | escritura | sí | no |
| `rondas.anomalias.revisar` | Registra la conclusión de un supervisor sobre una anomalía | escritura | sí | no |
| `rondas.ejecuciones.cerrar_admin` | Cierra una ronda con motivo | irreversible | sí | **sí** |
| `rondas.marcas.invalidar` | Registra la invalidación de una marca con motivo (hecho nuevo) | irreversible | sí | **sí** |
| `rondas.confianza.publicar_modelo` / `.recalcular` | Publica una versión del modelo de confianza o recalcula un período con otra versión | irreversible | sí | **sí** |
| `rondas.etiquetas.pdf` | Genera el PDF de etiquetas QR de una instalación | escritura (documento) | sí | no |
| `rondas.ejecuciones.iniciar`, `rondas.marcas.registrar`, `rondas.ejecuciones.cerrar`, `rondas.novedades.registrar`, `rondas.emergencia.activar` | Ejecución en terreno: iniciar y cerrar la propia ronda, marcar un punto, registrar una novedad y activar la emergencia (R35) | escritura | sí: aceptan `dryRun` e `idempotencyKey` como toda escritura (la vista previa valida sin escribir) | **excepción de paridad para agentes** (R33), declarada `soloPersonas` en `paridad-excepciones.ts` con el motivo «hecho físico en terreno»: solo sesión de trabajador o dispositivo emparejado (§10) |
| `rondas.emergencia.reconocer` | Registra que el supervisor o la central recibió la emergencia y la está atendiendo | escritura | sí | no (un agente puede reconocerla en nombre de su usuario; queda «agente vía <usuario>») |

**Flujos típicos de un agente** (para `docs/2.0/agentes/rondas.md`, con su escenario de prueba, ADR-034):

1. «¿Cómo van las rondas de hoy?» → `rondas.control.leer` → si hay atrasadas, `rondas.ejecuciones.leer` de cada una → resumen. Se detiene ahí: no llama a nadie (eso es la central, CAR-70).
2. «Arma la ronda nocturna de la Planta Quilicura con estos 6 puntos» → `preview_rondas_plantillas_crear` → muestra la vista previa → con confirmación del usuario (ADR-049 punto 4) la crea → `preview_rondas.programaciones.fijar`.
3. «Revisa las anomalías de la semana» → `rondas.anomalias.listar` → propone una conclusión por anomalía → el supervisor confirma cada `rondas.anomalias.revisar`.
4. «Cierra la ronda pegada de Bodega Lampa» → `preview_rondas_ejecuciones_cerrar_admin` → `APPROVAL_REQUIRED` → queda en la cola de aprobación humana.

## 10. Integraciones y qué permite cada dispositivo

**Del núcleo:** geolocalización y mapas estáticos por el servicio del núcleo (ADR-027, `packages/integrations/src/geo`), medidos en `core.consumos` (ADR-031); fotos por `core.documentos` (ADR-019, ADR-039); comunicaciones y push (ADR-020, ADR-044.4); bitácora encadenada (ADR-023); inventario de dispositivos emparejados (ADR-029.10, **pendiente en el núcleo**: el Brief 14 lo necesita o debe construir su parte mínima, a confirmar al planificar).

**Dependencias del núcleo que hoy faltan (a resolver al planificar el Brief 14):**

- **Actor «dispositivo».** El registro de capacidades conoce hoy los actores sistema, usuario y agente; no hay un actor de dispositivo emparejado. La excepción de paridad de R33 (solo `interna` o `soloPersonas`, ADR-055) cubre la sesión del trabajador, pero un dispositivo de Terreno con key sería un agente y quedaría bloqueado. El Brief 14 necesita la identidad de dispositivo de ADR-029.10 o ejecuta en Terreno con la sesión del guardia que la usa.
- **Ámbito «instalación» en Configuración.** No existe (R6); mientras tanto, los valores por instalación son datos del módulo.

**Fuentes opcionales (ADR-048):** Operaciones (asignar la ronda a «quien esté de turno en el puesto»; libro de novedades), Asistencia (cruzar que el guardia marcó entrada), Tickets (crear un ticket desde una anomalía, siempre con responsable, ADR-025), Central de monitoreo (CAR-70, consume eventos). Sin ellas, Rondas funciona con personas asignadas a mano y novedades propias.

**PWA o app nativa: qué se puede detectar.** Resumen; las fuentes están en [`referencias/benchmark-rondas.md` §B](../referencias/benchmark-rondas.md).

| Capacidad | PWA en Android (Chrome) | PWA en iOS (Safari, instalada) | App nativa (Capacitor, Brief 17) |
|---|---|---|---|
| Posición con precisión, con pantalla encendida | sí | sí | sí |
| Posición con la pantalla apagada o la app en segundo plano | **no** | **no** | sí (servicio en primer plano en Android; «ubicación siempre» en iOS) |
| Mantener la pantalla encendida durante la ronda | sí (Wake Lock) | sí desde iOS 18.4 (en apps instaladas falló hasta esa versión según un tercero; se prueba en el brief) | sí |
| Leer QR con la cámara | sí | sí (decodificador propio; el detector nativo del navegador no está en Safari) | sí |
| Leer NFC | sí (Web NFC, solo Chrome Android) | **no** | Android sí; iOS con Core NFC (no verificado en esta sesión) |
| Detectar ubicación simulada | **no** (solo heurísticas, R16) | **no** | **parcial**: no detecta todas las herramientas ni un teléfono con root que oculte la marca (Android: marca de ubicación simulada; iOS 15+: indicador de simulación por software) |
| Integridad del dispositivo y de la app | **no** | **no** | Android: dispositivo y app (Play Integrity: root, emulador); iOS: que la app es auténtica (App Attest), **no** detecta jailbreak |
| Redes Wi-Fi cercanas | **no** | **no** | solo Android (con permisos y límites de frecuencia) |
| Bluetooth cercano (balizas) | sí en Chrome Android, con elección manual del dispositivo (inútil para escanear) | **no** | sí |
| Movimiento del teléfono (acelerómetro) | sí | sí, con permiso explícito (conocimiento previo, a verificar en el brief) | sí |
| Nivel de batería | sí (Chromium; sin enlace verificado) | **no** | sí |
| Sincronizar la cola en segundo plano | parcial (Background Sync) | **no** (solo al abrir la app) | sí |
| Push | sí | sí, instalada (iOS 16.4+) | sí (APNs/FCM) |

**Recomendación (detalle en §14, pregunta 5):** el **Brief 14 se construye como PWA** y entrega rondas por QR (y NFC en Android) con GPS como evidencia mientras la pantalla está activa, con Wake Lock y huecos honestos; eso iguala lo que 1.0 hace hoy en el navegador. La **fidelidad completa** —rastro con pantalla apagada, ubicación simulada, integridad del dispositivo, redes cercanas— exige la **app nativa con Capacitor** (Brief 17, ya decidido en ADR-044.8 y la decisión 12 de Carlos). Cada marca registra su origen y el tenant puede **exigir la app nativa** por instalación cuando exista. Así nadie vende como «antifraude» algo que el navegador no puede medir.

## 11. Mejoras respecto de 1.0 y lo que no se porta

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| Método de verificación por marca (QR, NFC o GPS) | **Modo por punto** con cascada tenant → instalación → punto y modo combinado `QR + GPS` (R1, R2) | Se decide dónde importa cada cosa, no en cada marca |
| Geocerca de 5 m por defecto | Radio **y** precisión mínima, con estado dentro / dudosa / fuera (R3) y permanencia (R5) | 5 m es menor que el error típico de un teléfono: generaba falsos «fuera» |
| Confianza geográfica `high/low/unknown` | Señales con fuente, peso y «no disponible» (R15–R17) | Se explica el puntaje y no se castiga por lo que el teléfono no informa |
| Trust score con pesos fijos (configurables) | Mismos pesos como modelo «OPAI 1.0», **versionado**, con desglose visible y recálculo auditado (R19, R20) | Comparabilidad durante la convivencia y trazabilidad |
| Anomalías: velocidad, saltos, teletransporte | Las mismas + reloj alterado, QR lejos de su punto, etiqueta reemplazada, ubicación simulada (nativa) (R8, R13–R15) | Cubre el fraude del QR fotocopiado y del reloj cambiado |
| Tracking con batería y precisión | Igual, solo durante la ronda, adaptado a la batería, con huecos honestos (R9–R11) | Privacidad y batería; sin líneas inventadas |
| Offline con `is_offline_sync` | Cola idempotente con secuencia, reconciliación sin pérdida tras cierres automáticos y almacenamiento persistente (R22–R24) | En 1.0 una marca tardía podía quedar fuera de una ronda ya cerrada (a verificar en 1.0) |
| QR con el ID del punto | QR opaco, firmado y reemplazable (R7) | No se puede fabricar un QR a partir de un ID |
| Orden de puntos de la plantilla | Orden sugerido, estricto o **aleatorio por ejecución** (R12) | Una ronda impredecible es más difícil de simular |
| Alertas de pánico y críticas en el módulo | Eventos para la central (CAR-70), que decide y escala (R31) | Un solo lugar para vigilar y escalar |
| Digest diario por instalación | Informes desde los hechos y PDF programable al cliente con la marca del tenant (R32) | Responder un reclamo en minutos |

**No se porta:** hilos de Slack por ronda (pasa a Comunicaciones, ADR-020); la gestión y el escalamiento del pánico dentro del módulo (pasan a la central, CAR-70; Rondas conserva el botón y el aviso mínimo sin central, R35); cualquier lectura de posición fuera de la ronda.

**Brechas de 1.0 a verificar contra el código antes del brief:** formato del contenido de los QR impresos (para reutilizar las etiquetas físicas, §14, pregunta 20) y cómo trata 1.0 las marcas sin conexión que llegan después de un cierre automático.

## 12. Casos borde

- **Teléfono sin GPS o con permiso denegado:** con QR o NFC la marca vale (R2) con la señal «sin GPS»; con solo GPS no se puede marcar y la app ofrece pedir el permiso o avisar al supervisor. El permiso se pide en contexto, al iniciar la primera ronda.
- **Interior sin señal GPS (sótanos, estacionamientos −1 a −4):** se recomienda QR o NFC en esos puntos; la pantalla de configuración lo sugiere si la precisión medida al crear el punto es mala (R4).
- **Pantalla bloqueada a mitad de ronda en la PWA:** el rastro se corta (R10), la cola sigue intacta y al volver la app retoma la ronda en el punto en que iba.
- **Teléfono descargado:** la ronda sigue en otro dispositivo con la señal «cambio de dispositivo» (R27).
- **Dos guardias en la misma ronda:** no; cada uno tiene su ejecución. Una ronda de dos personas son dos ejecuciones de la misma plantilla.
- **Etiqueta QR dañada:** el guardia puede marcar por GPS si el punto tiene coordenadas, con la señal «etiqueta no leída», o registrar una novedad con foto.
- **Cambio de hora (horario de verano de Chile):** las ventanas se calculan en la zona del tenant y se guardan en UTC; las pruebas cubren los dos cambios de hora.
- **Reloj del teléfono adelantado o atrasado a propósito:** R14.
- **Cola con fotos grandes y poca memoria:** R24; si el teléfono no concede almacenamiento persistente, el aviso es permanente.
- **Punto archivado con rondas programadas:** se quita de las plantillas futuras; las ejecuciones pasadas lo conservan.
- **Instalación desactivada o cliente que termina contrato:** las programaciones se pausan; los informes históricos siguen visibles para el tenant y, según su contrato, para el cliente.
- **Guardia de dos empresas (dos tenants):** cada ronda vive en su tenant; nunca se mezclan colas ni rastros (prueba de aislamiento entre dos tenants).
- **Ronda que cruza la medianoche:** pertenece al día de su programación.

## 13. Criterios de aceptación

Verificables en `test.opai.cl` por Carlos y por Diseño y QA (los de la app nativa, en el Brief 17).

- **CA1.** Un punto configurado `QR + GPS` en una instalación con defecto `QR` muestra su modo propio; cambiar el defecto de la instalación no lo cambia (R1).
- **CA2.** Con el teléfono a 15 m de un punto de radio 20 m y precisión 8 m, la marca queda «dentro»; a 15 m con precisión 40 m queda «dudosa»; a 60 m con precisión 8 m, «fuera» (R3).
- **CA3.** Con modo solo GPS, quedarse 5 s en el punto no lo marca; quedarse 20 s con dos lecturas dentro sí (R5).
- **CA4.** Un QR fotografiado y leído a 300 m de su punto deja la marca con la anomalía «QR leído lejos de su punto» y el evento correspondiente (R8).
- **CA5.** Sin red, se inicia una ronda, se marcan 4 puntos con foto y se cierra; al volver la red los 4 llegan una sola vez, en orden, con sello del servidor; reenviar la cola no duplica nada (R22, R23).
- **CA6.** Una ronda cerrada automáticamente recibe después una marca sin conexión con hora del dispositivo dentro de su ventana: la marca se agrega, el estado se recalcula y queda «sincronizada después del cierre» (R23).
- **CA7.** En un iPhone (PWA) la ficha de la ronda muestra «batería: no disponible» e «integridad del dispositivo: no verificable desde el navegador», y el trust score no baja por eso (R11, R15, R17).
- **CA8.** La ficha de una marca muestra el desglose de su puntaje y la versión del modelo con que se calculó (R19, R20).
- **CA9.** El rastro de una ronda con la pantalla apagada 6 min en la PWA muestra un tramo sin rastro de 6 min, sin línea inventada (R10).
- **CA10.** Un supervisor solo ve las rondas de sus instalaciones; un contacto del cliente solo las de su cuenta y no ve anomalías internas (R29, R30).
- **CA11.** Un agente con `rondas:administrar` pide cerrar una ronda: recibe la vista previa y `APPROVAL_REQUIRED`; un agente no puede marcar un punto (R33, R34).
- **CA12.** El evento `rondas.ejecucion.atrasada` llega a la central cuando una ronda supera su tiempo máximo, y nadie más recibe aviso si el tenant no lo configuró (R31, ADR-020).
- **CA13.** El PDF de etiquetas QR sale con la marca del tenant y reemplazar una etiqueta invalida la anterior (R7, R32).
- **CA14.** Pantallas a 375, 1024 y 1280 px, claro y oscuro, con los estados cargando, vacío, error y sin permisos; ruta de terreno ≤ 150 KB de JS (ADR-044.6); Lighthouse ≥ 90 en rendimiento y accesibilidad en las rutas de terreno (gate desde este módulo, enmienda de ADR-044).

## 14. Preguntas abiertas para Carlos

Cerradas, cada una con recomendación. Ninguna bloquea el Design Prompt salvo la 2, la 5, la 7 y la 21.

1. **¿Qué radio y precisión por defecto usamos para los puntos GPS?** (a) 5 m como 1.0; (b) radio 20 m y precisión mínima 25 m; (c) radio 30 m y precisión 40 m. — **Recomendación: (b).** La precisión que informa el navegador es un radio con 95 % de confianza, no una garantía (benchmark §B), y TrackTik advierte que los radios chicos fallan (benchmark §A.2); 5 m es menor que el error habitual de un teléfono y produce falsos «fuera» que desacreditan el sistema ante el cliente. Los defectos se afinan en el brief con las marcas reales de 1.0. Cada tenant e instalación lo ajusta.
2. **¿Qué significa «QR + GPS» por defecto?** (a) QR identifica y GPS solo suma confianza (la marca vale sin GPS); (b) estricto: sin geocerca la marca queda «fuera» y es anomalía. — **Recomendación: (a) por defecto y (b) como opción por punto o instalación.** Mantiene ADR-023 (el GPS no bloquea) y la operación de sótanos; el estricto queda para puntos críticos con buena señal.
3. **¿El trust score bloquea algo?** (a) Solo informa y alerta; (b) un puntaje rojo impide cerrar la ronda o pagarla. — **Recomendación: (a).** La marca es un hecho; bloquear por un puntaje deja la operación a merced de un GPS malo. El rojo pide revisión (R21).
4. **¿Con qué modelo de confianza parte Gard?** (a) «OPAI 1.0» con los pesos de 1.0; (b) un modelo nuevo «Seguridad 2026» (por ejemplo: geocerca 25, permanencia 10, velocidad 15, movimiento 15, foto 10, mismo dispositivo 10, reloj 10, integridad del dispositivo 5, batería 0); (c) ambos, Gard elige. — **Recomendación: (c), con Gard en «OPAI 1.0» durante la convivencia** para comparar al punto con 1.0, y pasar a «Seguridad 2026» cuando exista la app nativa. Los pesos exactos del modelo nuevo se proponen en el brief con datos reales de 1.0.
5. **¿Basta la PWA o hace falta app nativa?** (a) Solo PWA; (b) PWA en el Brief 14 y app nativa (Capacitor) en el Brief 17 como ya está decidido; (c) adelantar la app nativa de Android para que salga junto con Rondas. — **Recomendación: (b), y evaluar (c) solo para Android si Gard exige rastro con pantalla apagada desde el primer día.** La web no da posición en segundo plano, ni ubicación simulada, ni integridad del dispositivo (benchmark §B); los productos revisados usan apps nativas (benchmark §A.1) y ninguno documenta cómo detecta GPS falso (benchmark §C). La PWA basta para QR/NFC con GPS como evidencia, que es lo que 1.0 hace hoy.
6. **¿Exigimos la app nativa por instalación cuando exista?** — **Recomendación: sí, como ajuste por instalación (defecto no).** Permite vender «rondas certificadas» en clientes exigentes sin obligar a todos a instalar la app.
7. **¿Qué ve el cliente?** (a) Cumplimiento, rondas, puntos, horas, recorrido y novedades visibles; (b) lo anterior más la banda de confianza (verde/amarillo/rojo); (c) todo, con anomalías. — **Recomendación: (a) por defecto y (b) como opción del tenant.** Las anomalías son material interno hasta que el supervisor las revisa; mostrarlas crudas genera reclamos por falsos positivos.
8. **¿Ofrecemos QR dinámico en el dispositivo de Terreno** (un código que cambia cada 30 s en la tableta de la portería, imposible de fotocopiar)? — **Recomendación: sí, pero después del Brief 14,** como mejora para puntos críticos que ya tienen un dispositivo emparejado.
9. **¿Mantenemos NFC?** — **Recomendación: sí, como modo de punto,** usable en la PWA solo en Chrome Android y en la app nativa en iOS y Android. 1.0 lo tiene; las etiquetas NFC son más difíciles de fotocopiar que un QR.
10. **¿Incorporamos balizas Bluetooth (BLE) como tipo de punto?** — **Recomendación: no en el Brief 14;** requieren hardware, pilas y app nativa. Se evalúa después del Brief 17 si un cliente lo pide.
11. **¿Puede un agente marcar un punto o iniciar una ronda?** — **Recomendación: no, nunca.** Es un hecho físico; un agente marcando vacía de sentido la medición. Queda en la lista de excepciones de paridad con ese motivo (R33). El agente sí lee, configura con vista previa, revisa y propone cierres con aprobación humana.
12. **¿Permitimos rondas ad hoc?** — **Recomendación: sí, por instalación (defecto sí),** marcadas «ad hoc» y fuera del cumplimiento programado, como en 1.0.
13. **¿Foto obligatoria por defecto?** — **Recomendación: no;** se activa por punto. Fotos en todos los puntos alargan la ronda y consumen almacenamiento medido (ADR-031).
14. **¿Mantenemos el umbral de «incompleta» en 20 % de puntos obligatorios sin marcar?** — **Recomendación: sí, como defecto configurable** (piso de 1.0).
15. **¿Qué orden de puntos por defecto?** — **Recomendación: «sugerido»,** con «estricto» y «aleatorio por ejecución» como opciones de la plantilla (R12).
16. **¿Cuánto tiempo guardamos el rastro GPS?** (a) 90 días; (b) 1 año; (c) lo mismo que las marcas. — **Recomendación: (b) para el rastro y 5 años para las marcas, configurable por tenant, a validar con el abogado por la Ley 21.719** (geolocalización de trabajadores: finalidad, información al trabajador y proporcionalidad). El rastro solo existe durante la ronda (R9) y el guardia ve un aviso de tratamiento al iniciar su primera ronda.
17. **¿Enviamos informes automáticos al cliente?** — **Recomendación: sí, opcional por cuenta, semanal en PDF por defecto (diario como opción),** con la plantilla de Comunicaciones y la marca del tenant; apagado hasta que el tenant lo active (ADR-020).
18. **Con Operaciones activo, ¿la ronda se asigna a «quien esté de turno en el puesto»?** — **Recomendación: sí,** y sin Operaciones a personas elegidas a mano (ADR-048).
19. **¿Emitimos «sin movimiento» durante la ronda y con qué umbral?** — **Recomendación: sí, 10 min por defecto,** solo como evento para la central (CAR-70), que decide si llama; Rondas no escala.
20. **¿Reutilizamos las etiquetas QR físicas de 1.0?** — **Recomendación: sí durante la migración:** importar los puntos de 1.0 con su código y aceptar su formato hasta que cada instalación reimprima con el QR firmado de 2.0 (R7). Hay que verificar en 1.0 qué contiene hoy el QR; si es solo un ID predecible, recomendamos reimprimir las de puntos críticos primero.

21. **¿El botón «Emergencia» avisa aunque el tenant no haya configurado nada?** — **Recomendación: sí, es la única excepción al silencio por defecto (ADR-020):** sin central, llega por push y correo al supervisor de la instalación. Un tenant que solo compra Rondas no puede quedar sin el pánico que 1.0 ya tiene.

## 15. Design Prompt para Claude Design

> **Se usa solo después de que Carlos apruebe esta especificación** (ADR-047). Copiar tal cual en Claude Design. Si la respuesta a las preguntas 2, 5, 7 o 21 cambia, se ajusta antes de copiar.

```text
Proyecto: OPAI 2.0 · Módulo Rondas (puntos de control por QR, NFC y GPS).
Sistema de diseño: SOLO el DS 2.0 de OPAI 2.0 (tokens de packages/ds/src/tokens.css y exports de docs/2.0/design/export-ds-2.0/). Nunca el estilo de OPAI 1.0. Sin hex sueltos, sin tamaños de letra arbitrarios: solo los estilos t-* (t-display, t-title, t-heading, t-subheading, t-body, t-body-sm, t-label, t-label-sm, t-caption, t-overline, t-mono, t-numeric). Radios rounded-sm/md/lg/xl. Estados con los tonos con nombre success, warning, danger, info, accent. Claro y oscuro verdadero.
Componentes del DS por nombre: AppShell, ListScreen, SplitScreen, DetailScreen, FormScreen, DashboardScreen, KpiTile, Card, Table, Badge, Chip, ChipToggle, Segmentado, Tabs, Timeline, BarraProgreso, MapaEstatico, Button (primary, secondary, ghost, destructive), Sheet, Dialog, Alerta, Campo, Input, Select, Switch, InputHora, Uploader, Avatar, Monograma, Empty, Loading, ErrorState, Forbidden. Si falta un componente, proponerlo como pieza del DS (no del módulo).
Partir de las pantallas de patrón RondaPhone y RondasPanelDesktop del export DS 2.0 y llevarlas al contenido real de esta especificación.

Viewports: teléfono 375 px, iPad 1024 px, escritorio 1280 px. Área táctil ≥ 44 px. Safe-area iOS. Sin scroll horizontal. Transiciones 150–200 ms con prefers-reduced-motion. Contraste AA en claro y oscuro.
Estados obligatorios en cada pantalla: cargando (skeleton con la forma), vacío (con acción), error (con Reintentar), sin permisos.
Datos ficticios realistas de una empresa de seguridad chilena («Atlas Seguridad SpA»), instalaciones como «Planta Quilicura», «Bodega Lampa», «Torre Apoquindo»; nombres ficticios; fechas dd-mm-aaaa; horas 24 h. Ningún dato real.

A. TELÉFONO · GUARDIA (Portal Trabajador; mismo flujo en Portal Terreno, pantalla de tarea única sin menú)
1. «Mis rondas de hoy»: lista por hora con estado (Por iniciar, En curso, Atrasada, Completa), instalación, plantilla, n.º de puntos y ventana («10:00 ± 15 min»). Acción principal «Iniciar ronda». Indicador fijo de conexión y de cola: «Sin conexión · 3 marcas por enviar».
2. «Ronda en curso» (evolución de RondaPhone): avance «3 de 6 puntos», tiempo «18 min · límite 40 min», tarjeta grande del siguiente punto con nombre, instrucción, modo (chip QR / GPS / QR + GPS / NFC) y distancia «a 60 m · precisión 8 m». Lista de puntos marcados con hora y un chip de confianza (verde/amarillo/rojo) y pendientes. Botones: «Marcar punto» (primario, fijo abajo), «Novedad», «Terminar ronda». Aviso discreto «Mantén la pantalla encendida durante la ronda» (Wake Lock) y aviso de batería baja.
3. Hoja «Marcar punto» a pantalla completa, tres variantes: (a) QR: visor de cámara con marco, linterna, texto de ayuda; (b) GPS: indicador de estado «Dentro del punto · mantente 12 s» con cuenta regresiva, distancia y precisión, y los estados «Precisión insuficiente, acércate a un lugar abierto» y «Fuera del punto»; (c) NFC (Android): «Acerca el teléfono a la etiqueta». Resultado: confirmación con hora, método y, si el punto lo exige, captura de foto antes de confirmar.
4. «Cierre de ronda»: resumen con puntos marcados/omitidos, duración, banda de confianza de la ronda, novedades y estado de envío («Enviada» o «Se enviará al recuperar conexión»).
5. Hoja «Cola sin conexión»: lista de hechos pendientes (marca, foto, novedad) con hora del dispositivo, botón «Reintentar ahora» y explicación de qué pasa si se cierra sesión.
6. Primera vez: pedido de permisos en contexto (ubicación, cámara, movimiento en iOS) con explicación de por qué y aviso de tratamiento de datos: «Tu ubicación se registra solo mientras haces la ronda».

B. TELÉFONO E IPAD · SUPERVISOR (Portal Supervisor, barra inferior «Visitas y rondas»)
7. «Rondas de hoy» de sus instalaciones con filtros de chips: Con alerta · En curso · Atrasadas · Omitidas · Todas, y contadores.
8. Ficha de la ronda (DetailScreen) con pestañas Resumen · Marcas · Rastro · Anomalías y revisión · Documentos · Actividad. Resumen: estado, avance, trust score con desglose («Geocerca 30/30 · Velocidad 20/20 · Movimiento 15/15 · Foto no pedida · Mismo dispositivo 10/10 · Batería no disponible en este teléfono»), MapaEstatico con el recorrido, los puntos y los tramos sin rastro en otro estilo, y Timeline de marcas. En iPad: SplitScreen lista + ficha.
9. Revisión de una anomalía (Sheet): tipo («QR leído lejos de su punto», «Velocidad imposible», «Reloj alterado», «Ubicación simulada»), evidencia, y conclusión con RadioGroup: Justificada · Confirmada · Sin conclusión, con comentario obligatorio. Dejar claro que la marca original no cambia.
10. Crear punto en el lugar (teléfono): «Usar mi ubicación actual» con medición de 20 s, precisión resultante y sugerencia de usar QR si la precisión es mala.

C. ESCRITORIO E IPAD · ERP (área Operaciones → Rondas)
11. «Control de rondas» en vivo (evolución de RondasPanelDesktop): KpiTile Programadas, Completadas, En curso, Atrasadas, Omitidas, Cumplimiento %, y uno nuevo «Con anomalías»; lista dividida con la ficha de la ronda seleccionada; acciones «Crear ticket» y «Ver en la central» (si la central está activa). Sin botón de llamar dentro de Rondas.
12. Pestaña «Rondas» en la ficha de instalación con Segmentado «Puntos · Plantillas · Programación»:
   - Puntos: tabla (nombre, modo, radio, precisión mínima, permanencia, foto, estado) + MapaEstatico con los puntos y sus círculos de radio; drawer de edición con los campos de la especificación, herencia visible («Hereda de la instalación: QR + GPS · Cambiar»), acciones «Imprimir etiquetas» y «Reemplazar etiqueta» (con Dialog de confirmación).
   - Plantillas: lista ordenable de puntos (obligatorio/opcional), orden Sugerido/Estricto/Aleatorio por ejecución, tiempo máximo total y por tramo, umbral de incompleta.
   - Programación: horarios, días, ventana de tolerancia, responsables (personas o «quien esté de turno en el puesto» si Operaciones está activo), switch «Permitir rondas ad hoc» y «Exigir app OPAI nativa».
13. «Informes de rondas» (DashboardScreen): cumplimiento por instalación y período, puntos más omitidos, distribución de bandas de confianza, anomalías por tipo y estado de revisión, mapa de calor de puntos. Acción «Programar informe al cliente».
14. Configuración → Rondas (formulario de ajustes del núcleo, no página propia): defectos de modo, radio, precisión y permanencia; modelo de confianza con sus versiones («OPAI 1.0» vigente, «Seguridad 2026» borrador), pesos que deben sumar 100, bandas, umbrales de anomalía; botón «Publicar versión» con aviso de aprobación.

D. TELÉFONO Y ESCRITORIO · CLIENTE (Portal Cliente → Reportes → Rondas)
15. Resumen de cumplimiento por instalación y período, lista de rondas con hora y puntos, ficha con recorrido en mapa y novedades visibles. Sin anomalías internas ni desglose de confianza (opcional: solo banda verde/amarillo/rojo si el tenant lo activa).

Etiquetas de estado en pantalla y su estado de la especificación: Por iniciar = pendiente; En curso = en_curso; Atrasada = en_curso fuera de plazo; Completa = completada; Incompleta = incompleta; Omitida = no_realizada; Cerrada automáticamente = cerrada_auto; Cerrada por administrador = cerrada_admin. «Con alerta» es un filtro (rondas con anomalías abiertas o atrasadas), no un estado.
Piezas que el DS 2.0 todavía no tiene y que se proponen como componentes del DS (no del módulo): lector de QR con cámara, indicador de permanencia GPS con cuenta regresiva, indicador fijo de conexión y cola, lista ordenable, mapa con recorrido, radios y tramos sin rastro (extensión de MapaEstatico), y gráficos de informes y mapa de calor (cargados en diferido, nunca en el JS inicial de terreno, ADR-044.6).
Botón «Emergencia» visible en la ronda en curso, separado de las acciones normales y con confirmación para evitar toques accidentales.
Entregar cada pantalla a 375, 1024 y 1280 px (las de guardia solo 375 y 1024), en claro y oscuro, con sus cuatro estados, y un tablero con todas.
```

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Primera versión (borrador) con modo por punto, fidelidad del GPS, trust score versionado, sin conexión, PWA vs nativa, vistas, eventos para la central, benchmark, 21 preguntas y Design Prompt (CAR-72) | — (pendiente de aprobación) |
