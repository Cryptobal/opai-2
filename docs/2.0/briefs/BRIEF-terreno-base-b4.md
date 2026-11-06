# BRIEF · Terreno base · B4 · Adaptador de biometría (CAR-78)

**Sesión:** «Operaciones · Base · Code». **ADR:** 079. **Migración:** `20261108130000_core_enrolamientos_biometricos` (aditiva, con RLS; la aplica el bot «OPAI 2.0»).

## Objetivo

Dejar listo, detrás de un contrato estable, el reconocimiento facial que usarán Asistencia, Rondas y Control de acceso: enrolar, verificar 1:1 con prueba de vida y borrar, **solo con el consentimiento vigente** de la persona y con el borrado automático al revocarlo (criterio 4 del frente). Hoy corre con un proveedor **simulado**; el proveedor real entra después detrás del mismo contrato (D-03 y D-04 siguen abiertas).

## Qué entra

- **Adaptador** en `packages/integrations/src/biometria`: `Biometria` (`enrolar`, `verificar`, `borrar`), proveedor simulado determinista (`rostro:<token>`; `…:foto` no pasa la prueba de vida) y `biometriaDelEntorno()`: el simulado solo en pruebas y desarrollo; en producción o preview **falla cerrado** (`BiometriaNoConfigurada`). OPAI nunca guarda la imagen ni la plantilla.
- **`core.enrolamientos_biometricos`:** una fila por persona con la **referencia opaca del proveedor, cifrada** con la DEK de la empresa (campo sensible del inventario 07d, base de licitud «consentimiento»), el consentimiento que la habilitó y el proveedor. La app puede leer, insertar, borrar y actualizar solo la referencia cifrada (rotación de DEK).
- **Capacidades:** `core.biometria.enrolar` y `core.biometria.verificar` (solo personas: la muestra es una imagen del rostro y no pasa por el MCP), `core.biometria.estado` y `core.biometria.borrar` (con herramienta MCP, `dryRun`). Medidas en `core.consumos` (`biometria.enrolar`, `biometria.verificar`).
- **Consentimiento 07d:** finalidad `biometria_asistencia`. Sin un último hecho «otorgado» no se enrola ni se verifica.
- **Revocación:** el consumidor `core.biometria.revocacion` escucha `core.cumplimiento.consentimiento_revocado` de esa finalidad y borra el rostro en el proveedor y la referencia local. Es idempotente y no borra un rostro enrolado después con un consentimiento nuevo.
- **Anonimizar a la persona** (a su pedido o por retención) también borra su rostro: `anonimizarPersona` avisa con `core.biometria.anonimizacion_pendiente` y el mismo consumidor lo borra en el proveedor y aquí.
- **Concurrencia:** enrolar, borrar, revocar y anonimizar toman el bloqueo de la fila de la persona; enrolar revalida el consentimiento dentro de la transacción, así que una revocación concurrente nunca deja un rostro sin consentimiento. Verificar exige que el consentimiento vigente sea el que habilitó el enrolamiento.
- **Eventos:** `core.biometria.enrolado`, `core.biometria.borrado` y `core.biometria.anonimizacion_pendiente` (sin datos biométricos).

## Decisiones

1. **El simulado no es un proveedor de producción.** Fuera de pruebas y desarrollo el adaptador falla cerrado: nadie queda «verificado» sin un proveedor real.
2. **Puntaje mínimo 90** de 100 para dar por verificado un rostro (más coincidencia y prueba de vida). El umbral real lo fija la política del proveedor elegido.
3. **No hay pantalla de enrolamiento ni cámara en este PR.** B4 deja el contrato, la base y las capacidades; la captura va con Face ID (Asistencia). Por eso no hay cambio visual.
4. **Cómo se pierde el rostro:** al revocar, la supresión es **eventual** (el outbox se despacha en segundos); mientras tanto `verificar` ya rechaza porque exige el consentimiento vigente.
5. **PIN siempre disponible:** quien no tenga rostro enrolado o no consienta marca con RUT y PIN (D-02, Res. Ex. 38 art. 57).

## Criterios

- Pruebas: adaptador (`biometria.test.ts`), `biometria-db.test.ts` (consentimiento, referencia cifrada, verificación con prueba de vida, dos empresas, revocación que borra, revocación tardía, borrado manual), inventario 07d y retención.
- Paridad: instantánea MCP e inventario regenerados; las capacidades de muestra con su motivo.
