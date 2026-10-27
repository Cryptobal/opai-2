# Inventario de lecturas sensibles · NÚCLEO-H

Base inspeccionada: `origin/main` `3199b00` (A #71 y C #70 integrados).
No se incorporan capacidades del PR de Puestos #49 ni se modifican sus archivos.
Inventario técnico de OpenCode / openai/gpt-6.1-sol para `nucleo-h-1112-oc`;
no añade una categoría legal ni una decisión de negocio de Carlos.

## Datos y documentos existentes

Todas las lecturas siguientes usan el append encadenado de A. Las nuevas
proyecciones `auditarLectura` se ejecutan **tras validar la salida**, dentro de la
misma transacción del handler, antes de entregar datos. Si falla el append, no
se devuelve la salida. Payload `{ ids: [...] }`, sin input, nombres, RUT, correos,
montos, nombres de archivo ni URLs firmadas. Actor, responsable delegado, tenant,
capacidad y fecha ya son columnas del evento. Se eliminan IDs repetidos.

| Capacidad existente | Datos revelados / IDs auditados |
|---|---|
| `core.personas.list/get` | Identificación, contacto, domicilio y vínculo; personas de la página/ficha |
| `core.vinculos.list` | Historial laboral; vínculos devueltos |
| `core.contactos.list/get` | Identificación/contacto; contactos devueltos |
| `core.cuentas.list/get` | Cuenta persona natural, contacto principal y representantes; cuenta, representantes y contactos de la ficha |
| `core.instalaciones.list/get` | Revelación indirecta del nombre de cuenta; IDs de instalaciones devueltas |
| `core.buscar` | Coincidencias de cuenta/persona/contacto; solo esos IDs, nunca el texto buscado |
| `core.empresa.get` | Representante legal/contactos; sin IDs de salida, `ids: []`, perfil identificado por el tenant del evento |
| `core.cumplimiento.estado` | DPO y aceptantes del DPA; sin IDs de salida, `ids: []`, tenant del evento |
| `core.cumplimiento.consentimientos_listar` | Titular e historial; titular y hechos devueltos |
| `core.cumplimiento.solicitudes_listar/solicitud_obtener` | ARCO, ya implementado en ce7ffaa; solicitudes reveladas, sin centinela |
| `core.cumplimiento.incidentes_listar` | Casos de brecha; IDs de los casos de la página |
| `core.documentos.list` | Metadatos de archivos; solo documentos visibles tras filtros |
| `core.documentos.get` | Documento y versiones; IDs de todos los documentos revelados |
| `core.documentos.url_descarga` | Acceso al archivo; ID autorizado del input, nunca la URL |
| `core.documentos.vencimientos` | Documentos vencidos/por vencer; IDs tras filtro de capa |
| `core.documentos.matriz` | Nombres y estado documental; personas y documentos de las filas devueltas |
| `core.users.list` | Directorio y último acceso; IDs de usuarios miembros del tenant |
| `core.excepciones.list` | Autor de la excepción; IDs de los autores revelados (`fijadoPor.id`) |
| `core.invitations.list` | Destinatarios invitados; IDs de invitaciones efectivamente devueltas |
| `core.notificaciones.list` | Contenido personal del inbox; IDs de avisos propios devueltos |
| `core.apikeys.list/get` | Nombre y correo del responsable, nunca el secreto; IDs de keys |
| `core.aprobaciones.list/get` | Responsable e input/resultado de la operación; IDs de aprobaciones |
| `core.inicio.pendientes` | Puede incluir correo de invitación; sin IDs de salida, `ids: []` |
| `core.audit.list`, `core.actividad.list` | Historial con actores y payload de negocio; IDs de eventos revelados, sin centinela ni copiar payload |

La auditoría del historial anterior es **un evento de acceso a la página**, no
una segunda implementación de la revelación salarial. El mecanismo salarial de
abajo y sus pruebas se conservan sin cambios: no se añade otro
`core.estructuras.read_sensible` por estructura o evento.

## Sueldos: auditoría existente, no duplicada

- `core.cargos.list`, `core.estructuras.list`, `core.estructuras.get`,
  `core.estructuras.efectiva`: mantienen `ocultarMontos`/`ocultarMontosDeCargo` y
  `core.estructuras.read_sensible`, con referencia de estructura sin montos.
- `core.audit.list` y `core.actividad.list`: mantienen
  `auditarHistorialSensible`, referencia al evento histórico y origen, sin montos.
- Las respuestas de escrituras de estructuras ya auditaban la revelación;
  siguen fuera de este cambio de lecturas. Sin cambios en archivos salariales.
- Pruebas existentes: `maestros-estructuras`, `cargos-list-sensible`,
  `actividad-sensible`, `estructuras-alcance-escritura` (unitarias y BD según archivo).

## Lecturas 07d que no revelan registros personales

`core.cumplimiento.rat`, `core.cumplimiento.dpa_texto` y
`core.cumplimiento.retencion_politica` entregan catálogo de campos/actividades,
texto contractual de plataforma y reglas/contadores de retención, respectivamente;
no entregan titulares ni contenido de registros personales. No se marcan como
lectura sensible. La exportación ARCO es una **escritura** (`solicitud_exportar`),
ya auditada; su documento se lee por las capacidades documentales de arriba.

## No existe aún

- Nómina: lectura de liquidaciones, cuentas bancarias, previsión o anticipos.
- Lecturas de liveness/biometría, evaluaciones psicolaborales o grabaciones de audio.
- API de lectura de credenciales (`accounts`), sesiones crudas (`sessions`),
  intentos de login o destinatarios de `envios`: no existe como capacidad de negocio;
  el último acceso agregado de usuarios sí se cubre arriba. No se construye esa API.
- Lecturas del explorador/editor/firma del módulo Documentos (Brief 09), aparte
  del servicio documental que ya existe y se cubre íntegramente arriba.

No son bloqueos ni se simulan módulos futuros. La identidad propia (`core.me`),
los flujos internos de autenticación/invitación por token y la administración
global `platform.*` conservan sus contratos de identidad/plataforma, no son
lecturas de los registros sensibles del tenant de 07d.

## Verificación

`lecturas-sensibles-db.test.ts` ejecuta el inventario nuevo sobre dos tenants,
rol real NOBYPASSRLS y documentos públicos/de cumplimiento. Comprueba payload
exacto, IDs y fallo cerrado/rollback por cada capacidad, permiso y alcance;
ARCO y sueldos mantienen además su cobertura previa específica. Las versiones,
matriz y vencimientos aplican también el filtro de documentos de cumplimiento,
evitando rutas laterales sin `cumplimiento.read`.

La autorrevisión detectó dos carreras y dos lecturas indirectas faltantes. Se
añaden instalaciones y excepciones. Los documentos retienen `FOR SHARE` sobre
las instalaciones, puestos y vínculos de dueño que justifican el conjunto
autorizado hasta terminar la transacción; solo se usan filas efectivamente
bloqueadas. Consentimientos autoriza exclusivamente contra los contactos
bloqueados, no contra una selección posterior ampliable. Pruebas con barreras
en `lecturas-concurrencia-db.test.ts`, incluidas descarga y entrada tardía de un
contacto al alcance. Son correcciones técnicas del constructor, no decisiones
de negocio nuevas. Los mocks solo simulan las selecciones; los locks se prueban
contra Postgres real, no en memoria.
