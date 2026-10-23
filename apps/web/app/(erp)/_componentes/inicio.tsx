import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { listarModulos } from "@opai/capabilities";
import { Badge, Card, CardContent, CardHeader, CardTitle, DashboardScreen } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

type Modulo = { id: string; nombre: string; estado: string | null };

/** Inicio del ERP: tarjetas de los módulos activos (sin KPIs de negocio todavía). */
export async function InicioErp() {
  const r = await ejecutarComoUsuario<Modulo[]>("erp", "core.modules.list");
  const activos = r.ok ? r.data.filter((m) => m.estado === "activo" || m.estado === "trial") : [];
  const manifests = new Map(listarModulos().map((m) => [m.id, m]));
  const state = r.ok && activos.length === 0 ? "empty" : estadoPantalla(r);
  return (
    <DashboardScreen
      state={state}
      titulo="Inicio"
      subtitulo="Módulos activos de tu empresa"
      kpis={[]}
      textos={{
        vacio: {
          titulo: "Aún no hay módulos activos",
          descripcion:
            "Cuando OPAI active módulos para tu empresa (Comercial, CPQ…) aparecerán aquí.",
        },
      }}
    >
      {activos.map((m) => {
        const entrada = manifests.get(m.id)?.navegacion.find((n) => n.portal === "erp");
        return (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle>{m.nombre}</CardTitle>
              {m.estado === "trial" ? (
                <Badge tono="info">Prueba</Badge>
              ) : (
                <Badge tono="success">Activo</Badge>
              )}
            </CardHeader>
            <CardContent>
              {entrada ? (
                <Link
                  href={entrada.href}
                  className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent"
                >
                  Abrir {m.nombre} <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </DashboardScreen>
  );
}
