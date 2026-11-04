export type Indicadores = {
  cobertura: {
    fecha: string;
    programados: number;
    cubiertos: number;
    ppc: number;
    cobertura: number | null;
  } | null;
  negocios: { cantidad: number; valorMensualClp: number; valorMensualUf: number | null } | null;
  cotizacionesPorAprobar: number | null;
  facturado: {
    periodo: string;
    hastaDia: number;
    netoClp: number;
    netoMesAnteriorClp: number;
  } | null;
  tickets: { abiertos: number | null; asignadosAMi: number } | null;
};

export type Tarjeta = {
  id: string;
  etiqueta: string;
  valor: string;
  variacion?: { texto: string; tono: "success" | "danger" | "warning" | "neutro" };
};

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

const plural = (n: number, uno: string, varios: string) =>
  `${entero.format(n)} ${n === 1 ? uno : varios}`;

/** Pasa los datos de la capacidad a tarjetas; omite los indicadores que vienen en null. */
export function armarIndicadores(d: Indicadores, ufEscala: number): Tarjeta[] {
  const t: Tarjeta[] = [];
  if (d.cobertura) {
    const c = d.cobertura;
    t.push({
      id: "cobertura",
      etiqueta: "Cobertura hoy",
      valor: c.cobertura === null ? "—" : `${numero.format(c.cobertura)} %`,
      variacion:
        c.programados === 0
          ? { texto: "Sin turnos hoy", tono: "neutro" }
          : {
              texto: `${plural(c.ppc, "turno sin cubrir", "turnos sin cubrir")} de ${entero.format(c.programados)}`,
              tono: c.ppc > 0 ? "warning" : "success",
            },
    });
  }
  if (d.negocios) {
    const n = d.negocios;
    const aprobar = d.cotizacionesPorAprobar;
    const partes = [`${plural(n.cantidad, "negocio", "negocios")}/mes`];
    if (aprobar !== null)
      partes.push(`${plural(aprobar, "cotización", "cotizaciones")} por aprobar`);
    t.push({
      id: "negocios",
      etiqueta: "Negocios abiertos",
      valor:
        n.valorMensualUf === null
          ? clp.format(n.valorMensualClp)
          : `${entero.format(n.valorMensualUf / ufEscala)} UF`,
      variacion: { texto: partes.join(" · "), tono: aprobar ? "warning" : "neutro" },
    });
  }
  if (d.facturado) {
    const f = d.facturado;
    const dif = f.netoClp - f.netoMesAnteriorClp;
    t.push({
      id: "facturado",
      etiqueta: "Facturado del mes",
      valor: clp.format(f.netoClp),
      variacion:
        f.netoMesAnteriorClp > 0
          ? {
              texto: `${dif >= 0 ? "+" : "−"}${numero.format(Math.abs(dif / f.netoMesAnteriorClp) * 100)} % vs. mes anterior al día ${f.hastaDia}`,
              tono: dif >= 0 ? "success" : "danger",
            }
          : { texto: "Sin base del mes anterior", tono: "neutro" },
    });
  }
  if (d.tickets) {
    const k = d.tickets;
    t.push({
      id: "tickets",
      etiqueta: "Tickets",
      valor: `${entero.format(k.asignadosAMi)} para ti`,
      ...(k.abiertos === null
        ? {}
        : {
            variacion: {
              texto: `${plural(k.abiertos, "abierto", "abiertos")} en total`,
              tono: "neutro" as const,
            },
          }),
    });
  }
  return t;
}
