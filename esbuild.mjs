import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info"
});

if (isWatch) {
  await context.watch();
  console.log("Sound Error watcher is running.");
} else {
  await context.rebuild();
  await context.dispose();
}
