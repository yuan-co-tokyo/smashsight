import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const config = JSON.parse(await readFile("lib/pose/assets.json", "utf8"));
const root = resolve("node_modules/@mediapipe/tasks-vision");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (pkg.version !== config.version) throw new Error("Unexpected MediaPipe version");
for (const asset of ["vision_bundle.mjs", "wasm/vision_wasm_internal.js", "wasm/vision_wasm_internal.wasm", "wasm/vision_wasm_nosimd_internal.js", "wasm/vision_wasm_nosimd_internal.wasm"]) {
  const target = resolve(`public${config.base}`, asset);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, asset), target);
}
const modelPath = resolve(`public${config.modelPath}`);
const valid = (buffer) => createHash("sha256").update(buffer).digest("hex") === config.modelSha256;
let cached;
try { cached = await readFile(modelPath); } catch { /* First install. */ }
if (!cached || !valid(cached)) {
  const response = await fetch(config.modelUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!valid(buffer)) throw new Error("Model checksum mismatch");
  await mkdir(dirname(modelPath), { recursive: true });
  await writeFile(modelPath, buffer);
}
console.log(`MediaPipe ${config.version} runtime and verified full model are ready.`);
