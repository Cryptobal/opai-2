import type { Prisma } from "@opai/db";
import type { Contexto } from "../../types";
import { dondeInstalacion, dondePersona } from "./alcance";
import type { EntradaPanel } from "./estructuras-panel-schema";

export function filtrosPanel(ctx: Contexto, input: EntradaPanel) {
  const f = input.filtros;
  const personas: Prisma.PersonaWhereInput = {
    AND: [dondePersona(ctx)],
    ...(input.tipo === "instalacion" ? { id: { in: [] } } : {}),
    archivadaEn: null,
    ...(f.q
      ? {
          OR: [
            { nombres: { contains: f.q!, mode: "insensitive" as const } },
            { apellidos: { contains: f.q!, mode: "insensitive" as const } },
            { rut: { startsWith: f.q.replace(/[.\s]/g, "").toUpperCase() } },
          ],
        }
      : {}),
    ...(f.cargo ? { vinculos: { some: { cargoId: f.cargo, estado: "vigente" } } } : {}),
    ...(f.estado === "bloqueada" ? { bloqueada: true } : f.estado ? { estado: f.estado } : {}),
  };
  const instalaciones: Prisma.InstalacionWhereInput = {
    AND: [dondeInstalacion(ctx)],
    archivadaEn: null,
    ...(f.q
      ? {
          OR: ["nombre", "comuna"].map((campo) => ({
            [campo]: { contains: f.q!, mode: "insensitive" },
          })),
        }
      : {}),
    ...(f.cuenta ? { cuentaId: f.cuenta } : {}),
    ...(f.estado ? { estado: f.estado } : {}),
    ...(f.region ? { region: f.region } : {}),
  };
  return { personas, instalaciones };
}
