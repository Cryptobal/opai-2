# BRIEF CAR-27 · Fusionar cuentas y contactos duplicados

Tarea: CAR-27 (Comercial PR 3: «fusión»). Diseño aprobado: `docs/2.0/diseño/export-crm-v3-cierre/CuentaV2.dc.html` con `screen="fusionar"` (estados `elegir`, `comparar`, `resumen` y `agente`). Spec: `docs/2.0/design/DESIGN-PROMPT-crm-pr3.md` §4. Carlos pidió hacerlo «ahora» el 13-nov-2026 (22:05).

## 1. Objetivo

Unir dos registros que son el mismo cliente sin perder nada. Se elige qué cuenta queda, se compara campo por campo para escoger cada valor, se revisa qué se mueve y se confirma. La fusión es irreversible: si la pide un agente, espera aprobación humana (`APPROVAL_REQUIRED`).

## 2. Estado actual (verificado el 13-nov-2026, base local con todas las migraciones)

No existe fusión. Las referencias a `core.cuentas` y `core.contactos` son de tres clases.

**FK a `core.cuentas`:**

| Tabla | Al borrar la cuenta |
|---|---|
| `comercial.negocios` | RESTRICT |
| `core.actividad_vinculos` | CASCADE |
| `core.campo_valores` | CASCADE |
| `core.contacto_cuentas` | CASCADE |
| `core.contactos` | RESTRICT |
| `core.correos_cliente` | SET NULL |
| `core.cuentas_referencias` | RESTRICT |
| `core.cuentas_representantes` | CASCADE |
| `core.etiqueta_asignaciones` | CASCADE |
| `core.instalaciones` | RESTRICT |
| `finanzas.cobranza_gestiones` | RESTRICT |
| `finanzas.documentos_emitidos` | RESTRICT |
| `finanzas.ventas_programaciones` | RESTRICT |
| `portal_cliente.accesos` | CASCADE |
| `portal_cliente.config_cuentas` | CASCADE |

**FK a `core.contactos`:**

| Tabla | Al borrar el contacto |
|---|---|
| `comercial.negocio_contactos` | RESTRICT |
| `core.actividad_vinculos` | CASCADE |
| `core.campo_valores` | CASCADE |
| `core.contacto_cuentas` | CASCADE |
| `core.correos_cliente` | SET NULL |
| `core_firma.firmantes` | SET NULL |
| `finanzas.ventas_programaciones_destinatarios` | RESTRICT |
| `portal_cliente.accesos` | SET NULL |

**Referencias sin FK:**

- `comercial.solicitudes.cuenta_id` y `.contacto_id`.
- `comercial.seguimientos.contacto_id`.
- `core.cuentas_referencias.contacto_id`.

**Polimórficas:**

- `core.documento_vinculos` y `core.ids_externos` se mueven.
- `core.bitacora`, `core.eventos` y `core.comprobantes` son historia y no se reescriben.

**Índices únicos que pueden chocar al mover:**

- `contacto_cuentas` (contacto, cuenta) y un solo principal por cuenta.
- `etiqueta_asignaciones`, `actividad_vinculos` y `campo_valores` (uno por entidad).
- `documento_vinculos` (documento, entidad).
- `instalaciones` (cuenta, nombre).
- `contactos` (cuenta, email).
- `portal_cliente.config_cuentas` (cuenta).
- `negocio_contactos` (negocio, contacto).
- `ventas_programaciones_destinatarios` (programación, contacto).
- `cuentas` (RUT).

## 3. Alcance

**Entra:**

- `core.cuentas.duplicados` (lectura): sugerencias para una cuenta. Primero las de mismo RUT, después las de nombre parecido.
- `core.cuentas.fusionar` (`efecto: "irreversible"`, `dryRun`). La vista previa devuelve la comparación y el resumen de lo que se mueve, y la ejecución lo aplica.
- Hoja «Fusionar cuentas» en la cuenta, en cuatro pasos (Elegir, Comparar, Resumen, Confirmar) con la casilla «Entiendo que es irreversible».
- Después: `core.contactos.fusionar` con la misma forma, en su propio PR.

**No entra:** deshacer una fusión, fusión masiva y la fusión automática por agente (el agente propone y una persona aprueba).

## 4. Arquitectura y reglas

- **Un solo módulo transaccional** en el núcleo (`core/maestros/cuentas-fusion*.ts`). Mueve las filas de cada tabla del inventario, resuelve los choques y al final borra el duplicado.
  - Si aparece una FK nueva hacia `core.cuentas` que no está en el inventario, el borrado falla y no se pierde nada.
  - Una prueba compara el inventario del código con el catálogo de la base, así que una tabla nueva obliga a actualizarlo.
- **Choques, se queda lo de la cuenta que se conserva:**
  - Vínculos repetidos (etiqueta, actividad, documento, contacto–cuenta): se borra el del duplicado.
  - Valores de campos personalizados: queda el de la cuenta que se conserva. Si esa cuenta no tiene valor para un campo, se mueve el del duplicado.
  - Contacto principal: si la cuenta que queda ya tiene uno, los contactos movidos dejan de ser principales.
  - Configuración del portal: queda la de la cuenta conservada.
  - Instalación con el mismo nombre: la movida se renombra con el sufijo « (fusionada)».
- **Se bloquea, con un mensaje que explica qué hacer:**
  - Las dos cuentas son la misma, o una no existe o está fuera del alcance (NOT_FOUND).
  - Un contacto del duplicado tiene el mismo correo que uno de la cuenta que queda: hay que fusionar primero esos contactos.
  - El duplicado tiene documentos tributarios emitidos y su RUT es distinto del RUT final. La factura está ligada a un RUT y no se mueve a otra persona jurídica.
- **Valores elegidos:** de cada campo de la comparación (nombre, razón social, RUT, giro, dirección, sitio web, origen y notas) se toma el de la cuenta que se conserva o el del duplicado. El RUT del duplicado se libera antes de asignarlo, por el índice único.
- **Rastro:**
  - Se emite el evento `core.cuenta.fusionada` (payload `{ duplicadoId }`) y queda en la auditoría.
  - En `core.ids_externos` se agrega la equivalencia, así una importación posterior desde 1.0 encuentra la cuenta que quedó.
  - La historia (bitácora, eventos y comprobantes) no se reescribe.

## 5. Permisos

`core:cuentas.manage` y el alcance de las dos cuentas. Los agentes reciben `APPROVAL_REQUIRED` por `efecto: "irreversible"`.

## 6. Modelo de datos

Sin migración.

## 7. Plan por PR

1. **F1:** capacidades `duplicados` y `fusionar` de cuentas, con pruebas contra Postgres real: inventario, choques, bloqueos, aislamiento y vista previa sin escritura.
2. **F2:** hoja de 4 pasos en la cuenta, prueba `@preview` y novedades.
3. **F3:** fusión de contactos, con capacidad y hoja.

## 8. Decisiones nocturnas (revisar)

- Bloquear la fusión cuando el duplicado tiene documentos tributarios emitidos y el RUT final es distinto.
- Exigir fusionar primero los contactos que tengan el mismo correo.
- Renombrar con « (fusionada)» la instalación movida cuando su nombre choca.
