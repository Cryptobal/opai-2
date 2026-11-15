# BRIEF CAR-340 · Estados vacíos y márgenes

1. **Objetivo:** los avisos de lista vacía, de error y de sin permiso no quedan pegados al borde.
2. **Estado actual (verificado en local a 375 y 1280 px):** `Estado` con `variante="lista"` pinta el aviso directo en el contenedor de la lista, que va de borde a borde (`-mx-4` en teléfono y sin padding en la columna).
3. **Alcance:** margen de 16 px (`p-4`) alrededor del aviso, en todas las listas, desde el DS.
4. **Arquitectura:** `Estado` separa el aviso (`avisoDe`) y, en la variante de lista, lo envuelve en `div[data-estado-lista].p-4`.
5. **Archivos:**
   - `packages/ds/src/patterns/estado.tsx` y su test
   - e2e `estados-vacios-preview.spec.ts`
6. **Datos:** sin cambios.
7. **Capacidades:** sin cambios.
8. **Interfaz:** solo el margen del aviso.
9. **Seguridad:** sin cambios.
10. **Casos límite:**
    - La carga no cambia.
    - Con datos, las filas siguen de borde a borde.
11. **Plan:** un commit.
12. **Tests:**
    - Unitario: los tres avisos llevan margen y la lista con datos queda igual.
    - e2e `@preview`: búsqueda sin resultados, con margen medido.
13. **Validación:**
    - Gate local y presupuesto de JS.
    - Capturas `lista-vacia-margen` a 375 y 1280 px.
14. **Criterios:** el aviso queda separado al menos 12 px del borde a 375, 1024 y 1280 px.
15. **Riesgos:** ninguno de datos. Rollback: revertir el PR.
16. **Reporte:** `docs/2.0/estado/diseno/CAR-340.md`.
