const fs = require("fs/promises");
const { resolveUploadPath } = require("../storage/files");

async function get(request, response) {
  const filePath = resolveUploadPath(request.params.filename);
  if (!filePath) {
    return response.status(400).json({ error: "Invalid evidence file name." });
  }
  try {
    await fs.access(filePath);
  } catch (_error) {
    return response.status(404).json({ error: "Evidence file not found." });
  }
  return response.sendFile(filePath);
}

module.exports = { get };
