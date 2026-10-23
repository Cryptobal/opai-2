import { headers } from "next/headers";
import { Suspense } from "react";

import { slugDeComprobante } from "@opai/capabilities";
import { forTenant, globales } from "@opai/db";
import { Alerta, AuthCard, Loading, Pares } from "@opai/ds";

import { ipDeCabeceras, permitir } from "@/lib/rate-limit";

export const metadata = { title: "Verificar comprobante" };

type Props = { params: Promise<{ token: string }> };

async function buscar(token: string) {
  const slug = slugDeComprobante(token);
  if (!slug) return null;
  const tenant = await globales().tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return null;
  const db = forTenant(tenant.id);
  const c = await db.comprobante.findUnique({ where: { token } });
  if (!c) return null;
  const eslabon = c.bitacoraSeq
    ? await db.bitacora.findUnique({
        where: { tenantId_seq: { tenantId: tenant.id, seq: c.bitacoraSeq } },
      })
    : null;
  return { ...c, integro: c.bitacoraSeq ? eslabon?.hash === c.hash : true };
}

async function Contenido({ params }: Props) {
  const { token } = await params;
  const permitido = permitir(`verificar:${ipDeCabeceras(await headers())}`, 30);
  const c = permitido ? await buscar(decodeURIComponent(token)) : null;
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
