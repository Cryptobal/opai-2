import { z } from "zod";

import { calcularDesfaseMs, desfaseAlto, horaCorregida, LOTE_MAXIMO_HECHOS } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo, fechaHora, iso } from "./hechos-comun";
import {
  evaluarLote,
  type HechoEntrada,
  hechoEntrada,
  type ResultadoHecho,
  resultadoHecho,
} from "./hechos-evaluar";

export const hechosRecibir = defineCapability({
  id: "core.hechos_terreno.recibir",
  descripcion:
    "Recibe el lote de hechos que un equipo de terreno emparejado capturó, posiblemente sin conexión: guarda cada hecho una sola vez con la hora del servidor y el desfase del reloj del equipo, y rechaza los tipos fuera de la lista blanca.",
  permiso: null,
  // Interna: el equipo de terreno no tiene sesión; su cookie de dispositivo es la credencial y la ruta la resuelve antes de llamar.
  interna: true,
  input: z.object({
    dispositivoId: uuidSchema,
    horaEnvio: fechaHora,
    // Cada hecho se valida por separado en el handler: uno mal formado se rechaza solo, no tumba el lote.
    hechos: z.array(z.unknown()).min(1).max(LOTE_MAXIMO_HECHOS),
  }),
  output: z.object({
    recibidoEn: z.string(),
    desfaseSegundos: z.number().int(),
    desfaseAlto: z.boolean(),
    resultados: z.array(resultadoHecho),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { dispositivoId, horaEnvio, hechos: crudos }, { dryRun }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    const recibidoEn = new Date();
    const envio = new Date(horaEnvio);
    const desfaseMs = calcularDesfaseMs(envio, recibidoEn);
    const alto = desfaseAlto(desfaseMs);
    const hechos: HechoEntrada[] = [];
    const malos: ResultadoHecho[] = [];
    crudos.forEach((crudo, i) => {
      const r = hechoEntrada.safeParse(crudo);
      if (r.success) hechos.push(r.data);
      else malos.push({ clave: `invalido-${i}`, estado: "rechazado", motivo: "payload_invalido" });
    });
    const personasPedidas = [...new Set(hechos.flatMap((h) => (h.personaId ? [h.personaId] : [])))];
    const [existentes, personas] = await Promise.all([
      ctx.db.hechoTerreno.findMany({
        where: { dispositivoId: disp.id, clave: { in: hechos.map((h) => h.clave) } },
        select: { clave: true },
      }),
      personasPedidas.length
        ? ctx.db.persona.findMany({
            where: {
              id: { in: personasPedidas },
              archivadaEn: null,
              anonimizadaEn: null,
              // Solo quienes tienen vínculo vigente en la instalación del equipo (como «¿Quién eres?»).
              vinculos: { some: { instalacionId: disp.instalacionId, estado: "vigente" } },
            },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
    ]);
    const { resultados, nuevos } = evaluarLote({
      hechos,
      envio,
      yaGuardadas: new Set(existentes.map((e) => e.clave)),
      personasValidas: new Set(personas.map((p) => p.id)),
    });
    if (!dryRun && nuevos.length > 0) {
      await ctx.transaccion(async (tx) => {
        // Doble envío simultáneo (la página y el service worker): la clave única lo deja pasar una sola vez.
        const { count } = await tx.hechoTerreno.createMany({
          skipDuplicates: true,
          data: nuevos.map((h) => ({
            tenantId: ctx.tenantId,
            dispositivoId: disp.id,
            instalacionId: disp.instalacionId,
            clave: h.clave,
            tipo: h.tipo,
            payload: h.payload as object,
            personaId: h.personaId ?? null,
            horaHecho: new Date(h.horaHecho),
            horaEnvio: envio,
            recibidoEn,
            desfaseSegundos: Math.round(desfaseMs / 1000),
            horaCorregida: horaCorregida(new Date(h.horaHecho), desfaseMs),
            desfaseAlto: alto,
          })),
        });
        // Si otra petición ganó la carrera no se insertó nada: tampoco se anuncia.
        if (count === 0) return;
        // Un evento por lote (no por hecho): los módulos de terreno leen sus hechos por tipo en la tabla.
        const porTipo: Record<string, number> = {};
        for (const h of nuevos) porTipo[h.tipo] = (porTipo[h.tipo] ?? 0) + 1;
        await ctx.eventos.emitir(tx, {
          tipo: "core.terreno.hechos_recibidos",
          entidadTipo: "dispositivo",
          entidadId: disp.id,
          payload: { instalacionId: disp.instalacionId, porTipo },
        });
      });
    }
    return {
      recibidoEn: iso(recibidoEn),
      desfaseSegundos: Math.round(desfaseMs / 1000),
      desfaseAlto: alto,
      resultados: [...resultados, ...malos],
    };
  },
});
