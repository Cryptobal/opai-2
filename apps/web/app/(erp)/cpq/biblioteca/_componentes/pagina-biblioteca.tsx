"use client";

import { Badge, Estado } from "@opai/ds";
import { useEffect, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function PaginaBibliotecaPropuesta() {
  const { ejecutar } = useCapacidad("erp");
  const [bloques, setBloques] = useState<{ id: string; titulo: string; tipo: string; estado: string }[]>([]);

  useEffect(() => {
    void ejecutar("cpq.biblioteca_bloques.list", {}).then((r) => {
      if (r && typeof r === "object" && "bloques" in r) {
        setBloques((r as { bloques: typeof bloques }).bloques);
      }
    });
  }, [ejecutar]);

  return (
    <Estado state="ready" variante="lista">
      <div className="space-y-4 p-4">
        <h1 className="t-heading">Biblioteca · Propuesta técnica</h1>
        <ul className="space-y-2">
          {bloques.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="t-body-sm">{b.titulo}</span>
              <Badge tono={b.estado === "publicado" ? "success" : "neutro"}>{b.estado}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Estado>
  );
}
