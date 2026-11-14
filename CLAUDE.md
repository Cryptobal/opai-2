# CLAUDE.md — OPAI 2.0

El contrato de este repositorio está en `AGENTS.md`, que vale igual para Claude y para todos los bots. Las reglas finas de código están en `docs/2.0/REGLAS-codigo.md`. Léelos antes de cualquier tarea. Instrucciones del proyecto Claude (briefs, ejecución e integración a `main`, ADR-060): `docs/2.0/INSTRUCCIONES-proyecto-claude.md`.

## Pasos que dependen de Carlos

Regla de Carlos del 14-nov-2026 (ADR-114), para todas las sesiones de Claude Code en este repositorio. El texto completo está en `AGENTS.md`, sección «Pasos que dependen de Carlos».

Si una tarea necesita algo que solo puede hacer Carlos (aprobar, decidir, pegar una clave o un secreto, conectar una cuenta, probar en producción, entrar a un portal, firmar, pagar), no te quedes esperando en silencio. Respóndele con este bloque fijo:

1. **Recomendación:** qué le recomiendas hacer y cuál opción elegirías tú.
2. **Qué tiene que hacer:** los pasos concretos, en orden y en lenguaje simple.
3. **Por qué:** qué se destraba con eso y qué pasa si no se hace.
4. **Prompt para el bot:** un texto listo para copiar en el bot de Grok Bot que corresponda («OPAI 2.0», «Revisor OPAI 2.0», «Diseño y QA OPAI 2.0» o «Chief of Staff»), para que el bot haga todo lo que pueda sin Carlos. El prompt le pide al bot que empiece su respuesta con «[Sesión <nombre>] <issue de Linear o PR>».
5. **Qué me devuelves:** qué parte de la respuesta del bot necesitas que Carlos pegue en el chat.

Nunca pidas claves ni secretos dentro del chat: los pega Carlos directo donde corresponde. Si nada depende de Carlos, no uses el bloque.

@AGENTS.md
@docs/2.0/REGLAS-codigo.md
