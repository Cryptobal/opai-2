import type { ReactNode } from "react";

import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, Badge, Enlace, ParesGrid, SeccionTarjeta, type ParGrid } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import * as E from "./estado-ficha";
import { laboralDe, pagoDe, previsionDe } from "./lecturas-ficha";

type Tarjeta = {
  titulo: string;
  estado: E.EstadoTarjeta;
  filas: ParGrid[];
  ir: string;
  ancla: string;
};

function TarjetaEstado({ t, personaId }: { t: Tarjeta; personaId: string }) {
  return (
    <SeccionTarjeta
      titulo={t.titulo}
      accion={<Badge tono={t.estado.tono}>{t.estado.etiqueta}</Badge>}
    >
      <ParesGrid unaColumna items={t.filas} />
      <div className="mt-3">
        <Enlace Link={LinkNext} href={`/personas/${personaId}/laboral#${t.ancla}`}>
          {t.ir}
        </Enlace>
      </div>
    </SeccionTarjeta>
  );
}

const Fallo = ({ titulo }: { titulo: string }) => (
  <SeccionTarjeta titulo={titulo}>
    <Alerta tono="danger" titulo="No pudimos cargar esta tarjeta">
      Recarga la página.
    </Alerta>
  </SeccionTarjeta>
);

/**
 * Tarjetas de estado del Resumen (CAR-124, export ficha-persona v1 «Resumen»): Previsión, Pago, Uniforme, Jornada DT
 * y OS-10, cada una con su insignia y el enlace a su sección de Laboral. Cada tarjeta respeta el permiso de lectura
 * de su sección (sin permiso no aparece: el gerente no ve previsión ni banco) y falla por su cuenta.
 */
export async function TarjetasResumen({ personaId, hoy }: { personaId: string; hoy: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  const puede = puedeDeIdentidad(identidad);
  const [prev, pago, lab] = await Promise.all([
    puede(PERMISOS_CORE.personasPrevisionRead) ? previsionDe(personaId) : null,
    puede(PERMISOS_CORE.personasPagoRead) ? pagoDe(personaId) : null,
    puede(PERMISOS_CORE.personasLaboralRead) ? laboralDe(personaId) : null,
  ]);
  const tarjetas: ReactNode[] = [];
  const agregar = (t: Tarjeta) =>
    tarjetas.push(<TarjetaEstado key={t.ancla} t={t} personaId={personaId} />);
  const fallo = (titulo: string) => tarjetas.push(<Fallo key={titulo} titulo={titulo} />);

  if (prev && !prev.ok) fallo("Previsión");
  else if (prev) {
    const p = prev.data;
    agregar({
      titulo: "Previsión",
      estado: E.estadoPrevision(p),
      ancla: "prevision",
      ir: "Ir a Previsión",
      filas: [
        { etiqueta: "AFP", valor: p.afp },
        {
          etiqueta: "Salud",
          valor: [p.sistemaSalud, p.isapreNombre].filter(Boolean).join(" · ") || null,
        },
      ],
    });
  }
  if (pago && !pago.ok) fallo("Pago");
  else if (pago) {
    const v = pago.data.vigente;
    agregar({
      titulo: "Pago",
      estado: E.estadoPago(v, Boolean(pago.data.solicitudPendiente)),
      ancla: "pago",
      ir: "Ir a Pago",
      filas: [
        { etiqueta: "Cuenta", valor: E.cuentaCorta(v) },
        { etiqueta: "RUT titular", valor: v.rutTitular, mono: true },
      ],
    });
  }
  if (lab && !lab.ok) fallo("Laboral");
  else if (lab) {
    const { uniforme: u, jornadaDt: j, os10: o } = lab.data;
    const ultima = u?.entregas.at(0);
    agregar({
      titulo: "Uniforme",
      estado: E.estadoUniforme(u),
      ancla: "uniforme",
      ir: "Ir a Uniforme y tallas",
      filas: [
        {
          etiqueta: "Calzado · Pantalón",
          valor: `${u?.tallaZapato ?? "—"} · ${u?.tallaPantalon ?? "—"}`,
        },
        {
          etiqueta: "Camisa · Chaqueta",
          valor: `${u?.tallaCamisa ?? "—"} · ${u?.tallaChaqueta ?? "—"}`,
        },
        {
          etiqueta: "Última entrega",
          valor: ultima ? `${fecha(ultima.entregadaEn)} · ${ultima.articulo}` : null,
        },
      ],
    });
    agregar({
      titulo: "Jornada DT",
      estado: E.estadoJornada(hoy, j),
      ancla: "jornada-dt",
      ir: "Ir a Jornada DT",
      filas: [
        {
          etiqueta: "Jornada",
          valor: j?.horasSemanales ? `${j.horasSemanales} h semanales` : null,
        },
        { etiqueta: "Distribución", valor: j?.distribucion },
        {
          etiqueta: "Término plazo fijo",
          valor: j?.terminoPlazoFijo ? fecha(j.terminoPlazoFijo) : null,
        },
      ],
    });
    const os10 = E.estadoOs10(hoy, o);
    agregar({
      titulo: "OS-10",
      estado: os10,
      ancla: "os10",
      ir:
        os10.tono === "success"
          ? "Ir a OS-10"
          : o?.venceEn
            ? "Registrar renovación"
            : "Registrar OS-10",
      filas: [
        { etiqueta: "Credencial", valor: o?.credencial, mono: true },
        { etiqueta: "Vencimiento", valor: o?.venceEn ? fecha(o.venceEn) : null },
      ],
    });
  }
  if (!tarjetas.length) return null;
  return <div className="grid gap-4 md:grid-cols-2">{tarjetas}</div>;
}
