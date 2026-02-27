import * as assert from "node:assert";
import * as vscode from "vscode";

describe("Sound Error smoke", () => {
  it("activates extension", async () => {
    const extension = vscode.extensions.getExtension("sound-error-dev.sound-error");
    assert.ok(extension, "Expected sound-error-dev.sound-error to be installed in test host.");

    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  it("registers commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("soundError.testSound"));
    assert.ok(commands.includes("soundError.reloadSoundPack"));
    assert.ok(commands.includes("soundError.toggleMode"));
  });

  it("executes reload/test commands without throwing", async () => {
    await vscode.commands.executeCommand("soundError.reloadSoundPack");
    await vscode.commands.executeCommand("soundError.testSound");
  });
});
