import { z } from "zod";

import {
  biometriaDe, borrarEnrolamiento, defineCapability, enrolarRostro, PROPOSITO_BIOMETRIA, reglaDeNegocio,
  registrarHechoConsentimiento, type Contexto,
} from "@opai/capabilities";

import { PROPOSITO_TELEFONO, PROPOSITOS, TEXTO_CONSENTIMIENTO, VERSION_AVISO } from "../domain";
import { autorizarPersona, quienSchema } from "./rostro-comun";

const proposito = z.enum(PROPOSITOS as [string, ...string[]]);
const ultimoConsentimiento = (ctx: Contexto, personaId: string, p: string) =>
  ctx.db.consentimiento.findFirst({ where: { titularTipo: "persona", titularId: personaId, proposito: p }, orderBy: { id: "desc" }, select: { estado: true } });

const estadoSchema = z.object({
  personaId: z.string(),
  rostroEnrolado: z.boolean(),
  consentimientoRostro: z.boolean(),
  consentimientoTelefono: z.boolean(),
  telefonoHabilitado: z.boolean(),
  instalacionId: z.string().nullable(),
  instalacionNombre: z.string().nullable(),
});

export const rostroEstado = defineCapability({
  id: "asistencia.rostro.estado",
  descripcion:
    "Estado de la identificación de la propia persona al marcar: si su rostro está enrolado, qué consentimientos dio y si puede marcar desde su teléfono. La consulta la propia persona (sesión) o el equipo del kiosco de su instalación. Nunca devuelve datos biométricos.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  input: z.object(quienSchema),
  output: estadoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const { personaId, instalacionId } = await autorizarPersona(ctx, i, false);
    const [enrol, rostro, tel, cred, inst] = await Promise.all([
      ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId }, select: { id: true } }),
      ultimoConsentimiento(ctx, personaId, PROPOSITO_BIOMETRIA),
      ultimoConsentimiento(ctx, personaId, PROPOSITO_TELEFONO),
      ctx.db.credencialTerreno.findUnique({ where: { personaId }, select: { telefonoPersonalHabilitado: true } }),
      instalacionId ? ctx.db.instalacion.findUnique({ where: { id: instalacionId }, select: { nombre: true } }) : null,
    ]);
    return {
      personaId, rostroEnrolado: enrol !== null, consentimientoRostro: rostro?.estado === "otorgado", consentimientoTelefono: tel?.estado === "otorgado",
      telefonoHabilitado: cred?.telefonoPersonalHabilitado ?? false, instalacionId, instalacionNombre: inst?.nombre ?? null,
    };
  },
});

export const rostroIniciarVida = defineCapability({
  id: "asistencia.rostro.iniciar_vida",
  descripcion:
    "Abre la prueba de vida del proveedor para enrolar o marcar con el rostro. Devuelve el identificador de la sesión que la cámara completa; con el proveedor simulado (pruebas) no hace falta sesión. Tiene costo por sesión y lo hace solo la propia persona o su equipo.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  input: z.object(quienSchema),
  output: z.object({ proveedor: z.string(), sesionId: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    await autorizarPersona(ctx, i, false);
    const prov = await biometriaDe(ctx);
    if (!prov) throw reglaDeNegocio("El reconocimiento facial no está disponible en esta empresa. Marca con RUT y PIN.");
    if (dryRun || !prov.b.iniciarVida) return { proveedor: prov.b.nombre, sesionId: null };
    return { proveedor: prov.b.nombre, sesionId: (await prov.b.iniciarVida()).sesionId };
  },
});

function consentimiento(estado: "otorgado" | "revocado") {
  return defineCapability({
    id: `asistencia.rostro.${estado === "otorgado" ? "consentir" : "revocar"}`,
    descripcion:
      estado === "otorgado"
        ? "La propia persona acepta el consentimiento expreso para el uso de su rostro o de su teléfono personal al marcar (Ley 21.719). Queda en Cumplimiento, versionado y auditado. En el kiosco exige su PIN. Un agente nunca consiente por una persona."
        : "La propia persona revoca su consentimiento (rostro o teléfono personal). Al revocar el rostro se borra su biometría y sigue marcando con RUT y PIN. En el kiosco exige su PIN. Es inmediato y no necesita aprobación.",
    permiso: null,
    portales: ["terreno", "trabajador"],
    soloPersonas: true,
    input: z.object({ ...quienSchema, proposito }),
    sensibles: ["credencial"],
    output: z.object({ proposito: z.string(), estado: z.string() }),
    efecto: "escritura",
    dryRun: true,
    async handler(ctx, i, { dryRun }) {
      const { personaId } = await autorizarPersona(ctx, i, true);
      const ultimo = await ultimoConsentimiento(ctx, personaId, i.proposito);
      if (estado === "otorgado" && ultimo?.estado === "otorgado") return { proposito: i.proposito, estado };
      if (estado === "revocado" && ultimo?.estado !== "otorgado") return { proposito: i.proposito, estado: "sin_consentimiento" };
      if (dryRun) return { proposito: i.proposito, estado };
      await ctx.transaccion((tx) =>
        registrarHechoConsentimiento(ctx, tx, { tipo: "persona", id: personaId }, {
          proposito: i.proposito, versionAviso: VERSION_AVISO, estado, nota: ctx.actor.tipo === "system" ? "kiosco" : "portal",
        }),
      );
      // Revocar borra el rostro ya (el despacho del evento lo reintenta si el proveedor falla); sin consentimiento no se usa.
      if (estado === "revocado" && i.proposito === PROPOSITO_BIOMETRIA)
        await borrarEnrolamiento(ctx, personaId, "consentimiento_revocado").catch(() => false);
      return { proposito: i.proposito, estado };
    },
  });
}
export const rostroConsentir = consentimiento("otorgado");
export const rostroRevocar = consentimiento("revocado");

export const rostroEnrolar = defineCapability({
  id: "asistencia.rostro.enrolar",
  descripcion:
    "La propia persona enrola su rostro con prueba de vida, en su teléfono o en el kiosco de su instalación (con su PIN). Exige su consentimiento vigente; guarda solo una referencia cifrada del proveedor, sin foto. Un agente nunca enrola a una persona.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  sensibles: ["muestra", "credencial"],
  input: z.object({ ...quienSchema, muestra: z.string().min(8).max(2_000_000), reemplazar: z.boolean().default(false) }),
  output: z.object({ proveedor: z.string(), enroladoEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const { personaId } = await autorizarPersona(ctx, i, true);
    if (i.reemplazar && !dryRun) await borrarEnrolamiento(ctx, personaId, "manual");
    const r = await enrolarRostro(ctx, personaId, i.muestra, dryRun);
    return { proveedor: r.proveedor, enroladoEn: r.enroladoEn };
  },
});

export const rostroTextos = defineCapability({
  id: "asistencia.rostro.textos",
  descripcion:
    "Textos vigentes de los consentimientos de Asistencia (uso del rostro y del teléfono personal) con su versión, tal como se muestran y se aceptan. Sirve para que la persona los lea antes de consentir.",
  permiso: null,
  portales: ["erp", "terreno", "trabajador"],
  input: z.object({}),
  output: z.array(z.object({ proposito: z.string(), version: z.string(), texto: z.string() })),
  efecto: "lectura",
  dryRun: false,
  handler: async () => PROPOSITOS.map((p) => ({ proposito: p, version: VERSION_AVISO, texto: TEXTO_CONSENTIMIENTO[p] })),
});
