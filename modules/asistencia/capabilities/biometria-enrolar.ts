import { z } from "zod";

import { biometriaDe, cifradoDeCampos, type Contexto, defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { consentimientoVigente } from "../domain";
import { exigirBiometriaPermitida, faltantesDe } from "./biometria-comun";
import { uuid } from "./esquemas";
import { personaPropia } from "./persona-propia";
import { consumirSesionVida } from "./sesion-vida";
import { usuarioId } from "./usuario";

const salida = z.object({ enrolado: z.boolean(), proveedor: z.string(), enroladoEn: z.string().nullable() });
const entrada = z.object({ sesionVidaId: z.string().min(8).max(128) });

/**
 * Enrola el rostro de una persona (L-13, P-03): exige consentimiento, correo personal y una prueba de vida
 * superada, y guarda SOLO la referencia que devuelve el proveedor, cifrada. La foto de la sesión se descarta.
 */
async function enrolar(ctx: Contexto, personaId: string, sesionVidaId: string, canal: "kiosco" | "erp" | "telefono_personal", dryRun: boolean) {
  await exigirBiometriaPermitida(ctx);
  const faltan = await faltantesDe(ctx, personaId);
  if (faltan.length) throw reglaDeNegocio(faltan.join(" "));
  const bio = await biometriaDe(ctx);
  if (!bio) throw reglaDeNegocio("La biometría no está configurada en esta empresa.");
  if (dryRun) return { enrolado: false, proveedor: bio.nombre, enroladoEn: null };
  if (!(await consumirSesionVida(ctx, sesionVidaId))) throw reglaDeNegocio("La prueba de vida venció o ya se usó. Inicia una nueva.");
  const vida = await bio.resultadoVida(sesionVidaId).catch(() => null);
  if (!vida?.viva || !vida.imagen) throw reglaDeNegocio("No se superó la prueba de vida. Intenta de nuevo con buena luz.");
  const consentimiento = await ctx.db.consentimientoPersona.findFirst({ where: { personaId, tipo: "biometria_facial", revocadoEn: null } });
  if (!consentimiento || !consentimientoVigente([{ ...consentimiento, tipo: "biometria_facial" }], "biometria_facial"))
    throw reglaDeNegocio("Falta el consentimiento vigente para el uso de su rostro.");
  const previo = await ctx.db.enrolamientoFacial.findUnique({ where: { tenantId_personaId: { tenantId: ctx.tenantId, personaId } } });
  const cifrado = cifradoDeCampos(ctx);
  const { rostroId } = await bio.enrolar(personaId, vida.imagen);
  const referencia = await cifrado.cifrar("enrolamientos_faciales", "referencia", rostroId);
  const ahora = new Date();
  // Volver a enrolar reemplaza el rostro: el nuevo ya existe; si el anterior no se puede borrar, se deshace el
  // nuevo y se avisa, para no dejar dos plantillas vivas (L-14).
  if (previo?.referencia) {
    const viejo = await cifrado.descifrar("enrolamientos_faciales", "referencia", previo.referencia);
    const borrado = await bio.eliminarRostro(viejo).then(() => true, () => false);
    if (!borrado) {
      await bio.eliminarRostro(rostroId).catch(() => undefined);
      throw reglaDeNegocio("No se pudo reemplazar el rostro anterior en el proveedor. Intenta de nuevo.");
    }
  }
  try {
    await ctx.transaccion(async (tx) => {
      // El consentimiento pudo revocarse mientras se hablaba con el proveedor.
      if (!(await tx.consentimientoPersona.findFirst({ where: { id: consentimiento.id, revocadoEn: null }, select: { id: true } })))
        throw reglaDeNegocio("El consentimiento fue revocado. No se enroló el rostro.");
      const datos = {
        proveedor: bio.nombre, referencia, consentimientoId: consentimiento.id, canal, enroladoPor: usuarioId(ctx),
        estado: "activo", enroladoEn: ahora, revocadoEn: null, motivoBaja: null,
      };
      const fila = await tx.enrolamientoFacial.upsert({
        where: { tenantId_personaId: { tenantId: ctx.tenantId, personaId } },
        create: { tenantId: ctx.tenantId, personaId, ...datos }, update: datos,
      });
      await ctx.bitacora.registrar(tx, {
        tipo: "asistencia.biometria.enrolada", entidadTipo: "enrolamiento_facial", entidadId: fila.id, payload: { personaId, canal },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "asistencia.biometria.enrolada", entidadTipo: "enrolamiento_facial", entidadId: fila.id,
        payload: { enrolamientoId: fila.id, personaId, canal },
      });
    });
  } catch (e) {
    await bio.eliminarRostro(rostroId).catch(() => undefined); // no dejar un rostro sin referencia en la base
    throw e;
  }
  return { enrolado: true, proveedor: bio.nombre, enroladoEn: ahora.toISOString() };
}

export const biometriaEnrolar = defineCapability({
  id: "asistencia.biometria.enrolar",
  descripcion:
    "La propia persona enrola su rostro desde Terreno o el Portal Trabajador, con una prueba de vida. Exige su consentimiento vigente y su correo personal; guarda solo la referencia cifrada del proveedor, sin foto. Un agente nunca enrola a una persona.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  sensibles: ["sesionVidaId"],
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    return enrolar(ctx, (await personaPropia(ctx)).id, i.sesionVidaId, ctx.portal === "terreno" ? "kiosco" : "telefono_personal", dryRun);
  },
});

export const biometriaEnrolarRrhh = defineCapability({
  id: "asistencia.biometria.enrolar_rrhh",
  descripcion:
    "RR. HH. enrola el rostro de una persona desde su ficha, estando la persona presente y con una prueba de vida. Exige el consentimiento vigente de la persona y su correo personal; guarda solo la referencia cifrada del proveedor.",
  permiso: "asistencia:configurar",
  portales: ["erp"],
  soloPersonas: true,
  sensibles: ["sesionVidaId"],
  input: entrada.extend({ personaId: uuid }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, i, { dryRun }) => enrolar(ctx, i.personaId, i.sesionVidaId, "erp", dryRun),
});
