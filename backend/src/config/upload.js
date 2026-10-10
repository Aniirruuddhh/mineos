const path = require("path");
const multer = require("multer");
const { uploadDirectory, ensureUploadDirectory } = require("../storage/files");
const storage = multer.diskStorage({ destination: async (_request, _file, callback) => { try { await ensureUploadDirectory(); callback(null, uploadDirectory); } catch (error) { callback(error); } }, filename: (_request, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") return callback(null, true); return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only images and PDFs are accepted")); } });
function runUpload(request, response, fieldName) { return new Promise((resolve, reject) => upload.single(fieldName)(request, response, (error) => error ? reject(error) : resolve())); }
module.exports = { upload, runUpload };
