/**
 * Estilos de las vistas MCP App: toman las variables que entrega el cliente (spec MCP Apps,
 * `hostContext.styles.variables`), así la vista se ve como Claude en claro y oscuro. Sin colores
 * propios: el respaldo son colores de sistema de CSS.
 */
export const ESTILOS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 12px;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: var(--font-text-md-size, 15px);
  line-height: var(--font-text-md-line-height, 1.45);
  color: var(--color-text-primary, CanvasText);
  background: var(--color-background-primary, Canvas);
}
h1 { font-size: var(--font-heading-sm-size, 17px); margin: 0 0 8px; font-weight: var(--font-weight-semibold, 600); }
p { margin: 0; }
.sub { color: var(--color-text-secondary, GrayText); font-size: var(--font-text-sm-size, 13px); }
ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
li {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  padding: 12px; border-radius: var(--border-radius-lg, 12px);
  border: var(--border-width-regular, 1px) solid var(--color-border-primary, GrayText);
}
li .texto { flex: 1 1 12rem; min-width: 0; }
li .titulo { font-weight: var(--font-weight-semibold, 600); }
li[data-tono="danger"] { border-color: var(--color-border-danger, GrayText); }
li[data-tono="warning"] { border-color: var(--color-border-warning, GrayText); }
button {
  font: inherit; min-height: 36px; padding: 0 14px; cursor: pointer;
  border-radius: var(--border-radius-md, 8px);
  border: var(--border-width-regular, 1px) solid var(--color-border-primary, GrayText);
  background: var(--color-background-secondary, ButtonFace);
  color: var(--color-text-primary, ButtonText);
}
button:focus-visible { outline: 2px solid var(--color-ring-primary, Highlight); outline-offset: 2px; }
.pie { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 8px; }
@media (prefers-reduced-motion: no-preference) { button { transition: background-color 150ms; } }
`;
