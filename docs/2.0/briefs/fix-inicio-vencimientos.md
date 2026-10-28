# Inicio y vencimientos — continuidad del PR #90

Encargo: corregir regreso a Inicio, coherencia del conteo, comparación de navegación en iPad y evidencia visual. Sin migraciones.

Decisión de implementación de Codex: el resumen de Inicio comprende únicamente documentos de personas que aparecen en la matriz; las demás entidades no se suman. Al superar 2.000 personas accesibles, la matriz señala que sus cifras son parciales e Inicio sustituye el conteo por un aviso. El límite se aplica antes de filtrar por cargo, por lo que el aviso es conservador con ese filtro. El cálculo reutiliza la matriz y puede ser costoso en tenants grandes.

Criterios: el regreso desde Inicio se muestra en los tres tamaños; la matriz y el resumen comparten fuente; se advierte el límite; las lecturas exigen permisos de personas y documentos. La prueba de igualdad incluye una siembra ficticia con al menos un vencimiento positivo; la e2e pasó en teléfono, iPad y escritorio. La prueba RLS comprueba que las filas ajenas no se devuelvan. La comparación del spec de navegación en iPad pasó tanto en la rama como en main `49b1d8d`; el fallo informado no se reprodujo.

Pendiente: conservar por separado los documentos de otras entidades que antes contaba Inicio. El criterio de alcance sigue parcial hasta resolverlo.
