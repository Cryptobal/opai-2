import { createElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { esActivo } from "@opai/ds";

import { datosShell } from "@/app/_components/datos-shell";
import type { Identidad } from "@/lib/actor";
import { NAV_PLATAFORMA, navegacionPortal } from "@/lib/navegacion";
import { membresia } from "./fuentes-falsas";

const sesion = vi.hoisted(() => ({ identidad: null as Identidad | null }));
vi.mock("@/lib/servidor", () => ({
  identidadActual: async () => sesion.identidad,
  tieneAccesoAPortal: (i: Identidad, p: string) =>
    p === "platform" ? i.usuario.platformRole !== null : (i.actual?.portales.includes(p) ?? false),
}));
vi.mock("@/app/_components/marco-shell", () => ({ MarcoShell: () => null }));
import { PortalLayout } from "@/app/_components/portal-layout";

function identidad(): Identidad {
  const actual = membresia();
  return {
    usuario: { id: "u1", nombre: "Prueba", email: "prueba@example.test", platformRole: null },
    actual,
    membresias: [actual],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
}

describe("seguimiento del shell", () => {
  it.each(["platform", "trabajador", "cliente", "supervisor"])(
    "%s sin acceso: monta el shell con la navegación vacía (H1)",
    async (portal) => {
      sesion.identidad = identidad();
      const datos = datosShell(sesion.identidad, portal);
      expect(datos.nav).toEqual([]);
      // Sin acceso al portal, `acceso` es falso: el shell no ofrece búsqueda ni Preferencias.
      expect(datos.acceso).toBe(false);
      const contenido = createElement("p", null, "Sin acceso");
      const layout = PortalLayout({ portal, children: contenido });
      const hijo = layout.props.children as ReactElement<
        {
          portal: string;
          children: typeof contenido;
        },
        (p: { portal: string; children: typeof contenido }) => Promise<ReactNode>
      >;
      // Con sesión el shell se monta aunque falte el acceso (MarcoShell, aquí mockeado): no se
      // devuelve el contenido pelado, y su navegación va vacía (el aviso vive dentro del marco).
      const montado = (await hijo.type(hijo.props)) as ReactElement<{ datos: { nav: unknown[] } }>;
      expect(montado).not.toBe(contenido);
      expect(montado.props.datos.nav).toEqual([]);
    },
  );

  it("Plataforma: «Empresas» activa en el índice y en el detalle de un tenant, no en las demás (H5)", () => {
    const empresas = NAV_PLATAFORMA[0];
    if (!empresas) throw new Error("Falta Empresas");
    expect(empresas.etiqueta).toBe("Empresas");
    const activa = (ruta: string) =>
      esActivo(ruta, empresas.href, empresas.exacta, empresas.activoEn);
    expect(activa("/platform")).toBe(true);
    expect(activa("/platform/tenants/abc")).toBe(true);
    for (const r of ["/platform/trabajos", "/platform/consumos", "/platform/ajustes"])
      expect(activa(r)).toBe(false);
    const trabajos = NAV_PLATAFORMA.find((i) => i.href === "/platform/trabajos");
    if (!trabajos) throw new Error("Falta Trabajos");
    expect(esActivo("/platform/trabajos", trabajos.href, trabajos.exacta, trabajos.activoEn)).toBe(
      true,
    );
    expect(esActivo("/platform", trabajos.href, trabajos.exacta, trabajos.activoEn)).toBe(false);
  });

  it("Supervisor: la ficha de persona mantiene «Hoy» activa, no «Instalaciones» (H6)", () => {
    const [hoy, instalaciones] = navegacionPortal("/supervisor", "supervisor");
    if (!hoy || !instalaciones) throw new Error("Falta navegación");
    expect(esActivo("/supervisor/personas/abc", hoy.href, hoy.exacta, hoy.activoEn)).toBe(true);
    expect(esActivo("/supervisor/instalaciones", hoy.href, hoy.exacta, hoy.activoEn)).toBe(false);
    expect(
      esActivo(
        "/supervisor/personas/abc",
        instalaciones.href,
        instalaciones.exacta,
        instalaciones.activoEn,
      ),
    ).toBe(false);
  });

  it("con acceso al portal, `acceso` es verdadero (habilita búsqueda y Preferencias)", () => {
    const i = identidad();
    expect(datosShell(i, "erp").acceso).toBe(true);
    i.usuario.platformRole = "owner";
    expect(datosShell(i, "platform").acceso).toBe(true);
  });

  it("otro usuario en el mismo tenant renueva la época (remonta la campana)", () => {
    const i = identidad();
    const epoca = datosShell(i, "erp").epoca;
    i.usuario = { ...i.usuario, id: "u2" };
    expect(datosShell(i, "erp").epoca).not.toBe(epoca);
  });

  it("plataforma autorizada conserva su menú; otra empresa renueva la época", () => {
    const i = identidad();
    i.usuario.platformRole = "owner";
    expect(datosShell(i, "platform").nav[0]?.href).toBe("/platform");
    const epoca = datosShell(i, "erp").epoca;
    i.actual = membresia({ tenantId: "otro-tenant" });
    expect(datosShell(i, "erp").epoca).not.toBe(epoca);
  });

  it("Hoy solo se activa en /supervisor, Instalaciones incluye sus fichas", () => {
    const i = identidad();
    i.actual = membresia({ portales: ["supervisor"] });
    const [hoy, instalaciones] = datosShell(i, "supervisor").nav;
    expect(hoy).toBeDefined();
    expect(instalaciones).toBeDefined();
    if (!hoy || !instalaciones) throw new Error("Falta navegación");
    expect(esActivo("/supervisor", hoy.href, hoy.exacta)).toBe(true);
    expect(esActivo("/supervisor/instalaciones", hoy.href, hoy.exacta)).toBe(false);
    expect(esActivo("/supervisor/instalaciones/una", instalaciones.href)).toBe(true);
    expect(esActivo("/cuentas", "/")).toBe(false);
  });

  it("el menú del ERP usa los permisos efectivos, no el rol base (I4/P4)", () => {
    const href = (i: Identidad) => datosShell(i, "erp").nav.map((x) => x.href);
    // Rol base supervisor (sin `estructuras.read`): «Cargos y sueldos» no aparece por el rol base.
    const base = identidad();
    base.actual = membresia({ rol: "supervisor" });
    expect(href(base)).not.toContain("/cargos");
    expect(href(base)).toContain("/personas");
    // Mismo rol base, pero con un rol personalizado que concede `estructuras.read`: ahora sí aparece
    // (y se pierden las secciones que el personalizado no concede, como «Cuentas»).
    const conRol = identidad();
    conRol.actual = membresia({ rol: "supervisor" });
    conRol.acceso = {
      permisosRol: ["core:estructuras.read", "core:personas.read"],
      excepciones: [],
      instalaciones: null,
    };
    expect(href(conRol)).toContain("/cargos");
    expect(href(conRol)).toContain("/personas");
    expect(href(conRol)).not.toContain("/cuentas");
    // Una excepción que deniega gana sobre el rol base: «Personas» desaparece aunque el rol lo dé.
    const conExcepcion = identidad();
    conExcepcion.actual = membresia({ rol: "supervisor" });
    conExcepcion.acceso = {
      permisosRol: null,
      excepciones: [{ permiso: "core:personas.read", conceder: false }],
      instalaciones: null,
    };
    expect(href(conExcepcion)).not.toContain("/personas");
  });

  it.each([undefined, "", "   "])("test:db falla sin URL (%j)", (url) => {
    const env = { ...process.env };
    delete env["DATABASE_URL_TEST"];
    if (url !== undefined) env["DATABASE_URL_TEST"] = url;
    const r = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../../../scripts/exigir-base-test.mjs", import.meta.url))],
      { env },
    );
    expect(r.status).toBe(1);
    expect(r.stderr.toString()).toContain("Falta DATABASE_URL_TEST");
  });
});
