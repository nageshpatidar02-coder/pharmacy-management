const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
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
    if (description === "Next runtime") {
      throw new Error(`Next runtime missing from standalone build: ${filePath}`);
    }
    throw new Error(`${description} missing from standalone build: ${filePath}`);
  }
}

console.log("Verified Next standalone runtime and generated Prisma client/engine.");