import { spawn } from "child_process";
import { resolve } from "path";

export default function runBrowserPy(query, site = null, limit = 10) {
  return new Promise((resolvePromise, reject) => {
    const pythonPath = resolve("src/python/venv/bin/python"); // Linux/macOS
    // Windows: const pythonPath = resolve("src/python/venv/Scripts/python.exe");

    const args = [resolve("src/python/browser.py"), query];
    if (site) args.push(site);
    args.push(limit.toString());

    const python = spawn(pythonPath, args);

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (errorOutput) return reject(new Error(errorOutput));
      try {
        const json = JSON.parse(output);
        resolvePromise(json);
      } catch (err) {
        reject(err);
      }
    });
  });
}
