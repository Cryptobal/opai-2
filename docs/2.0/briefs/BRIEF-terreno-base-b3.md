# BRIEF · Terreno base · B3 · Portal Terreno y cola sin conexión (CAR-78)

**Sesión:** «Operaciones · Base · Code». **ADR:** 079. **Migración:** `20261108120000_core_hechos_terreno` (aditiva, con RLS; la aplica el bot «OPAI 2.0»). **Diseño:** `docs/2.0/diseño/export-terreno/` (v1, aprobado el 30-oct-2026): g0 Inicio, g1 «¿Quién eres?» y g6 «Cola sin conexión» (de `Rondas Guardia.dc.html`).

## Objetivo

Un equipo de terreno ya emparejado (B2) abre Terreno, el guardia elige su nombre, y lo que captura **sin señal** queda en el teléfono y llega **una sola vez** al volver la conexión, con la hora del servidor y el desfase del reloj del dispositivo (criterio 3 del frente). Las rutas de Terreno pesan ≤ 150 KB de JS en la primera carga (criterio 6).

## Qué entra

- **`core.hechos_terreno`** (append-only para `opai_app`: solo `SELECT` e `INSERT`): lo que el equipo envía, con `clave` (idempotencia), `tipo`, `payload`, `hora_hecho` (reloj del dispositivo), `hora_envio` (reloj del dispositivo al enviar), `recibido_en` (servidor), `desfase_ms`, `hora_corregida`, la persona elegida en «¿Quién eres?» y el dispositivo. Único por `(tenant_id, dispositivo_id, clave)`.
- **Tipos encolables (lista blanca) en `packages/domain`:** cada módulo de terreno declara los suyos con su esquema en su propio PR (Rondas, Asistencia, Novedades, Acceso). B3 trae solo `terreno.latido` (el equipo avisa que estuvo activo, sin datos personales) para probar de punta a punta. Un tipo que no está en la lista se rechaza y el resto del lote sigue.
- **Capacidades:** `core.terreno.hechos.recibir` (interna: el equipo no tiene sesión; su cookie es la credencial) y `core.terreno.hechos.listar` (con herramienta MCP, alcance por instalación, lectura auditada). `core.terreno.personas.listar` (interna) alimenta «¿Quién eres?» con nombre y cargo de quienes tienen vínculo activo en la instalación del equipo.
- **Ruta `POST /api/terreno/lote`:** cookie del dispositivo, hasta 50 hechos y 256 KB por lote, tope por dispositivo (fallo cerrado). Responde por hecho: `recibido`, `duplicado` o `rechazado` (con motivo). Un equipo revocado recibe 401 y no escribe nada.
- **Cola local:** IndexedDB `opai-terreno` y envío desde `public/sw.js` (Background Sync `opai-terreno-lote`, mensaje de la página y evento `online`), con reintento y espera creciente. Los hechos viajan con su `clave`; reenviar es seguro.
- **Pantallas** (DS `@opai/ds`, 375/1024/1280, claro y oscuro): `/terreno` Inicio del equipo (en línea, sin conexión, sincronizando), «¿Quién eres?» y «Cola sin conexión» con «Reintentar ahora».
- **Proxy:** `/terreno` pasa sin sesión; la página verifica el equipo en servidor. El portal con sesión sigue igual.

## Decisiones de diseño

1. **D1 (modo dispositivo).** Este PR implementa el equipo emparejado con «¿Quién eres?». La sesión de cada guardia sigue disponible por el portal; si hay sesión, `/terreno` muestra lo de siempre.
2. **Hora del servidor manda.** `desfase_ms = recibido_en − hora_envio`; `hora_corregida = hora_hecho + desfase_ms`. Si el desfase pasa de 10 minutos queda marcado `desfase_alto` (el hecho se guarda igual: no se pierde un hecho por un reloj malo). Nada se edita ni se borra: una corrección es un hecho nuevo (ADR-023).
3. **La persona elegida es declarada, no autenticada.** «¿Quién eres?» fija quién usa el teléfono; no prueba que lo sea. Verificarlo (rostro, PIN) llega con la biometría (B4) y con cada módulo que lo exija.
4. **Equipo revocado:** el envío se rechaza y la pantalla avisa «Este dispositivo ya no está emparejado» (B2); los hechos pendientes se descartan con ese aviso. DECISIÓN CARLOS: si prefiere conservarlos hasta que un administrador los rescate, se cambia en un PR aparte.
5. **Sin datos personales en el log ni en el aviso del lote:** solo identificadores y conteos.

## Criterios

- Pruebas: dominio (lista blanca, desfase), `hechos-terreno-db.test.ts` (capacidades; dos empresas, idempotencia, equipo revocado, tipo no permitido, append-only), e2e en modo avión (el hecho llega una vez al recuperar la señal), presupuesto de JS por ruta.
- Paridad: instantánea MCP e inventario regenerados; las capacidades internas con su motivo.
