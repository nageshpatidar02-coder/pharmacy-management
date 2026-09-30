const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const mode = process.argv[2] ?? "package";
if (mode !== "staged" && mode !== "package") {
  throw new Error("Usage: node scripts/verify-desktop.js [staged|package]");
}

const runtime = mode === "staged"
  ? path.join(root, "desktop-app")
  : path.join(output, "win-unpacked", "resources", "app");
const requiredRuntimePaths = [
  "server.js",
  ".next/BUILD_ID",
  ".next/static",
  "node_modules/next/package.json",
  "node_modules/@prisma/client/package.json",
  "node_modules/@prisma/client/default.js",
  "node_modules/.prisma/client/index.js",
  "node_modules/.prisma/client/query_engine-windows.dll.node",
  "public",
  "prisma/schema.prisma",
];
const requiredPackagePaths = [
  "PharmaDesk Setup.exe",
  "latest.yml",
  "PharmaDesk Setup.exe.blockmap",
  "win-unpacked/PharmaDesk.exe",
];

function requirePath(basePath, relativePath) {
  const target = path.join(basePath, relativePath);
  if (!fs.existsSync(target)) {
    throw new Error(`Packaged runtime verification failed; missing ${target}`);
  }
}

function findEnvironmentFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...findEnvironmentFiles(entryPath));
    } else if (entry.name === ".env" || entry.name.startsWith(".env.")) {
      found.push(entryPath);
    }
  }
  return found;
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(body) });
        } catch {
          reject(new Error(`Health endpoint returned invalid JSON with status ${response.statusCode}.`));
        }
      });
    });
    request.setTimeout(20000, () => request.destroy(new Error("Health endpoint timed out.")));
    request.once("error", reject);
  });
}

function checkLoginModule(url) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      url,
      { method: "POST", headers: { "content-type": "application/json" } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(body) });
          } catch {
            reject(new Error(`Login route returned invalid JSON with status ${response.statusCode}.`));
          }
        });
      },
    );
    request.setTimeout(20000, () => request.destroy(new Error("Login route timed out.")));
    request.once("error", reject);
    request.end("{}");
  });
}

async function smokeTestStandalone() {
  const port = await reservePort();
  const serverPath = path.join(runtime, "server.js");
  const child = spawn(process.execPath, [serverPath], {
    cwd: runtime,
    env: {
      ...process.env,
      DATABASE_URL: "mongodb://127.0.0.1:1/pharmadesk_build_check?serverSelectionTimeoutMS=1000",
      HOSTNAME: "127.0.0.1",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let serverOutput = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      serverOutput = (serverOutput + chunk).slice(-12000);
    });
  }

  const deadline = Date.now() + 45000;
  try {
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Packaged standalone server exited with code ${child.exitCode}.\n${serverOutput}`);
      }

      try {
        const result = await checkHealth(`http://127.0.0.1:${port}/api/health`);
        if (result.status === 503 && result.body?.ok === false && result.body.database === "unavailable") {
          const login = await checkLoginModule(`http://127.0.0.1:${port}/api/auth/login`);
          if (login.status !== 400 || login.body?.ok !== false) {
            throw new Error(`Unexpected standalone login response (${login.status}): ${JSON.stringify(login.body)}\n${serverOutput}`);
          }
          return;
        }
        throw new Error(`Unexpected standalone health response (${result.status}): ${JSON.stringify(result.body)}\n${serverOutput}`);
      } catch (error) {
        if (error.message.startsWith("Unexpected standalone health response")) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    throw new Error(`Packaged standalone server did not answer its health check.\n${serverOutput}`);
  } finally {
    child.kill();
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }
}

for (const relativePath of requiredRuntimePaths) requirePath(runtime, relativePath);

if (mode === "package") {
  for (const relativePath of requiredPackagePaths) requirePath(output, relativePath);
}

const environmentFiles = findEnvironmentFiles(runtime);
if (environmentFiles.length) {
  throw new Error(`Packaged runtime contains environment files: ${environmentFiles.join(", ")}`);
}

smokeTestStandalone()
  .then(() => console.log(`Verified ${mode} Next standalone server, Prisma client/engine, assets, health, and login route.`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });