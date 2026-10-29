# Extracción de OPAI 1.0 · Control de acceso y firma electrónica

**Fecha:** 29-oct-2026 · **Tarea:** CAR-73 · **Autor:** Claude · **Fuente:** lectura de `Cryptobal/opai` (HEAD del 29-oct-2026), solo lectura y como referencia de reglas de negocio. No se porta código (`REGLAS-codigo.md`).

> Al 29-oct-2026 no existía en `main` una extracción de control de acceso ni de firma. Esta es la primera. Distingue lo **verificado en el código** de lo **inferido**, que se marca así. Las rutas citadas son de 1.0.

## A. Control de acceso físico (`/portal/acceso`, `/api/access-control/*`)

### A.1 Lo que hace 1.0 (verificado)

| Tema | Comportamiento en 1.0 | Dónde |
|---|---|---|
| Configuración por instalación | Una configuración por instalación: tipos de registro habilitados, modo de acceso (`solo lista blanca` o `lista blanca + registro manual`, este por defecto), qué tipos se cruzan con lista blanca y cuáles con lista negra, exigir validación de documento, foto o firma, permanencia máxima en horas, frecuencia del reporte automático, formulario y campos de la nómina, lista negra del cliente activable | `prisma/schema.prisma` (schema `access_control`, `AccessControlConfig`) |
| Tipos de registro | Visita, proveedor, vehículo, personal y despacho, más tipos personalizados por tenant con sus modos de escaneo y campos por defecto | `records/[installationId]/entry/route.ts`, `AccessControlRecordType` |
| Identidad | RUT con dígito verificador, pasaporte o documento extranjero con país; lectura del QR de la cédula chilena (formatos 2013 y 2024) y de la zona MRZ | `src/lib/access-control/identity.ts`, `utils.ts`, `mrz.ts` |
| Validación de cédula | No consulta al Registro Civil: siempre responde «no verificado» | `validate-cedula/route.ts` |
| OCR | MRZ y patente leídos con un modelo de IA multimodal del tenant (imagen de hasta 4 MB) | `ocr-mrz/route.ts`, `ocr-plate/route.ts` |
| Lista negra | Por documento, de la instalación, global del tenant o por grupo, filtrada por tipo. Si coincide, rechaza y registra un intento denegado | `entry/route.ts`, `whitelist-match.ts` |
| Lista blanca | En modo estricto exige estar en la lista o tener un prerregistro de hoy; si no, rechaza y registra el intento. Admite vigencia, días y horario permitidos, uso único y grupos. Quien está en lista queda con nombre y nómina de solo lectura | `AccessControlList`, `AccessControlListGroup*` |
| Gestión de listas | Importar (agregar o reemplazar) con simulación e historial, exportar, plantilla Excel y vaciar escribiendo «ELIMINAR LISTA» | `lists/[installationId]/*`, `list-import.ts` |
| Visitantes conocidos | Se crea o actualiza en cada entrada fuera de la lista blanca, con número de visitas y última foto | `known-visitors/`, `AccessControlKnownVisitor` |
| Prerregistro | Desde el ERP y desde el portal del cliente, con vista «Esperados hoy»; puede durar varios días; al entrar pasa a «ingresó» | `preregistrations/*`, `EsperadosHoySection.tsx` |
| Entrada, salida y en sitio | Registro de entrada y de salida, lista «en sitio», estadísticas y color de permanencia según el máximo | `records/*`, `utils.ts` |
| Dispositivo | Se empareja con el código de la instalación; la toma del equipo por el guardia se firma con PIN o rostro con prueba de vida | `pair/route.ts`, `set-guard/route.ts`, `src/lib/libro/firma.ts` |
| Sin conexión | El service worker unificado precarga el portal; las entradas sin red van a una cola local y se sincronizan; una caché de listas impide autorizar sin red a quien no esté en la lista blanca guardada | `public/sw.js`, `AccessControlEntry.tsx`, `list-validation-cache.ts`, `sync/route.ts` |
| Reportes | Correo diario, semanal o mensual con nombre, RUT, empresa, tipo, entrada y salida e intentos denegados; destinatarios desde ERP y portal del cliente; envío de prueba | `cron/access-control-reports`, `src/lib/access-control/report.ts` |
| Exportación | Excel de hasta 20.000 registros, solo administradores | `src/lib/access-control/export.ts` |

### A.2 Brechas observadas en 1.0

Se describen en términos de negocio. Las que afectan a la seguridad de 1.0 en producción se reportan a Carlos en el PR (corregirlas en 1.0 solo procede si él lo pide, `AGENTS.md`).

