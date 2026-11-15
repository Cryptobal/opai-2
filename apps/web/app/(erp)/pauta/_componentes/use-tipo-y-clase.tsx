"use client";

import { useEffect, useState } from "react";

import { CampoClase, type ClaseAusencia } from "@/app/_components/campo-clase-ausencia";
import { useCapacidad } from "@/app/_components/use-capacidad";

/**
 * Tipo y clase de la excepción que se registra desde la pauta (CAR-393). Las clases de la empresa se leen al abrir la
 * hoja, solo si se puede registrar. Si el rol no ve los datos laborales (o falla la lectura), quedan vacías y el campo
 * «Clase» no se muestra: la excepción se registra igual, sin clase. Al cambiar el tipo, la clase vuelve a «Sin
 * especificar», porque cada clase pertenece a un tipo.
 */
export function useTipoYClase(activo: boolean, diaria: boolean) {
  const { ejecutar } = useCapacidad("erp");
  const [clases, setClases] = useState<readonly ClaseAusencia[]>([]);
  const [tipo, setTipoBase] = useState<string>("ausencia");
  const [clase, setClase] = useState("");
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    void ejecutar<{ items: ClaseAusencia[] }>("core.ausencias.clases", {}, false, "ninguna").then(
      (r) => {
        if (vigente && r) setClases(r.items);
      },
    );
    return () => {
      vigente = false;
    };
  }, [activo, ejecutar]);
  const setTipo = (v: string) => {
    setTipoBase(v);
    setClase("");
  };
  const campoClase = (
    <CampoClase
      id={diaria ? "ex-clase-d" : "ex-clase"}
      clases={clases}
      tipo={tipo}
      valor={clase}
      onCambiar={setClase}
    />
  );
  return { tipo, clase, campos: { tipo, setTipo, campoClase } };
}
