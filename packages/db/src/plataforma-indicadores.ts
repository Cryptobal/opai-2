// Indicadores legales para plataforma (CAR-193): propuestas del cron, estado de captura y aprobación.
import { clienteApp } from "./client";
import { remuneracionesResolverPropuesta } from "./remuneraciones-previsional";
import type { TenantTx } from "./transaccion";

const CLAVES = ["imm", "topes", "afp", "sis", "cesantia"];

export function operacionesIndicadoresPlataforma() {
  const db = clienteApp();
  return {
    /** Propuestas pendientes con el valor vigente para compararlas. */
    propuestasIndicadores: async () => {
      const filas = await db.valorPublicado.findMany({
        where: { estado: "propuesto", indicador: { clave: { in: CLAVES } } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, valorJson: true, vigenteDesde: true, fuente: true, consultadaEl: true,
          indicador: { select: { id: true, clave: true, nombre: true } },
        },
      });
      return Promise.all(
        filas.map(async (f) => {
          const vigente = await db.valorPublicado.findFirst({
            where: { indicadorId: f.indicador.id, estado: "vigente" },
            orderBy: { vigenteDesde: "desc" },
            select: { valorJson: true, vigenteDesde: true },
          });
          return { ...f, vigente };
        }),
      );
    },
    /** Última captura de cada indicador previsional, para el aviso de «fuente caída». */
    capturasPrevisionales: async () => {
      const filas = await db.capturaIndicador.findMany({
        where: { indicador: { clave: { in: CLAVES } } },
        orderBy: { capturadoEn: "desc" },
        take: 50,
        select: {
          capturadoEn: true, resultado: true, diferencia: true, alertaEmitida: true,
          indicador: { select: { clave: true } },
        },
      });
      const vistas = new Set<string>();
      return filas.filter((f) => !vistas.has(f.indicador.clave) && vistas.add(f.indicador.clave));
    },
    /** Aprueba o rechaza una propuesta, en la transacción de su auditoría global (falla cerrado). */
    resolverPropuestaIndicador: (
      input: { id: string; aprobar: boolean; actorId: string },
      tx: TenantTx,
    ) => remuneracionesResolverPropuesta(tx, input),
  };
}
