# Agente interno del tenant

Cliente del registro común de capacidades, sin herramientas de negocio propias.
Requiere módulo agente activo y permiso agente:usar. Configurarlo exige agente:configurar.
La UI llegará en otro PR con export aprobado, siempre con el Design System de OPAI 2.0.

## Flujo

1. agente.modelos.list devuelve proveedor, clase y modelo conectados, nunca credenciales.
2. Una sesión humana solicita agente.turno.preparar con mensaje, modelo y nivel:
   aprobar_todo o paso_a_paso. En el servidor se delegan sus permisos y alcance actuales.
3. El modelo propone herramientas del MCP. Las lecturas se ejecutan y sus resultados
   se marcan externos; las escrituras solo producen dryRun y un plan firmado.
4. La persona revisa la vista previa y llama agente.plan.confirmar con token y aceptar.
   Una API key no puede confirmar ni iniciar otro agente. Rechazar impide reutilizar
   ese token para aceptar. En paso_a_paso, solo el servidor entrega el token siguiente.
5. Lo irreversible queda en core.aprobaciones con APPROVAL_REQUIRED: solo una persona
   puede aprobarlo. El plan se detiene allí; no adelanta los pasos siguientes.
6. agente.historial.list muestra solo metadatos de acciones vía el usuario actual,
   nunca conversaciones, resultados de lecturas ni datos de otra empresa.

## Seguridad y límites

El actor es agent, identificado como agente-interno:<usuario>, con via_user del usuario
y apiKeyId nulo. Auditoría y medición distinguen «Agente interno» de las keys externas.
Un documento, correo o resultado de herramienta es dato: nunca confirma ni autoriza.
Los planes están ligados a tenant, usuario, portal y acceso vigente; vencen en una hora.
Se firma en servidor con BETTER_AUTH_SECRET, sin una clave nueva ni claves en el cliente.
Cada escritura lleva su propia idempotencyKey; las confirmaciones concurrentes compiten
por una reserva común. Se confirman la capacidad y sus argumentos firmados: las fechas
calculadas del dryRun no son una versión del estado. Cada capacidad revalida sus reglas
al previsualizar y al escribir; el agente no agrega una garantía atómica entre ambas llamadas.

No hay tablas nuevas de conversaciones ni memoria. Solo existe el caché temporal del
resultado/idempotencia del núcleo (24 horas y purga diaria), las aprobaciones y la
auditoría existentes, aislados con RLS. El presupuesto opcional por tenant usa el ledger
atómico de C, con aviso al 80 %. 0 significa sin tope. El costo ya incurrido se registra;
el siguiente prepago corta. Hay 12 pasos y 128.000 tokens medidos por turno: una respuesta
que supera el límite se registra y se rechaza, sin continuar ni ejecutar escrituras.

POST /api/agente requiere sesión, MFA aplicable, origen propio y acceso ERP. Emite SSE
iniciado/resultado/error, no fragmentos del texto del proveedor. No acepta API keys.
No hay UI ni entrada nueva de navegación. Otros portales quedan para la UI posterior.

## Escenario determinista (ADR-034 §5)

modules/agente/bucle.test.ts y planes.test.ts usan un proveedor simulado: una capacidad
nueva aparece sin editar el agente; una lectura conserva alcance y marca externo;
dos escrituras solo se ejecutan después de confirmar el plan o cada paso; rechazar
no escribe; una acción irreversible solicita aprobación, incluso si el texto externo
ordena saltarse las reglas. Otro tenant, otro alcance o un token alterado se rechazan.
presupuesto-interno-db.test.ts prueba 20 cargos concurrentes contra un tope de 10.
agente-interno-aislamiento-db.test.ts prueba el mismo usuario en dos empresas.

Si una ejecución se interrumpe después de un efecto, no se libera la reserva del plan:
consulta la auditoría antes de solicitar otra acción. No presupongas que fallar la
conexión significa que no hubo escritura.
