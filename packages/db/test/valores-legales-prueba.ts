import type { Entorno } from "./entorno";

const VIGENCIA = new Date("2026-10-01T12:00:00.000Z");
const FUENTE_PRUEBA = "https://prueba.opai.test/indicadores";

/** En `test:db` paralelo otras suites dejan UF/UTM verificados sin `consultada_el` y `juegoDeValores` falla. */
export async function repararConsultadaElIndicadores(
  e: Entorno,
  consultadaEl = new Date("2026-11-01"),
) {
  await e.admin.valorPublicado.updateMany({
    where: { consultadaEl: null, verificacion: "verificado" },
    data: { consultadaEl },
  });
}

/** Garantiza UF/UTM vigentes de plataforma sin borrar filas (seguro con suites paralelas en merge_group). */
export async function asegurarUfUtmPlataforma(
  e: Entorno,
  consultadaEl = new Date("2026-11-01"),
) {
  const refs = { uf: 4_123_701, utm: 72_151 } as const;
  for (const clave of Object.keys(refs) as (keyof typeof refs)[]) {
    const indicadorId = (await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave } })).id;
    const vigente = await e.admin.valorPublicado.findFirst({
      where: {
        indicadorId,
        estado: "vigente",
        vigenteDesde: { lte: VIGENCIA },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: VIGENCIA } }],
      },
      orderBy: { vigenteDesde: "desc" },
    });
    if (vigente) {
      if (!vigente.consultadaEl || vigente.verificacion !== "verificado") {
        await e.admin.valorPublicado.update({
          where: { id: vigente.id },
          data: { consultadaEl, verificacion: "verificado" },
        });
      }
      continue;
    }
    await e.admin.valorPublicado.create({
      data: {
        indicadorId,
        valorJson: refs[clave],
        vigenteDesde: VIGENCIA,
        vigenteHasta: null,
        estado: "vigente",
        fuente: FUENTE_PRUEBA,
        consultadaEl,
        verificacion: "verificado",
      },
    });
  }
}

/** Antes de proyectar costos de Nómina: UF/UTM y demás verificados con `consultada_el`. */
export async function prepararIndicadoresProyeccion(e: Entorno) {
  await asegurarUfUtmPlataforma(e);
  await repararConsultadaElIndicadores(e);
}