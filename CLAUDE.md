# CLAUDE.md — OPAI 2.0

El contrato de este repositorio está en `AGENTS.md`, que vale igual para Claude y para todos los bots. Las reglas finas de código están en `docs/2.0/REGLAS-codigo.md`. Léelos antes de cualquier tarea. Instrucciones del proyecto Claude (briefs, ejecución e integración a `main`, ADR-060): `docs/2.0/INSTRUCCIONES-proyecto-claude.md`.

## Autonomía de las sesiones

Regla de Carlos del 14-nov-2026 (ADR-114), para todas las sesiones de Claude Code en este repositorio. Reemplaza la regla «Pasos que dependen de Carlos». El texto completo está en `AGENTS.md`, sección «Autonomía de las sesiones».

1. **Decide por defecto.** Todo lo reversible lo decides tú: diseño, nombres, alcance de un PR, cuál opción tomar, migraciones con snapshot, integrar un PR listo. Anota la decisión y el porqué en el PR y en `docs/2.0/ESTADO.md`. Solo te detienes ante lo que no tiene vuelta atrás: plata real, emitir o anular algo en el SII, temas legales o contractuales, borrar datos de producción o un secreto que no tengas.
2. **Usa tus propias herramientas.** Lo que puedas hacer directo (GitHub, Linear, Neon, Vercel, vistas previas, pruebas) lo haces tú, sin pasar por bots ni por «Chief of Staff». Si te falta una llave, crea un solo ítem en Linear que diga cuál falta y dónde va. Nunca la pidas en el chat.
3. **Junta lo que depende de Carlos.** No le preguntes en el momento. Crea o actualiza un issue en Linear con la etiqueta «Decide Carlos» y el título «`[Sesión <nombre>] pregunta corta`», con tu recomendación, las opciones en una línea cada una y qué pasa si no decide. Después sigue con otra tarea. Si no responde en 48 horas, aplica tu recomendación cuando sea reversible y avísale en el mismo issue.
4. **Prompts ya enviados a bots.** Si mandaste prompts a algún bot («OPAI 2.0», «Revisor OPAI 2.0», «Diseño y QA OPAI 2.0», «Chief of Staff») y siguen sin respuesta, reevalúalos con esta regla: lo que puedas hacer tú, hazlo y cierra el pedido; lo que sea decisión de Carlos, pásalo a «Decide Carlos»; lo que ya no sirva, descártalo y anótalo en `ESTADO.md`.
5. **Identifícate siempre.** Cada PR, comentario e issue empieza con «`[Sesión <nombre>]`».

## Código simple

Regla de Carlos del 14-nov-2026 (ADR-115). El texto completo está en `AGENTS.md`, sección «Código simple».

1. **La solución más simple que cumpla**, sin recortar tenant, permisos, auditoría, paridad ni pruebas.
2. **Reutiliza antes de crear:** busca primero en `packages/*` y en el módulo; extiende, no copies.
3. **Nada «por si acaso»:** sin abstracciones, parámetros ni capas para un uso que hoy no existe.
4. **Borra el código muerto en el mismo PR** que lo deja sin uso.
5. **Funciones y archivos cortos:** archivos de hasta 150 líneas, funciones de hasta 60.

El check `simplicidad` falla si tu PR empeora las cifras de `simplicidad-base.json`. Las respuestas a Carlos ya no terminan con «Decisión tuya»: lo suyo va a Linear con «Decide Carlos».

@AGENTS.md
@docs/2.0/REGLAS-codigo.md
