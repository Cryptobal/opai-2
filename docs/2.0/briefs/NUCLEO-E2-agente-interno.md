# NÚCLEO-E2 · Agente interno del tenant (PR 2)

Encargo de Carlos: 26-oct-2026 20:47 CLT, chat con OPAI 2.0 (t457u),
con decisión de adelanto del 26-oct-2026 21:07, respuesta al widget t461s2118.
Implementación: OpenCode / openai/gpt-6.1-sol, rama `core/agente-interno-pr2`.
El encargo no incluye un ID de Linear; no se inventa uno. No se abre PR.

## Bloques y criterios de aceptación

0. Merge normal de `origin/main`: sin cambios, base `5c18a92`; E1 (#62) y C (#70)
   integrados. A (#71) no está integrada; es recomendada, no obligatoria en el encargo.
1. Manifest vendible `agente`, permisos `agente:usar` y `agente:configurar`, sin navegación
   ni dependencias de negocio. Activación por el mecanismo existente `tenant_modules`;
   el ejecutor común deniega las capacidades del módulo inactivo. Prueba negativa de
   licencia y permiso, y positiva con licencia activa. No activa la licencia por defecto.
2. Herramientas del registro MCP con permisos, portal y alcance: pendiente.
3. Bucle, confirmación, cola humana, identidad y presupuesto: pendiente.
4. Elección de modelo validada en servidor: pendiente.
5. Persistencia aislada, migración `20261028120000_agente_interno`: pendiente.
6. API SSE, capacidades, manual y documentación: pendiente.

## Límites

No hay pantallas nuevas ni cambios de diseño. La UI posterior exige export aprobado,
siempre con el Design System de OPAI 2.0. No se aplica ninguna migración en Neon.
Las adaptaciones técnicas de implementación corresponden a OpenCode; no se atribuyen
decisiones nuevas de negocio a Carlos.

## Verificación

Bloque 1: typecheck, lint (solo advertencias preexistentes), 934 tests unitarios,
test:db (90 + 64 + 24) y build/presupuesto en verde. E2E de oferta del módulo en
servidor propio en el puerto 3186: 3/3 (375, 1024 y 1280 px), capturas en
`/tmp/opencode/agente-modulo-*.png`. Autorrevisión parcial independiente del manifest y
de la derivación de herramientas: dos observaciones de herramientas corregidas;
falta la autorrevisión final del conjunto.
Los logs locales del gate se guardan en `/tmp/opencode/agente-interno-bloque*.log`.
