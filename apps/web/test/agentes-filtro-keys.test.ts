import { describe, expect, it } from "vitest";

import { conteosKeys, filtroDesde, keysFiltradas } from "../app/(erp)/configuracion/agentes/filtro-keys";
import type { ApiKey } from "../app/(erp)/configuracion/agentes/datos";

const key = (valida: boolean): ApiKey => ({
  id: crypto.randomUUID(),
  nombre: "t",
  prefijo: "opai_x",
  scopes: ["core"],
  tipo: "usuario",
  permisos: null,
  scopeAmplio: false,
  responsable: { nombre: "u", email: "u@e.cl" },
  ultimoUsoEn: null,
  expiraEn: null,
  revocadaEn: valida ? null : "2026-01-01T00:00:00.000Z",
  presupuestoMensualUsd: null,
  valida,
});

describe("filtro de API keys en agentes", () => {
  it("por defecto muestra activas", () => {
    expect(filtroDesde({})).toBe("activas");
    expect(filtroDesde({ estado: "revocadas" })).toBe("revocadas");
  });

  it("cuenta y filtra por validez", () => {
    const keys = [key(true), key(true), key(false)];
    expect(conteosKeys(keys)).toEqual({ activas: 2, revocadas: 1, todas: 3 });
    expect(keysFiltradas(keys, "activas")).toHaveLength(2);
    expect(keysFiltradas(keys, "revocadas")).toHaveLength(1);
    expect(keysFiltradas(keys, "todas")).toHaveLength(3);
  });
});