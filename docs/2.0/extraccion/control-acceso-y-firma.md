# Extracción de OPAI 1.0 · Control de acceso y firma electrónica

**Fecha:** 29-oct-2026 · **Tarea:** CAR-73 · **Autor:** Claude · **Fuente:** lectura de `Cryptobal/opai` (HEAD del 29-oct-2026), solo lectura y como referencia de reglas de negocio. No se porta código (`REGLAS-codigo.md`).

> Al 29-oct-2026 no existía en `main` una extracción de control de acceso ni de firma. Esta es la primera. Distingue lo **verificado en el código** de lo **inferido**, que se marca así. Ambas secciones describen el comportamiento sin rutas ni archivos de 1.0, porque hay brechas vigentes en producción (A.2 y B.2); su detalle se entrega a Carlos fuera del repo.

## A. Control de acceso físico (portal de acceso de 1.0)

### A.1 Lo que hace 1.0 (verificado)

| Tema | Comportamiento en 1.0 |
|---|---|
| Configuración por instalación | Una configuración por instalación: tipos de registro habilitados, modo de acceso (`solo lista blanca` o `lista blanca + registro manual`, este por defecto), qué tipos se cruzan con lista blanca y cuáles con lista negra, exigir validación de documento, foto o firma, permanencia máxima en horas, frecuencia del reporte automático, formulario y campos de la nómina, lista negra del cliente activable |
| Tipos de registro | Visita, proveedor, vehículo, personal y despacho, más tipos personalizados por tenant con sus modos de escaneo y campos por defecto |
| Identidad | RUT con dígito verificador, pasaporte o documento extranjero con país; lectura del QR de la cédula chilena (formatos 2013 y 2024) y de la zona MRZ |
| Validación de cédula | No consulta al Registro Civil: siempre responde «no verificado» |
| OCR | MRZ y patente leídos con un modelo de IA multimodal del tenant (imagen de hasta 4 MB) |
| Lista negra | Por documento, de la instalación, global del tenant o por grupo, filtrada por tipo. Si coincide, rechaza y registra un intento denegado |
| Lista blanca | En modo estricto exige estar en la lista o tener un prerregistro de hoy; si no, rechaza y registra el intento. Admite vigencia, días y horario permitidos, uso único y grupos. Quien está en lista queda con nombre y nómina de solo lectura |
| Gestión de listas | Importar (agregar o reemplazar) con simulación e historial, exportar, plantilla Excel y vaciar escribiendo «ELIMINAR LISTA» |
| Visitantes conocidos | Se crea o actualiza en cada entrada fuera de la lista blanca, con número de visitas y última foto |
| Prerregistro | Desde el ERP y desde el portal del cliente, con vista «Esperados hoy»; puede durar varios días; al entrar pasa a «ingresó» |
| Entrada, salida y en sitio | Registro de entrada y de salida, lista «en sitio», estadísticas y color de permanencia según el máximo |
| Dispositivo | Se empareja a una instalación; la toma del equipo por el guardia se firma con PIN o rostro con prueba de vida |
| Sin conexión | La portería abre sin red; las entradas sin red se guardan en el dispositivo y se envían al volver la señal |
| Reportes | Correo diario, semanal o mensual con nombre, RUT, empresa, tipo, entrada y salida e intentos denegados; destinatarios desde ERP y portal del cliente; envío de prueba |
| Exportación | Excel de hasta 20.000 registros, solo administradores |

### A.2 Requisitos para 2.0 que salen de la revisión de 1.0

La revisión de 1.0 encontró brechas de seguridad vigentes en producción en el control de acceso. **Su detalle no se documenta en este repo**: se entrega a Carlos fuera de él, y corregirlas en 1.0 solo procede si él lo pide (`AGENTS.md`, pregunta P9 de `modulos/control-acceso.md`). Aquí solo quedan los requisitos que 2.0 debe cumplir.

**Requisitos de seguridad (sin detalle de 1.0)**

1. **Toda acción autenticada y autorizada.** Toda lectura o escritura del control de acceso exige sesión, credencial de dispositivo emparejado o API key, con permiso y alcance verificados en la capacidad (ADR-004, ADR-022).
2. **Rol mínimo del dispositivo.** El dispositivo de portería solo registra entradas y salidas y abre la lista de evacuación; gestionar listas, importar, vaciar, configurar y exportar exige un usuario con permiso (R3).
3. **Reglas de lista aplicadas al decidir.** Vigencia, días, horario, tipos y uso único se aplican al decidir la entrada, en el servidor y sin conexión (R6, R8, R21).
4. **Validar las listas al sincronizar.** Todo registro hecho sin conexión se revalida contra las listas vigentes, **incluida la lista bloqueada**, al sincronizar; la hora oficial es la del servidor y la deduplicación es por tenant y clave de idempotencia (R20–R22).
6. **Sin datos personales en la caché del navegador**, salvo la copia mínima de listas y la copia cifrada de evacuación (R21, R23, R26).
10. **Emparejamiento con límite de intentos.** Código temporal de un solo uso, con vencimiento corto y **límite de intentos** (R28).

