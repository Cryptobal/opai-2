import { describe, expect, it } from "vitest";

import { portalesVisibles } from "@/app/_components/portales";
import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

function identidad(extra: {
  portales?: string[];
  rol?: string;
  platformRole?: "owner" | "support" | null;
  instalaciones?: string[] | null;
  personaVinculada?: boolean;
  modulosActivos?: string[];
}): Identidad {
  const actual = membresia({ portales: extra.portales ?? ["erp"], rol: extra.rol ?? "admin" });
  return {
    usuario: {
      id: "u1",
      nombre: "Prueba",
      email: "prueba@example.test",
      platformRole: extra.platformRole ?? null,
    },
    mfaActiva: false,
    actual,
    membresias: [actual],
    modulosActivos: extra.modulosActivos ?? ["portal_trabajador"],
    acceso: {
      permisosRol: null,
      excepciones: [],
      instalaciones: extra.instalaciones ?? null,
    },
    personaVinculada: extra.personaVinculada ?? false,
  };
}

describe("portalesVisibles por perfil (CAR-746)", () => {
  it("owner administrativo no ve Cliente aunque esté en la membresía", () => {
    const ids = portalesVisibles(
      identidad({ portales: ["erp", "cliente", "supervisor", "terreno"], rol: "owner" }),
    ).map((p) => p.id);
    expect(ids).toEqual(["erp"]);
  });

  it("supervisor ve ERP y Supervisor", () => {
    const ids = portalesVisibles(
      identidad({
        portales: ["erp", "supervisor"],
        rol: "supervisor",
        instalaciones: [],
      }),
    ).map((p) => p.id);
    expect(ids).toEqual(["erp", "supervisor"]);
  });

  it("contacto de cliente solo ve Cliente", () => {
    const ids = portalesVisibles(
      identidad({ portales: ["cliente"], rol: "viewer", instalaciones: ["i1"] }),
    ).map((p) => p.id);
    expect(ids).toEqual(["cliente"]);
  });
});