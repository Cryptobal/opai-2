import { expect, it } from "vitest";
import { ROLES, tienePermiso } from "@opai/domain";
import { armarNavegacion, type EntradaArea } from "@/lib/navegacion-areas";

const items: EntradaArea[] = [
  { area: "inicio", href: "/", etiqueta: "Inicio", icono: "Home", modulo: "core" },
  { area: "comercial", href: "/negocios", etiqueta: "Negocios", icono: "Home", modulo: "crm", permiso: "crm:read" },
  { area: "clientes", href: "/cuentas", etiqueta: "Cuentas", icono: "Home", modulo: "core", permiso: "core:cuentas.read" },
  { area: "operaciones", href: "/puestos", etiqueta: "Puestos", icono: "Home", modulo: "ops", permiso: "ops:read" },
  { area: "personas", href: "/personas", etiqueta: "Personas", icono: "Home", modulo: "core", permiso: "core:personas.read" },
  { area: "personas", href: "/remuneraciones", etiqueta: "Remuneraciones", icono: "Home", modulo: "nomina", permiso: "nomina:read" },
  { area: "finanzas", href: "/finanzas", etiqueta: "Finanzas", icono: "Home", modulo: "finanzas", permiso: "finanzas:read" },
  { area: "documentos", href: "/documentos", etiqueta: "Documentos", icono: "Home", modulo: "documentos", permiso: "documentos:read" },
];
const escenarios = {
  A: { modulos: [], rutas: ["/", "/cuentas", "/personas"] },
  B: { modulos: ["crm", "ops"], rutas: ["/", "/negocios", "/cuentas", "/puestos", "/personas"] },
  C: { modulos: ["crm", "ops", "nomina", "finanzas", "documentos"], rutas: items.map((i) => i.href) },
  D: { modulos: ["ops", "nomina"], rutas: ["/", "/cuentas", "/puestos", "/personas", "/remuneraciones"] },
};
for (const [escenario, { modulos, rutas }] of Object.entries(escenarios)) for (const rol of ROLES) {
  it(`${escenario}/${rol}: usa permisos reales y solo módulos activos`, () => {
    const grupos = armarNavegacion(items, { modulosActivos: modulos, puede: (p) => tienePermiso(rol, p) });
    const excluidas = rol === "owner" || rol === "admin" ? [] : ["/remuneraciones", "/finanzas"];
    if (rol === "supervisor") excluidas.push("/negocios", "/documentos");
    expect(grupos.flatMap((g) => g.entradas.map((i) => i.href))).toEqual(rutas.filter((r) => !excluidas.includes(r)));
    expect(grupos.every((g) => g.suelta === (g.entradas.length === 1))).toBe(true);
  });
}
