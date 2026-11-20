import { describe, expect, it } from "vitest";

import {
  validarContextoPreview,
  validarDestinoPreview,
} from "../scripts/compras-qa-preview-validar";
import { metadataPreviewQa } from "./compras-qa-preview-fixture";

describe("guard autoritativo preview compras", () => {
  it("acepta solo metadata y URL coherentes", () => {
    const m = metadataPreviewQa();
    expect(validarContextoPreview(m.env, m.evento).ramaId).toBe(m.env.PREVIEW_BRANCH_ID);
    expect(validarDestinoPreview(m.env, m.branch, m.endpoints)).toBe(m.env.DB_URL);
  });
  it.each(["id", "project_id", "name", "current_state"] as const)(
    "rechaza rama discordante: %s",
    (key) => {
      const m = metadataPreviewQa();
      m.branch.branch[key] = "discordante";
      expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
    },
  );
  it.each(["default", "primary", "protected"] as const)("rechaza rama restringida: %s", (key) => {
    const m = metadataPreviewQa();
    m.branch.branch[key] = true;
    expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
  });
  it.each(["id", "project_id", "branch_id", "host", "type", "current_state"] as const)(
    "rechaza endpoint discordante: %s",
    (key) => {
      const m = metadataPreviewQa();
      m.endpoints.endpoints[0]![key] = "discordante";
      expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
    },
  );
  it("rechaza endpoint deshabilitado, ausente, duplicado o metadata ausente", () => {
    const m = metadataPreviewQa();
    m.endpoints.endpoints[0]!.disabled = true;
    expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
    m.endpoints.endpoints[0]!.disabled = false;
    m.endpoints.endpoints.push(m.endpoints.endpoints[0]!);
    expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
    expect(() => validarDestinoPreview(m.env, m.branch, { endpoints: [] })).toThrow();
    expect(() => validarDestinoPreview(m.env, {}, {})).toThrow();
  });
  it.each([
    "postgresql://f:f@other.invalid/neondb?sslmode=require",
    "postgresql://f:f@ep-ficticio-pooler.region.neon.tech/neondb?sslmode=require",
    "http://f:f@ep-ficticio.region.neon.tech/neondb?sslmode=require",
    "postgresql://f:f@ep-ficticio.region.neon.tech:9999/neondb?sslmode=require",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb?sslmode=require&host=other.invalid",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb?sslmode=require&options=endpoint%3Dother",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb?sslmode=require&sslmode=disable",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb?sslmode=disable",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb#fragment",
    "postgresql://f:f@ep-ficticio.region.neon.tech/neondb",
  ])("rechaza URL alternativa o ambigua", (url) => {
    const m = metadataPreviewQa();
    m.env.DB_URL = url;
    expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
  });
  it.each([
    "GITHUB_REPOSITORY",
    "GITHUB_EVENT_NAME",
    "NEON_PROJECT_ID",
    "PREVIEW_BRANCH_ID",
    "NEON_API_KEY",
    "DB_URL",
  ] as const)("rechaza contexto ausente: %s", (key) => {
    const m = metadataPreviewQa();
    m.env[key] = "";
    expect(() => validarContextoPreview(m.env, m.evento)).toThrow();
  });
  it("rechaza otro PR, fork, cerrado o repositorio ajeno", () => {
    const m = metadataPreviewQa();
    m.evento.number = 832;
    expect(() => validarContextoPreview(m.env, m.evento)).toThrow();
    m.evento.number = 831;
    m.evento.pull_request.head.repo.fork = true;
    expect(() => validarContextoPreview(m.env, m.evento)).toThrow();
    m.evento.pull_request.head.repo.fork = false;
    m.evento.action = "closed";
    expect(() => validarContextoPreview(m.env, m.evento)).toThrow();
    m.evento.action = "synchronize";
    m.evento.pull_request.head.repo.full_name = "ajeno/repo";
    expect(() => validarContextoPreview(m.env, m.evento)).toThrow();
  });
});
