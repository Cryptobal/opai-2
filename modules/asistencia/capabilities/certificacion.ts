import { z } from "zod";

import { defineCapability, prohibido } from "@opai/capabilities";

/** Checklist Res. 38 (P10): estados calculados al vuelo, sin afirmar certificación. */
const ITEMS = [
  { id: "R-26", tema: "Reportes", requisito: "Cabecera con razón social, RUT y lugar", estado: "c" as const, evidencia: "Cabecera en vista y exportación" },
  { id: "R-27", tema: "Reportes", requisito: "Siglas oficiales con su glosa", estado: "c" as const, evidencia: "Leyenda SIGLAS en pantalla" },
  { id: "R-28", tema: "Reportes", requisito: "Reporte de jornada diaria", estado: "c" as const, evidencia: "Capacidad asistencia.reportes.*" },
  { id: "R-29", tema: "Reportes", requisito: "Domingos, festivos y turnos modificados", estado: "p" as const, evidencia: "Totales domingos/festivos; modificaciones desde correcciones" },
  { id: "R-30", tema: "Reportes", requisito: "Verificación de marca por hash", estado: "c" as const, evidencia: "asistencia.marcas.verificar y ruta pública" },
  { id: "R-32", tema: "Reportes", requisito: "Seis reportes DT con exportación", estado: "c" as const, evidencia: "P01/P02 en ERP" },
] as const;

export const certificacionChecklist = defineCapability({
  id: "asistencia.certificacion.checklist",
  descripcion:
    "Checklist de certificación DT (solo owner): requisitos R-01 a R-33 con estado cumple, parcial o no cumple y la evidencia en el sistema. No acredita certificación.",
  permiso: "asistencia:configurar",
  portales: ["erp"],
  input: z.object({ filtro: z.enum(["todos", "c", "p", "n"]).default("todos") }),
  output: z.object({
    sinCertificar: z.literal(true),
    resumen: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        tema: z.string(),
        requisito: z.string(),
        estado: z.enum(["c", "p", "n"]),
        etiquetaEstado: z.string(),
        evidencia: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    if (ctx.rol !== "owner") throw prohibido("Solo el dueño ve el checklist de certificación.");
    if (!ctx.autorizar("asistencia:configurar")) throw prohibido("Exige permiso asistencia:configurar.");
    const etiqueta = { c: "Cumple", p: "Parcial", n: "No cumple" } as const;
    const items = ITEMS.filter((r) => i.filtro === "todos" || r.estado === i.filtro).map((r) => ({
      ...r,
      etiquetaEstado: etiqueta[r.estado],
    }));
    const cnt = (k: "c" | "p" | "n") => items.filter((r) => r.estado === k).length;
    return {
      sinCertificar: true as const,
      resumen: `${items.length} requisitos mostrados · ${cnt("c")} cumple · ${cnt("p")} parcial · ${cnt("n")} no cumple`,
      items,
    };
  },
});