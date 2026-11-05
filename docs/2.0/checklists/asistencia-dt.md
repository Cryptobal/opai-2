# Checklist trazable · Asistencia, Face ID, certificación DT y requisitos comerciales

**Estado:** propuesta de «Operaciones · Auditoría» (5-nov-2026). Va a `docs/2.0/checklists/asistencia-dt.md` cuando Carlos la apruebe.
**No acredita cumplimiento.** OPAI 2.0 no está certificado ni autorizado. Este checklist ordena el trabajo y la evidencia; la validación formal la hacen la certificadora y la DT.

## Cómo leerlo

| Columna | Qué significa |
|---|---|
| **ID** | `L` legal obligatorio · `T` técnico · `E` evidencia y pruebas de certificación · `P` privacidad y biometría · `C` comercial y proveedor (incluye BizPartners) |
| **Fuente** | Norma u ordinario con número. `[V]` verificado en fuente oficial · `[S]` fuente secundaria · `[?]` sin verificar: confirmar con el texto íntegro de la Res. Ex. 38 o con la DT |
| **Diseño** | Requisito del checklist aprobado en `diseño/export-reporteria-dt-v2/10 Checklist certificacion` (R-01 a R-33), si existe |
| **Frente** | Sesión que lo construye: **B** Operaciones · Base · **A** Asistencia · Núcleo legal · **F** Asistencia · Face ID · **R** Asistencia · Reportes y fiscalización · **N** Nómina · **Ops** operación y despliegue · **Leg** asesoría legal · **Carlos** |
| **Estado 2.0** | Hoy en `main` `abfbc85`: ✗ ausente · ◐ parcial · ✅ existe la pieza reutilizable |

Normas base:
- Código del Trabajo, art. 33.
- Res. Ex. N° 38 (DT, 26-abr-2024, D.O. 9-may-2024).
- Res. Ex. 2000-9453/2025: solo posterga el art. 26 al 26-sep-2025.
- Ordinarios de la DT 321/2024, 448/2024, 626/2024, 859/2024, 860/2024, 87/2025, 91/2025, 554/2025, 737/2025, 751/2025, 770/2025, 312/2026, 315/2026, 408/2026, 411/2026, 412/2026.
- Ley 21.561 (40 horas).
- Ley 21.719 (datos personales, vigente desde el 1-dic-2026).

Extracción de 1.0: `extraccion/dt-normativa.md`. ADR aplicables: ADR-023, ADR-044, ADR-048 y ADR-057.

---

## 1. Registro de la marca (legal)

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-01 | Marca de entrada y salida, más inicio y término de colación si se marca, con fecha y hora asignadas por el servidor | Art. 11 [V vía ORD 411/2026]; ADR-023 | R-01 | A | ✗ | Test de dominio: la hora del dispositivo nunca reemplaza la del servidor |
| L-02 | Transmisión en línea a la base central; sin conexión se guarda en el equipo y se envía al volver la señal | Arts. 9 y 10 [V ORD 411/2026, ORD 448/2024] | R-33 | B (cola) + A (recepción) | ✗ | e2e en modo avión: marca → reconexión → misma marca con `origen=offline_queue` y su desfase |
| L-03 | La marca diferida queda identificada, y la ven el trabajador y el supervisor | PREGUNTAS P14; ADR-044.3 | R-33 | A | ✗ | Reporte con la marca diferida señalada |
| L-04 | Comprobante automático e inmediato de cada marca al **correo personal** del trabajador (no corporativo; el trabajador lo controla) | Art. 12 [V ORD 411/2026, 312/2026, 770/2025] | R-02 | A | ✗ (Comunicaciones ✅) | Correo en menos de 1 minuto en la prueba; log de envío |
| L-05 | Dos trabajadores no pueden registrar el mismo correo | Art. 12 [V ORD 411/2026] | — | A | ✗ | Restricción única por empresa + test |
| L-06 | Si el trabajador viene de una EST, copia del comprobante a la EST | Art. 12 [V] | R-18 | A | ✗ | Test |
| L-07 | Contenido del comprobante: nombre completo, ubicación, hash, y la resolución de jornada excepcional (número y fecha) cuando corresponde; razón social y RUT de la empresa donde presta servicios (EST o subcontrato) | Art. 13 [V parcial ORD 860/2024]; lista completa [?] | R-02 | A | ✗ | Plantilla revisada contra el texto íntegro del art. 13 |
| L-08 | Fotografía de los datos al marcar: empleador, establecimiento, mandante y resolución. No se recalcula desde los maestros | `dt-normativa.md` §1; art. 13 | — | A | ✗ | Columnas de snapshot en la marca + test de inmutabilidad |
| L-09 | Si no hay comprobante posible (trabajador sin correo personal), se avisa al empleador y se bloquea el enrolamiento hasta que lo tenga | Art. 12 [S]; 1.0 lo hace | — | A | ✗ | Alerta en Inicio y regla de enrolamiento |
| L-10 | La geolocalización se registra como evidencia y **nunca bloquea** la marca. Fuera de rango, solo alerta | Arts. 38, 53 y 58 k [V ORD 554/2025, 408/2026] | R-03 | A | ✗ (piezas en Rondas ✅) | Test: fuera de la geocerca, la marca se registra con `gps_estado=fuera_rango` |
| L-11 | Marca de contingencia con autor, motivo y evidencia; no alimenta asistencia ni nómina hasta que se acepta | `dt-normativa.md` §1 | R-06 | A | ✗ | Flujo y test |

