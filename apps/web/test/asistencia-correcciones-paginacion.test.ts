import { createElement as h, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ejecutar } = vi.hoisted(() => ({ ejecutar: vi.fn() }));
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: ejecutar }));
vi.mock("@/app/_components/pagina-portal", () => ({ PaginaPortal: () => null }));
vi.mock("@/app/_components/portales", () => ({ tituloPagina: (_: string, titulo: string) => titulo }));
vi.mock("@opai/ds", () => ({ Badge: () => null, Empty: () => null, ListScreen: () => null }));
vi.mock("@/app/_components/maestros/enlace-boton", () => ({
  EnlaceBoton: ({ href, children }: { href: string; children: ReactNode }) => h("a", { href }, children),
}));
vi.mock("../app/(trabajador)/trabajador/_componentes/estado-lista", () => ({
  EstadoLista: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../app/(trabajador)/trabajador/correcciones/_componentes/respuesta", () => ({
  TarjetaCorreccion: () => null,
}));

import PaginaErp from "../app/(erp)/asistencia/correcciones/page";
import PaginaTrabajador from "../app/(trabajador)/trabajador/correcciones/page";

const CURSOR = "00000000-0000-4000-8000-000000000001";
const SIGUIENTE = "00000000-0000-4000-8000-000000000002";

type PropsPagina = {
  cargar: () => Promise<unknown>;
  children: (resultado: unknown) => ReactNode;
};

describe("paginación de correcciones de asistencia", () => {
  for (const [portal, pagina, ruta] of [
    ["erp", PaginaErp, "/asistencia/correcciones"],
    ["trabajador", PaginaTrabajador, "/trabajador/correcciones"],
  ] as const) {
    it(`${portal}: envía el cursor y navega a siguiente conservando parámetros`, async () => {
      ejecutar.mockReset().mockImplementation(async (_portal, capacidad) => ({
        ok: true,
        data: capacidad === "asistencia.correcciones.listar"
          ? { items: [], siguiente: SIGUIENTE }
          : { zona: "America/Santiago" },
      }));

      const searchParams = Promise.resolve({ cursor: CURSOR, estado: "pendiente" });
      const elemento = await pagina({ searchParams }) as ReactElement<PropsPagina>;
      const resultado = await elemento.props.cargar();
      expect(ejecutar).toHaveBeenCalledWith(portal, "asistencia.correcciones.listar",
        portal === "trabajador" ? { cursor: CURSOR, estado: "pendiente" } : { cursor: CURSOR });
      const html = renderToStaticMarkup(elemento.props.children(resultado));
      expect(html).toContain(`href="${ruta}?estado=pendiente&amp;cursor=${SIGUIENTE}"`);
      expect(html).toContain("Cargar más");
      expect(renderToStaticMarkup(elemento.props.children({ ...(resultado as object), siguiente: null })))
        .not.toContain("Cargar más");
    });
  }
});
