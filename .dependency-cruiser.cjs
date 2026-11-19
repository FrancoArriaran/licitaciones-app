/** Enforces the layer rule from docs/ENGINEERING_STANDARDS.md §3.1. */
module.exports = {
  forbidden: [
    {
      name: "core-is-pure",
      comment: "packages/core must not depend on infrastructure, apps, frameworks or SDKs.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: {
        path: [
          "^packages/(infra|ui)/",
          "^apps/",
          "node_modules/(next|react|react-dom|@supabase|resend|openai|fflate|@trigger\\.dev)/",
        ],
      },
    },
    {
      name: "infra-not-apps",
      severity: "error",
      from: { path: "^packages/infra/" },
      to: { path: ["^apps/", "^packages/ui/"] },
    },
    {
      name: "ui-is-presentational",
      comment: "packages/ui holds generic components only: no data access or domain logic.",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: ["^packages/(core|infra)/", "^apps/", "node_modules/@supabase/"] },
    },
    {
      name: "module-public-api-only",
      comment: "Core modules import each other only through their index.ts.",
      severity: "error",
      from: { path: "^packages/core/src/([^/]+)/" },
      to: {
        path: "^packages/core/src/([^/]+)/.+",
        pathNot: ["^packages/core/src/$1/", "^packages/core/src/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["\\.next/", "node_modules/\\.pnpm/"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
