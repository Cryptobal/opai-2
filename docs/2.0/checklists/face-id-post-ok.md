# Checklist de verificación post-OK · Face ID (CAR-89, PR #360)

**Estado:** preparado el 8-nov-2026 por «Asistencia · Code». Solo documentación: no enciende nada, no abre proveedor real y no migra. Se ejecuta **después** del OK explícito de Carlos (ver «Puertas»).
**Base de los datos:** ADR-082 y el head de la rama de #360 (`6363653`, 7-nov-2026). Si la rama cambia, revisar los nombres de ajustes, rutas y capacidades contra el código antes de usar este archivo.
**No acredita cumplimiento** de la Res. Ex. 38 ni de la Ley 21.719; ordena la verificación. La matriz legal vive en [`asistencia-dt.md`](asistencia-dt.md).

## Puertas (todas, antes de tocar un ajuste)

| # | Puerta | Quién | Estado |
|---|---|---|---|
| 1 | OK visual de Carlos sobre las pantallas sin diseño aprobado (D-11), con enlace usable y puntos de usabilidad (A2.10) | Carlos | Pendiente |
| 2 | Evaluación de impacto y DPA con el proveedor, antes de cualquier empresa real (Ley 21.719) | Carlos | Pendiente |
| 3 | Revisión final de la sesión sobre el head de #360 y 4 checks en verde | Sesión | Pendiente |
| 4 | Integración «biometria» configurada por el bot («OPAI 2.0», con `@opai-2.0:`); las credenciales las pone Carlos en el almacén cifrado | Carlos / bot | Pendiente |
| 5 | Widget de AWS Face Liveness en el navegador (dependencia y credenciales temporales) | Carlos decide | Pendiente |

Sin las puertas 2, 4 y 5 solo se puede verificar con el **proveedor simulado en una empresa `qa-…`** (secciones A a D). La sección E exige las tres.

## Ajustes, en este orden (apagado por defecto)

| Ajuste | Ámbito | Para qué | Orden |
|---|---|---|---|
| `marcas_habilitadas` | empresa | Sin él no sale ninguna marca real | 1 |
| `canales_por_instalacion` (kiosco; `telefono_personal` opcional) | empresa | Sin entrada, la instalación marca solo en el kiosco | 2 |
| `rostro_habilitado` | empresa | Apagado: todos marcan con RUT + PIN | 3 |
| `telefono_personal_permitido` | empresa | Además cada persona debe estar habilitada y consentir (T-04) | 4, opcional |
| `biometria_umbral_similitud` (90; 70–99,9) | **plataforma** | Lo fija la plataforma, no la empresa (T-03) | solo ajustar con evidencia |
| `biometria_empresas_reales` | **plataforma** | Cerrado: solo `qa-…`. Se abre solo con las puertas 2 y 4 | **último** |

Regla: no se enciende `biometria_empresas_reales` para verificar nada. Si algo requiere una empresa real, se detiene y se pregunta a Carlos.

## A. Rutas y qué mirar (preview del PR, empresa `qa-…`, proveedor simulado)

Verificar cada ruta a **375 y 1280 px** (y 1024 en iPad), tema claro y oscuro, con la sesión del rol indicado.

| Ruta | Rol | Qué mirar |
|---|---|---|
| Ficha de persona › Laboral › «Rostro para marcar» (`/personas/[id]/laboral`) | RR. HH. | Estado del rostro, botón de borrar con confirmación, habilitar teléfono; sin foto en ningún lugar |
| `/terreno/marcar` | Kiosco emparejado | RUT + PIN siempre visible; con `rostro_habilitado` suma la captura; mensaje claro si falla; sin conexión no encola (ADR-082 §8) |
| `/trabajador/marcar` | Trabajador habilitado | Solo si la instalación incluye `telefono_personal`, el interruptor general está encendido y la persona consintió |
| `/trabajador/mi-rostro` | Trabajador | Consentir, enrolar y revocar; revocar deja solo PIN |
| `/pauta` (diaria y mensual) | Supervisor / operaciones | Ver sección C |
| Configuración › Auditoría | Admin | Las acciones de rostro y marca aparecen con etiqueta legible y sin datos biométricos |

