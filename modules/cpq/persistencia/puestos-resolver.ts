import { type Contexto, conflicto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import { horaValida, horasSemanalesSugeridas, patronValido, type DefinicionPatron } from "@opai/domain";

import type { LineaOferta } from "./puestos-oferta";

export type PedidoPuesto = {
  lineaId: string;
  cantidad?: number | undefined;
  instalacionId?: string | undefined;
  cargoId?: string | undefined;
  nombre?: string | undefined;
  patronId?: string | undefined;
  horaInicio?: string | undefined;
  horaFin?: string | undefined;
  funcionId?: string | undefined;
  horaInicioNoche?: string | undefined;
  horaFinNoche?: string | undefined;
};

export type PlanPuesto = {
  lineaId: string;
  posicion: number;
  nombre: string;
  datos: {
    instalacionId: string;
    cargoId: string;
    patronId: string | null;
    nombre: string;
    diasTrabajo: number;
    diasDescanso: number;
    horaInicio: string;
    horaFin: string;
    funcionId: string | null;
    horaInicioNoche: string | null;
    horaFinNoche: string | null;
    horasSemanales: number;
    jornada: string;
    dotacion: number;
    estado: string;
    cobertura: string;
    coberturaMotivo: string;
  };
};

/** Ciclo del puesto: el patrón elegido o del catálogo; si no, el «NxM» escrito en la línea. */
async function cicloDe(ctx: Contexto, patronId: string | null, texto: string | null, linea: string) {
  if (patronId) {
    const p = await ctx.db.patronTurno.findUnique({ where: { id: patronId } });
    if (!p) throw noEncontrado("El patrón de turno");
    if (!p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
    const definicion: DefinicionPatron = {
      nombre: p.nombre,
      clase: p.clase === "semanal" ? "semanal" : "ciclico",
      diasTrabajo: p.diasTrabajo,
      diasDescanso: p.diasDescanso,
      diasSemana: p.diasSemana,
    };
    return { patronId: p.id, diasTrabajo: p.diasTrabajo, diasDescanso: p.diasDescanso, definicion };
  }
  const m = texto ? /^(\d{1,2})\s*[x×]\s*(\d{1,2})$/i.exec(texto.trim()) : null;
  const [t, d] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (!m || !patronValido(t, d))
    throw reglaDeNegocio(`Elige el patrón de turno de «${linea}»: la cotización no trae uno válido.`);
  const definicion: DefinicionPatron = {
    nombre: `${t}×${d}`, clase: "ciclico", diasTrabajo: t, diasDescanso: d, diasSemana: [],
  };
  return { patronId: null, diasTrabajo: t, diasDescanso: d, definicion };
}

/**
 * Convierte lo que RRHH confirmó en puestos por crear: valida instalación, cargo, patrón y horario
 * (de la línea o del ajuste), numera las posiciones pendientes y comprueba que los nombres no choquen
 * con puestos existentes de la instalación. No escribe.
 */
export async function resolverPuestos(ctx: Contexto, items: LineaOferta[], pedidos: PedidoPuesto[]) {
  const planes: PlanPuesto[] = [];
  let yaCreados = 0;
  const vistas = new Set<string>();
  for (const p of pedidos) {
    const l = items.find((i) => i.lineaId === p.lineaId);
    if (!l) throw reglaDeNegocio("Una línea elegida no pertenece a la cotización aceptada.");
    if (vistas.has(l.lineaId)) throw reglaDeNegocio(`La línea «${l.linea}» está repetida.`);
    vistas.add(l.lineaId);
    const pendientes = l.posiciones - l.creados;
    if (pendientes <= 0) {
      yaCreados += l.creados;
      continue;
    }
    const cantidad = Math.min(p.cantidad ?? pendientes, pendientes);
    const instalacionId = p.instalacionId ?? l.instalacionId;
    if (!instalacionId) throw reglaDeNegocio(`Elige la instalación de «${l.linea}».`);
    const inst = await ctx.db.instalacion.findUnique({ where: { id: instalacionId } });
    if (!inst) throw noEncontrado("La instalación");
    if (inst.archivadaEn) throw reglaDeNegocio(`La instalación «${inst.nombre}» está archivada.`);
    const cargoId = p.cargoId ?? l.cargoId;
    if (!cargoId) throw reglaDeNegocio(`Elige el cargo de «${l.linea}».`);
    const cargo = await ctx.db.cargo.findUnique({ where: { id: cargoId } });
    if (!cargo) throw noEncontrado("El cargo");
    if (!cargo.activo) throw reglaDeNegocio(`El cargo "${cargo.nombre}" está desactivado.`);
    const horaInicio = p.horaInicio ?? l.horaInicio;
    const horaFin = p.horaFin ?? l.horaFin;
    if (!horaInicio || !horaFin || !horaValida(horaInicio) || !horaValida(horaFin))
      throw reglaDeNegocio(`Falta el horario de «${l.linea}» (de 00:00 a 23:59).`);
    const { definicion, ...ciclo } = await cicloDe(ctx, p.patronId ?? l.patronId, l.patron, l.linea);
    // Función y tramo de noche vienen del catálogo y del encargo de RR. HH.; las horas semanales
    // salen del cálculo único del dominio (turnos.ts), el mismo de la Pauta y de Asistencia.
    let funcionId: string | null = null;
    if (p.funcionId) {
      const f = await ctx.db.funcionPuesto.findUnique({ where: { id: p.funcionId } });
      if (!f) throw noEncontrado("La función del puesto");
      if (!f.activo) throw reglaDeNegocio(`La función "${f.nombre}" está desactivada.`);
      funcionId = f.id;
    }
    const noche = p.horaInicioNoche || p.horaFinNoche ? { ini: p.horaInicioNoche, fin: p.horaFinNoche } : null;
    if (noche && (!noche.ini || !noche.fin || !horaValida(noche.ini) || !horaValida(noche.fin)))
      throw reglaDeNegocio(`El tramo de noche de «${l.linea}» necesita hora de inicio y de término (de 00:00 a 23:59).`);
    const horasSemanales = horasSemanalesSugeridas({
      patron: definicion,
      tramos: [{ horaInicio, horaFin }, ...(noche ? [{ horaInicio: noche.ini!, horaFin: noche.fin! }] : [])],
      colacionMin: 0,
      colacionFuera: false,
    });
    const base = p.nombre ?? cargo.nombre;
    for (let i = 0; i < cantidad; i++) {
      const posicion = l.creados + i + 1;
      const nombre = `${base} ${posicion}`;
      planes.push({
        lineaId: l.lineaId,
        posicion,
        nombre,
        datos: {
          instalacionId,
          cargoId,
          ...ciclo,
          nombre,
          horaInicio,
          horaFin,
          funcionId,
          horaInicioNoche: noche?.ini ?? null,
          horaFinNoche: noche?.fin ?? null,
          horasSemanales,
          jornada: horaFin <= horaInicio ? "noche" : "dia",
          dotacion: 1,
          estado: "activo",
          cobertura: "ppc",
          coberturaMotivo: "sin_asignar",
        },
      });
    }
  }
  const choques = await ctx.db.puesto.findMany({
    where: {
      OR: planes.map((x) => ({ instalacionId: x.datos.instalacionId, nombre: x.nombre })),
    },
    select: { nombre: true },
  });
  if (planes.length && choques.length)
    throw conflicto(
      `Ya existe un puesto con el nombre ${choques.map((c) => `«${c.nombre}»`).join(", ")} en la instalación: cambia el nombre base.`,
    );
  const nombres = new Set<string>();
  for (const x of planes) {
    const k = `${x.datos.instalacionId}:${x.nombre}`;
    if (nombres.has(k)) throw conflicto(`El nombre «${x.nombre}» se repetiría en la instalación: cambia el nombre base.`);
    nombres.add(k);
  }
  return { planes, yaCreados };
}
