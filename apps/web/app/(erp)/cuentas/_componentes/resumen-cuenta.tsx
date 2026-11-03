import Link from "next/link";

import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { fecha, rut } from "@/lib/fechas";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { VinculosComercialCuenta } from "./vinculos-comercial-cuenta";

/** Tab Resumen de una cuenta: identificación y representante legal (01). */
export function ResumenCuenta({ c }: { c: CuentaDetalle }) {
  const principal = c.contactos.find((k) => k.esPrincipal)?.nombre ?? null;
  const direccion = [c.calle, c.comuna, c.region].filter(Boolean).join(", ") || null;
  const editar = (
    <EnlaceBotonHoja href="?editar=1" variante="ghost">
      Editar
    </EnlaceBotonHoja>
  );
  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta titulo="Identificación" accion={editar}>
        <ParesGrid
          items={[
            { etiqueta: "Razón social", valor: c.razonSocial },
            { etiqueta: "RUT", valor: c.rut ? rut(c.rut) : null, mono: true },
            { etiqueta: "Giro", valor: c.giro },
            { etiqueta: "Origen", valor: c.origen },
            {
              etiqueta: "Sitio web",
              valor: c.sitioWeb ? (
                <Link
                  href={c.sitioWeb.startsWith("http") ? c.sitioWeb : `https://${c.sitioWeb}`}
                  className="text-accent underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.sitioWeb.replace(/^https?:\/\//, "")}
                </Link>
              ) : null,
            },
            { etiqueta: "Contacto principal", valor: principal },
            { etiqueta: "Dirección", valor: direccion, ancho: true },
            ...(c.notas ? [{ etiqueta: "Notas", valor: c.notas, ancho: true }] : []),
          ]}
        />
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Representante legal">
        <ParesGrid
          items={[
            {
              etiqueta: "Representante",
              valor: c.representantes.length
                ? c.representantes.map((r) => (
                    <span key={r.id} className="block">
                      {r.nombre} · <span className="t-mono">{rut(r.rut)}</span>
                    </span>
                  ))
                : null,
            },
            {
              etiqueta: "Personería",
              valor:
                c.escrituraFecha || c.escrituraNotaria
                  ? `Escritura${c.escrituraFecha ? ` del ${fecha(c.escrituraFecha)}` : ""}${c.escrituraNotaria ? `, ${c.escrituraNotaria}` : ""}`
                  : null,
            },
          ]}
        />
      </SeccionTarjeta>
      <VinculosComercialCuenta cuentaId={c.id} />
    </div>
  );
}