Tab, foco visible, targets ≥44 px, estados de carga, vacío, error y sin permisos en cada pantalla (reglas de UI).

## B. Flujo funcional con el simulado

1. Consentir (`biometria_asistencia`) → enrolar con el «rostro de prueba» → marcar con el mismo rostro: marca registrada, canal y mecanismo visibles.
2. Marcar con otro rostro de prueba: no coincide; la marca no se registra por rostro y ofrece PIN.
3. Marcar con «foto» (sin vida): rechazada.
4. Caer a PIN: exige `motivo_respaldo` (ajuste `pin_respaldo_exige_motivo`); PIN erróneo repetido bloquea de forma atómica.
5. Revocar: el rostro se borra de inmediato y solo queda PIN; repetir el paso 1 falla hasta volver a consentir.
6. Geocerca (300 m): una marca fuera del radio se registra igual y queda señalada; el GPS nunca bloquea.
7. Repetir la misma marca con la misma clave del dispositivo: no duplica (idempotencia).
8. Dar de baja a la persona: el trabajo diario de supresión borra su rostro.

## C. Presencia en la Pauta (criterio de Carlos: marcar = asistió, visible igual en diaria y mensual)

Con datos de prueba, para cada estado verificar **la misma lectura** en la grilla mensual (punto por celda), en la Pauta diaria y en el detalle del día:

| Estado | Etiqueta | Cómo provocarlo |
|---|---|---|
| presente | «Asistió» | Entrada y salida del día |
| incompleto | «Sin salida» | Solo entrada |
| sin_marca | «Sin marca» | Turno esperado, aún sin marca |
| ausente | «Ausente» | Turno pasado sin marca |
| sin_turno | (sin etiqueta) | Día libre |

Además: marca por rostro y por RUT + PIN se ven **idénticas**; las horas están en hora de Chile; con Asistencia apagada o sin `asistencia:ver` no aparece ninguna presencia (el dato no viaja al navegador); un reemplazo muestra la presencia de quien cubre.

## D. Negativos (deben fallar cerrados)

- Empresa real con proveedor real y `biometria_empresas_reales` apagado: sin biometría disponible, todos marcan con RUT + PIN.
- Empresa distinta del tenant: nunca ve rostros, colecciones ni consentimientos de otra (una colección por empresa).
- Persona sin consentimiento vigente: no se enrola ni se verifica.
- `asistencia:configurar` no enrola a otra persona (solo la propia persona o el kiosco con su PIN).
- Ninguna respuesta de API ni MCP, ni log ni auditoría, contiene imagen, plantilla, credenciales ni la respuesta cruda del proveedor.
- Con `rostro_habilitado` apagado el kiosco no pide cámara.

## E. Solo tras las puertas 2, 4 y 5 (proveedor real)

1. Probar primero en una empresa `qa-…` con credenciales reales: crear colección, enrolar, verificar, borrar y eliminar la colección.
2. Comprobar el consumo medido en `core.consumos` (sin duplicar cobro con credenciales propias).
3. Medir latencia de la marca por rostro en red móvil y falsos rechazos antes de fijar el umbral.
4. Solo con OK expreso de Carlos para esa empresa: abrir `biometria_empresas_reales` y repetir B en una persona real **con su consentimiento**.

## Reversa

Orden para apagar: `rostro_habilitado` (todos vuelven a RUT + PIN) → `biometria_empresas_reales` → `marcas_habilitadas` si hubiera que detener todo. Para borrar datos: revocar el consentimiento (borra el rostro) o la baja de la persona. No hay migración de #360, así que no hay reversa de esquema.

## Evidencia que se deja en el PR

Capturas a 375 y 1280 px de cada ruta de A y de la sección C, resultado de B y D, comentario `REVISIÓN VISUAL CARLOS:` con la preview verificada, y SHA del head sobre el que se verificó.
