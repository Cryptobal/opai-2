import { ajuste, type Contexto } from "@opai/capabilities";

import { LIMITES_JORNADA_DEFECTO, limitesSuperados, lunesDeSemana, type LimitesJornada, type TopeLimite } from "../domain/limites-jornada";
import { textoDuracion } from "../domain";
import { emitir } from "./alertas-art45";
import { fechaDe, type DiaCalculado } from "./dias-calculo";
import { nombreCompleto, tenantBasico } from "./formato";

const ETIQUETA: Record<TopeLimite, string> = {
  semanal_aviso: "Aviso: 40 horas semanales",
  semanal: "Límite semanal de jornada (42 h)",
  diario: "Límite diario de jornada (12 h)",
  extra_diario: "Límite de horas extraordinarias diarias (2 h)",
};

async function limitesConfig(ctx: Contexto): Promise<LimitesJornada> {
  return { ...LIMITES_JORNADA_DEFECTO, ...(await ajuste<Partial<LimitesJornada>>(ctx, "asistencia", "limites_jornada")) };
}

/** Tras consolidar el día, evalúa límites de jornada y emite un aviso por tope (clave única, sin repetir). */
export async function alertarLimitesJornada(
  ctx: Contexto, d: DiaCalculado, zona: string, ahora = new Date(),
): Promise<void> {
  if (d.fecha < fechaDe(new Date(ahora.getTime() - 86_400_000), zona)) return;
  const cfg = await limitesConfig(ctx);
  const lunes = lunesDeSemana(d.fecha);
  const domingo = new Date(`${lunes}T12:00:00Z`);
  domingo.setUTCDate(domingo.getUTCDate() + 6);
  const hasta = domingo.toISOString().slice(0, 10);
  const dias = await ctx.db.dia.findMany({
    where: {
      personaId: d.personaId,
      fecha: { gte: new Date(`${lunes}T12:00:00Z`), lte: new Date(`${hasta}T12:00:00Z`) },
    },
    select: { minutosTrabajados: true, segundosExtra: true },
  });
  const minutosSemana = dias.reduce((a, x) => a + x.minutosTrabajados, 0);
  const minutosExtraDia = Math.floor(d.segundosExtra / 60);
  const persona = await ctx.db.persona.findUnique({
    where: { id: d.personaId }, select: { nombres: true, apellidos: true },
  });
  const trabajador = persona ? nombreCompleto(persona) : "";
  const t = await tenantBasico(ctx);
  for (const tope of limitesSuperados(cfg, d.fecha, d.minutosTrabajados, minutosSemana, minutosExtraDia)) {
    const clave = `limite:${d.personaId}:${tope}:${tope.startsWith("semanal") ? lunes : d.fecha}`;
    await emitir(
      ctx, "limite_jornada", clave, d.personaId,
      { ...(d.instalacionId ? { instalacionId: d.instalacionId } : {}) },
      {
        trabajador: { nombre: trabajador },
        limite: { etiqueta: ETIQUETA[tope], tope },
        semana: { desde: lunes },
        dia: { fecha: d.fecha, minutos: String(d.minutosTrabajados), extra: textoDuracion(d.segundosExtra) },
        jornada: { minutos_semana: String(minutosSemana) },
        url: `${ctx.servicios.urlBase}/personas/${d.personaId}`,
        empresa: { nombre: t.nombre },
      },
    );
  }
}