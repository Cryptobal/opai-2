// Datos ficticios del Design Prompt de maestros (Brief 02). Nunca personas ni RUT reales.
export const CUENTAS = [
  {
    nombre: "Logística Andina SpA",
    rut: "76543210",
    giro: "Transporte y logística",
    estado: "cliente_activo",
  },
  {
    nombre: "Inmobiliaria Costanera Ltda.",
    rut: "77123456",
    giro: "Inmobiliaria",
    estado: "cliente_activo",
  },
  { nombre: "Minera Cerro Alto SpA", rut: "76987654", giro: "Minería", estado: "prospecto" },
  {
    nombre: "Bodegas Pudahuel S.A.",
    rut: "96555444",
    giro: "Bodegaje",
    estado: "cliente_inactivo",
  },
] as const;

export const INSTALACIONES = [
  {
    cuenta: 0,
    nombre: "Planta Quilicura",
    calle: "Av. Las Industrias 4520",
    comuna: "Quilicura",
    estado: "activa",
    geocercaM: 300,
  },
  {
    cuenta: 0,
    nombre: "CD Pudahuel",
    calle: "Camino Lo Boza 120",
    comuna: "Pudahuel",
    estado: "activa",
    geocercaM: 500,
  },
  {
    cuenta: 1,
    nombre: "Torre Costanera Oriente",
    calle: "Av. Apoquindo 3000",
    comuna: "Las Condes",
    estado: "activa",
    geocercaM: 200,
  },
  {
    cuenta: 2,
    nombre: "Faena Cerro Alto",
    calle: "Ruta D-85 km 12",
    comuna: "Illapel",
    estado: "prospecto",
    geocercaM: 1000,
  },
  {
    cuenta: 3,
    nombre: "Bodega Lo Boza",
    calle: "Lo Boza 800",
    comuna: "Pudahuel",
    estado: "inactiva",
    geocercaM: 500,
  },
] as const;

export const PERSONAS = [
  {
    nombres: "María Fernanda",
    apellidos: "Soto",
    cuerpo: "16234567",
    cargo: "Guardia",
    inicio: "2025-03-03",
    tipo: "indefinido",
  },
  {
    nombres: "José Antonio",
    apellidos: "Pérez",
    cuerpo: "12345678",
    cargo: "Supervisor",
    inicio: "2022-01-10",
    tipo: "indefinido",
  },
  {
    nombres: "Camila Andrea",
    apellidos: "Rojas",
    cuerpo: "19876543",
    cargo: "Guardia",
    inicio: "2026-09-01",
    tipo: "plazo_fijo",
  },
  {
    nombres: "Luis Alberto",
    apellidos: "Muñoz",
    cuerpo: "14222333",
    cargo: "Operador CCTV",
    inicio: "2023-05-02",
    tipo: "indefinido",
    termino: "2026-08-31",
  },
  {
    nombres: "Pedro Pablo",
    apellidos: "Lagos",
    cuerpo: "15555666",
    cargo: "Guardia",
    inicio: "2024-02-01",
    tipo: "indefinido",
    bloqueada: true,
  },
] as const;
