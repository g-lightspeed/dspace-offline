# Verification results

Date: 2026-09-08T08:14:10.299581+00:00

- DSpace 7.6.7 rebuilt with Java 11.0.28+6 and Maven 3.9.9 in offline mode (`-o package`). Source staging contained no generated target directories before the build. All 13 reactor modules passed packaging.
- Maven used only the separate staged copy of the prepared repository. No dependency downloads or network-setting changes were used for this build.
- Fresh installation through the packaged Node helper and external Java/Ant/Tomcat passed. The test verified the external Tomcat context and refusal to overwrite an existing installation, then removed its temporary state.
- Integrity checks passed for all 1492 included JARs: 689 in the installer and 803 in the Maven repository. Counts include libraries repeated in different application classpaths.
- Generated intermediate build directories were removed after validation; the newly built installer was retained.
- The packaging procedure reads every ZIP member and compares its SHA-256 and metadata against the staged payload before publishing the final archive. `manifests/files.json` covers all payload files except itself.

## Limits

- `clean package` failed because `maven-clean-plugin:3.5.0` is not in the existing local cache. Use `package`, or remove generated target directories in a disposable source copy before rebuilding. See `unsupported-clean.log`.
- The default Maven build compiles test sources but skips test execution. No full backend unit/integration test run is claimed.
- No database migration, live REST application startup, PostgreSQL/Solr provisioning, actual Windows execution, or destination-server compatibility check was performed.
- External Node, Java, Maven, Ant, and Tomcat tool distributions were used for verification and are not included in this backend/dependency archive.

## Git staging verification

A fresh local repository accepted `git add .` without force-add flags. All 1492 JARs were staged; each staged Git blob hash matches its original JAR bytes. All 7731 Maven repository and installer files were staged, including POMs and plugin metadata. See `git-staging.json`. No commits or remote writes were made.
