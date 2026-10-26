"use strict";

function errorHandler(err, req, res, next) {
  console.error("Central error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large"
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body"
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred"
  });
}

module.exports = errorHandler;