## 2. Identificación del trabajador

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-12 | Al menos dos mecanismos de identificación (principal y secundario), uno **sin biometría** y definido en el RIOHS o el contrato | Art. 57 [S: Talana, Rex+, MLV]; número de artículo [?] | — | B (RUT+PIN) + F | ✗ | Configuración por empresa + texto para el RIOHS |
| L-13 | La biometría requiere **consentimiento expreso y escrito** con finalidad, prohibición de ceder a terceros y revocable | Art. 57 [V ORD 91/2025]; ORD 1233/2023 | — | F | ✗ | Registro de consentimiento versionado (texto, fecha, firma) |
| L-14 | Si el trabajador revoca o pide suprimir su biometría durante la relación laboral, se borra la plantilla y sigue marcando con el mecanismo secundario | Art. 57 [V ORD 91/2025] | — | F | ✗ | e2e: revocar → borrado en el proveedor → marca por PIN |
| L-15 | Al terminar la relación laboral se destruyen los datos biométricos (sin perjuicio de los 5 años de las marcas) | Art. 57 [V] | R-11 | F | ✗ | Trabajo diario de purga + reporte |
| T-01 | Bloqueo tras intentos fallidos de PIN o rostro, con registro del intento | Diseño R-05; buena práctica | R-05 | B | ✗ | Rate limit cerrado + auditoría |
| T-02 | PIN de 6 dígitos con hash (nunca en claro) y cambio por el trabajador | Hallazgo en 1.0 (PIN de 4) | — | B | ✗ | Test |
| T-03 | Face ID con prueba de vida activa, umbral de similitud configurable por plataforma (no por empresa) y búsqueda **1:1** contra el rostro del RUT ingresado, nunca 1:N entre empresas | Hallazgo en 1.0 (colección compartida); ADR-044.5 | R-04 | F | ✗ | Test con proveedor simulado; colección por empresa |
| T-04 | Uso del teléfono personal: consentimiento escrito y costo a cargo del empleador | [S] Rex+, MLV | — | B + Leg | ✗ | Cláusula modelo |

## 3. Inalterabilidad, seguridad y respaldos

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-16 | Las marcas no se editan ni se borran. Triggers impiden UPDATE, DELETE y TRUNCATE para todos los roles de la aplicación | Art. 14 [V ORD 411/2026]; ADR-023 | R-07 | A | ◐ (`core.bitacora` ✅) | `test:db` que intenta UPDATE y DELETE como `opai_app` y como dueño |
| L-17 | Hash SHA-256 por marca sobre el registro canónico **completo** (snapshot, método, confianza, dispositivo, ubicación y hora de servidor), encadenado por empresa | Art. 14 [V]; hallazgo en 1.0 (hash parcial) | R-09 | A | ✗ | Test de canonicalización + verificador público |
| L-18 | Respaldos con control de integridad: hash o firma, y manifiesto | Art. 14 b [V] | R-11 | R + Ops | ✗ | Respaldo mensual en R2 con manifiesto verificable |
| L-19 | Base de datos distribuida en más de un servidor o centro de datos, replicada y con respaldo externo | Art. 20 [V ORD 411/2026] | — | Ops | ✗ (Neon en una región, PITR) | Arquitectura documentada: réplica Neon + exportación diaria a R2 en otra región. **Validar con la certificadora** |
| L-20 | Los datos del comprobante coinciden con la base | Art. 20 [V] | R-30 | A | ✗ | Test de verificación por hash |
| L-21 | Perfiles de visualización y bitácora automática de auditoría, visible solo para administradores | Art. 15 [V] | R-24 | A + R | ◐ (`audit_events` ✅) | Pantalla de auditoría |
| L-22 | Redundancia, monitoreo y respaldo (disponibilidad) | Art. 16 [V] | R-32 | Ops | ◐ | Monitoreo + registro de incidentes técnicos |
| T-05 | Verificación diaria de la cadena; si se rompe, alerta a Plataforma | `dt-normativa.md`; `core.bitacora.verificar` ✅ | R-10 | A | ◐ | Trabajo diario |
| T-06 | Idempotencia por marca: clave única que genera el dispositivo, sin duplicados al reintentar | `dt-normativa.md` | — | A | ✗ | Test de reintento |
| L-23 | Conservación de 5 años de la información electrónica | ORD 795 [S extracto]; Art. 22.1 [V] | R-11 | R + Ops | ✗ | Política de retención documentada |
| T-07 | Hora oficial: comparar la hora del servidor contra una fuente oficial (SHOA) y registrar el desfase | Diseño R-31; exigencia legal [?] | R-31 | A | ✗ | Trabajo horario + registro de desfase |

