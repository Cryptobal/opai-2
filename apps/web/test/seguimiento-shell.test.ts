import { createElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { esActivo } from "../../../packages/ds/src/shell/types";
import { datosShell } from "@/app/_components/datos-shell";
import type { Identidad } from "@/lib/actor";
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
    acceso: { permisosRol: null, excepciones: [] },
  };
}

describe("seguimiento del shell", () => {
  it.each(["platform", "trabajador", "cliente", "supervisor"])(
    "%s sin acceso: no produce navegación ni monta el shell",
    async (portal) => {
      sesion.identidad = identidad();
      expect(datosShell(sesion.identidad, portal).nav).toEqual([]);
      const contenido = createElement("p", null, "Sin acceso");
      const layout = PortalLayout({ portal, children: contenido });
      const hijo = layout.props.children as ReactElement<
        {
          portal: string;
          children: typeof contenido;
        },
        (p: { portal: string; children: typeof contenido }) => Promise<ReactNode>
      >;
      expect(await hijo.type(hijo.props)).toBe(contenido);
    },
  );

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
