# DSpace offline multipart ZIP

These parts contain every tracked file from commit
`c69b4b6ba0979a3231a873931eed0ce2920b8438` of
<https://github.com/g-lightspeed/dspace-offline>, including the backend source,
prebuilt installer, complete Maven dependency cache, and original manifests.
The snapshot excludes Git's `.git` directory and these newly added archive files.

Each part is at most **49,000,000 bytes**, strictly below 50 MB (decimal).
There are **17 parts**: 16 of 49,000,000 bytes and one of 13,328,120 bytes.
The complete ZIP is 797,328,120 bytes and contains 11,654 files.
`manifest.json` records the ordered parts, sizes, SHA-256 checksums, source commit,
and checksum of the complete ZIP. `SHA256SUMS` also lists the part checksums.

## Download and restore

Download **all** `dspace-offline.zip.NNN` parts, `manifest.json`, and `restore.py`
into the same directory. On GitHub, use each file's raw download button.
These are sequential byte segments of one ZIP, not independently extractable ZIPs.
Join all parts before extraction; the script needs only Python 3's standard library.

Linux/macOS, from that directory:

```sh
python3 restore.py dspace-offline.zip
unzip dspace-offline.zip -d dspace-offline-restored
```

Windows PowerShell, from that directory:

```powershell
py -3 restore.py dspace-offline.zip
Expand-Archive -LiteralPath .\dspace-offline.zip -DestinationPath .\dspace-offline-restored
```

If using a full clone, run `python3 archives/restore.py dspace-offline.zip`
(or `py -3 archives/restore.py dspace-offline.zip` on Windows).
The script verifies every part and the complete ZIP and refuses to overwrite an
existing output. Use a new extraction directory to avoid mixing installations.
Allow disk space for both the restored ZIP and the extracted files.

The ZIP preserves the original paths and Unix executable permissions. Use an
extractor that preserves these permissions when restoring on Linux/macOS.
Follow the restored root `README.md` for offline build and installation steps.

## Verification

Before splitting, every ZIP file entry was checked against the source commit's
Git blob hash, size, path, and executable permission. All tracked files must occur
exactly once. The parts are then reassembled using `restore.py` and the reconstructed
ZIP is checked for integrity before publication.
