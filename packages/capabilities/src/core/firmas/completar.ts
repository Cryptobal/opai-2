import { createHash, randomBytes } from "node:crypto";

import { claveDocumento, enmascararRun, nombreSeguro } from "@opai/domain";

import { selloDe } from "../../integraciones/sello";
import type { Contexto } from "../../types";
import { uuid7 } from "../documentos/uuid7";
import { hashToken, registrarEvidencia } from "./comun-flujo";

const sha256Hex = (texto: string): string => createHash("sha256").update(texto).digest("hex");

type Firmante = {
  id: string;
  nombre: string;
  run: string | null;
  firmadoEn: Date | null;
};
type Solicitud = {
  id: string;
  documentoId: string;
  documentoVersion: number;
  sha256: string;
  nivel: string;
  estado: string;
  firmantes: Firmante[];
};

/**
 * Cierra una solicitud cuando firma el último (R6): arma el PDF firmado con la página de evidencia
 * (sello de plataforma + sello de tiempo, P7), calcula H2, lo guarda como versión nueva e inmutable
 * del documento, registra la evidencia `completada` encadenada, emite el comprobante público y el
 * evento. Las llamadas externas (sello, almacenamiento) van fuera de la transacción.
 */
export async function completarSolicitud(ctx: Contexto, s: Solicitud): Promise<void> {
  const tenant = await ctx.db.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  const comprobanteToken = `${tenant.slug}.${randomBytes(18).toString("base64url")}`;
  const comprobanteUrl = `${ctx.servicios.urlBase}/verificar/${comprobanteToken}`;
  const metodos = new Map(
    (
      await ctx.db.evidenciaFirma.findMany({
        where: { solicitudId: s.id, tipo: "firmada" },
        select: { firmanteId: true, metodo: true },
      })
    ).map((e) => [e.firmanteId, e.metodo]),
  );
  const sellado = await selloDe(ctx).sellar({
    solicitudId: s.id,
    sha256Documento: s.sha256,
    nivel: s.nivel,
    comprobanteUrl,
    firmantes: s.firmantes.map((f) => ({
      nombre: f.nombre,
      run: enmascararRun(f.run),
      nivel: s.nivel,
      metodo: metodos.get(f.id) ?? "firma",
      firmadoEn: (f.firmadoEn ?? new Date()).toISOString(),
    })),
  });
  const h2 = sha256Hex(sellado.bytes);
  const docId = uuid7();
  const version = s.documentoVersion + 1;
  const original = await ctx.db.documento.findUniqueOrThrow({ where: { id: s.documentoId } });
  const nombre = nombreSeguro(`firmado-${original.nombre}`);
  const storageKey = claveDocumento(ctx.tenantId, docId, version, nombre);
  if (ctx.servicios.almacenamiento.disponible)
    await ctx.servicios.almacenamiento.subir(storageKey, sellado.bytes, sellado.mime, h2);
  await ctx.transaccion(async (tx) => {
    const firmado = await tx.documento.create({
      data: {
        id: docId,
        tenantId: ctx.tenantId,
        tipoId: original.tipoId,
        nombre,
        titulo: original.titulo,
        mime: sellado.mime,
        tamano: Buffer.byteLength(sellado.bytes),
        sha256: h2,
        storageKey,
        estado: "disponible",
        version,
        reemplazaAId: original.id,
        visibleEn: original.visibleEn,
        origen: "generado",
        moduloOrigen: "core",
        creadoPorTipo: "system",
        confirmadoEn: new Date(),
      },
    });
    const propietario = await tx.documentoVinculo.findFirst({
      where: { documentoId: original.id, rol: "propietario" },
    });
    if (propietario)
      await tx.documentoVinculo.create({
        data: {
          tenantId: ctx.tenantId,
          documentoId: firmado.id,
          entidadTipo: propietario.entidadTipo,
          entidadId: propietario.entidadId,
          rol: "propietario",
        },
      });
    await tx.documento.update({ where: { id: original.id }, data: { estado: "reemplazado" } });
    const hecho = await registrarEvidencia(ctx, tx, s, {
      tipo: "completada",
      nivel: s.nivel,
      sha256: h2,
    });
    await tx.comprobante.create({
      data: {
        tenantId: ctx.tenantId,
        tipo: "documentos.firma.completada",
        entidadTipo: "solicitud_firma",
        entidadId: s.id,
        hash: hecho.hash,
        token: comprobanteToken,
        bitacoraSeq: hecho.seq,
      },
    });
    await tx.solicitudFirma.update({
      where: { id: s.id },
      data: {
        estado: "completada",
        documentoFirmadoId: firmado.id,
        sha256Firmado: h2,
        comprobanteTokenHash: hashToken(comprobanteToken),
        completadaEn: new Date(),
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "documentos.firma.completada",
      entidadTipo: "solicitud_firma",
      entidadId: s.id,
      payload: { documentoFirmadoId: firmado.id, sha256Firmado: h2 },
    });
  });
}
