const fs = require("fs/promises");
const path = require("path");
const uploadDirectory = path.join(__dirname, "..", "..", "uploads");
async function ensureUploadDirectory() { await fs.mkdir(uploadDirectory, { recursive: true }); }
async function removeFile(filePath) { if (filePath) await fs.unlink(filePath).catch(() => undefined); }
function resolveUploadPath(filename) { const safeName = path.basename(String(filename || "")); if (!safeName || safeName.startsWith(".")) return null; const root = path.resolve(uploadDirectory); const resolved = path.resolve(uploadDirectory, safeName); return resolved !== root && resolved.startsWith(`${root}${path.sep}`) ? resolved : null; }
module.exports = { uploadDirectory, ensureUploadDirectory, removeFile, resolveUploadPath };
