import { Suspense } from "react";

import { formatearFechaHora } from "@opai/domain";

import { Alerta, AuthCard, Loading, Pares } from "@opai/ds";

import { FormularioRespuesta } from "./formulario";
import { verContingencia } from "./ver";

export const metadata = { title: "Marca de contingencia", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; token: string }> };

const zona = "America/Santiago";
const legible = (iso: string) => formatearFechaHora(iso, zona, { fechaLarga: true });

const ESTADOS: Record<string, string> = {
  aceptada: "Ya aceptaste esta contingencia.",
  rechazada: "Ya objetaste esta contingencia.",
};

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const v = await verContingencia(slug, token);
  if ("limitada" in v)
    return (
      <AuthCard titulo="Marca de contingencia">
        <Alerta tono="warning" titulo="Demasiadas consultas">Espera un minuto e inténtalo de nuevo.</Alerta>
      </AuthCard>
    );
  if (!v.ok)
    return (
      <AuthCard titulo="Marca de contingencia">
        <Alerta tono="danger" titulo="Enlace no válido">El enlace no existe o ya no está disponible.</Alerta>
      </AuthCard>
    );
  const c = v.data;
  return (
    <AuthCard titulo="Marca de contingencia" subtitulo="Tu empleador propone registrar una marca porque el sistema no estuvo disponible.">
      <div className="flex flex-col gap-4">
        <Pares
          items={[
            { etiqueta: "Tipo", valor: c.tipo },
            { etiqueta: "Hora declarada", valor: legible(c.hora) },
            { etiqueta: "Motivo", valor: c.motivo },
            ...(c.estado === "pendiente" && c.venceEn ? [{ etiqueta: "Responde antes de", valor: legible(c.venceEn) }] : []),
          ]}
        />
        {c.estado === "pendiente" ? (
          <FormularioRespuesta slug={slug} token={token} />
        ) : (
          <Alerta tono="info" titulo="Contingencia cerrada">{ESTADOS[c.estado]}</Alerta>
        )}
      </div>
    </AuthCard>
  );
}

export default function Pagina(props: Props) {
  return (
    <Suspense fallback={<Loading variante="detalle" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}