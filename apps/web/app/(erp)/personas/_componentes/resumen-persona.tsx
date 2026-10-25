import { Mail, MessageSquare, Phone, UserPlus } from "lucide-react";

import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { MapaOpai } from "@/app/_components/maestros/mapa";
import { fecha, rut, telefono } from "@/lib/fechas";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { etiquetaDe, NACIONALIDADES, SEXOS } from "./opciones-persona";

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
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Dirección">
        <div className="@container">
          <div className="grid gap-4 @min-[800px]:grid-cols-[minmax(0,1fr)_160px] @min-[800px]:items-start">
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
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Acceso">
        <ParesGrid
          unaColumna
          items={[{ etiqueta: "Usuario vinculado", valor: p.usuarioId ? "Sí" : "No" }]}
        />
        {p.usuarioId ? null : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <EnlaceBotonHoja href="?vincular=1" variante="secondary" icono={UserPlus}>
              Vincular usuario
            </EnlaceBotonHoja>
            <span className="t-caption">Le permite entrar al portal Trabajador</span>
          </div>
        )}
      </SeccionTarjeta>
    </div>
  );
}
