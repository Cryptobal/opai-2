import { camposACifrar } from "@opai/domain";
import { cifrar, descifrar, generarDek, kekDelEntorno } from "@opai/integrations";

import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { kidDe, recifrarValor } from "./cifrado-campos";
import { listarInventario } from "./inventario";

// Rotación de la DEK de un tenant (Ley 21.719, Brief 07d §21/§22, ADR-027). A diferencia de
// `rotar-kek` (que solo reenvuelve la DEK), esto cambia la clave que cifra los datos: recifra los
// secretos de integraciones y los campos sensibles del inventario y reemplaza la DEK, todo en UNA
// transacción con la fila de `claves_tenant` bloqueada. Si algo falla, nada cambia.

/** Recifra un campo sensible: recorre sus filas y reescribe cada valor con `recifrar`. */
export type Recifrador = (tx: TenantTx, recifrar: (guardado: string) => string) => Promise<number>;

const b = (x: Uint8Array) => Uint8Array.from(x);

export async function rotarDek(
  ctx: Contexto,
  recifradores: Readonly<Record<string, Recifrador>> = {},
): Promise<{ secretos: number; campos: number; kidAnterior: string; kidNuevo: string }> {
  const k = kekDelEntorno();
  if (!k.actual)
    throw reglaDeNegocio("El almacén de secretos no está configurado (OPAI_SECRETS_KEY).");
  const kek = k.actual;
  // Cada campo sensible declarado debe tener su recifrador: sin él, rotar dejaría datos ilegibles.
  const sensibles = camposACifrar(listarInventario()).map((c) => `${c.tabla}.${c.campo}`);
  const faltan = sensibles.filter((c) => !recifradores[c]);
  if (faltan.length) throw reglaDeNegocio(`Falta el recifrador de: ${faltan.join(", ")}.`);
  return ctx.transaccion(async (tx) => {
    await tx.$queryRaw`SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
    const fila = await tx.claveTenant.findUnique({ where: { tenantId: ctx.tenantId } });
    if (!fila) throw reglaDeNegocio("El tenant aún no tiene una clave de datos que rotar.");
    const envoltura = fila.kekVersion < k.version && k.anterior ? k.anterior : kek;
    const vieja = descifrar(envoltura, { cifrado: fila.dekCifrada, iv: fila.iv, tag: fila.tag });
    const nueva = generarDek();
    let secretos = 0;
    for (const s of await tx.secreto.findMany()) {
      const claro = descifrar(vieja, { cifrado: s.cifrado, iv: s.iv, tag: s.tag });
      const c = cifrar(nueva, claro);
      await tx.secreto.update({
        where: { id: s.id },
        data: { cifrado: b(c.cifrado), iv: b(c.iv), tag: b(c.tag) },
      });
      secretos += 1;
    }
    let campos = 0;
    for (const clave of sensibles) {
      const [tabla = "", campo = ""] = clave.split(".");
      const recifrador = recifradores[clave];
      if (recifrador)
        campos += await recifrador(tx, (g) =>
          recifrarValor({ tenantId: ctx.tenantId, tabla, campo }, g, vieja, nueva),
        );
    }
    const w = cifrar(kek, nueva);
    await tx.claveTenant.update({
      where: { tenantId: ctx.tenantId },
      data: { dekCifrada: b(w.cifrado), iv: b(w.iv), tag: b(w.tag), kekVersion: k.version },
    });
    return { secretos, campos, kidAnterior: kidDe(vieja), kidNuevo: kidDe(nueva) };
  });
}
