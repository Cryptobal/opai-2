import { describe, expect, it } from "vitest";

import {
  actividadHilo,
  agendaHilo,
  estadoDeFallo,
  indiceHilo,
  monogramaHilo,
  pendientesHilo,
  resumenHilo,
  saludoHilo,
  subLienzo,
  tituloDeRuta,
} from "@/app/_components/hilo/datos-hilo";

describe("datos del hilo", () => {
  it("saluda según la hora de Santiago y con el nombre de pila", () => {
    expect(saludoHilo(new Date("2026-11-11T13:00:00Z"), "Camilo Ibarra")).toBe("Buen día, Camilo.");
    expect(saludoHilo(new Date("2026-11-11T19:00:00Z"), "Camilo Ibarra")).toBe(
      "Buenas tardes, Camilo.",
    );
    expect(saludoHilo(new Date("2026-11-12T01:30:00Z"), "Camilo Ibarra")).toBe(
      "Buenas noches, Camilo.",
    );
  });

  it("el resumen cuenta las decisiones como en el diseño y no afirma nada mientras carga o falla", () => {
    expect(resumenHilo("listo", 0)).toBe("No tienes decisiones pendientes.");
    expect(resumenHilo("listo", 1)).toBe("Una decisión te espera.");
    expect(resumenHilo("listo", 4)).toBe("4 decisiones te esperan.");
    expect(resumenHilo("cargando", 0)).toBe("Revisando tus pendientes.");
    expect(resumenHilo("error", 0)).toBe("No pudimos revisar tus pendientes.");
  });

  it("el monograma es la inicial de la empresa", () => {
    expect(monogramaHilo("Gard Security")).toBe("G");
    expect(monogramaHilo("  ópalo spa")).toBe("Ó");
    expect(monogramaHilo("")).toBe("O");
  });

  it("los pendientes conservan destino y acción; solo las aprobaciones vienen de agentes", () => {
    const r = pendientesHilo(
      [
        {
          tipo: "aprobaciones",
          titulo: "2 aprobaciones de agentes",
          detalle: "1 de riesgo alto",
          tono: "warning",
          href: "/configuracion/aprobaciones",
          accion: "Revisar",
        },
        {
          tipo: "documentos",
          titulo: "3 documentos vencidos",
          detalle: "Revisa el semáforo",
          tono: "danger",
          href: "/personas/vencimientos?origen=inicio",
          accion: "Pedir renovación",
        },
      ],
      0,
    );
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({
      origen: "Agentes",
      agente: true,
      href: "/configuracion/aprobaciones",
      accion: "Revisar",
    });
    expect(r[1]).toMatchObject({
      origen: "Personas",
      titulo: "3 documentos vencidos",
      contexto: "Revisa el semáforo",
    });
    expect(r[1]?.agente).toBeUndefined();
  });

  it("los avisos sin leer entran como un pendiente que lleva a la Bandeja", () => {
    expect(pendientesHilo([], 0)).toEqual([]);
    expect(pendientesHilo([], 1)[0]).toMatchObject({
      titulo: "1 aviso sin leer",
      href: "/bandeja",
      accion: "Ver avisos",
    });
    expect(pendientesHilo([], 5)[0]?.titulo).toBe("5 avisos sin leer");
  });

  it("el Índice agrupa por área en el orden del menú y deja lo general al final", () => {
    const areas = indiceHilo([
      { href: "/", etiqueta: "Inicio" },
      { href: "/negocios", etiqueta: "Negocios", grupo: "Comercial" },
      { href: "/pauta", etiqueta: "Pauta", grupo: "Operaciones" },
      { href: "/cuentas", etiqueta: "Cuentas", grupo: "Comercial" },
      { href: "/configuracion", etiqueta: "Configuración" },
    ]);
    expect(areas.map((a) => a.nombre)).toEqual(["Comercial", "Operaciones", "General"]);
    expect(areas[0]?.entradas.map((e) => e.etiqueta)).toEqual(["Negocios", "Cuentas"]);
    expect(areas[2]?.entradas.map((e) => e.href)).toEqual(["/", "/configuracion"]);
  });

  it("el lienzo nombra el área de la pantalla abierta, o adónde se vuelve", () => {
    const nav = [
      { href: "/", etiqueta: "Inicio" },
      { href: "/cuentas", etiqueta: "Cuentas", grupo: "Comercial" },
    ];
    expect(subLienzo(nav, "/cuentas", undefined)).toBe("Comercial");
    expect(subLienzo(nav, "/cuentas/abc", { href: "/cuentas", etiqueta: "Cuentas" })).toBe(
      "Cuentas",
    );
    expect(subLienzo(nav, "/", undefined)).toBe("");
  });

  it("antes de que la página fije su título, el lienzo usa el de su entrada del menú", () => {
    const nav = [
      { href: "/", etiqueta: "Inicio" },
      { href: "/finanzas", etiqueta: "Hoy en Finanzas", grupo: "Finanzas" },
      { href: "/finanzas/ventas", etiqueta: "Ventas", grupo: "Finanzas" },
    ];
    expect(tituloDeRuta(nav, "/")).toBe("Inicio");
    expect(tituloDeRuta(nav, "/finanzas/ventas")).toBe("Ventas");
    expect(tituloDeRuta(nav, "/finanzas/ventas/123")).toBe("");
    expect(tituloDeRuta(nav, "/otra")).toBe("");
  });

  it("la actividad dice quién hizo qué y marca a los agentes", () => {
    const filas = actividadHilo(
      [
        {
          id: "1",
          cuando: "2026-11-11T14:05:00Z",
          actor: { nombre: "Camilo Ibarra", agente: false },
          accion: "creó la cuenta Andina",
        },
        {
          id: "2",
          cuando: "2026-11-10T14:05:00Z",
          actor: { nombre: "Cobranza", agente: true },
          accion: "preparó 3 recordatorios",
        },
      ],
      new Date("2026-11-11T18:00:00Z"),
    );
    expect(filas[0]).toMatchObject({
      id: "1",
      cuando: "11:05",
      quien: "Camilo Ibarra",
      texto: "creó la cuenta Andina",
    });
    expect(filas[0]?.agente).toBeUndefined();
    expect(filas[1]).toMatchObject({ quien: "Cobranza", agente: true });
    expect(filas[1]?.cuando).not.toBe("11:05");
  });

  it("la agenda muestra tareas y documentos con su fecha y marca lo vencido", () => {
    const ahora = new Date("2026-11-11T15:00:00Z");
    const filas = agendaHilo(
      [
        {
          id: "t1",
          origen: "tarea",
          cuando: "2026-11-10T13:00:00Z",
          titulo: "Llamar",
          nota: null,
          vencido: true,
          href: "/tareas",
        },
        {
          id: "d1",
          origen: "documento",
          cuando: "2026-11-11",
          titulo: "OS-10",
          nota: "Ana Pérez",
          vencido: false,
          href: "/personas/p1",
        },
        {
          id: "d2",
          origen: "documento",
          cuando: "2026-11-20",
          titulo: "Contrato",
          nota: "Andina SpA",
          vencido: false,
          href: "/cuentas/c1",
        },
      ],
      ahora,
    );
    expect(filas.map((f) => f.id)).toEqual(["tarea-t1", "documento-d1", "documento-d2"]);
    expect(filas[0]).toMatchObject({ nota: "Vencido", tono: "alerta", href: "/tareas" });
    // Un día sin hora no se corre por la zona horaria.
    expect(filas[1]).toMatchObject({ cuando: "Hoy", nota: "Ana Pérez" });
    expect(filas[2]).toMatchObject({ cuando: "20-11", texto: "Contrato", href: "/cuentas/c1" });
  });

  it("un fallo real se dice; sin permiso o con el módulo apagado no es un error", () => {
    expect(estadoDeFallo("INTERNAL")).toBe("error");
    expect(estadoDeFallo("INVALID_OUTPUT")).toBe("error");
    expect(estadoDeFallo("FORBIDDEN")).toBe("sin-permiso");
    expect(estadoDeFallo("MODULE_INACTIVE")).toBe("sin-permiso");
  });
});
