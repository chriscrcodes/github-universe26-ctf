const express = require("express");
const path = require("node:path");
const { searchHotelsByCity } = require("./hotels");

function createApp() {
  const app = express();
  const publicDirectory = path.resolve(__dirname, "..", "public");

  app.use(express.static(publicDirectory));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, vulnerable: process.env.VULNERABLE !== "0" });
  });

  app.get("/api/hotels", (req, res) => {
    const city = typeof req.query.city === "string" ? req.query.city : "";
    const hotels = searchHotelsByCity(city);
    res.json({ hotels });
  });

  return app;
}

function startServer(port = Number(process.env.PORT || 3000)) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`app listening on ${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
