// Shared Node 14 tooling. Pass argument arrays directly; never invoke a command shell.
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");
const root = path.resolve(__dirname, "../..");
const app = path.join(root, "dspace-nextjs");
function platformTools(
  base = root,
  platform = process.platform,
  env = process.env
) {
  const p = platform === "win32" ? path.win32 : path.posix;
  const windows = platform === "win32";
  if (!["win32", "linux"].includes(platform))
    throw new Error("Supported platforms: Windows x64 and Linux x64.");
  const nodeHome =
    env.DSPACE_NODE_HOME ||
    p.join(
      base,
      "tooling",
      windows ? "node-v14.21.3-win-x64" : "node-v14.21.3-linux-x64"
    );
  const javaHome =
    env.DSPACE_JAVA_HOME ||
    env.JAVA_HOME ||
    p.join(
      base,
      "tooling",
      windows ? "jdk-11.0.28+6-win-x64" : "jdk-11.0.28+6"
    );
  return {
    nodeHome,
    node: p.join(nodeHome, windows ? "node.exe" : "bin/node"),
    npm: p.join(
      nodeHome,
      windows
        ? "node_modules/npm/bin/npm-cli.js"
        : "lib/node_modules/npm/bin/npm-cli.js"
    ),
    javaHome,
    java: p.join(javaHome, "bin", windows ? "java.exe" : "java"),
    maven:
      env.DSPACE_MAVEN_HOME || p.join(base, "tooling", "apache-maven-3.9.9"),
    ant: env.DSPACE_ANT_HOME || p.join(base, "tooling", "apache-ant-1.10.15"),
    tomcat:
      env.DSPACE_TOMCAT_HOME ||
      p.join(base, "tooling", "apache-tomcat-9.0.108"),
  };
}
function requireFile(file) {
  if (!fs.existsSync(file))
    throw new Error("Required local file is missing: " + file);
  return file;
}
function output(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  }).trim();
}
function nodeTools() {
  if (process.arch !== "x64")
    throw new Error("This toolchain is prepared for x64.");
  const tools = platformTools();
  requireFile(tools.node);
  requireFile(tools.npm);
  if (output(tools.node, ["--version"]) !== "v14.21.3")
    throw new Error("Expected Node 14.21.3.");
  if (output(tools.node, [tools.npm, "--version"]) !== "6.14.18")
    throw new Error("Expected npm 6.14.18.");
  return tools;
}
function environment(extra = {}) {
  return {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    npm_config_offline: "true",
    npm_config_cache: path.join(root, "offline/npm-cache"),
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    ...extra,
  };
}
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      windowsHide: true,
      shell: false,
      ...options,
    });
    const interrupt = () => child.kill("SIGINT");
    const terminate = () => child.kill("SIGTERM");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    const clean = () => {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
    };
    child.once("error", (error) => {
      clean();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clean();
      if (code === 0) resolve();
      else
        reject(
          new Error(path.basename(command) + " exited with " + (signal || code))
        );
    });
  });
}
function copy(from, to, filter = () => true) {
  if (!filter(from)) return;
  const stat = fs.lstatSync(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (stat.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(from), to);
  else if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from))
      copy(path.join(from, entry), path.join(to, entry), filter);
  } else {
    fs.copyFileSync(from, to);
    if (process.platform !== "win32") fs.chmodSync(to, stat.mode);
  }
}
function remove(file) {
  fs.rmSync(file, { recursive: true, force: true });
}
function sourceFile(file) {
  if (path.basename(file) === ".env.example") return true;
  return (
    !/^(node_modules|\.next|\.next-dev|\.env.*)$/.test(path.basename(file)) &&
    !file.endsWith(".tsbuildinfo")
  );
}
function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}
function nativePackage(platform = process.platform) {
  return (
    "@next/swc-" + (platform === "win32" ? "win32-x64-msvc" : "linux-x64-gnu")
  );
}
function checkNative(tools, directory = app) {
  // Fail before Next's fallback compiler downloader can run on an isolated machine.
  const name = nativePackage();
  try {
    output(tools.node, [
      "-e",
      "require(process.argv[1])",
      require.resolve(name, { paths: [directory] }),
    ]);
  } catch {
    throw new Error(
      "Cannot load " +
        name +
        ". Run the offline install on this OS; do not reuse another OS's node_modules."
    );
  }
}
function loadEnv(file) {
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match)
      throw new Error("Invalid environment-file line; expected KEY=value.");
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
function main(fn) {
  Promise.resolve()
    .then(fn)
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
module.exports = {
  root,
  app,
  fs,
  path,
  os,
  platformTools,
  requireFile,
  output,
  nodeTools,
  environment,
  run,
  copy,
  remove,
  sourceFile,
  sha256,
  nativePackage,
  checkNative,
  loadEnv,
  main,
};
