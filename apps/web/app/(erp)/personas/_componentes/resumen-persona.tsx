import { Suspense } from "react";

import { Mail, MessageSquare, Phone } from "lucide-react";

import { ParesGrid, SeccionTarjeta, Skeleton } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { MapaOpai } from "@/app/_components/maestros/mapa";
import { fecha, rut, telefono } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { etiquetaDe, NACIONALIDADES, SEXOS } from "./opciones-persona";
import { ResumenContactoEmergencia } from "./seccion-contacto-laboral";
import { SeccionAccesoPortal } from "./seccion-acceso-portal";

/** Años cumplidos a una fecha ISO (aaaa-mm-dd). */
function edad(nacimiento: string, hoy: string) {
  const [a, m, d] = nacimiento.split("-").map(Number);
  const [ha, hm, hd] = hoy.split("-").map(Number);
  if (!a || !m || !d || !ha || !hm || !hd) return null;
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

type Props = { p: PersonaDetalle; hoy: string };

/** Resumen de una persona (11/12): datos personales, contacto, dirección con mapa y acceso. */
export function ResumenPersona({ p, hoy }: Props) {
  const anos = p.fechaNacimiento ? edad(p.fechaNacimiento, hoy) : null;
  const tel = p.telefono?.replace(/[^\d+]/g, "") ?? "";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SeccionTarjeta titulo="Datos personales">
        <ParesGrid
          items={[
            { etiqueta: "RUT", valor: rut(p.rut), mono: true },
            {
              etiqueta: "Nacimiento",
              valor: p.fechaNacimiento
                ? `${fecha(p.fechaNacimiento)}${anos !== null ? ` (${anos} años)` : ""}`
                : null,
            },
            { etiqueta: "Sexo", valor: etiquetaDe(SEXOS, p.sexo) },
            { etiqueta: "Nacionalidad", valor: etiquetaDe(NACIONALIDADES, p.nacionalidad) },
          ]}
        />
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Contacto">
        <ParesGrid
          unaColumna
          items={[
            { etiqueta: "Correo personal", valor: p.emailPersonal },
            { etiqueta: "Correo laboral", valor: p.emailLaboral },
            {
              etiqueta: "Teléfono",
              valor: p.telefono ? (
                <span className="flex items-center justify-between gap-2">
                  {telefono(p.telefono)}
                  <span className="flex gap-1">
                    <EnlaceBoton
                      href={`tel:${tel}`}
                      variante="ghost"
                      icono={Phone}
                      etiqueta="Llamar"
                    >
                      {null}
                    </EnlaceBoton>
                    <EnlaceBoton
                      href={`sms:${tel}`}
                      variante="ghost"
                      icono={MessageSquare}
                      etiqueta="Enviar mensaje"
                    >
                      {null}
                    </EnlaceBoton>
                    {p.emailPersonal ? (
                      <EnlaceBoton
                        href={`mailto:${p.emailPersonal}`}
                        variante="ghost"
                        icono={Mail}
                        etiqueta="Escribir correo"
                      >
                        {null}
                      </EnlaceBoton>
                    ) : null}
                  </span>
                </span>
              ) : null,
            },
          ]}
        />
        <ResumenContactoEmergencia personaId={p.id} />
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Dirección">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px] md:items-start">
          <ParesGrid
            unaColumna
            items={[
              { etiqueta: "Dirección", valor: p.calle ?? p.direccionFormateada },
              {
                etiqueta: "Comuna",
                valor: [p.comuna, p.region].filter(Boolean).join(" · ") || null,
              },
            ]}
          />
          <MapaOpai lat={p.lat} lng={p.lng} {...(p.comuna ? { pie: p.comuna } : {})} />
        </div>
      </SeccionTarjeta>
      <Suspense fallback={<Skeleton className="h-44 rounded-lg" aria-label="Cargando acceso" />}>
        <SeccionAccesoPortal
          personaId={p.id}
          nombre={p.nombreCompleto}
          tieneUsuario={Boolean(p.usuarioId)}
          personaActiva={p.estado === "activa" && !p.bloqueada}
        />
      </Suspense>
    </div>
  );
}
