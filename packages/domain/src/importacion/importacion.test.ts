import { describe, expect, it } from "vitest";

import { ErrorPlanilla, escribirCsv, escribirExcel, fechaCivil, leerCsv, leerExcel, normalizarFilas, numero, plantillaCsv, resolverMapeo, sugerirMapeo, tablaDeRegistros, type DefinicionImportador } from "./index";

const def: DefinicionImportador = {
  id: "prueba",
  etiqueta: "Prueba",
  descripcion: "Importador de prueba.",
  campos: [
    { clave: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true, sinonimos: ["name", "Nombre de fantasía"], ejemplo: "Acme" },
    { clave: "rut", etiqueta: "RUT", tipo: "rut", sinonimos: ["R.U.T."], ejemplo: "76.543.210-3" },
    { clave: "email", etiqueta: "Correo", tipo: "email", sinonimos: ["e-mail", "mail"] },
    { clave: "monto", etiqueta: "Monto", tipo: "entero" },
    { clave: "desde", etiqueta: "Cliente desde", tipo: "fecha" },
    { clave: "principal", etiqueta: "Principal", tipo: "booleano" },
    { clave: "estado", etiqueta: "Estado", tipo: "opcion", opciones: { cliente_activo: ["activo", "cliente"], prospecto: ["prospect"] } },
  ],
};

describe("lectura de planillas", () => {
  it("detecta el separador y respeta comillas, BOM y saltos dentro de una celda", () => {
    const t = leerCsv('\ufeffNombre;Notas\r\n"Acme; SpA";"línea 1\nlínea 2"\r\n\r\nBeta;"dijo ""hola"""\r\n');
    expect(t.columnas).toEqual(["Nombre", "Notas"]);
    expect(t.filas).toEqual([["Acme; SpA", "línea 1\nlínea 2"], ["Beta", 'dijo "hola"']]);
    expect(leerCsv("a,b\n1,2").filas).toEqual([["1", "2"]]);
  });

  it("rechaza planillas vacías, sin filas, con encabezados repetidos o demasiado largas", () => {
    expect(() => leerCsv("")).toThrow(ErrorPlanilla);
    expect(() => leerCsv("a;b\n")).toThrow(/solo tiene el encabezado/);
    expect(() => leerCsv("a;A\n1;2")).toThrow(/mismo encabezado/);
    expect(() => leerCsv(`a\n${"x\n".repeat(20_001)}`)).toThrow(/el máximo es/);
  });

  it("un Excel escrito se lee igual, con fechas como aaaa-mm-dd", async () => {
    const bytes = await escribirExcel("Cuentas", ["nombre", "rut"], [["Acme", "76.543.210-3"]]);
    expect(await leerExcel(bytes)).toEqual({ columnas: ["nombre", "rut"], filas: [["Acme", "76.543.210-3"]] });
    await expect(leerExcel(new Uint8Array([1, 2, 3]))).rejects.toThrow(/Excel/);
  });

  it("la plantilla trae las claves como encabezado y se puede volver a leer", () => {
    const t = leerCsv(plantillaCsv(def));
    expect(t.columnas).toEqual(def.campos.map((c) => c.clave));
    expect(t.filas[0]?.[0]).toBe("Acme");
    expect(escribirCsv(["a"], [["x;y"]])).toContain('"x;y"');
  });

  it("arma una planilla desde registros estructurados", () => {
    expect(tablaDeRegistros([{ nombre: "Acme", monto: 10 }, { nombre: "Beta", rut: null }])).toEqual({
      columnas: ["nombre", "monto", "rut"],
      filas: [["Acme", "10", ""], ["Beta", "", ""]],
    });
  });
});

describe("mapeo de columnas", () => {
  it("sugiere por clave, etiqueta o sinónimo, sin tildes ni signos", () => {
    expect(sugerirMapeo(["Nombre de Fantasia", "R.U.T.", "E-mail", "Otra"], def)).toEqual({
      "Nombre de Fantasia": "nombre", "R.U.T.": "rut", "E-mail": "email", Otra: null,
    });
  });

  it("el mapeo manual manda y se valida", () => {
    const r = resolverMapeo(["Empresa", "name", "x"], def, { Empresa: "nombre", x: "no_existe" });
    expect(r.mapeo).toEqual({ Empresa: "nombre", name: null, x: null });
    expect(r.problemas).toEqual(["El campo «no_existe» no existe en este importador."]);
    expect(resolverMapeo(["rut"], def).requeridosSinColumna).toEqual(["Nombre"]);
    expect(resolverMapeo(["a", "b"], def, { a: "rut", b: "rut" }).problemas[0]).toMatch(/Dos columnas/);
  });
});

describe("validación por fila", () => {
  it("convierte tipos y reporta cada error con su fila", () => {
    const tabla = leerCsv(
      "nombre;rut;email;monto;desde;principal;estado\n" +
        "Acme;76.543.210-3;VENTAS@ACME.CL;$ 1.200.000;15/03/2026;Sí;Activo\n" +
        ";11.111.111-2;no-es-correo;12,5;31-02-2026;quizás;otro\n",
    );
    const [ok, mala] = normalizarFilas(tabla, def, resolverMapeo(tabla.columnas, def).mapeo);
    expect(ok).toEqual({
      fila: 2,
      errores: [],
      datos: { nombre: "Acme", rut: "76543210-3", email: "ventas@acme.cl", monto: 1200000, desde: "2026-03-15", principal: true, estado: "cliente_activo" },
    });
    expect(mala?.fila).toBe(3);
    expect(mala?.errores.map((e) => e.campo)).toEqual(["nombre", "rut", "email", "monto", "desde", "principal", "estado"]);
  });

  it("fechas y números en formatos chilenos", () => {
    expect(fechaCivil("2026-11-11T10:00:00Z")).toBe("2026-11-11");
    expect(fechaCivil("1.2.26")).toBe("2026-02-01");
    expect(fechaCivil("2026-13-01")).toBeNull();
    expect(numero("1.200.000,50")).toBe(1200000.5);
    expect(numero("1200")).toBe(1200);
    expect(numero("abc")).toBeNull();
  });
});
