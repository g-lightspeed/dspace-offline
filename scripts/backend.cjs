#!/usr/bin/env node
const t = require("./lib/tools.cjs");
function javaTools() {
  const tools = t.platformTools();
  t.requireFile(tools.java);
  const { spawnSync } = require("child_process");
  const check = spawnSync(tools.java, ["-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (check.error || check.status !== 0 || !/version "11\./.test(check.stderr))
    throw new Error("Expected a local Java 11 JDK. Set DSPACE_JAVA_HOME.");
  return tools;
}
function paths() {
  if (!process.env.DSPACE_STATE_DIR)
    throw new Error(
      "Set DSPACE_STATE_DIR to a persistent directory outside the source checkout."
    );
  const state = t.path.resolve(process.env.DSPACE_STATE_DIR);
  return {
    state,
    installed: t.path.join(state, "dspace"),
    base: t.path.join(state, "tomcat"),
  };
}
function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
async function backend(command, args = []) {
  const tools = javaTools();
  const env = { ...process.env, JAVA_HOME: tools.javaHome };
  const heap = process.env.DSPACE_JAVA_HEAP || "2g";
  if (!/^\d+[mMgG]$/.test(heap))
    throw new Error("DSPACE_JAVA_HEAP must be a size such as 2g or 2048m.");
  const java = (values) =>
    t.run(tools.java, ["-Xmx" + heap, "-Dfile.encoding=UTF-8", ...values], {
      env,
    });
  if (command === "build") {
    const source =
      process.env.DSPACE_BACKEND_SOURCE ||
      t.path.join(t.root, "dspace-backend");
    const boot = t.path.join(tools.maven, "boot");
    const launcher = t.fs
      .readdirSync(boot)
      .find((name) => /^plexus-classworlds-.*\.jar$/.test(name));
    if (!launcher) throw new Error("Missing Maven classworlds launcher.");
    return java([
      "-Dmaven.home=" + tools.maven,
      "-Dclassworlds.conf=" + t.path.join(tools.maven, "bin/m2.conf"),
      "-Dmaven.multiModuleProjectDirectory=" + source,
      "-cp",
      t.path.join(boot, launcher),
      "org.codehaus.plexus.classworlds.launcher.Launcher",
      "-o",
      "-B",
      "-ntp",
      "-f",
      t.requireFile(t.path.join(source, "pom.xml")),
      "-s",
      t.path.join(t.root, "config/maven-settings.xml"),
      "-Dmaven.repo.local=" +
        (process.env.DSPACE_MAVEN_REPOSITORY ||
          t.path.join(t.root, "offline/maven-repository")),
      ...(args.length ? args : ["package"]),
    ]);
  }
  const p = paths();
  if (command === "install") {
    if (t.fs.existsSync(p.installed) || t.fs.existsSync(p.base))
      throw new Error(
        "Installation target already contains dspace or tomcat; refusing to overwrite it."
      );
    const installer = t.path.join(
      t.root,
      "dspace-backend/dspace/target/dspace-installer"
    );
    const ant = t.requireFile(t.path.join(tools.ant, "lib/ant-launcher.jar"));
    const staging = t.fs.mkdtempSync(
      t.path.join(t.os.tmpdir(), "dspace-installer-")
    );
    // Ant creates config-temp beside build.xml, so keep the supplied installer read-only.
    try {
      t.copy(installer, staging);
      // These upstream targets copy code/configuration without fresh_install's spider-list download.
      await java([
        "-Dant.home=" + tools.ant,
        "-cp",
        ant,
        "org.apache.tools.ant.launch.Launcher",
        "-f",
        t.requireFile(t.path.join(staging, "build.xml")),
        "-Ddspace.dir=" + p.installed,
        "init_installation",
        "init_configs",
        "install_code",
        "copy_webapps",
      ]);
    } finally {
      t.remove(staging);
    }
    t.copy(t.path.join(tools.tomcat, "conf"), t.path.join(p.base, "conf"));
    for (const name of [
      "logs",
      "temp",
      "work",
      "webapps",
      "conf/Catalina/localhost",
    ])
      t.fs.mkdirSync(t.path.join(p.base, name), { recursive: true });
    // An external context works on Windows without administrator-only symbolic-link privileges.
    t.fs.writeFileSync(
      t.path.join(p.base, "conf/Catalina/localhost/server.xml"),
      '<Context docBase="' +
        xml(t.path.join(p.installed, "webapps/server").replace(/\\/g, "/")) +
        '" />\n'
    );
    console.log(
      "Installed in " +
        p.state +
        ". Configure dspace/config/local.cfg before migrate/start."
    );
    return;
  }
  // local.cfg is optional when settings are supplied through the environment.
  t.requireFile(t.path.join(p.installed, "config/dspace.cfg"));
  if (command === "cli" || command === "migrate") {
    return java([
      "-Ddspace.dir=" + p.installed,
      "-Dlog4j2.configurationFile=" +
        t.path.join(p.installed, "config/log4j2-cli.xml"),
      "-cp",
      [
        t.path.join(p.installed, "lib/*"),
        t.path.join(p.installed, "config"),
      ].join(t.path.delimiter),
      "org.dspace.app.launcher.ScriptLauncher",
      ...(command === "migrate" ? ["database", "migrate"] : args),
    ]);
  }
  if (command === "start" || command === "stop") {
    return java(tomcatArguments(tools, p, command));
  }
  throw new Error(
    "Usage: node scripts/backend.cjs build | install | migrate | start | stop | cli <command>"
  );
}
// Shared by the foreground launcher and native workflow-test restart helper.
function tomcatArguments(tools, p, command) {
  return [
    "-Ddspace.dir=" + p.installed,
    "-Djava.awt.headless=true",
    "-Dcatalina.home=" + tools.tomcat,
    "-Dcatalina.base=" + p.base,
    "-Djava.io.tmpdir=" + t.path.join(p.base, "temp"),
    "-Djava.util.logging.config.file=" +
      t.path.join(p.base, "conf/logging.properties"),
    "-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager",
    "-cp",
    [
      t.path.join(tools.tomcat, "bin/bootstrap.jar"),
      t.path.join(tools.tomcat, "bin/tomcat-juli.jar"),
    ].join(t.path.delimiter),
    "org.apache.catalina.startup.Bootstrap",
    command,
  ];
}
module.exports = { backend, javaTools, paths, tomcatArguments };
if (require.main === module)
  t.main(() => backend(process.argv[2], process.argv.slice(3)));
