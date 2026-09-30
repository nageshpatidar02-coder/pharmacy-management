const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "dist");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getProjectProcessIds() {
  const outputPath = outputDirectory.replace(/'/g, "''");
  const command = [
    `$dist = '${outputPath}'`,
    "$prefix = [System.IO.Path]::GetFullPath($dist).TrimEnd([char]92) + [char]92",
    "$allowed = @('PharmaDesk.exe', 'PharmaDesc.exe', 'electron.exe', 'node.exe')",
    "$pids = Get-CimInstance Win32_Process | Where-Object { $allowed -contains $_.Name -and ((($_.ExecutablePath) -and $_.ExecutablePath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) -or (($_.CommandLine) -and $_.CommandLine.IndexOf($prefix, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)) } | Select-Object -ExpandProperty ProcessId",
    "$pids | ConvertTo-Json -Compress",
  ].join("; ");

  const result = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();

  if (!result || result === "null") return [];
  const parsed = JSON.parse(result);
  return (Array.isArray(parsed) ? parsed : [parsed]).map(Number).filter(Number.isInteger);
}

async function stopProjectProcesses() {
  if (process.platform !== "win32") return;

  let processIds;
  try {
    processIds = getProjectProcessIds();
  } catch (error) {
    throw new Error(`Could not safely inspect PharmaDesk build processes: ${error.message}`);
  }

  for (const processId of processIds) {
    try {
      execFileSync("taskkill.exe", ["/PID", String(processId), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // The process may have exited between enumeration and termination.
    }
  }

  if (processIds.length) await delay(500);
}

async function removeOutput() {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(outputDirectory, { recursive: true, force: true, maxRetries: 2, retryDelay: 250 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await delay(700);
    }
  }

  throw new Error(
    `Could not remove ${outputDirectory} after 5 attempts (${lastError?.code ?? "unknown error"}). ` +
      "Close PharmaDesk instances launched from this repository's dist folder and retry.",
  );
}

async function main() {
  await stopProjectProcesses();
  await removeOutput();
  console.log("Removed previous Windows build output.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});