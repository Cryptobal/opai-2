import type { z } from "zod";

import type { cabeceraSchema } from "./esquema";
import type { Col, Fila } from "./filas-comun";

export type CabeceraReporteDt = z.infer<typeof cabeceraSchema>;
export type ColumnaReporteDt = Col;
export type FilaReporteDt = Fila;