## 4. Correcciones y alteraciones

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-24 | Toda alteración queda señalada en pantalla (signo, símbolo o color) y el original sigue visible | Art. 41 a [V ORD 626/2024] | R-08 | A + R | ✗ | Reporte con la marca original y la corregida |
| L-25 | La corrección es un hecho nuevo; el trabajador es notificado y puede aceptar u objetar | Arts. 39–41 [V parcial]; 48 h [S/?] | R-13, R-15 | A | ✗ | Flujo `pendiente → aceptada \| objetada \| vencida` |
| L-26 | **Plazo de la corrección:** el ORD 626/2024 habla del «día hábil siguiente» y el repo usa 48 h de oposición. **Ambos plazos deben confirmarse** con el texto íntegro de los arts. 39 a 43 antes de construir | [?] | R-13 | Leg → A | — | Regla parametrizable con vigencia (ADR-021) |
| L-27 | Mientras está pendiente, reportes y nómina usan el valor anterior | `dt-normativa.md` | — | A + N | ✗ | Test |
| L-28 | No se descuenta remuneración por marcas perdidas por fallas técnicas | ORD 1086 [S extracto] | — | N | ✗ | Regla de nómina |

## 5. Trabajador

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-29 | Perfil propio del trabajador con al menos 5 años de historial de sus marcas | Art. 22.1 [V] | R-12 | A (+ Portal Trabajador) | ✗ | Pantalla «Mis marcas» |
| L-30 | Descarga de sus reportes | [S] | R-14 | R | ✗ | PDF, Excel y Word |
| L-31 | Alerta por falta de marca de inicio a los 30 minutos, con copia al empleador | Art. 45.1 [V] | — | A | ✗ | Trabajo + test con reloj simulado |
| L-32 | Alerta por falta de marca de término (el empleador puede deshabilitarla) | Art. 45.2 [V] | — | A | ✗ | Ajuste por empresa |
| L-33 | Cada 30 días, aviso de horas compensables y días de descanso acumulados | Art. 45.3 [V] | — | A | ✗ | Trabajo mensual |
| L-34 | Aviso de desconexión para teletrabajadores, 30 minutos antes | Art. 45.4 [V] | — | A | ✗ (si aplica) | Ajuste por tipo de jornada |
| L-35 | Comunicaciones formales al trabajador por un canal formal; no se exige confirmación de lectura | Art. 47 c [V ORD 626/2024] | — | A | ✗ (Comunicaciones ✅) | Plantillas |

