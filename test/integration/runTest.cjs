const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "..", "..");
    const extensionTestsPath = path.resolve(__dirname, "..", "..", "out", "integration", "index.js");

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath
    });
  } catch (error) {
    console.error("Integration tests failed.");
    console.error(error);
    process.exit(1);
  }
}

main();
