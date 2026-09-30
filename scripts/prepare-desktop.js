const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");
const prismaClient = path.join(root, "node_modules", ".prisma", "client");
const standaloneModules = path.join(standalone, "node_modules");
const standalonePrismaClient = path.join(standaloneModules, ".prisma", "client");

function copyDirectory(source, destination) {
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true });
  }
}

if (!fs.existsSync(server)) {
  throw new Error("Next standalone server is missing. Run the Next.js standalone build first.");
}
if (!fs.existsSync(prismaClient)) {
  throw new Error("Generated Prisma client is missing. Run prisma generate before packaging.");
}
if (!fs.existsSync(standaloneModules)) {
  throw new Error("Standalone node_modules is missing from the Next.js build output.");
}

copyDirectory(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copyDirectory(path.join(root, "public"), path.join(standalone, "public"));
fs.mkdirSync(path.dirname(standalonePrismaClient), { recursive: true });
fs.rmSync(standalonePrismaClient, { recursive: true, force: true });
fs.cpSync(prismaClient, standalonePrismaClient, { recursive: true, dereference: true });
copyDirectory(path.join(root, "prisma", "schema.prisma"), path.join(standalone, "prisma", "schema.prisma"));

for (const envFile of [".env", ".env.local", ".env.production", ".env.development", ".env.test"]) {
  fs.rmSync(path.join(standalone, envFile), { force: true });
}

console.log("Prepared standalone Next.js runtime with Prisma client and no bundled environment files.");