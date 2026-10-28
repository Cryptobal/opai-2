"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Campo, InputFecha, Select } from "@opai/ds";

export function SelectorContexto({ fecha, instalaciones, puestos }: {
  fecha: string; instalaciones: { id: string; nombre: string }[];
  puestos: { id: string; nombre: string; instalacionId: string }[];
}) {
  const q = useSearchParams();
  const ruta = usePathname();
  const router = useRouter();
  const cambiar = (clave: string, valor: string) => {
    const p = new URLSearchParams(q);
    if (valor) p.set(clave, valor); else p.delete(clave);
    if (clave === "instalacion") p.delete("puesto");
    if (clave === "puesto") {
      const puesto = puestos.find((x) => x.id === valor);
      if (puesto) p.set("instalacion", puesto.instalacionId);
    }
    router.replace(`${ruta}?${p}`);
  };
  return <div className="grid gap-3 md:grid-cols-3">
    <Campo etiqueta="Resolver al" htmlFor="s-fecha"><InputFecha id="s-fecha" valor={fecha} onCambiar={(v) => cambiar("fecha", v)} /></Campo>
    <Campo etiqueta="Instalación explícita" htmlFor="s-instalacion"><Select id="s-instalacion" valor={q.get("instalacion") ?? "sin"} onCambiar={(v) => cambiar("instalacion", v === "sin" ? "" : v)} opciones={[{ valor: "sin", etiqueta: "Sin instalación" }, ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))]} /></Campo>
    <Campo etiqueta="Puesto explícito" htmlFor="s-puesto"><Select id="s-puesto" valor={q.get("puesto") ?? "sin"} onCambiar={(v) => cambiar("puesto", v === "sin" ? "" : v)} opciones={[{ valor: "sin", etiqueta: "Sin puesto" }, ...puestos.filter((p) => !q.get("instalacion") || p.instalacionId === q.get("instalacion")).map((p) => ({ valor: p.id, etiqueta: p.nombre }))]} /></Campo>
  </div>;
}
