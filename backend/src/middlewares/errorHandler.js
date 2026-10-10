const multer = require("multer");

function notFound(_request, response) {
  response.status(404).json({ error: "API route not found." });
}

function errorHandler(error, _request, response, _next) {
  console.error(error);
  if (error instanceof multer.MulterError) {
    return response.status(400).json({ error: error.message });
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return response.status(error.status).json({ error: error.message });
  }
  return response.status(500).json({ error: "Something went wrong processing this request." });
}

module.exports = { notFound, errorHandler };
