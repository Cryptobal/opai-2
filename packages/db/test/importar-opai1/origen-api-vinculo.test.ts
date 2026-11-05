import { describe, expect, it } from "vitest";

import { acumuladoVacio, agregarFila } from "../../scripts/importar-opai1/origen-api-contrato";

const negocio = (primaryContactId: string | null) => ({
  id: "d1",
  accountId: "a1",
  stageId: "s1",
  title: "T",
  amount: "100.00",
  primaryContactId,
});

describe("vínculo principal derivado del negocio", () => {
  it("un negocio repetido entre páginas deja solo el contacto de la última versión", () => {
    const acc = acumuladoVacio();
    agregarFila(acc, "negocios", negocio("c1"));
    agregarFila(acc, "negocios", negocio("c2"));
    expect(acc.dealContacts).toHaveLength(1);
    expect(acc.dealContacts[0]).toMatchObject({ dealId: "d1", contactId: "c2", role: "primary" });
  });

  it("si la última versión no tiene contacto, no queda vínculo obsoleto", () => {
    const acc = acumuladoVacio();
    agregarFila(acc, "negocios", negocio("c1"));
    agregarFila(acc, "negocios", negocio(null));
    expect(acc.dealContacts).toHaveLength(0);
  });
});