## 6. Reportes (art. 27)

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-36 | Solo los reportes indicados, en orden, con nombres fijos y solo con las columnas previstas | Art. 27 [V ORD 87/2025] | R-16 | R | ✗ | Comparación de columnas contra la norma |
| L-37 | a) Asistencia | Art. 27 a [V] | R-16 | R | ✗ | Reporte |
| L-38 | b) Jornada diaria, con encabezado: razón social, RUT, nombre y cédula del trabajador, lugar y banda horaria | Art. 27 b [V ORD 87/2025] | R-26, R-28 | R | ✗ | Reporte |
| L-39 | c) Domingos y festivos, con **totales** de días trabajados (no un listado) | Art. 27 c [V] | R-29 | R | ✗ (feriados ✅) | Reporte |
| L-40 | d) Modificaciones o alteraciones de turnos; en turnos fijos, indicarlo. Quien pide el cambio es siempre «Empleador» | Art. 27 d [V]; [S Buk] | R-29 | R | ✗ | Reporte desde `pauta.historial` y excepciones |
| L-41 | **Por confirmar:** el repo y 1.0 suman «reporte diario» e «incidentes técnicos» como obligatorios (6 en total); los ordinarios oficiales confirman 4 (a a d). Construir los 4 confirmados y dejar los otros como reportes de apoyo hasta verificar | `dt-normativa.md` vs ORD 87/2025 [?] | R-32 | Leg → R | — | Decisión registrada en un ADR |
| L-42 | Siglas oficiales con su glosa (A.I., A.J., AT, C.T., D.E.J., H.E., J.O., L.M., P.G.R., PREN., P.S.G.R., POSTN, S.A., VAC) | `dt-normativa.md` (art. 28 g) | R-27 | R | ✗ | Leyenda en pantalla y en exportación |
| L-43 | Filtros: búsqueda por nombre, apellido o cédula (sin puntos y con guion); jornada; turnos; lugar (más de 10 trabajadores: lista seleccionable; más de 5 sedes por región: agrupar por región); cargo según RIOHS; EST; hash sin período | Art. 25.1 [V ORD 859/2024, 412/2026, 315/2026] | R-16 | R | ✗ | Tests de filtros |
| L-44 | Sin valores genéricos como «POR DEFINIR» o «sin lugar fijo» en lugar ni cargo | [V ORD 412/2026, 315/2026] | — | A + datos | ✗ | Validación de maestros antes de activar asistencia |
| L-45 | Atrasos y sobretiempo a la hora, minuto y segundo, sin redondeo | Art. 44 [V] | — | A | ✗ | Tests de dominio |
| L-46 | El mismo reporte se ve en pantalla y se descarga igual en Excel, PDF y Word | [S Buk] | R-14 | R | ✗ | Prueba de igualdad |
| L-47 | Jornada mixta presencial y remota con totales semanales; bandas horarias | Arts. 46 y 55 c [V] | — | A | ✗ | Tipos de jornada configurables |

## 7. Fiscalización

| ID | Requisito | Fuente | Diseño | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|---|
| L-48 | Portal de fiscalización con acceso «permanente e irrestricto» para la DT, **enlazado desde la página de inicio del sitio principal** (un subdominio solo no basta) | Arts. 17, 22.4 y 23 [V ORD 860/2024, 87/2025] | R-21 | R + Carlos (opai.cl) | ✗ | Enlace visible en opai.cl |
| L-49 | El fiscalizador escribe su correo `@dt.gob.cl` y el sistema le envía una clave automáticamente; el sistema debe aceptar ese dominio | [V ORD 87/2025, 860/2024] | R-22 | R | ✗ | e2e |
| L-50 | Consulta sin restricción de fechas, solo lectura, búsqueda por RUT del empleador | Art. 23 [V] | R-23 | R | ✗ | e2e |
| L-51 | Auditoría de cada acceso del fiscalizador: fecha, correo, RUT consultado, IP y qué vio | Art. 22.5 [S/1.0] | R-24 | R | ✗ | Pantalla 07 |
| L-52 | Credenciales del portal entregadas por escrito si las crea el empleador | Art. 34 N° 1 [V ORD 626/2024] | R-25 | R | ✗ | Plantilla |
| E-01 | Las credenciales del portal de fiscalización se entregan con la solicitud de autorización a la DT | Art. 66.2 [V] | — | Carlos | — | Expediente |

## 8. Proveedor del sistema (OPAI) y obligaciones comerciales

| ID | Requisito | Fuente | Frente | Estado | Evidencia esperada |
|---|---|---|---|---|---|
| C-01 | El proveedor informa a la DT, dentro de los primeros 5 días corridos de cada mes, la lista de sus clientes (razón social, dirección, RUT, servicio, URL de fiscalización y vencimiento del contrato) | Art. 26 [V Res. 9453/2025; campos S Prieto] | R + Plataforma | ◐ (diseño R-20) | Reporte mensual desde Plataforma (`platform.*`) |
| C-02 | Un empleador usa un solo tipo de registro y un solo producto en todas sus sedes, incluido el teletrabajo | Art. 48 a y b [V ORD 321/2024] | Comercial | — | Condición de venta: el módulo cubre a toda la empresa |
| C-03 | La autorización es del **sistema** (no de la empresa usuaria), dura **2 años** y la DT lista los sistemas autorizados con su certificadora | [V dt.gob.cl, registro] | Carlos | — | Calendario de renovación |
| C-04 | La empresa usuaria de un sistema autorizado no necesita un pronunciamiento propio, pero puede ser fiscalizada | [V] | Comercial | — | Texto de venta |
| C-05 | Los requisitos de **BizPartners**: rol por confirmar (no figura como certificadora en el registro de la DT) | Pendiente de Carlos | Carlos | — | Su lista, trazada aquí con IDs `C-BP-nn` |
| C-06 | El módulo Asistencia se puede activar solo (sin Operaciones ni Nómina): marca contra la jornada pactada del vínculo | ADR-048 | A | ✗ | e2e con empresa que solo tiene Asistencia |
| C-07 | El cobro es por trabajador activo en el mes | CAR-89 (C3); CAR-188 | Plataforma | ◐ (cobro por módulo ✅) | Unidad «trabajadores con marca en el mes» |

