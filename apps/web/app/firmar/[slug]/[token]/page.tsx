import { Suspense } from "react";

import { Alerta, AuthCard, Loading } from "@opai/ds";

import type { DatosFirma } from "./acciones";
import { verFirma } from "./acciones";
import { FirmarFlujo } from "./firmar-flujo";

export const metadata = { title: "Firmar documento" };

type Props = { params: Promise<{ slug: string; token: string }> };

/** "%" mal formado en el token no rompe la página (igual que /verificar). */
function decodificar(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return "";
  }
}

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const vista = await verFirma(slug, decodificar(token));
  if ("limitada" in vista) {
    return (
      <AuthCard titulo="Firmar documento">
        <Alerta tono="warning" titulo="Demasiadas consultas">
          Espera un minuto e inténtalo de nuevo.
        </Alerta>
      </AuthCard>
    );
  }
  if (!vista.ok) {
    return (
      <AuthCard titulo="Firmar documento">
        <Alerta tono="danger" titulo="Enlace no válido">
          El enlace venció o no corresponde a una solicitud de firma.
        </Alerta>
      </AuthCard>
    );
  }
  return <FirmarFlujo slug={slug} token={token} datos={vista.data as DatosFirma} />;
}

/** Firmar por enlace personal (firma.md §5): público, sin sesión; el tenant sale del slug, no del body. */
export default function PaginaFirmar(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
