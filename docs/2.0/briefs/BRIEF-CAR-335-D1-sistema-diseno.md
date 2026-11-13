# BRIEF · CAR-335 D1 · Sistema de diseño nuevo

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109 (Carlos, 12-nov-2026). Diseño: `docs/2.0/design/export-diseno-nuevo/`.

## 1. Objetivo
Dejar en el código y en Claude Design el sistema del diseño nuevo: colores de día y de noche, tipografía, forma y el color de cada empresa como único acento, sin que nadie vea todavía un cambio en la aplicación.

## 2. Estado actual (verificado en `main`, 12-nov-2026)
`tokens.css` tiene la piel clásica y la de Hilo (`[data-marco="hilo"]`). Las fuentes (Inter y JetBrains Mono) estaban fijas en `@theme`. El perfil de marca (`core.marca.get` y `core.marca.update`) ya guarda `colorPrimario`; la interfaz no lo usa.

## 3. Alcance
Entra: piel `[data-marco="nuevo"]`, fuentes por piel, Geist autoalojada, `acentoDeMarca`, muestra `/ds/nuevo` y el sistema en Claude Design. No entra: el marco (D2), Inicio (D3), listas y fichas (D4), activar la piel (D6).

## 4. Arquitectura
Igual que Hilo: tokens con alcance por atributo. La tipografía pasa a `--ds-font-sans` y `--ds-font-mono`, definidas en `:root` (Inter y JetBrains Mono) y redefinidas por la piel nueva (Geist). El color de la empresa se calcula en `packages/domain` (función pura) y el marco lo pondrá como variables CSS en su raíz (D2).

## 5. Archivos
`packages/ds/src/tokens.css`, `tokens-medir.ts`, `tokens.test.ts`, `tokens-nuevo.test.ts`; `packages/domain/src/marca/acento.ts` y su prueba (subruta `@opai/domain/marca-acento`); `apps/web/app/globals.css` y `package.json` (fuentes); `apps/web/app/ds/nuevo/*`; `apps/web/e2e/ds-nuevo.spec.ts`; `DISENO.md`, `ESTADO.md`.

## 6. Modelo de datos y migraciones
Ninguno. Usa `colorPrimario` de la marca, que ya existe.

## 7. Capacidades
Ninguna nueva. La paridad no cambia.

## 8. Interfaz y responsive
Solo `/ds/nuevo` (fuera de producción), probada a 375, 1024 y 1280 px, de día y de noche.

## 9. Seguridad y tenant
Sin datos ni consultas. El color de la empresa se valida como hexadecimal de 6 dígitos; cualquier otro valor se ignora.

## 10. Casos límite
Color muy claro (amarillo, blanco): se oscurece de día. Color muy oscuro (azul marino, negro): se aclara de noche. Gris: igual que cualquier color. Sin color o inválido: acento por defecto.

## 11. Plan por bloques
D1.1 piel, fuentes y `acentoDeMarca`. D1.2 muestra `/ds/nuevo` y su e2e. D1.3 documentos y sistema en Claude Design.

## 12. Tests
Contraste 4,5:1 de nueve colores de ejemplo de día y de noche; los fondos de `acentoDeMarca` siguen a `tokens.css`; contraste de la piel nueva en claro y oscuro (texto, acento, estados, botón destructivo, bordes 3:1); e2e de `/ds/nuevo` con capturas.

## 13. Validación
Gate local de los paquetes tocados, e2e de `/ds/nuevo` en los tres tamaños y revisión de las capturas contra el prototipo.

## 14. Criterios de aceptación
La piel existe y pasa contraste en los dos temas; `acentoDeMarca` deja cualquier color a 4,5:1; la aplicación no cambia para nadie; el sistema está en Claude Design.

## 15. Riesgos y rollback
Cambiar `--font-sans` a `var(--ds-font-sans)` podría cambiar la fuente si la variable faltara: `:root` la define con el mismo valor de antes. Rollback: revertir el PR; no hay datos.

## 16. Reporte de ejecución
Hecho según el plan. Diferencia: las piezas del DS no se reescribieron; toman la piel por sus tokens, como en Hilo. En la muestra se reutilizan las piezas de `/ds/hilo`.
