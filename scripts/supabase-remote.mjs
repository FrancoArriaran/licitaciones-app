// Runs a Supabase CLI command against SUPABASE_DB_URL from apps/web/.env.local.
// The connection string never appears in the terminal: it is passed straight to the
// CLI binary (no shell) and any credentials in the output are masked.
//
//   node scripts/supabase-remote.mjs migration list
//   node scripts/supabase-remote.mjs gen types typescript --schema public --out <file>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

process.loadEnvFile("apps/web/.env.local");
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "Falta SUPABASE_DB_URL en apps/web/.env.local (cadena del Session pooler, puerto 5432).",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
if (outIndex >= 0) args.splice(outIndex, 2);

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve("supabase/package.json");
const cliEntry = join(dirname(packageJsonPath), require(packageJsonPath).bin.supabase);

const mask = (text) =>
  text
    .split(dbUrl)
    .join("***")
    .replace(/:\/\/[^@\s"]+@/g, "://***@");

const child = spawn(process.execPath, [cliEntry, ...args, `--remote=${dbUrl}`], {
  stdio: ["inherit", "pipe", "pipe"],
});

let captured = "";
child.stdout.on("data", (chunk) => {
  if (outFile) captured += chunk.toString();
  else process.stdout.write(mask(chunk.toString()));
});
child.stderr.on("data", (chunk) => process.stderr.write(mask(chunk.toString())));
child.on("close", (code) => {
  if (outFile && code === 0) {
    writeFileSync(outFile, captured);
    console.log(`Escrito ${outFile}`);
  }
  process.exit(code ?? 1);
});
