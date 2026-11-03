"use client";

import { useState } from "react";

import { DatosSii, type CampoDatosSii, type EstadoDatosSii } from "@opai/ds";

const CAMPOS: CampoDatosSii[] = [
  {
    campo: "razonSocial",
    etiqueta: "Razón social",
    ficha: "Clínica Los Leones S.A.",
    sii: "CLINICA LOS LEONES S.A.",
    estado: "igual",
  },
  {
    campo: "giro",
    etiqueta: "Giro",
    ficha: "Servicios de salud",
    sii: "Actividades de hospitales y clínicas privadas",
    estado: "distinto",
  },
  {
    campo: "calle",
    etiqueta: "Dirección tributaria",
    ficha: null,
    sii: "Av. Providencia 2330, of. 1201",
    estado: "vacio_ficha",
  },
  { campo: "ciudad", etiqueta: "Ciudad", ficha: null, sii: null, estado: "vacio_sii" },
];

const ESTADOS: { titulo: string; e: EstadoDatosSii }[] = [
  {
    titulo: "Comparación",
    e: { tipo: "ok", campos: CAMPOS, lista: true, resumen: "Lista para facturar al aplicar" },
  },
  { titulo: "Consultando", e: { tipo: "cargando" } },
  {
    titulo: "Sin respuesta",
    e: {
      tipo: "error",
      titulo: "El SII no responde",
      mensaje:
        "El SII tardó más de 20 segundos. Tus datos no cambiaron; reintenta en unos minutos.",
      onReintentar: () => undefined,
    },
  },
  {
    titulo: "Sin inicio de actividades",
    e: { tipo: "sin_inicio", mensaje: "El RUT existe pero no registra inicio de actividades." },
  },
  {
    titulo: "No configurado",
    e: {
      tipo: "no_configurado",
      mensaje: "Falta la API key de SimpleAPI RUT en Configuración › Integraciones.",
    },
  },
];

/** `DatosSII` (CRM v3 cierre §2): comparación, consultando, sin respuesta, sin inicio y no configurado. */
export function MuestraSii() {
  const [elegidos, setElegidos] = useState<Set<string>>(new Set(["giro", "calle"]));
  return (
    <div className="grid gap-6 md:grid-cols-2" data-testid="muestra-sii">
      {ESTADOS.map(({ titulo, e }) => (
        <section key={titulo} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <h3 className="t-label">{titulo}</h3>
          <DatosSii
            estado={e}
            elegidos={elegidos}
            onElegir={(c, si) =>
              setElegidos((s) => {
                const n = new Set(s);
                if (si) n.add(c);
                else n.delete(c);
                return n;
              })
            }
          />
        </section>
      ))}
    </div>
  );
}
