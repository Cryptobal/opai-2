import { describe, expect, it } from "vitest";

import { metaLibroCompras } from "@/app/(erp)/finanzas/compras/_componentes/meta-libro-compras";

const formato = String;
describe("alcance de los totales del libro", () => {
  it("distingue saldo visible de total del libro cuando hay filtro de saldo", () => {
    expect(metaLibroCompras({ documentos: 9, total: 900 }, [{ saldoPorPagar: 12 }, { saldoPorPagar: 35 }], true, formato))
      .toBe("2 documentos en esta página · Saldo de esta página 47 · Resumen del libro sin filtro de saldo: 9 documentos · Total 900");
  });
  it("mantiene el resumen usual y permite una página sin resultados", () => {
    const r = { documentos: 9, total: 900 };
    expect(metaLibroCompras(r, [], false, formato)).toBe("9 documentos · Total 900");
    expect(metaLibroCompras(undefined, [], true, formato)).toBe("0 documentos en esta página · Saldo de esta página 0");
  });
});