1. **Rutas sin control de acceso.** Varias rutas del control de acceso aceptan llamadas sin sesión ni credencial de dispositivo, incluidas algunas que leen datos personales o cambian dispositivos. El detalle se entrega a Carlos fuera del repo y no se documenta aquí hasta que se corrija (pregunta P9 de `modulos/control-acceso.md`).
2. **El dispositivo tiene poderes de administrador.** Con su credencial se pueden importar o vaciar listas y cambiar la configuración. No se revisan permisos por rol.
3. **Vigencia, días y horario de la lista blanca** no se aplican al registrar la entrada; solo se muestran.
4. **La sincronización sin conexión no revisa la lista negra** ni registra intentos denegados, toma la hora del dispositivo como verdad y deduplica de forma débil (sin tenant).
5. **Cola sin conexión incompleta** (inferido): las salidas no se encolan y parte de lo guardado sin red no se sube.
6. **La caché del navegador guarda respuestas con datos personales** del control de acceso.
7. **Prerregistro de varios días**: «hoy» y la lista blanca solo miran el primer día; nada marca «no llegó»; «hoy» se calcula en UTC.
8. **Foto y firma exigidas por configuración no se aplican** (son marcadores visuales).
9. **Totales del reporte** calculados sobre a lo más 200 registros.
10. **Código de emparejamiento** permanente, de 6 caracteres y sin límite de intentos.

### A.3 Lo que no existe en 1.0

Retención o borrado automático de registros, visitantes conocidos e intentos; aviso de privacidad al visitante y derechos del titular (Ley 21.719); almacenamiento real de fotos (llegan como URL del cliente); validación contra el Registro Civil; herramientas MCP de control de acceso; aviso al anfitrión; auditoría de lecturas.

## B. Firma electrónica

### B.1 Lo que hace 1.0 (verificado)

| Tema | Comportamiento en 1.0 | Dónde |
|---|---|---|
| Nivel | Solo firma electrónica simple (Ley 19.799); casilla obligatoria de aceptación de firma electrónica | `src/lib/validations/docs.ts` |
| Solicitud | Borrador, pendiente, en curso, completada, cancelada o vencida; firmantes y copias; orden secuencial (por defecto) o paralelo; vencimiento opcional; una solicitud activa por documento | `DocSignatureRequest`, `DocSignatureRecipient`, migraciones `20260219000000_*`, `20260511150000_*` |
| Firmantes de la empresa | Representante legal y prevencionista con imagen de firma guardada y autoestampado | `20261221000000_docs_laborales_multi_signer`, `notify-due-signers.ts` |
| Flujo del firmante | Enlace con token a `/sign/[token]`: marca «visto», respeta el orden, permite firma escrita, dibujada o subida, y rechazo con motivo (cancela la solicitud) | `src/app/(templates)/sign/[token]/page.tsx`, `api/docs/sign/*` |
| Evidencia | Hora del servidor, IP, navegador, método, nombre o imagen; el RUT declarado queda solo en el historial | `DocSignatureRecipient`, `docHistory` |
| PDF firmado | Se genera desde HTML con una página de certificado (firmantes, IP, SHA-256 del contenido y QR a una vista) | `api/docs/documents/[id]/signed-pdf/route.ts` |
| Recordatorios | Trabajo que vence solicitudes y recuerda cada 24 h | `api/cron/signature-reminders` |
| Documentos | Cualquier documento del módulo: contratos de servicio y laborales, aviso de término y finiquito | `prisma/seeds/seed-labor-templates.ts` |
| Actas en terreno | La visita de supervisión captura la firma del cliente como trazo en el dispositivo del supervisor («Firma aquí / No estaba») | `FirmaCanvas.tsx`, `CierreClient.tsx` |
| Libro y toma de equipo | Firma del guardia con PIN o rostro con prueba de vida, por propósito (anotación, relevo, consigna, toma de equipo, turno) | `OpsLibroFirma`, `src/lib/libro/firma.ts` |

`crm/signatures` y `opai/configuracion/firmas` son **firmas de correo**, no de documentos.

### B.2 Brechas observadas en 1.0

1. **El trabajo de recordatorios no está programado** (`vercel.json`): nada vence ni recuerda solo.
2. **El hash no prueba nada**: se calcula al generar el PDF, no al firmar, no se guarda, y el PDF se regenera con los datos actuales, así que puede cambiar después de firmado.
3. **Un documento firmado o en firma se puede editar.**
4. **Sin control de concurrencia** al firmar; la imagen de firma acepta cualquier URL o un data URL sin límite; la aceptación legal no se guarda.
5. **En modo paralelo** solo se recuerda al primer orden.
6. **La firma del cliente en la visita** no guarda nombre ni RUT de quien firma ni la huella del resumen.

### B.3 Lo que no existe en 1.0

Código de un solo uso (OTP), verificación de identidad del firmante, firma electrónica avanzada o proveedor externo, sellado del PDF (PAdES) y PDF final inmutable guardado, verificación pública que compare la huella, firma de propuestas de CPQ, firma del guardia en la visita y herramientas MCP de firma.
