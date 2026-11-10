"use client";

import { useEffect, useState } from "react";

import { CAMPOS_SII, ETIQUETA_CAMPO_SII } from "@opai/domain";
import { Alerta, avisar, Button, campoElegible, DatosSii, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { rut } from "@/lib/fechas";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { ConsultadoEn, estadoDe, type Consulta } from "./hoja-sii-estado";

/** «Datos del SII» (CuentaV2 · sii): consulta por RUT, compara y aplica campo por campo. */
export function HojaSii({ cuenta }: { cuenta: CuentaDetalle }) {
  const hoja = useHojaUrl("sii");
  const consulta = useCapacidad("erp");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [c, setC] = useState<Consulta | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  // La hoja se monta al abrirse (`hojaDiferida`): el estado inicial ya es «cargando» (c = null).
  const cargar = (r: Consulta | null) => {
    if (!r) return;
    setC(r);
    const conEtiqueta = r.campos.map((x) => ({ ...x, etiqueta: ETIQUETA_CAMPO_SII[x.campo] }));
    setElegidos(new Set(conEtiqueta.filter(campoElegible).map((x) => x.campo)));
  };
  // La consulta (lectura) va con su propio estado de error; aplicar, con el de abajo.
  const pedir = (refrescar = false) => {
    const { ejecutar } = consulta;
    return ejecutar<Consulta>("core.cuentas.consultar_sii", {
      id: cuenta.id,
      ...(refrescar ? { refrescar } : {}),
    });
  };
  const reintentar = (refrescar = false) => {
    setC(null);
    void pedir(refrescar).then(cargar);
  };
  useEffect(() => {
    void pedir().then(cargar);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una consulta por apertura
  }, [cuenta.id]);
  const campos = CAMPOS_SII.filter((x) => elegidos.has(x));
  async function guardar() {
    const r = await ejecutar<{ cambios: unknown[] }>("core.cuentas.aplicar_sii", {
      id: cuenta.id,
      campos,
    });
    if (!r) return;
    avisar.exito(r.cambios.length ? "Datos del SII aplicados" : "No había cambios que aplicar");
    hoja.cerrar();
  }
  const ok = c?.estado === "ok" || c?.estado === "sin_inicio";
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Datos del SII"
      {...(cuenta.rut ? { descripcion: `RUT ${rut(cuenta.rut)}` } : {})}
      telefono="completo"
      acciones={
        ok ? (
          <>
            <Button variant="secondary" onClick={hoja.cerrar}>
              Mantener todo lo mío
            </Button>
            <Button disabled={pendiente || !campos.length} onClick={() => void guardar()}>
              {pendiente
                ? "Aplicando…"
                : `Aplicar ${campos.length} ${campos.length === 1 ? "cambio" : "cambios"}`}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cerrar
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {c?.consultadoEn ? (
          <ConsultadoEn fecha={c.consultadoEn} onRefrescar={() => reintentar(true)} />
        ) : null}
        <DatosSii
          estado={estadoDe(c, consulta.error, () => reintentar())}
          elegidos={elegidos}
          onElegir={(campo, si) =>
            setElegidos((s) => {
              const n = new Set(s);
              if (si) n.add(campo);
              else n.delete(campo);
              return n;
            })
          }
        />
      </div>
    </Sheet>
  );
}
