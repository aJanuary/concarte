// electron-builder rebuilds node_modules from its own reading of the
// dependency tree, which drops nested packages (e.g. css-select's own
// domhandler on Windows) and all .d.ts files, which the site's type check
// needs. Copying what pnpm installed makes the app match the tested tree.
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

exports.default = async function afterPack(context) {
  const target = path.join(appDir(context), "node_modules");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(context.packager.projectDir, "node_modules"), target, {
    recursive: true,
    filter: (source) => !source.endsWith(".map"),
  });
};
