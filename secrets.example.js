// ============================================================
// Retina — Secrets Template
// ============================================================
// Secrets are resolved from (in priority order):
//   1. process.env (manual env vars, Docker --env)
//   2. Vault service (via next.config.mjs → VAULT_URL + VAULT_TOKEN)
//   3. Fallback .env file (../vault/.env)
//
// See vault/.env.example for the full list of variables.
// ============================================================

// RETINA_PORT=3333
// PRISM_URL=http://localhost:7777
// PRISM_WS_URL=ws://localhost:7777
// TOOLS_API_URL=http://localhost:5590
// MINIO_PUBLIC_URL=
