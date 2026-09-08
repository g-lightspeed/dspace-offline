# DSpace 7.6.7 backend and offline Java dependencies

This archive supplies backend source, a prebuilt DSpace installer with runtime JARs, and the complete prepared Maven repository. Preserve the directory layout. Runtime libraries belong in their original application directories; do not flatten all JARs into one classpath.

## Contents

- `dspace-backend/`: DSpace 7.6.7 source, including its original Maven modules and licenses.
- `dspace-backend/dspace/target/dspace-installer/`: prebuilt installer; `lib/` holds CLI libraries and `webapps/server/WEB-INF/lib/` holds REST application libraries. Other upstream webapps retain their own libraries.
- `offline/maven-repository/`: build dependencies, Maven plugins, parent POMs, and repository metadata. Keep all files, not just JARs.
- `scripts/backend.cjs`, `scripts/lib/tools.cjs`: existing Node 14-compatible backend launcher.
- `config/`: isolated Maven settings, backend configuration example, and PostgreSQL initialization SQL.
- `tests/backend-install.cjs`: temporary fresh installation and overwrite-protection check.
- `manifests/`: source provenance, package file hashes and JAR inventory.
- `verification/`: build/install evidence and validation limits.

Frontend applications, npm packages, live backend state, and database/search distributions are outside this archive. Node, JDK, Maven, Ant and Tomcat distributions are also separate prerequisites. They are available in the previously prepared full repository's `tooling/` directory.

## Select existing tools

Use Java 11 (prepared version 11.0.28+6), Maven 3.9.9, Ant 1.10.15 and Tomcat 9.0.108. Node 14.21.3 is used only by the supplied helper scripts; it is not a Java application dependency. Tools must match the workstation OS. Run source builds on Linux; native Windows 10/11 development can install the Linux-built Java installer. Actual Windows execution and destination-server compatibility are unverified.

Linux example, from this extracted archive's root (adjust the external tool directory):

```bash
TOOLS=/path/to/existing/tooling
NODE="$TOOLS/node-v14.21.3-linux-x64/bin/node"
export DSPACE_JAVA_HOME="$TOOLS/jdk-11.0.28+6"
export DSPACE_MAVEN_HOME="$TOOLS/apache-maven-3.9.9"
export DSPACE_ANT_HOME="$TOOLS/apache-ant-1.10.15"
export DSPACE_TOMCAT_HOME="$TOOLS/apache-tomcat-9.0.108"
```

PowerShell example, from the extracted root:

```powershell
$Tools = 'C:\Work\dspace-repository\tooling'
$Node = Join-Path $Tools 'node-v14.21.3-win-x64\node.exe'
$env:DSPACE_JAVA_HOME = Join-Path $Tools 'jdk-11.0.28+6-win-x64'
$env:DSPACE_MAVEN_HOME = Join-Path $Tools 'apache-maven-3.9.9'
$env:DSPACE_ANT_HOME = Join-Path $Tools 'apache-ant-1.10.15'
$env:DSPACE_TOMCAT_HOME = Join-Path $Tools 'apache-tomcat-9.0.108'
```

## Offline source build on Linux

```bash
"$NODE" scripts/backend.cjs build package
```

The helper enforces Maven `-o` and uses this archive's `offline/maven-repository/`. Output is `dspace-backend/dspace/target/dspace-installer/`.

The prepared cache does not contain `maven-clean-plugin:3.5.0`, so `clean package` is not supported by this archive. For a from-scratch rebuild, remove only generated `target/` directories within a disposable copy of `dspace-backend/`, then run the command above. This is how the package's fresh-source build was verified. Other Maven goals/profiles may need additional artifacts. Maven's default project configuration compiles tests but skips execution; a successful package build is not a backend integration test.

## Install the prebuilt backend

No Maven build is needed to use the supplied installer. Select a NEW external state directory and install with the configured tools:

Linux:

```bash
export DSPACE_STATE_DIR=/srv/dspace-state
"$NODE" scripts/backend.cjs install
```

PowerShell:

```powershell
$env:DSPACE_STATE_DIR = 'C:\Work\dspace-state'
& $Node scripts/backend.cjs install
```

Installation refuses existing `dspace` or `tomcat` state. It copies program/configuration files without downloading the upstream spider list. This helper is for fresh installations, not upgrades or database restoration.

Copy `config/backend.local.cfg.example` into the external state's `dspace/config/local.cfg`. Set `dspace.dir`, the public REST/UI URLs, CORS origins, private PostgreSQL credentials, and Solr URL. Use forward slashes for Windows paths in Java configuration. The example URLs assume a separately deployed frontend/proxy at port 3000; adapt them to your deployment.

Supply PostgreSQL 14.x with pgcrypto and Solr 8.11.4 separately, or connect to existing configured internal services. DSpace's Solr core configurations are included under `dspace-backend/dspace/solr/`. PostgreSQL/Solr service installation and live REST readiness are not validated by this package's checks.

After configuration and service provisioning, use `scripts/backend.cjs migrate`, then `scripts/backend.cjs cli create-administrator` interactively, and `scripts/backend.cjs start` (prefix with `"$NODE"` on Linux or `& $Node` in PowerShell). `stop` shuts down the selected Tomcat. Configure Tomcat's HTTP and shutdown listeners for your deployment. Database migration changes the selected database; run it as an explicit installation/update step.

## Integrity and evidence

`manifests/files.json` records SHA-256 and size for every payload file except itself. `manifests/jars.json` identifies every included JAR by its original path and SHA-256. An external `.zip.sha256` file covers the complete ZIP. The archiver verifies every ZIP member against the staged payload and verifies each JAR's ZIP integrity.

See `verification/RESULTS.md` for checks actually performed and their limits. No live database migration or running service is changed by the packaging checks.

## Store the complete backend and dependencies in Git

This package intentionally includes the Maven repository and prebuilt installer in version control. Its ignore rules allow all Maven artifacts (including POMs and metadata), the complete installer, and every JAR. JAR attributes disable text conversion.

From this extracted package root, inside your intended Git repository:

```bash
git add .
git status --short
```

`git add -f` is not needed for these dependencies with the supplied rules. The package was tested in a fresh local Git repository: all 1,492 JARs and every Maven-repository and installer file were staged, with JAR blob hashes matching the original bytes. No remote repository is created or pushed by this package.

The upstream source provenance in `manifests/upstream.json` identifies the original DSpace source. This delivery adds explicit installer/JAR tracking rules to `dspace-backend/.gitignore` and binary JAR attributes to `dspace-backend/.gitattributes`; application source is unchanged.
