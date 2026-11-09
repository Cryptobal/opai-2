/**
 * Referencias estáticas a cada `.md`: en Vercel el catálogo no puede usar `readdir` junto al
 * chunk compilado (ENOENT). El bundler debe ver cada archivo.
 */
export const RUTAS_ENTRADAS_NOVEDADES = [
  new URL("./2026-11-03-menu-bandeja.md", import.meta.url),
  new URL("./2026-11-04-explorador-documentos.md", import.meta.url),
  new URL("./2026-11-04-inicio-indicadores.md", import.meta.url),
  new URL("./2026-11-05-cobranza-finanzas.md", import.meta.url),
  new URL("./2026-11-09-novedades-seccion.md", import.meta.url),
] as const;
