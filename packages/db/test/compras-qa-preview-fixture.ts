// Metadata íntegramente inventada para tests del guard; no identifica recursos existentes.
export function metadataPreviewQa() {
  return {
    env: {
      GITHUB_REPOSITORY: "opai-cl/opai-2",
      GITHUB_EVENT_NAME: "pull_request",
      NEON_PROJECT_ID: "proyecto-ficticio",
      PREVIEW_BRANCH_ID: "br-ficticia",
      NEON_API_KEY: "no-es-una-credencial",
      DB_URL: "postgresql://ficticio:ficticio@ep-ficticio.region.neon.tech/neondb?sslmode=require",
    },
    evento: {
      number: 831,
      action: "synchronize",
      repository: { full_name: "opai-cl/opai-2" },
      pull_request: {
        number: 831,
        draft: false,
        state: "open",
        head: { repo: { full_name: "opai-cl/opai-2", fork: false } },
        base: { repo: { full_name: "opai-cl/opai-2" } },
      },
    },
    branch: {
      branch: {
        id: "br-ficticia",
        project_id: "proyecto-ficticio",
        name: "preview/pr-831",
        default: false,
        primary: false,
        protected: false,
        current_state: "ready",
      },
    },
    endpoints: {
      endpoints: [
        {
          id: "ep-ficticio",
          project_id: "proyecto-ficticio",
          branch_id: "br-ficticia",
          host: "ep-ficticio.region.neon.tech",
          type: "read_write",
          disabled: false,
          current_state: "active",
        },
      ],
    },
  };
}
