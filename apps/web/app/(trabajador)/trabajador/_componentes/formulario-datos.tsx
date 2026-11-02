"use client";

import { lazy, type FormEvent, type ReactNode, Suspense, useState } from "react";

import { avisar, Button, Campo, type Direccion, Input, Skeleton } from "@opai/ds";

import { FormScreenListo } from "@opai/ds/form-screen-listo";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { MisDatos } from "./tipos";

// Aparte (React.lazy, ADR-037): el buscador de direcciones (mapa, combobox) no pesa en el JS
// inicial de la ruta; esta pantalla solo lo necesita si el trabajador edita su dirección.
const DireccionOpai = lazy(() =>
  import("@/app/_components/maestros/direccion").then((m) => ({ default: m.DireccionOpai })),
);

function direccionInicial(d: MisDatos): Direccion | null {
  const texto = d.direccionFormateada ?? d.calle;
  if (!texto) return null;
  return {
    calle: d.calle ?? texto,
    comuna: d.comuna,
    region: d.region,
    direccionFormateada: d.direccionFormateada,
    placeId: d.placeId,
    lat: d.lat,
    lng: d.lng,
  };
}

/** Lo que la API exige: el texto formateado va siempre; sin él, calle y comuna. */
function aEntrada(d: Direccion) {
  const texto = d.direccionFormateada?.trim() || [d.calle, d.comuna].filter(Boolean).join(", ");
  return {
    direccionFormateada: texto,
    calle: d.calle?.trim() || null,
    comuna: d.comuna?.trim() || null,
    region: d.region?.trim() || null,
    placeId: d.placeId ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  };
}

/** Pantalla 10 · Mis datos: contacto y dirección editables; nombre, RUT y correo laboral solo se ven. */
export function FormularioDatos({ inicial, cabecera }: { inicial: MisDatos; cabecera: ReactNode }) {
  const { ejecutar, pendiente, error } = useCapacidad("trabajador");
  const [telefono, setTelefono] = useState(inicial.telefono ?? "");
  const [email, setEmail] = useState(inicial.emailPersonal ?? "");
  const [direccion, setDireccion] = useState<Direccion | null>(direccionInicial(inicial));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = await ejecutar<MisDatos>("portal_trabajador.mis_datos.actualizar", {
      telefono: telefono.trim() || null,
      emailPersonal: email.trim() || null,
      direccion: direccion ? aEntrada(direccion) : null,
    });
    if (r) avisar.exito("Tus datos quedaron guardados");
    else avisar.error("No se pudo guardar. Revisa los datos e inténtalo de nuevo.");
  }

  return (
    <FormScreenListo
      cabecera={cabecera}
      formProps={{ onSubmit: guardar, noValidate: true }}
      secciones={[
        {
          id: "contacto",
          titulo: "Contacto",
          contenido: (
            <>
              <Campo
                etiqueta="Teléfono"
                htmlFor="mis-datos-telefono"
                ayuda="Con código de país si no es chileno."
              >
                <Input
                  id="mis-datos-telefono"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </Campo>
              <Campo etiqueta="Correo personal" htmlFor="mis-datos-email">
                <Input
                  id="mis-datos-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.cl"
                />
              </Campo>
            </>
          ),
        },
        {
          id: "direccion",
          titulo: "Dirección",
          contenido: (
            <Campo etiqueta="Dónde vives" htmlFor="mis-datos-direccion">
              <Suspense fallback={<Skeleton className="h-11 w-full" />}>
                <DireccionOpai
                  portal="trabajador"
                  id="mis-datos-direccion"
                  valor={direccion}
                  onCambiar={setDireccion}
                />
              </Suspense>
            </Campo>
          ),
        },
      ]}
      resumen={error ? <span className="text-sm font-medium text-danger-fg">{error}</span> : null}
      acciones={
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </Button>
      }
    />
  );
}
