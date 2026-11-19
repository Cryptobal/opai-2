import { expect, it, vi } from "vitest";

vi.mock("../src/core/documentos/generar-pdf-persona", () => ({ generarPdfLaboralPersona: vi.fn() }));
vi.mock("../src/core/firmas/enviar-ejecutar", () => ({ ejecutarEnvioFirma: vi.fn() }));

import { ejecutarFilaMasivo } from "../src/core/documentos/enviar-masivo-fila-ejecutar";
import { generarPdfLaboralPersona } from "../src/core/documentos/generar-pdf-persona";
import { ejecutarEnvioFirma } from "../src/core/firmas/enviar-ejecutar";

it("la fila dryRun no genera PDF ni crea una solicitud de firma", async () => {
  const ctx = {} as Parameters<typeof ejecutarFilaMasivo>[0];
  const persona = { id: "persona-ficticia", nombres: "Persona", apellidos: "Ficticia", rut: "RUT-FICTICIO-NO-VALIDO" };
  const r = await ejecutarFilaMasivo(ctx, {
    plantilla: { id: "plantilla-ficticia", nombre: "Prueba", clase: "anexo_contrato", nivelFirma: "N2", firmantes: "trabajador" },
    version: { numero: 1 }, personaId: persona.id, persona, relleno: { parrafos: [] },
    nombre: "Persona Ficticia", clase: "anexo_contrato", nivel: "N2", dryRun: true, firmantes: [],
  });
  expect(r).toMatchObject({ personaId: persona.id, estado: "ok", documentoId: null, solicitudFirmaId: null });
  expect(generarPdfLaboralPersona).not.toHaveBeenCalled();
  expect(ejecutarEnvioFirma).not.toHaveBeenCalled();
});
