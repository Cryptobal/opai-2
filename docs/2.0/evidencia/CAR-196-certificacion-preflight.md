# CAR-196 · Evidencia previa a emitir en certificación (8-nov-2026)

Alcance: PR A (arreglos). **No se emitió ningún DTE ni se cedió nada.** Sin credenciales ni datos personales en este archivo.

## 1. CAF 33, folios 2064–2068 (ambiente, con evidencia)

Lectura **solo de lectura** (`SELECT`) en el proyecto Neon `opai-2` (`steep-wildflower-90764475`), rama `main` (`br-dawn-morning-b6037bp9`), tabla `finanzas.dte_folios`. En la rama `dev` no hay ningún CAF cargado; la rama `main` tiene exactamente este.

| Campo | Valor |
| --- | --- |
| Empresa | `gard` |
| Tipo / rango | 33 · 2064–2068 |
| `folio_actual` | 2064 (**ningún folio consumido**) |
| `activo` | `true` |
| `caf_idk` | `300` |
| `caf_autorizado_en` / `caf_vence_en` | 2026-11-06 / 2027-05-06 |
| Cargado | 2026-11-06 17:46 UTC (`created_at` = `updated_at`: nunca modificado) |

**Qué prueba y qué no.**
- El IDK 300 es la llave del SII con que viene firmado el CAF. LibreDTE (librería de terceros, no documentación oficial del SII) define `IDK_CERTIFICACION = 100` e `IDK_PRODUCCION = 300`. Con esa correspondencia, **la evidencia del archivo es de producción**.
- **No** verifiqué la firma `FRMA` contra las llaves públicas del SII ni descifré el XML (queda cifrado en el almacén del núcleo, ADR-027): la clasificación descansa en el IDK guardado, y la correspondencia viene de un tercero. Para cerrarla del todo falta confirmar con el SII (o la firma) que la llave 300 es la de producción.
- Consecuencia: con el código de este PR, **ese CAF no puede usarse para emitir en certificación** (la guardia lo rechaza), y en `test.opai.cl`/previews el candado CAR-191 fuerza certificación.
- **No lo desactivé, modifiqué ni consumí.** Cualquier cambio sobre él requiere autorización específica de Carlos.

## 2. Lista previa a emitir (estado real al 8-nov, sin emitir)

| Punto | Estado |
| --- | --- |
| Despliegue y commit en `preview.opai.cl` | Hoy apunta a `dpl_HjQ1zj4XwGShTPyruFDpGttPSa6N` (READY), rama `brief/car-221-programacion-circuito`, commit `a5f2f2630c74020b91888cc1d880d8b6a16c72ac`: **otra revisión en curso, no es este PR; no la pisé.** Este PR no está desplegado en el preview. |
| Empresa (tenant) | **Sin verificar.** Por definir con Carlos (hoy el único CAF existe en `gard`). |
| Base de datos (proyecto y rama de Neon) | **Sin verificar** para el preview: las variables del despliegue no se leen. Proyecto `opai-2`; ramas candidatas `dev`, `main`, `preview/pr-N`. |
| Proveedor y ambiente | **Sin verificar:** falta la API key de certificación de SimpleAPI (canal seguro). |
| Certificado | **Falta** el `.pfx` de certificación (canal seguro). |
| CAF de certificación | **Falta** (IDK 100, tipo 33 y 61/56 para la cesión). El único CAF cargado es el 33 anterior, que no sirve en certificación. |
| Candado CAR-191 | Cerrado; este PR no lo toca. |

**Emisión y cesión de prueba: no ejecutadas.** Quedan bloqueadas por lo anterior. Cuando se ejecuten, la evidencia irá separada: (a) simulación (sandbox/datos locales) y (b) aceptación externa del SII de certificación (track ID y estado).

## 3. Qué cambia en el código

1. Resolución SII 0: válida solo en certificación (`resolucionSiiValida`); en producción debe ser > 0. Además el esquema de salida de `dte_config` aceptaba solo ≥ 1 y habría fallado al mostrar una resolución 0.
2. XML de SimpleAPI: el emisor lleva `ActividadEconomica` (lista), `DireccionOrigen`, `ComunaOrigen` y `CiudadOrigen`, con los nombres que usa OPAI 1.0 contra SimpleAPI (no hay documentación oficial accesible; el nombre `ActividadEconomica` no está confirmado por SimpleAPI). El ACTECO sale de `dte_config.acteco` (#419), la dirección de `core.perfil_empresa`.
3. Ambiente del CAF: `dte_folios.caf_ambiente` (migración aditiva `20261114120000_finanzas_caf_ambiente`, sin backfill). Se marca al cargar según el IDK (100 certificación, 300 producción, otro: sin determinar); las filas anteriores lo derivan de `caf_idk`. El preflight (`caf_ambiente`) y la reserva de folios (`consumirFolio`/`foliosPrevistos`) rechazan un CAF de otro ambiente o indeterminado cuando la emisión no es simulada.
