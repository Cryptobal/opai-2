import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { AreaNav } from "@opai/domain";
import type { GrupoArea } from "@/lib/navegacion-areas";

const prefs = vi.hoisted(() => ({ areaPrincipal: "comercial" as AreaNav | null }));
vi.mock("@/app/_components/use-navegacion-area", () => ({
  useNavegacionArea: () => ({ ...prefs, fijados: [], areaAbierta: null, cargado: true }),
}));
vi.mock("@/app/_acciones/validar-fichas-nav", () => ({ validarFichasNav: vi.fn() }));
import { useShellNavegacion } from "@/app/_components/use-shell-navegacion";

const grupos: GrupoArea[] = [{ area: "operaciones", etiqueta: "Operaciones", suelta: true,
  entradas: [{ area: "operaciones", href: "/puestos", etiqueta: "Puestos", icono: "Building2", modulo: "ops" }] }];
const defecto = [{ href: "/puestos", etiqueta: "Puestos", icono: "Building2" }];
function resolver() {
  let rutas: string[] | undefined;
  function Prueba() {
    const shell = useShellNavegacion(grupos, defecto, "/puestos", "erp", true, "Puestos");
    rutas = shell.navInferiorResuelto?.map((n) => n.href);
    return null;
  }
  renderToStaticMarkup(createElement(Prueba));
  return rutas;
}
it("si el área guardada desaparece, vuelve al área por defecto del supervisor", () => {
  prefs.areaPrincipal = "comercial";
  expect(resolver()).toEqual(["/puestos"]);
});
it("sin preferencia también usa el área del rol", () => {
  prefs.areaPrincipal = null;
  expect(resolver()).toEqual(["/puestos"]);
});
