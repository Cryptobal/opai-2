"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import {
  CamposPersona,
  type DatosPersona,
  inicialPersona,
  invalidoPersona,
} from "./campos-persona";
import {
  CamposVinculo,
  conTermino,
  type DatosVinculo,
  vinculoInvalido,
  vinculoVacio,
} from "./campos-vinculo";

type Props =
  | { persona: PersonaDetalle; cargos?: undefined; hoy?: undefined }
  | {
      persona?: undefined;
      cargos: { valor: string; etiqueta: string }[];
      hoy: string;
    };

const camposDe = (d: DatosPersona) => ({
  nombres: d.nombres.trim(),
  apellidos: d.apellidos.trim(),
  rut: d.rut.trim(),
  fechaNacimiento: d.fechaNacimiento || null,
  sexo: d.sexo || null,
  nacionalidad: d.nacionalidad || "CL",
  emailPersonal: d.emailPersonal.trim() || null,
  emailLaboral: d.emailLaboral.trim() || null,
  telefono: d.telefono.trim() || null,
  calle: d.direccion?.calle ?? null,
  comuna: d.direccion?.comuna ?? null,
  region: d.direccion?.region ?? null,
  direccionFormateada: d.direccion?.direccionFormateada ?? null,
  placeId: d.direccion?.placeId ?? null,
  lat: d.direccion?.lat ?? null,
  lng: d.direccion?.lng ?? null,
});

/** Agregar persona (con su vínculo) o editar sus datos: Sheet en md+, pantalla completa en teléfono. */
export function HojaPersona({ persona, cargos, hoy }: Props) {
  const hoja = useHojaUrl(persona ? "editar" : "nueva");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [d, setD] = useState<DatosPersona>(() => inicialPersona(persona));
  const [v, setV] = useState<DatosVinculo>(() => vinculoVacio(hoy ?? ""));
  const invalido = invalidoPersona(d) || (!persona && vinculoInvalido(v));
  async function guardar() {
    const vinculo = {
      instalacionId: v.instalacionId,
      puestoId: v.puestoId || null,
      horasSemanales: Number(v.horasSemanales),
      distribucion: v.distribucion,
      cargoId: v.cargoId,
      tipo: v.tipo,
      inicio: v.inicio,
      ...(conTermino(v.tipo) ? { termino: v.termino } : {}),
    };
    const r = await ejecutar<{ id: string }>(
      persona ? "core.personas.update" : "core.personas.create",
      persona ? { id: persona.id, ...camposDe(d) } : { ...camposDe(d), vinculo },
    );
    if (!r) return;
    avisar.exito(persona ? "Datos actualizados" : "Persona creada");
    hoja.cerrar();
    if (!persona) router.push(`/personas/${r.id}`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={persona ? "Editar datos" : "Agregar persona"}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalido} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : persona ? "Guardar" : "Crear persona"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {persona ? (
          <Alerta tono="info" titulo="Aquí se edita solo la identidad y el contacto">
            Cargo, contrato, instalación, jornada, previsión y demás datos laborales se editan en la
            pestaña{" "}
            <Link href={`/personas/${persona.id}/laboral`} className="font-medium underline">
              Laboral
            </Link>
            . El sueldo está en la pestaña Sueldo.
          </Alerta>
        ) : null}
        <CamposPersona d={d} setD={setD} />
        {cargos ? <CamposVinculo v={v} onCambiar={setV} cargos={cargos} /> : null}
      </div>
    </Sheet>
  );
}
