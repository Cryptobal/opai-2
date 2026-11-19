import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@opai/ds", () => ({
  Badge: ({ children }: { children: ReactNode }) => h("span", null, children),
  KpiTile: () => null,
  cn: (...xs: string[]) => xs.join(" "),
  GRILLA_KPI_HILO: "grid",
  ListScreen: ({ items, filtros, tarjeta, columnas, acciones }: {
    items: unknown[]; filtros: ReactNode; tarjeta: (x: unknown) => ReactNode;
    columnas: { render: (x: unknown) => ReactNode }[]; acciones: (x: unknown) => ReactNode;
  }) => h("section", null, filtros, ...items.map((x, i) => h("div", { key: i },
    tarjeta(x), ...columnas.map((c, j) => h("span", { key: j }, c.render(x))), acciones(x)))),
}));
vi.mock("@/app/_components/maestros/buscador", () => ({ Buscador: () => h("input", { placeholder: "Buscar" }) }));
vi.mock("@/app/_components/maestros/chips-filtro", () => ({ ChipsFiltro: () => h("span", null, "Estado") }));
vi.mock("@/app/_components/maestros/enlace-boton", () => ({
  EnlaceBoton: ({ href, children }: { href: string; children: ReactNode }) => h("a", { href }, children),
}));
vi.mock("@/app/(erp)/asistencia/_componentes/boton-proponer-correccion", () => ({
  BotonProponerCorreccion: ({ personaId, fecha }: { personaId: string; fecha: string }) =>
    h("button", { "data-persona": personaId, "data-fecha": fecha }, "Proponer corrección"),
}));

import { ListaAsistenciaHoyErp, type DatosAsistenciaHoy } from "../app/(erp)/asistencia/_componentes/lista-asistencia-hoy";

const datos: DatosAsistenciaHoy = {
  fecha: "2026-11-17", zona: "America/Santiago", siguiente: "cursor-ficticio",
  resumen: { turnos: 1, presentes: 1, sinMarca: 0, ausentes: 0, incompletos: 0, atrasos: 0 },
  items: [{ personaId: "persona-ficticia", nombre: "Persona ficticia", instalacion: "Instalación ficticia",
    turnoInicio: null, turnoFin: null, entrada: "2026-11-17T12:00:00Z", salida: null,
    estado: "presente", atrasoMin: 0, correccionPendiente: true, descansoInsuficiente: true, marcaFueraDeTurno: true }],
};
const render = (d: DatosAsistenciaHoy) => renderToStaticMarkup(h(ListaAsistenciaHoyErp, {
  resultado: { ok: true, data: d, dryRun: false }, parametros: { estado: "presente", q: "Persona ficticia" },
}));

describe("Asistencia de hoy conserva CAR-603 al agregar correcciones", () => {
  it("mantiene búsqueda, filtros, cursor, avisos y acción para la persona exacta", () => {
    const html = render(datos);
    expect(html).toContain('placeholder="Buscar"');
    expect(html).toContain("Descanso insuficiente");
    expect(html).toContain("Marca fuera de turno");
    expect(html).toContain("Corrección pendiente");
    expect(html).toContain('data-persona="persona-ficticia"');
    expect(html).toContain('data-fecha="2026-11-17"');
    expect(html).toContain("cursor=cursor-ficticio&amp;estado=presente&amp;q=Persona+ficticia");
  });
  it("no ofrece corregir una fila sin marcas ni navegar sin siguiente", () => {
    const html = render({ ...datos, siguiente: null, items: [{ ...datos.items[0]!, entrada: null, salida: null }] });
    expect(html).not.toContain("Proponer corrección");
    expect(html).not.toContain("Cargar más");
  });
});
