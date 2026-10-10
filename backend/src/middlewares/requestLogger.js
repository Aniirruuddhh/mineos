function requestLogger(request, response, next) {
  const startedAt = Date.now();
  response.on("finish", () => {
    console.debug(request.method + " " + request.originalUrl + " " + response.statusCode + " " + (Date.now() - startedAt) + "ms");
  });
  next();
}

module.exports = { requestLogger };
