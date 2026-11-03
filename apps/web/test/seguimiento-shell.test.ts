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
import { asegurarRegistro } from "@/lib/registro";

function identidad(): Identidad {
  const actual = membresia();
  return {
    mfaActiva: false,
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
    const [hoy, instalaciones] = navegacionPortal("/supervisor", "supervisor", () => true);
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
    asegurarRegistro();
    const href = (i: Identidad) => datosShell(i, "erp").nav.map((x) => x.href);
    // Rol base supervisor (sin `nomina:read`): «Remuneraciones» no aparece por el rol base. Antes se
    // probaba con Cargos, que salió del menú en CAR-182 (vive en Configuración).
    const base = identidad();
    base.actual = membresia({ rol: "supervisor" });
    base.modulosActivos = ["nomina"];
    expect(href(base)).not.toContain("/remuneraciones");
    expect(href(base)).toContain("/personas");
    // Mismo rol base, pero con un rol personalizado que concede `nomina:read`: ahora sí aparece
    // (y se pierden las secciones que el personalizado no concede, como «Cuentas»).
    const conRol = identidad();
    conRol.actual = membresia({ rol: "supervisor" });
    conRol.modulosActivos = ["nomina"];
    conRol.acceso = {
      permisosRol: ["nomina:read", "core:personas.read"],
      excepciones: [],
      instalaciones: ["instalacion-limitada"],
    };
    expect(href(conRol)).toContain("/remuneraciones");
    expect(href(conRol)).toContain("/personas");
    expect(href(conRol)).not.toContain("/cuentas");
    // Una excepción que deniega gana sobre el rol base: «Personas» desaparece aunque el rol lo dé.
    const conExcepcion = identidad();
    conExcepcion.actual = membresia({ rol: "supervisor" });
    conExcepcion.acceso = {
      permisosRol: null,
      excepciones: [{ permiso: "core:personas.read", conceder: false }],
      instalaciones: ["instalacion-limitada"],
    };
    expect(href(conExcepcion)).not.toContain("/personas");
    conExcepcion.acceso = {
      permisosRol: [],
      excepciones: [{ permiso: "core:personas.read", conceder: true }],
      instalaciones: null,
    };
    expect(href(conExcepcion)).toContain("/personas");
  });

  it("Supervisor filtra cada entrada por su permiso efectivo", () => {
    const i = identidad();
    i.actual = membresia({ rol: "supervisor", portales: ["supervisor"] });
    i.acceso = {
      permisosRol: ["core:documentos.read", "core:personas.read"],
      excepciones: [],
      instalaciones: null,
    };
    expect(datosShell(i, "supervisor").nav.map((x) => x.href)).toEqual(["/supervisor"]);
    i.acceso.excepciones = [
      { permiso: "core:documentos.read", conceder: false },
      { permiso: "core:instalaciones.read", conceder: true },
    ];
    expect(datosShell(i, "supervisor").nav.map((x) => x.href)).toEqual([
      "/supervisor/instalaciones",
    ]);
    i.acceso = { permisosRol: ["core:documentos.read"], excepciones: [], instalaciones: null };
    expect(datosShell(i, "supervisor").nav).toEqual([]);
    i.acceso = { permisosRol: ["core:personas.read"], excepciones: [], instalaciones: null };
    expect(datosShell(i, "supervisor").nav).toEqual([]);
  });

  it("permisos de plataforma dependen del rol global, no del rol del tenant", () => {
    const i = identidad();
    i.actual = membresia({ rol: "owner" });
    expect(datosShell(i, "platform").nav).toEqual([]);
    for (const platformRole of ["owner", "support"] as const) {
      i.usuario.platformRole = platformRole;
      expect(datosShell(i, "platform").nav).toEqual(NAV_PLATAFORMA);
    }
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
