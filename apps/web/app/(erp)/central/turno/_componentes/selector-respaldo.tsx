"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  respaldoId: string;
  usuarios: { userId: string; nombre: string }[];
  puedeEditar: boolean;
};

export function SelectorRespaldo({ respaldoId, usuarios, puedeEditar }: Props) {
  const router = useRouter();
  const [valor, setValor] = useState(respaldoId);
  const { ejecutar, pendiente } = useCapacidad("erp");
  const opciones = [{ valor: "", etiqueta: "Sin responsable de respaldo" }, ...usuarios.map((u) => ({ valor: u.userId, etiqueta: u.nombre }))];

  const guardar = async () => {
    if (await ejecutar("core.config.set", { modulo: "central", clave: "responsable_respaldo", valor: valor || null })) {
      avisar.exito("Responsable de respaldo guardado");
      router.refresh();
    }
  };

  if (!puedeEditar) {
    const nombre = respaldoId ? (usuarios.find((u) => u.userId === respaldoId)?.nombre ?? "persona asignada") : "sin asignar";
    return (
      <p className="t-caption text-fg-muted">
        Responsable de respaldo: {nombre}. Quien administra la central puede cambiarlo aquí o en Configuración → Central.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h3 className="t-label text-fg">Responsable de respaldo</h3>
      <p className="t-caption text-fg-muted">Persona a cargo cuando no hay turno abierto.</p>
      <Select valor={valor} onCambiar={setValor} opciones={opciones} />
      <Button variant="secondary" disabled={pendiente || valor === respaldoId} onClick={() => void guardar()}>
        Guardar respaldo
      </Button>
    </section>
  );
}