import { headers } from "next/headers";
import { Suspense } from "react";

import { slugDeComprobante } from "@opai/capabilities";
import { forTenant, globales, verificarEslabon } from "@opai/db";
import { Alerta, AuthCard, Loading, Pares } from "@opai/ds";

import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

export const metadata = { title: "Verificar comprobante" };

type Props = { params: Promise<{ token: string }> };

async function buscar(token: string) {
  const slug = slugDeComprobante(token);
  if (!slug) return null;
  const tenant = await globales().tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return null;
  const c = await forTenant(tenant.id).comprobante.findUnique({ where: { token } });
  if (!c) return null;
  if (!c.bitacoraSeq) return { ...c, integro: true };
  // Se recalcula el eslabón (contenido y enlace con el anterior), no solo se compara la huella.
  const eslabon = await verificarEslabon(tenant.id, c.bitacoraSeq);
  return { ...c, integro: !!eslabon?.integro && eslabon.hash === c.hash };
}

/** Los tokens son base64url: un `%` mal formado no debe romper la página. */
function decodificar(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return "";
  }
}

async function Contenido({ params }: Props) {
  const { token } = await params;
  const permitido = await permitir(
    `verificar:${ipDeCabeceras(await headers())}`,
    LIMITES.verificar.maximo,
  );
  const c = permitido ? await buscar(decodificar(token)) : null;
  return (
    <AuthCard titulo="Verificar comprobante" subtitulo="Comprobante emitido por OPAI">
      {!permitido ? (
        <Alerta tono="warning" titulo="Demasiadas consultas">
          Espera un minuto e inténtalo de nuevo.
        </Alerta>
      ) : !c ? (
        <Alerta tono="danger" titulo="Comprobante no encontrado">
          El enlace no corresponde a un comprobante emitido por OPAI.
        </Alerta>
      ) : (
        <>
          <Alerta
            tono={c.integro ? "success" : "danger"}
            titulo={c.integro ? "Comprobante válido" : "Integridad no verificada"}
          >
            {c.integro
              ? "El registro existe y su huella coincide con la bitácora encadenada."
              : "La huella no coincide con la bitácora. Contacta a la empresa emisora."}
          </Alerta>
          <Pares
            items={[
              { etiqueta: "Tipo", valor: c.tipo },
              {
                etiqueta: "Emitido",
                valor: c.createdAt.toISOString().replace("T", " ").slice(0, 19) + " UTC",
              },
              {
                etiqueta: "Huella SHA-256",
                valor: <span className="t-mono break-all">{c.hash}</span>,
              },
            ]}
          />
        </>
      )}
    </AuthCard>
  );
}

/** Verificación pública de comprobantes (sin sesión, sin datos personales). */
export default function Verificar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="detalle" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
