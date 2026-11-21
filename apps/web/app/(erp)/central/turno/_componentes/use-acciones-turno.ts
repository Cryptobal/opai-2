"use client";

import { useRouter } from "next/navigation";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export function useAccionesTurno() {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");

  async function run(llamada: Promise<unknown>, ok: string) {
    if (await llamada) {
      avisar.exito(ok);
      router.refresh();
    }
  }

  return { ejecutar, pendiente, error, run };
}