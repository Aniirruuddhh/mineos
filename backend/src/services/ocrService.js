const { execFile } = require("child_process");
const { promisify } = require("util");
const Tesseract = require("tesseract.js");
const { removeFile } = require("../storage/files");
const execFileAsync = promisify(execFile);
async function recognize(file) { let renderedPdfPath; try { let sourcePath = file.path; if (file.mimetype === "application/pdf") { const outputPrefix = `${file.path}-page`; try { await execFileAsync("pdftoppm", ["-f", "1", "-l", "1", "-png", "-singlefile", file.path, outputPrefix]); } catch (error) { if (error.code === "ENOENT") { error.status = 503; error.message = "PDF OCR requires Poppler (pdftoppm) on the API server. Install Poppler and try again."; } throw error; } renderedPdfPath = `${outputPrefix}.png`; sourcePath = renderedPdfPath; } const result = await Tesseract.recognize(sourcePath, "eng"); return { extractedText: result.data.text.trim(), confidence: result.data.confidence / 100 }; } finally { await Promise.all([removeFile(file.path), renderedPdfPath ? removeFile(renderedPdfPath) : undefined]); } }
module.exports = { recognize };
