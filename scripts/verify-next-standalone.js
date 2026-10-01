const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

// Auto-copy missing files from root node_modules to standalone node_modules
function ensureStandaloneFile(relPath) {
  const src = path.join(root, relPath);
  const dest = path.join(standalone, relPath);

  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Auto-copied to standalone: ${relPath}`);
  }
}

// Automatically ensure Prisma engine and client exist in standalone before verification
ensureStandaloneFile("node_modules/.prisma/client/query_engine-windows.dll.node");
ensureStandaloneFile("node_modules/.prisma/client/index.js");
ensureStandaloneFile("node_modules/@prisma/client/package.json");

const requiredFiles = [
  ["Next runtime", path.join(standalone, "node_modules", "next", "package.json")],
  ["Prisma client package", path.join(standalone, "node_modules", "@prisma", "client", "package.json")],
  ["Generated Prisma client", path.join(standalone, "node_modules", ".prisma", "client", "index.js")],
  ["Windows Prisma engine", path.join(standalone, "node_modules", ".prisma", "client", "query_engine-windows.dll.node")],
  ["Next standalone server", path.join(standalone, "server.js")],
  ["Next build ID", path.join(standalone, ".next", "BUILD_ID")],
];

for (const [description, filePath] of requiredFiles) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} missing from standalone build: ${filePath}`);
  }
}

console.log("Verified Next standalone runtime and generated Prisma client/engine.");