import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KpiTile } from "../components/card";
import { DashboardScreen } from "../patterns/dashboard-screen";
import { Empty, ErrorState, Forbidden, Loading } from "./index";
import { SinConexion } from "./sin-conexion";

// H2 (CAR-324): la piel Hilo vive en `styles.css` (utilidades `ds-*` con alcance al marco Hilo), para
// no pesar en el JS compartido; los componentes solo llevan el nombre. El marco clásico no cambia.
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const regla = (nombre: string) => css.match(new RegExp(`@utility ${nombre} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";

describe("piel Hilo de los estados", () => {
  it("vacío, error, sin permiso y sin conexión usan el bloque de estado del DS", () => {
    for (const html of [
      renderToStaticMarkup(<Empty titulo="Sin cuentas" />),
      renderToStaticMarkup(<ErrorState titulo="Falló" />),
      renderToStaticMarkup(<Forbidden />),
      renderToStaticMarkup(<SinConexion />),
    ]) {
      expect(html).toContain('class="ds-estado"');
      expect(html).toContain("ds-estado-icono");
      expect(html).toContain("ds-estado-titulo");
    }
  });

  it("el bloque es centrado y punteado en el clásico, y a la izquierda y sin borde en Hilo", () => {
    const r = regla("ds-estado");
    expect(r).toMatch(/@apply flex flex-col items-center .*border-dashed/);
    expect(r).toMatch(/:is\(\[data-marco="hilo"\] \*\) \{\s*@apply .*items-start .*border-0/);
    expect(regla("ds-estado-icono")).toMatch(/size-11 rounded-\[14px\] bg-fill/);
  });

  it("el ícono toma el tono del estado", () => {
    expect(renderToStaticMarkup(<ErrorState titulo="x" />)).toContain("ds-estado-icono-danger");
    expect(renderToStaticMarkup(<Forbidden />)).toContain("ds-estado-icono-warning");
    expect(regla("ds-estado-icono-danger")).toContain("bg-danger-muted");
    expect(regla("ds-estado-icono-warning")).toContain("bg-warning-muted");
  });

  it("el esqueleto se pinta como filas con monograma en el marco Hilo, sin elementos extra", () => {
    const lista = renderToStaticMarkup(<Loading variante="lista" />);
    expect(lista).toContain("ds-esq ");
    expect(lista).toContain("ds-esq-fila");
    expect(lista).toContain("ds-esq-mono");
    expect(renderToStaticMarkup(<Loading variante="formulario" />)).not.toContain("ds-esq-mono");
    expect(renderToStaticMarkup(<Loading variante="dashboard" />)).toContain("ds-esq-kpi");
    expect(regla("ds-esq-fila")).toMatch(/border-b border-border bg-transparent/);
  });

  it("el indicador va sin tarjeta y el tablero cierra con una línea", () => {
    expect(renderToStaticMarkup(<KpiTile etiqueta="Turnos" valor="146" />)).toContain("ds-kpi ");
    expect(regla("ds-kpi")).toMatch(/rounded-none border-0 border-t bg-transparent/);
    const tablero = renderToStaticMarkup(
      <DashboardScreen state="ready" titulo="Inicio" kpis={[{ etiqueta: "A", valor: "1" }]} />,
    );
    expect(tablero).toContain("ds-grilla-kpi");
    expect(regla("ds-grilla-kpi")).toMatch(/gap-y-0 border-b/);
  });
});
