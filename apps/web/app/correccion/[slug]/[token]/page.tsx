import { Suspense } from "react";

import { Alerta, AuthCard, Loading, Pares } from "@opai/ds";

import { FormularioRespuesta } from "./formulario";
import { verCorreccion } from "./ver";

export const metadata = { title: "Corrección de tu marca", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; token: string }> };

const TIPOS: Record<string, string> = {
  entrada: "Entrada", salida: "Salida", inicio_colacion: "Inicio de colación", fin_colacion: "Fin de colación",
};
const formato = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Santiago" });

/** «tipo · ISO» → «Entrada · 5 de noviembre de 2026, 08:00». */
function legible(v: string): string {
  const [tipo = "", iso = ""] = v.split(" · ");
  return `${TIPOS[tipo] ?? tipo} · ${iso ? formato.format(new Date(iso)) : ""}`;
}

const ESTADOS: Record<string, string> = {
  aceptada: "Ya aceptaste esta corrección.",
  objetada: "Ya objetaste esta corrección; la empresa la está revisando.",
  vencida: "El plazo para responder venció. La marca original se mantiene.",
};

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const v = await verCorreccion(slug, token);
  if ("limitada" in v)
    return (
      <AuthCard titulo="Corrección de tu marca">
        <Alerta tono="warning" titulo="Demasiadas consultas">Espera un minuto e inténtalo de nuevo.</Alerta>
      </AuthCard>
    );
  if (!v.ok)
    return (
      <AuthCard titulo="Corrección de tu marca">
        <Alerta tono="danger" titulo="Enlace no válido">El enlace no existe o ya no está disponible.</Alerta>
      </AuthCard>
    );
  const c = v.data;
  return (
    <AuthCard titulo="Corrección de tu marca" subtitulo="Tu empleador propone corregir una marca. Tu marca original no se borra.">
      <div className="flex flex-col gap-4">
        <Pares
          items={[
            { etiqueta: "Marca original", valor: legible(c.original) },
            { etiqueta: "Corrección propuesta", valor: legible(c.propuesta) },
            { etiqueta: "Motivo", valor: c.motivo },
            ...(c.venceEn && c.estado === "pendiente" ? [{ etiqueta: "Responde antes de", valor: formato.format(new Date(c.venceEn)) }] : []),
          ]}
        />
        {c.estado === "pendiente" ? (
          <FormularioRespuesta slug={slug} token={token} />
        ) : (
          <Alerta tono="info" titulo="Corrección cerrada">{ESTADOS[c.estado]}</Alerta>
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
