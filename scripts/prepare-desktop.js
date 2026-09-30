const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const stage = path.join(root, "desktop-app");

function requirePath(target, description) {
  if (!fs.existsSync(target)) {
    throw new Error(`${description} is missing: ${target}`);
  }
}

function copyDirectory(source, destination, description) {
  requirePath(source, description);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, dereference: true });
}

function removeEnvironmentFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removeEnvironmentFiles(entryPath);
    } else if (entry.name === ".env" || entry.name.startsWith(".env.")) {
      fs.rmSync(entryPath, { force: true });
    }
  }
}

requirePath(path.join(standalone, "server.js"), "Next standalone server");
requirePath(path.join(standalone, "node_modules"), "Next standalone dependencies");
requirePath(path.join(root, ".next", "static"), "Next static assets");
requirePath(path.join(root, "public"), "Public assets");
requirePath(path.join(root, "prisma", "schema.prisma"), "Prisma schema");

fs.rmSync(stage, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
fs.cpSync(standalone, stage, { recursive: true, dereference: true });
copyDirectory(path.join(root, ".next", "static"), path.join(stage, ".next", "static"), "Next static assets");
copyDirectory(path.join(root, "public"), path.join(stage, "public"), "Public assets");

copyDirectory(
  path.join(root, "prisma", "schema.prisma"),
  path.join(stage, "prisma", "schema.prisma"),
  "Prisma schema",
);
removeEnvironmentFiles(stage);

const requiredRuntimeFiles = [
  "server.js",
  ".next/BUILD_ID",
  "node_modules/next/package.json",
  "node_modules/@prisma/client/package.json",
  "node_modules/@prisma/client/default.js",
  "node_modules/.prisma/client/index.js",
  "node_modules/.prisma/client/query_engine-windows.dll.node",
  "public/icon.ico",
  "prisma/schema.prisma",
];

for (const relativePath of requiredRuntimeFiles) {
  requirePath(path.join(stage, relativePath), `Staged runtime file ${relativePath}`);
}

console.log(`Prepared verified production runtime at ${stage}`);