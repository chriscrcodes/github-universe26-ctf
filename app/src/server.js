const express = require("express");
const path = require("node:path");
const { findHotelById, partnerRateSummary, searchHotelsByCity } = require("./hotels");

function stringParam(value) {
  return typeof value === "string" ? value : "";
}

function createApp() {
  const app = express();
  const publicDirectory = path.resolve(__dirname, "..", "public");

  app.use(express.static(publicDirectory));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "hotel-search" });
  });

  app.get("/api/hotels", (req, res) => {
    const hotels = searchHotelsByCity(stringParam(req.query.city), {
      maxPrice: stringParam(req.query.maxPrice),
      name: stringParam(req.query.name),
      sort: stringParam(req.query.sort),
    });
    res.json({ hotels });
  });

  app.get("/api/hotels/:id", (req, res) => {
    const hotel = findHotelById(req.params.id);
    if (!hotel) {
      res.status(404).json({ error: "listing not found" });
      return;
    }
    res.json({ hotel });
  });

  app.get("/api/partners/summary", (req, res) => {
    res.json({ summary: partnerRateSummary(stringParam(req.query.city)) });
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
