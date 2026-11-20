# CAR-239: preparación de fixture visual, solo local

Candidato contra el head bb5f55ff de #831. Comparado con main 39bb8dc7: no hay cambio
relevante al modelo financiero ni al contrato de preview-e2e; el cambio de reparación
por checksum en preview permanece separado de este trabajo.

## Alcance

Fixture nueva sintética, sin credenciales ni identificadores personales. No lee ni
invoca el SQL manual anterior. Crea proveedor, cuenta, dos facturas, movimiento y
conciliación en una única transacción serializable. Rechaza tenant ausente/suspendido
y colisiones; no adopta, actualiza ni borra filas existentes. Dos llamadas concurrentes
solo pueden crear un conjunto. La fecha histórica fija permite comprobar vencimiento
sin depender del mes de ejecución. Los datos compartidos con E2E son constantes puras.

El harness debe provisionar y verificar una instancia realmente efímera; loopback y nombre
no demuestran aislamiento por sí solos (por ejemplo, podría existir un túnel). Las pruebas
requieren una base nueva vacía. El destino local se valida antes de construir el cliente: PostgreSQL, IP loopback
literal, nombre de base efímera, sin query ni fragmento. El cliente se construye con
esa misma URL; no se acepta un cliente conectado a otro destino. No hay comando ni
paso de CI que ejecute esta fixture. La repetición exacta es de solo lectura: compara todos los escalares salvo timestamps automáticos.
Un conjunto parcial, alterado o con enlaces adicionales falla cerrado y no se repara.

## Bloqueo remoto y mínimo cambio defensivo pendiente

No publicar el cambio de E2E aislado: exige datos que aún no se siembran en preview.
No basta un slug de tenant o PREVIEW_RAMA para verificar el destino real. Para habilitar
setup remoto hace falta un paso explícito de CI, después de verificar y preparar la
rama del PR y antes de los E2E, que:

1. Obtenga metadata autoritativa de Neon usando la integración ya autorizada; compare
   proyecto esperado, ID/nombre de rama exacta del PR y pertenencia del endpoint.
2. Compare el hostname de la conexión con ese endpoint y excluya main/dev. Falle ante
   metadata ausente, discrepancias o endpoint compartido. No imprimir credenciales.
3. Verifique el tenant ficticio esperado y conserve la política de repetición probada:
   conjunto exacto implica solo lectura; cualquier diferencia aborta sin reparación.
   Los conflictos serializables concurrentes pueden fallar y admiten una repetición posterior segura.
4. Mantenga los gates y la suspensión posterior verificada. No etiquetar ni disparar E2E
   antes de revisar y autorizar ese paso y resolver la repetición.

No se ha implementado ese puente de CI ni flexibilizado el guard local. El parche E2E
elimina la omisión por fixture faltante y exige las filas sintéticas específicas.
La validación de Playwright contra un despliegue y la revisión visual quedan pendientes.

## Integración mínima propuesta, no implementada

En main 39bb8dc7, `neon-preview-branch.sh` ya entrega branch_id y la URL sin pool.
No cambió el flujo relevante respecto de fbfc3d5d. Esos outputs no prueban por sí solos
que la URL pertenezca a esa rama. Agregar un único paso a `preview.yml`, después de
migrar/aislar empresas y antes del despliegue, con las mismas condiciones de rama propia,
PR abierto/no-docs y las credenciales que ya usa ese workflow. Sin etiquetas ni nuevo permiso.

El runner debe consultar, justo antes de crear el cliente, la API de gestión autenticada:
`GET /projects/{project_id}/branches/{branch_id}` y
`GET /projects/{project_id}/endpoints`. No consulta SQL para identificar el destino.
Exige nombre exacto derivado del número del PR del evento, ID y proyecto esperados,
rama no predeterminada/protegida y endpoint read_write de esa rama. Compara el hostname
exacto del endpoint con la URL no pooled ya obtenida, sin aceptar redirecciones o parámetros
que sustituyan host/port/conexión. Rechaza respuestas incompletas o ambiguas y errores API.
No aceptar un JSON de metadata suministrado por el PR como prueba de identidad.

Se necesitaría ese runner revisado y un verificador puro con tests negativos, además del
único paso YAML. El guard local actual no debe relajarse para aceptar un nombre de rama.
Fuentes públicas: https://neon.com/docs/reference/api/branches/get-project-branch y
https://neon.com/docs/reference/api/endpoints/list-project-endpoints (campos host,
project_id, branch_id y type). No se consultó ningún proyecto ni endpoint de una cuenta.

## Delta local del puente, separado para revisión

Sobre el commit local de fixture repetible se preparó un runner y un paso YAML restringido
exclusivamente a #831. Aún no publicado ni ejecutado con credenciales. El runner valida evento
GitHub/repositorio, consulta las dos rutas fijas de la API sin permitir redirects, exige rama
exacta no predeterminada/protegida y endpoint writable coincidente, y rechaza URL alternativa,
pooled, puerto alternativo, fragmento o parámetros que cambien conexión. Solo permite opciones
TLS conocidas. La construcción del cliente ocurre después de todas las verificaciones.

El runner no carga dotenv ni acepta archivos de metadata del PR. Los errores públicos son
constantes para no filtrar respuestas, URLs o credenciales del driver. La transacción existente
se extrajo sin cambios a un módulo compartido por los wrappers local y preview. No se modifican
los gates, permisos, migraciones, credenciales o mecanismos de limpieza/suspensión existentes.

Los tests del puente simulan HTTP y el cliente de DB, incluidos errores de API/red/JSON,
redirect, metadata discordante y URL inválida. No son evidencia de ejecución remota ni QA visual.
