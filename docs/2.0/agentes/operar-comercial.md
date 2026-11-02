# Operar Comercial (solicitudes) con GrowthBot u otro agente externo

Manual para una API key de agente con scope **comercial** y permisos mínimos de solicitudes. MCP: `https://test.opai.cl/api/mcp` con cabecera `Authorization: Bearer <API key>`. API equivalente: `https://test.opai.cl/api/v1/comercial/solicitudes/<verbo>`.

## 1. Dar de alta la key (Carlos / owner o admin)

1. Entra a **Configuración → Agentes → Nueva API key**.
2. **Tipo:** `usuario` (GrowthBot opera con los permisos del responsable, acotados por la key) o `servicio` (permisos explícitos en la key; exige presupuesto mensual > 0).
3. **Scopes:** incluye `comercial` (no uses `*` salvo transitorio).
4. **Permisos finos recomendados para GrowthBot:**
   - `comercial:solicitudes.read`
   - `comercial:solicitudes.manage`
   - `core:me.read` (incluido en lecturas habituales del responsable)
   - **No** des `comercial:canales.manage`, `comercial:negocios.manage` ni `core:apikeys.manage` si quieres alcance mínimo.
5. **Presupuesto:** fija un tope mensual en USD si la key usará IA del tenant más adelante; la key de servicio lo exige.
6. Entrega el secreto **una sola vez** por un canal seguro; formato `opai_<empresa>_<32 caracteres>`.

Empieza siempre con **`core_me`**: confirma tenant, scopes, permisos y herramientas visibles.

## 2. Herramientas MCP (canal «agente»)

| Herramienta | Uso |
|---|---|
| `core_me` | Contexto y permisos |
| `comercial_solicitudes_list` / `comercial_solicitudes_get` | Bandeja y ficha (texto externo) |
| `preview_comercial_solicitudes_create` → `comercial_solicitudes_create` | Registrar solicitud en canal **agente** |
| `preview_comercial_solicitudes_enriquecer` → `comercial_solicitudes_enriquecer` | Empresa, contacto, servicio, fuente, notas internas |
| `comercial_solicitudes_buscar_duplicadas` | Duplicadas por correo o RUT antes de crear |
| `preview_comercial_solicitudes_marcar_duplicada` | Enlazar duplicada (con vista previa) |
| `preview_comercial_solicitudes_convertir` | **Propuesta** de conversión (plan qué reutiliza y qué crea) |
| `comercial_solicitudes_convertir` | Conversión real: queda en **aprobación humana** (`APPROVAL_REQUIRED`) salvo autonomía «directo» |
| `comercial_solicitudes_acciones_agente` | Historial de lo hecho por agentes en la ficha |
| `core_aprobaciones_list` / `core_aprobaciones_get` | Seguimiento de conversiones pendientes |

Escrituras: siempre **`preview_` primero**, clave de **idempotencia** en la ejecución real, y respeta el tope de **500** creaciones/enriquecimientos por día por API key.

## 3. Flujo recomendado

1. `comercial_solicitudes_buscar_duplicadas` si ya tienes correo o RUT.
2. `preview_comercial_solicitudes_create` y, si procede, `comercial_solicitudes_create`.
3. `preview_comercial_solicitudes_enriquecer` y enriquecer hasta dejar datos listos para revisión humana.
4. `preview_comercial_solicitudes_convertir` para mostrar el plan; la ejecución real la aprueba una persona en **Configuración → Aprobaciones** (o autonomía «directo» que solo fija owner/admin).

La auditoría registra cada paso como **agente vía** el usuario responsable de la key.

## 4. Fuera de alcance de GrowthBot

- Configurar canales, formulario web o correo de entrada (PR 2 Leads; **no** tocar el endpoint público del formulario).
- Convertir sin aprobación (salvo autonomía explícita).
- Ganar negocios, fusionar cuentas u otras acciones irreversibles de Comercial sin permiso y aprobación correspondiente.
