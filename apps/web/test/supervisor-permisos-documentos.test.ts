import { describe, expect, it, vi } from "vitest";
import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

const sesion = vi.hoisted(() => ({ identidad: null as Identidad | null }));
vi.mock("@/lib/servidor", () => ({ requerirIdentidad: async () => sesion.identidad }));
import { puedeGestionarDocumentos } from "@/app/(supervisor)/supervisor/_componentes/datos";

describe("documentos de supervisor con alcance limitado", () => {
  it.each([
    {
      rol: "gerente",
      permisosRol: null,
      excepciones: [{ permiso: "core:documentos.manage", conceder: false }],
      esperado: false,
    },
    { rol: "supervisor", permisosRol: ["core:documentos.manage"], excepciones: [], esperado: true },
  ])("usa el permiso efectivo para $rol", async ({ rol, permisosRol, excepciones, esperado }) => {
    const actual = membresia({ rol, portales: ["supervisor"] });
    sesion.identidad = {
      mfaActiva: false,
      usuario: { id: "u1", nombre: "Prueba", email: "prueba@example.test", platformRole: null },
      actual,
      membresias: [actual],
      modulosActivos: [],
      acceso: { permisosRol, excepciones, instalaciones: ["instalacion-limitada"] },
    };
    expect(await puedeGestionarDocumentos()).toBe(esperado);
  });
});
