// electron-builder drops node_modules/**/*.d.ts and its `files` patterns can't
// bring them back, but the site's type check needs them at runtime.
const fs = require("fs");
const path = require("path");

function appDir(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  if (electronPlatformName === "darwin") {
    return path.join(
      appOutDir,
      `${packager.appInfo.productFilename}.app`,
      "Contents",
      "Resources",
      "app",
    );
  }
  return path.join(appOutDir, "resources", "app");
}

function copyDeclarations(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDeclarations(source, target);
    } else if (
      entry.name.endsWith(".d.ts") ||
      entry.name.endsWith(".d.mts") ||
      entry.name.endsWith(".d.cts")
    ) {
      fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
}

exports.default = async function afterPack(context) {
  copyDeclarations(
    path.join(context.packager.projectDir, "node_modules"),
    path.join(appDir(context), "node_modules"),
  );
};
