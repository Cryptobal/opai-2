import { Suspense } from "react";

import { Alerta, AuthCard, Loading } from "@opai/ds";

import { fecha, pesos } from "@/lib/fechas";

import { verCotizacionPublica } from "./ver";

export const metadata = { title: "Cotización", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; token: string }> };

async function Contenido({ params }: Props) {
  const { slug, token } = await params;
  const v = await verCotizacionPublica(slug, token);
  if ("limitada" in v) {
    return (
      <AuthCard titulo="Cotización">
        <Alerta tono="warning" titulo="Demasiadas consultas">
          Espera un minuto e inténtalo de nuevo.
        </Alerta>
      </AuthCard>
    );
  }
  if (!v.ok) {
    return (
      <AuthCard titulo="Cotización">
        <Alerta tono="danger" titulo="Enlace no válido">
          El enlace venció, fue revocado o no corresponde a una cotización. Pide uno nuevo a quien te lo envió.
        </Alerta>
      </AuthCard>
    );
  }
  const c = v.data;
  return (
    <AuthCard
      titulo={c.titulo}
      subtitulo={`${c.empresa} · ${c.codigo}${c.validaHasta ? ` · válida hasta ${fecha(c.validaHasta)}` : ""}`}
    >
      <div className="flex flex-col gap-4">
        {c.ventaMensualClp != null ? (
          <div className="rounded-md bg-fill p-3">
            <p className="t-caption">Venta mensual</p>
            <p className="t-heading">{pesos(c.ventaMensualClp)}</p>
          </div>
        ) : null}
        {c.secciones.map((s) => (
          <section key={s.nombre} className="flex flex-col gap-2" aria-label={s.nombre}>
            <h2 className="t-label">{s.nombre}</h2>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {s.lineas.map((l, i) => (
                <li key={`${l.nombre}-${i}`} className="flex justify-between gap-3 p-3">
                  <span className="t-body-sm">{l.nombre}</span>
                  <span className="t-caption">× {l.posiciones}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="t-caption">Este enlace vence el {fecha(c.venceEn)}.</p>
      </div>
    </AuthCard>
  );
}

/** Cotización compartida por enlace: pública, sin sesión; solo alcance y venta, nunca costos ni margen. */
export default function PaginaCotizacionPublica(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
