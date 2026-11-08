import { z } from "zod";

import { FINALIDADES_CAMPO } from "@opai/domain";

export const finalidadSchema = z.enum(FINALIDADES_CAMPO);
