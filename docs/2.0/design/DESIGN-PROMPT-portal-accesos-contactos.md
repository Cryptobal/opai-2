# Design Prompt · Portal Cliente: accesos por contacto, prospecto limitado y valores por defecto (CAR-218)

**Estado:** preparado para revisión de Carlos; **no aprobado**. Lo prepara «Comercial · Code» (9-nov-2026) tras el OK de Carlos a preparar los diseños (P4). No se construye ni se migra nada hasta el diseño aprobado y la autorización de ejecución (P5). El servidor del PR 1 está integrado (#385); el PR 2 (con migración) es solo propuesta.

**Regla de este prompt: reutiliza lo aprobado y dibuja solo las ampliaciones.** Ya están aprobados y no se redibujan: el export `export-portal-cliente` v3 (30-oct), con «08 Cotizaciones», «12 Configuración Portal Cliente (Ley 21.719)» y «13 Cliente prospecto», y las fichas de cuenta y contacto de `export-crm`.

## Decisiones de Carlos que este diseño respeta (no se vuelven a preguntar)
- **Ciclo (4-nov y 7-nov):** archivar una cuenta bloquea su portal; **ENVIAR** una cotización nueva (no crearla) la desarchiva como **prospecto con acceso limitado**, nunca como cliente activo; **ganar** el negocio la activa; el historial se conserva; **enviar nunca reactiva** accesos que se suspendieron o revocaron a mano.
- **Acceso limitado (P1, 9-nov):** el prospecto ve **solo la propuesta recién enviada**. No ve otras cotizaciones, instalaciones, reportes, documentos ni solicitudes.
- **Los contactos del cliente no son usuarios del ERP:** el acceso se da por contacto de la cuenta.
- **Enlace público (Opción A, 4-nov):** el cliente entra por el Portal; el enlace suelto queda apagado por defecto.
- **Valores por defecto (6-nov 12:02):** los ajustes del portal tienen un valor por defecto en Configuración y cada cuenta puede sobrescribirlo, con «volver al valor por defecto».

```
Diseña con el Design System de OPAI 2.0 V2 (nunca el estilo de OPAI 1.0), en el mismo proyecto del export portal-cliente v3 y de export-crm. Mobile e iPad primero: 375, 1024 y 1280 px. Touch targets ≥ 44 px, foco visible, contraste AA, claro y oscuro. Datos ficticios; nunca datos de Gard. Muestra lo aprobado en gris para dar contexto y dibuja SOLO lo nuevo.

AMPLIACIÓN A · ACCESOS DE CONTACTOS (ERP)
A1. Ficha de cuenta › nueva pestaña «Portal» (la ficha ya está aprobada en export-crm; solo se agrega la pestaña, visible con permiso de ver accesos del portal). Contenido:
 - Resumen: estado de la cuenta frente al portal (Cliente activo · Prospecto con acceso limitado · Pausado por cuenta archivada · Pausado por cuenta inactiva) con una línea que explica qué ve el cliente en ese estado.
 - Lista «Accesos de contactos»: una fila por contacto vigente de la cuenta con nombre, cargo, correo (visible solo con permiso), «principal» si corresponde y un chip de estado: Sin acceso · Invitación pendiente · Activo · Suspendido · Revocado · Sin correo · No disponible (con el motivo: «es usuario interno» o «tiene acceso por otra cuenta»).
 - Acciones por fila según estado: «Dar acceso» (Sin acceso), «Reenviar» no existe (no se repite una invitación vigente: muestra «Invitación enviada el 12-11»), «Suspender», «Revocar» y «Ver instalaciones habilitadas». Dar acceso abre una confirmación con vista previa: «Se invitará a ana@cliente.test. No se habilitan instalaciones todavía». Un suspendido o revocado NO se reactiva desde «Dar acceso»: la fila explica «Reactívalo desde Accesos».
 - Estados: cargando (skeleton con la forma de la lista), vacío («La cuenta no tiene contactos: agrega uno»), error, sin permiso, y cuenta archivada o inactiva (acciones de dar acceso deshabilitadas con el motivo).

A2. Cambio del panel «Invita a los primeros usuarios» del Portal Cliente en el ERP: hoy invita escribiendo un correo; pasa a elegir contactos de la cuenta (Combobox de contactos con su estado). Mantén la opción de invitar un correo nuevo solo si crea primero el contacto.

AMPLIACIÓN B · PROSPECTO CON ACCESO LIMITADO (portal del cliente)
La pantalla «13 Cliente prospecto» ya existe. Redibuja solo su versión para el nuevo ciclo: entra por el portal y ve únicamente la propuesta recién enviada (cotización y propuesta técnica, con descarga), un encabezado «Propuesta de [empresa]» con la fecha de envío, y un texto «Tu acceso completo se activa cuando aceptes el servicio» sin presionar. Sin menú de secciones. Estados: propuesta vigente, propuesta vencida («Esta propuesta venció el 01-12; pide una nueva a tu ejecutivo»), acceso pausado por cuenta archivada o inactiva (mensaje neutro, sin datos de la empresa), cargando, error. Dibuja también la transición visual a cliente activo (menú completo) sin animación decorativa.

AMPLIACIÓN C · VALORES POR DEFECTO Y EXCEPCIONES POR CUENTA (PR 2)
C1. Configuración › Portal Cliente (el módulo ya aparece en Configuración › Módulos activos): los mismos controles de «12 Configuración Portal Cliente» (qué secciones y datos puede ver el cliente) pasan a tener un valor por defecto del tenant. Cada control muestra «Valor por defecto». Solo quien gestiona la configuración del portal.
C2. En la pantalla 12 de cada cuenta: cada control hereda el valor por defecto y, si se cambia, muestra la marca «Distinto del valor por defecto» y «Volver al valor por defecto» (por control y para toda la cuenta). Cambiar el valor por defecto en Configuración NO mueve lo que ya se sobrescribió en una cuenta (dilo en una nota visible). Estados: cargando, guardando, error, sin permiso, y cuenta con todo heredado («Todo igual al valor por defecto»).

Entrega: una pantalla por archivo (.dc.html) con capturas a 375, 1024 y 1280 en claro y oscuro: «CuentaPortalAccesos», «InvitarContactos», «ProspectoLimitado», «ConfigPortalDefectos», «ConfigPortalCuenta». Lista de componentes nuevos que falten al DS (idealmente ninguno).
```

## Propuestas de diseño que Carlos puede cambiar (no bloquean el prompt)
1. **Una sola pestaña «Portal»** en la ficha de cuenta en vez de una pantalla aparte de accesos.
2. **«Dar acceso» nunca reactiva** un acceso suspendido o revocado (regla ya decidida): se reactiva solo desde la pantalla de Accesos.
3. **Si el portal de cotizaciones del cliente se puede apagar por empresa** sigue abierto en el diseño de C1; no lo dibujes como control hasta que se decida.

## Datos que el servidor ya entrega (referencia)
`portal_cliente.contactos.listar` (estados y `accesoId`), `portal_cliente.contactos.dar_acceso` (con `dryRun`; irreversible para un agente) y `portal_cliente.accesos.actualizar` (suspender y revocar). La ampliación C requiere migración (columnas opcionales por cuenta): **solo propuesta, no se aplica**. El ciclo archivar/enviar/ganar y el acceso limitado del prospecto (ampliación B) **no están implementados**: hoy solo se bloquea la cuenta inactiva (#384).
