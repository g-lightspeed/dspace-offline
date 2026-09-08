const t = require("../scripts/lib/tools.cjs");
const { backend } = require("../scripts/backend.cjs");
t.main(async () => {
  const stage = t.fs.mkdtempSync(
    t.path.join(t.os.tmpdir(), "backend-install-check-")
  );
  process.env.DSPACE_STATE_DIR = stage;
  try {
    await backend("install");
    const context = t.fs.readFileSync(
      t.path.join(stage, "tomcat/conf/Catalina/localhost/server.xml"),
      "utf8"
    );
    if (
      !context.includes(
        t.path.join(stage, "dspace/webapps/server").replace(/\\/g, "/")
      )
    )
      throw new Error("Wrong context deployment path.");
    let refused = false;
    try {
      await backend("install");
    } catch (e) {
      refused = e.message.includes("refusing to overwrite");
    }
    if (!refused) throw new Error("Existing installation was not protected.");
    console.log(
      "PASS: direct Java/Ant installation, external Tomcat context and existing-state protection."
    );
  } finally {
    t.remove(stage);
  }
});
