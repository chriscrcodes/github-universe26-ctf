const { withDatabase } = require("./database");

function searchHotelsByCity(city) {
  if (typeof city !== "string" || city.length === 0) {
    return [];
  }

  return withDatabase((db) => {
    if (process.env.VULNERABLE !== "0") {
      const statement = `
        SELECT id, city, name, pricePerNight, listingStatus, partnerNetRate,
          forecastOccupancyPct, syntheticReservationCount
        FROM hotels
        WHERE city = '${city}' AND listingStatus = 'PUBLIC'
        ORDER BY id
      `;
      return db.prepare(statement).all();
    }

    return db
      .prepare(`
        SELECT id, city, name, pricePerNight, listingStatus, partnerNetRate,
          forecastOccupancyPct, syntheticReservationCount
        FROM hotels
        WHERE city = ? AND listingStatus = 'PUBLIC'
        ORDER BY id
      `)
      .all(city);
  });
}

module.exports = { searchHotelsByCity };
