const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "public", "icon.svg");
const targetPath = path.join(root, "public", "icon.ico");

async function main() {
  const pngToIco = (await import("png-to-ico")).default;
  const svg = fs.readFileSync(sourcePath);
  const png = await sharp(svg).resize(256, 256).png().toBuffer();
  const icon = await pngToIco([png]);

  fs.writeFileSync(targetPath, icon);
  console.log(`Generated ${path.relative(root, targetPath)}`);
}

main().catch((error) => {
  console.error("Unable to generate the Pharma Desk icon:", error);
  process.exitCode = 1;
});