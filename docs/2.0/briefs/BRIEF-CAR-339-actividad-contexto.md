# BRIEF CAR-339 · Actividad con más contexto

1. **Objetivo:** cada fila de Actividad (hilo e Inicio) dice qué se hizo y sobre qué, y lleva a la ficha, en vez de «realizó un cambio».
2. **Estado actual (verificado):** `frase()` de `core/panel/actividad-texto.ts` traduce solo las capacidades cuyo verbo y entidad están en dos diccionarios cortos. Contando el registro completo, 382 de 426 escrituras caían en «realizó un cambio». La auditoría ya guarda `entidad` (tipo e id), pero ninguna fila la usaba para enlazar.
3. **Alcance:** diccionarios de verbos, entidades y módulos más amplios; respaldo por niveles; enlace a la ficha en el hilo y en Inicio. Sin cambios de datos.
4. **Arquitectura:**
   - `frase()`: verbo y entidad conocidos → «aprobó la cotización X». Solo la entidad → «modificó la cotización». Solo el verbo → «aprobó un registro de Finanzas». Nada conocido → «realizó un cambio en Finanzas».
   - Nunca muestra fragmentos de ids.
   - `entidadAuditada` reconoce también negocios, cotizaciones y tickets.
   - `lib/ruta-entidad.ts` arma la ruta de la ficha.
5. **Archivos:**
   - `packages/capabilities/src/core/panel/{actividad-texto,actividad-sustantivos,actividad-verbos}.ts` y `execute-util.ts`.
   - `apps/web/lib/ruta-entidad.ts`.
   - `app/_components/hilo/{actividad-hilo,datos-hilo,cargas-hilo}.ts`.
   - `(erp)/_componentes/actividad-inicio.tsx`.
   - Tipos de `tipos-maestros.ts`.
6. **Datos:** sin migración. Las filas ya auditadas se leen igual; desde ahora negocios, cotizaciones y tickets guardan su entidad.
7. **Capacidades:** `core.actividad.list` y `core.hilo.actividad` no cambian de forma; `accion` sale más precisa.
8. **Interfaz:** la fila del hilo pasa a ser un enlace cuando tiene ficha; en Inicio, el texto de la acción es el enlace.
9. **Seguridad:** el enlace lleva a la ficha y la ficha aplica su permiso y alcance. El texto usa solo el input ya saneado (lo sensible sigue redactado).
10. **Casos límite:** id no-UUID o tipo sin ficha → sin enlace. Capacidad de lectura → «consultó información».
11. **Plan:** un commit.
12. **Tests:** `actividad-texto.test.ts` (nuevas frases y respaldos) y `actividad-enlace.test.ts` (rutas y enlace del hilo).
13. **Validación:** gate local; recuento sobre el registro completo: de 382 a 38 escrituras sin frase propia, que ahora dicen al menos el módulo.
14. **Criterios:** ninguna escritura de un módulo conocido dice solo «realizó un cambio»; las filas con ficha llevan a ella.
15. **Riesgos:** frases imperfectas en verbos raros, que se corrigen agregando una entrada al diccionario. Rollback: revertir el PR.
16. **Reporte:** en `docs/2.0/estado/diseno/CAR-339.md`.
