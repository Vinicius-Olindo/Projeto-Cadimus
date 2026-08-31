#!/usr/bin/env node
// Atualiza a versão exibida no rodapé e renova o cache do arquivo de versão.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const version = args.find((arg) => arg !== "--dry-run");

if (!version) {
  console.error("Uso: node scripts/bump-version.mjs <versao> [--dry-run]");
  console.error("Exemplo: node scripts/bump-version.mjs 1.1.1-staging");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Versão inválida. Use algo como 1.1.1 ou 1.1.1-staging.");
  process.exit(1);
}

const appVersionPath = path.join(repoRoot, "frontend", "js", "app-version.js");
const filesWithVersionCache = [
  "frontend/login.html",
  "frontend/redefinir-senha.html",
  "frontend/js/admin-loader.js",
  "frontend/js/cadastro-loader.js",
  "frontend/js/dashboard-loader.js",
  "frontend/js/planning-loader.js",
  "frontend/js/reports-loader.js",
];

const appVersionContent = `// ==========================================
// app-version.js - Versão exibida no app
// Atualize com: node scripts/bump-version.mjs <versao>
// ==========================================

(function () {
  window.CADIMUS_APP_VERSION = ${JSON.stringify(version)};
})();
`;

const updates = [{ file: appVersionPath, content: appVersionContent }];
let bumpedCaches = 0;

for (const relativeFile of filesWithVersionCache) {
  const filePath = path.join(repoRoot, relativeFile);
  const currentContent = readFileSync(filePath, "utf8");
  const nextContent = currentContent.replace(/app-version\.js\?v=(\d+)/g, (_match, cacheVersion) => {
    bumpedCaches += 1;
    return `app-version.js?v=${Number(cacheVersion) + 1}`;
  });

  if (nextContent !== currentContent) {
    updates.push({ file: filePath, content: nextContent });
  }
}

if (!dryRun) {
  for (const update of updates) {
    writeFileSync(update.file, update.content, "utf8");
  }
}

console.log(`${dryRun ? "Simulação concluída" : "Versão atualizada"}: ${version}`);
console.log(`Referências de cache ${dryRun ? "seriam atualizadas" : "atualizadas"}: ${bumpedCaches}`);