## 9. Privacidad y biometría (Ley 21.719)

| ID | Requisito | Fuente | Frente | Estado 2.0 | Evidencia esperada |
|---|---|---|---|---|---|
| P-01 | Los datos biométricos son datos sensibles: requieren base de licitud y consentimiento expreso | Arts. 2 g, 16 y 16 ter [V] | F + Leg | ✗ | Consentimiento versionado (L-13) |
| P-02 | Informar al titular el sistema, la finalidad, el plazo y cómo ejercer sus derechos | Art. 16 ter [V] | F | ✗ | Pantalla de consentimiento + texto aprobado por el abogado |
| P-03 | Minimización: guardar solo la **plantilla o el identificador** en el proveedor, no la foto de referencia; la foto de cada marca no es necesaria si hay prueba de vida | Criterio propuesto; sin pronunciamiento oficial [?] | F + Leg | ✗ | Decisión en un ADR (ver D-04) |
| P-04 | Evaluación de impacto obligatoria (tratamiento masivo de datos sensibles) | Art. 15 ter [V] | Leg | ✗ | EIPD firmada antes de activar en producción |
| P-05 | Transferencia internacional: el proveedor biométrico y la base están fuera de Chile (AWS) y requieren cláusulas contractuales o garantías | Arts. 27 y 28 [V]; lista de países adecuados [?] | Leg + Carlos | ✗ | DPA con el proveedor y cláusulas tipo |
| P-06 | Medidas de seguridad y aviso de vulneraciones (a la Agencia y, con datos sensibles, a los titulares) | Arts. 14 quinquies y sexies [V] | Ops + Leg | ◐ (07d ✅) | Procedimiento de incidentes |
| P-07 | Derechos ARCO y portabilidad, con respuesta en 30 días | Arts. 4–11 [V] | ✅ núcleo (07d) | ◐ | Incluir la biometría en el inventario de datos |
| P-08 | Datos personales cifrados en reposo; la biometría queda en el adaptador del núcleo y su consumo se mide | REGLAS-codigo; ADR-027; ADR-031 | F | ✗ | Revisión de seguridad del Revisor |
| P-09 | Sin datos personales en Linear, PRs ni logs | AGENTS.md | Todos | ✅ regla | Revisión |

## 10. Evidencia y pruebas para la certificadora

| ID | Entregable | Frente |
|---|---|---|
| E-02 | Documento de arquitectura: flujo de la marca, cadena de hash, réplicas y respaldos, retención | A + Ops |
| E-03 | Matriz de este checklist con estado «cumple» y enlace a la evidencia (pantalla, test, log); se alimenta automáticamente en la pantalla 10 del diseño de reportería | R |
| E-04 | Entorno de certificación: empresa demo con trabajadores ficticios, credenciales del portal de fiscalización y datos de 3 meses | Ops |
| E-05 | Suite e2e de marcación: online, sin conexión, PIN, Face ID simulado, contingencia, corrección aceptada, objetada y vencida, con capturas a 375 y 1280 px | A + F |
| E-06 | Prueba de inalterabilidad: intento de UPDATE y DELETE como cada rol y verificación de la cadena después de restaurar un respaldo | A + Ops |
| E-07 | Prueba de carga: picos de cambio de turno (por ejemplo, 500 marcas en 10 minutos) sin pérdida | Ops |
| E-08 | Declaración jurada y documentos de admisibilidad en archivos separados | Art. 66.2 [V] · Carlos |
| E-09 | Reglamento interno (RIOHS) y anexo de contrato con mecanismos de identificación, consentimiento biométrico y uso de teléfono personal | Leg + Carlos |

## 11. Hallazgos de 1.0 que **no** se portan

1. Hash sin foto, sin confianza facial y sin snapshot de la Res. 38.
2. Trigger que permite actualizar la hora de una marca.
3. Colección de rostros compartida entre empresas.
4. PIN de 4 dígitos.
5. Colación de 60 minutos en un cálculo y de 30 en otro.
6. Atraso calculado en UTC.
7. Dos portales de inspector paralelos.
8. Crons de integridad colgados de otros crons por el límite de Vercel.

En 2.0 cada uno queda cubierto por L-16, L-17, T-02, T-03, L-45 y R.
