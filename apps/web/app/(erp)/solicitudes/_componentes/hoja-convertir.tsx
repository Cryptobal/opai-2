"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Enlace, Input, Sheet } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { SolicitudDato } from "./datos";
import { PlanConversion, type Plan } from "./plan-conversion";

type Resultado = { plan: Plan; negocioId: string | null };

/** Procesar y convertir (diseño 04): datos revisados, qué se reutiliza y qué se crea, y «Pasar a negocio». */
export function HojaConvertir({ s }: { s: SolicitudDato }) {
  const hoja = useHojaUrl("convertir");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState({
    nombre: s.nombre ?? "",
    empresa: s.empresa ?? "",
    email: s.email ?? "",
    telefono: s.telefono ?? "",
    rut: s.rut ?? "",
    servicio: s.servicio ?? "",
  });
  const [vista, setVista] = useState<Resultado | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hecho, setHecho] = useState<Resultado | null>(null);
  const entrada = () => ({
    id: s.id,
    ...Object.fromEntries(
      Object.entries(d)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => [k, v.trim()]),
    ),
  });
  useEffect(() => {
    if (!hoja.abierta) return;
    let vigente = true;
    const t = setTimeout(() => {
      void ejecutar<Resultado>("comercial.solicitudes.convertir", entrada(), true, "ninguna").then(
        (r) => {
          if (!vigente) return;
          setVista(r);
          setFallo(r ? null : "No se pudo preparar la conversión.");
        },
      );
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, hoja.abierta]);
  async function convertir() {
    const r = await ejecutar<Resultado>("comercial.solicitudes.convertir", entrada());
    if (!r) return;
    avisar.exito("Solicitud convertida");
    setHecho(r);
  }
  const campo = (k: keyof typeof d) => ({
    value: d[k],
    onChange: (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value })),
  });
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Procesar y convertir"
      descripcion="Revisa los datos. Se reutiliza lo que ya existe (por RUT o correo) y se crea lo que falta."
      acciones={
        hecho ? (
          <Button onClick={hoja.cerrar}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={hoja.cerrar}>
              Cancelar
            </Button>
            <Button disabled={pendiente || !vista} onClick={() => void convertir()}>
              {pendiente ? "Guardando…" : "Pasar a negocio"}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {error || fallo ? <Alerta tono="danger" titulo={error ?? fallo ?? ""} /> : null}
        {hecho ? (
          <Alerta tono="success" titulo="Solicitud convertida">
            <Enlace
              Link={LinkNext}
              href={`/negocios/${hecho.negocioId ?? ""}`}
              className="underline"
            >
              Abrir el negocio {hecho.plan.negocio.titulo}
            </Enlace>
          </Alerta>
        ) : (
          <>
            {(["nombre", "empresa", "email", "telefono", "rut", "servicio"] as const).map((k) => (
              <Campo
                key={k}
                etiqueta={
                  {
                    nombre: "Nombre",
                    empresa: "Empresa",
                    email: "Correo",
                    telefono: "Teléfono",
                    rut: "RUT",
                    servicio: "Servicio",
                  }[k]
                }
                htmlFor={`conv-${k}`}
              >
                <Input id={`conv-${k}`} maxLength={200} {...campo(k)} />
              </Campo>
            ))}
            {vista ? <PlanConversion plan={vista.plan} /> : null}
          </>
        )}
      </div>
    </Sheet>
  );
}
