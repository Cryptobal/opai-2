import { describe, expect, it } from "vitest";

import {
  CANALES_SOLICITUD,
  ESTADOS_SOLICITUD,
  claveDuplicado,
  estadoTras,
  motivoRechazo,
  partirNombre,
  puede,
  tituloNegocio,
  ESTADO_INICIAL_CANAL,
} from "../src/comercial/solicitudes-dominio";

describe("solicitudes · transiciones", () => {
  it("nueva → en_revision al derivar (R3)", () => {
    expect(estadoTras("derivar", "nueva")).toBe("en_revision");
    expect(puede("en_revision", "derivar")).toBe(false);
  });

  it("se puede convertir o descartar desde nueva y en_revision", () => {
    for (const e of ["nueva", "en_revision"] as const) {
      expect(estadoTras("convertir", e)).toBe("convertida");
      expect(estadoTras("descartar", e)).toBe("descartada");
      expect(estadoTras("marcar_duplicada", e)).toBe("descartada");
    }
  });

  it("descartar es reversible; convertida es terminal (R4, R5)", () => {
    expect(estadoTras("reabrir", "descartada")).toBe("en_revision");
    for (const a of ["derivar", "descartar", "reabrir", "convertir", "marcar_duplicada"] as const) {
      expect(puede("convertida", a)).toBe(false);
    }
    expect(motivoRechazo("convertida", "descartar")).toMatch(/ya se convirtió/);
  });

  it("rechaza acciones fuera de estado", () => {
    expect(() => estadoTras("reabrir", "nueva")).toThrow();
    expect(() => estadoTras("convertir", "descartada")).toThrow();
    expect(motivoRechazo("descartada", "convertir")).toContain("descartada");
  });

  it("todo estado tiene al menos una acción o es terminal", () => {
    for (const e of ESTADOS_SOLICITUD) {
      const acciones = (
        ["derivar", "descartar", "reabrir", "convertir", "marcar_duplicada"] as const
      ).filter((a) => puede(e, a));
      expect(e === "convertida" ? acciones.length === 0 : acciones.length > 0).toBe(true);
    }
  });
});

describe("solicitudes · utilidades", () => {
  it("canales internos nacen conectados; web y correo, sin conectar", () => {
    expect(CANALES_SOLICITUD).toHaveLength(4);
    expect(ESTADO_INICIAL_CANAL("manual")).toBe("conectado");
    expect(ESTADO_INICIAL_CANAL("agente")).toBe("conectado");
    expect(ESTADO_INICIAL_CANAL("correo")).toBe("sin_conectar");
    expect(ESTADO_INICIAL_CANAL("formulario_web")).toBe("sin_conectar");
  });

  it("clave de duplicado por correo o RUT", () => {
    expect(claveDuplicado({ email: " Ana@Atlas.cl ", rut: "76543210-k" })).toEqual([
      "email:ana@atlas.cl",
      "rut:76543210-K",
    ]);
    expect(claveDuplicado({})).toEqual([]);
  });

  it("parte el nombre completo en nombres y apellidos", () => {
    expect(partirNombre("Ana Pérez")).toEqual({ nombres: "Ana", apellidos: "Pérez" });
    expect(partirNombre("Ana María Pérez Soto")).toEqual({
      nombres: "Ana María",
      apellidos: "Pérez Soto",
    });
    expect(partirNombre("Ana")).toEqual({ nombres: "Ana", apellidos: "—" });
    expect(partirNombre(null).nombres).toBe("Sin nombre");
  });

  it("título del negocio «cuenta · servicio» con tope de 120", () => {
    expect(tituloNegocio("Atlas Seguridad SpA", "Guardias 24/7")).toBe(
      "Atlas Seguridad SpA · Guardias 24/7",
    );
    expect(tituloNegocio("Atlas")).toBe("Atlas");
    expect(tituloNegocio("x".repeat(200)).length).toBe(120);
  });
});
