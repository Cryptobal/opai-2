"use client";

import { useEffect, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type ContactoEnvio = { id: string; nombres: string; apellidos: string; email: string | null };

/** Contactos de la cuenta con correo; deja elegido el primero. Sin cuenta, lista vacía. */
export function useContactosEnvio(cuentaId: string | null) {
  const { ejecutar } = useCapacidad("erp");
  const [contactos, setContactos] = useState<ContactoEnvio[]>([]);
  const [contactoId, setContactoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(Boolean(cuentaId));

  useEffect(() => {
    if (!cuentaId) return;
    void ejecutar("core.contactos.list", { cuentaId }, false, "ninguna").then((r) => {
      if (Array.isArray(r)) {
        const conCorreo = (r as ContactoEnvio[]).filter((c) => c.email?.trim());
        setContactos(conCorreo);
        if (conCorreo[0]) setContactoId(conCorreo[0].id);
      }
      setCargando(false);
    });
  }, [cuentaId, ejecutar]);

  return { contactos, contactoId, setContactoId, cargando, contacto: contactos.find((c) => c.id === contactoId) };
}
