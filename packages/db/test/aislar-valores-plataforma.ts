import type { Entorno } from "./entorno";

type FilaValor = {
  indicadorId: string;
  valorJson: number;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
  estado: string;
  fuente: string;
  verificacion: string;
};

/** Guarda UF/UTM de plataforma al inicio del describe y los restaura tras cada test. */
export function aislarValoresPlataformaUfUtm(
  getEntorno: () => Entorno,
  getIds: () => { ufId: string; utmId: string },
): { beforeAll: () => Promise<void>; afterEach: () => Promise<void> } {
  let snapshot: FilaValor[] = [];

  return {
    async beforeAll() {
      const e = getEntorno();
      const { ufId, utmId } = getIds();
      const rows = await e.admin.valorPublicado.findMany({
        where: { indicadorId: { in: [ufId, utmId] } },
      });
      snapshot = rows.map((r) => ({
        indicadorId: r.indicadorId,
        valorJson: Number(r.valorJson),
        vigenteDesde: r.vigenteDesde,
        vigenteHasta: r.vigenteHasta,
        estado: r.estado,
        fuente: r.fuente,
        verificacion: r.verificacion,
      }));
    },
    async afterEach() {
      const e = getEntorno();
      const { ufId, utmId } = getIds();
      await e.admin.valorPublicado.deleteMany({ where: { indicadorId: { in: [ufId, utmId] } } });
      for (const row of snapshot) {
        await e.admin.valorPublicado.create({ data: row });
      }
    },
  };
}