**Brechas funcionales**

5. **Cola sin conexión incompleta** (inferido): las salidas no se encolan y parte de lo guardado sin red no se sube.
7. **Prerregistro de varios días**: «hoy» y la lista autorizada solo miran el primer día; nada marca «no llegó»; «hoy» se calcula en UTC.
8. **Foto y firma exigidas por configuración no se aplican** (son marcadores visuales).
9. **Totales del reporte** calculados sobre una muestra acotada de registros.

### A.3 Lo que no existe en 1.0

Retención o borrado automático de registros, visitantes conocidos e intentos; aviso de privacidad al visitante y derechos del titular (Ley 21.719); almacenamiento real de fotos (llegan como URL del cliente); validación contra el Registro Civil; herramientas MCP de control de acceso; aviso al anfitrión; auditoría de lecturas.

## B. Firma electrónica

### B.1 Lo que hace 1.0 (verificado)

| Tema | Comportamiento en 1.0 |
|---|---|
| Nivel | Solo firma electrónica simple (Ley 19.799), con casilla de aceptación de firma electrónica |
| Solicitud | Borrador, pendiente, en curso, completada, cancelada o vencida; firmantes y copias; orden secuencial (por defecto) o paralelo; vencimiento opcional; una solicitud activa por documento |
| Firmantes de la empresa | Representante legal y prevencionista con firma guardada y firma automática |
| Flujo del firmante | Enlace personal por correo: marca «visto», respeta el orden, permite firma escrita, dibujada o subida, y rechazo con motivo (cancela la solicitud) |
| Evidencia | Hora del servidor, IP, navegador, método, nombre o imagen de firma, RUT declarado |
| PDF firmado | Con una página de certificado (firmantes, IP, huella del contenido y QR a una vista) |
| Recordatorios | Vencimiento de solicitudes y recordatorio diario a pendientes |
| Documentos | Cualquier documento del módulo: contratos de servicio y laborales, aviso de término y finiquito |
| Actas en terreno | La visita de supervisión captura la firma del cliente como trazo en el dispositivo del supervisor («Firma aquí / No estaba») |
| Libro y toma de equipo | Firma del guardia con PIN o rostro con prueba de vida, por propósito (anotación, relevo, consigna, toma de equipo, turno) |

Las «firmas» de la configuración del CRM de 1.0 son **firmas de correo**, no de documentos.

### B.2 Requisitos para 2.0 que salen de la revisión de 1.0

La revisión de 1.0 encontró brechas vigentes en la firma de documentos. **Su detalle no se documenta en este repo**: se entrega a Carlos fuera de él (`AGENTS.md`). Aquí solo quedan los requisitos que 2.0 debe cumplir.

1. **Recordatorios y vencimientos programados** por el trabajo diario del núcleo, a todos los pendientes según el modo secuencial o paralelo (R7, R8).
2. **Integridad verificable:** el documento se congela al enviarse, su huella se calcula y se guarda en ese momento, y el PDF firmado es una versión inmutable con su propia huella registrada; la verificación pública compara contra lo registrado (R4–R6).
3. **Documento bloqueado en firma:** un documento en firma o firmado no se edita; cambiarlo crea una versión nueva y cancela la solicitud (R4).
4. **Firma atómica y evidencia completa:** cada firma es una transición condicionada al estado (sin doble firma); el trazo o el nombre se capturan en OPAI y no se aceptan imágenes externas; el texto y la versión de la aceptación quedan en la evidencia (R11, R12).
5. **Actas con identidad del firmante:** nombre, RUN y huella del acta en la firma en terreno (§4 de `modulos/firma.md`).

### B.3 Lo que no existe en 1.0

Código de un solo uso (OTP), verificación de identidad del firmante, firma electrónica avanzada o proveedor externo, sellado del PDF (PAdES) y PDF final inmutable guardado, verificación pública que compare la huella, firma de propuestas de CPQ, firma del guardia en la visita y herramientas MCP de firma.
