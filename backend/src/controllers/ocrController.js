const { runUpload } = require("../config/upload");
const { recognize } = require("../services/ocrService");
async function ocr(request, response, next) { try { await runUpload(request, response, "document"); if (!request.file) return response.status(400).json({ error: "Attach a document image or PDF." }); response.json(await recognize(request.file)); } catch (error) { next(error); } }
module.exports = { ocr };
