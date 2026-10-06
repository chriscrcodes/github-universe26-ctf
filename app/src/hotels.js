const { withDatabase } = require("./database");
const { normalizeSearchTerm, parsePositiveInteger } = require("./input-normalizer");
const {
  buildCityFilter,
  buildMaxPriceFilter,
  buildNameFilter,
  buildPublicListingQuery,
  selectPublicListingById,
  summarizePartnerRates,
} = require("./search-query");

function searchHotelsByCity(city, options = {}) {
  const error = new Error("Hotel search by city has not been delivered yet.");
  error.code = "CITY_SEARCH_NOT_IMPLEMENTED";
  throw error;
}

function findHotelById(id) {
  const listingId = parsePositiveInteger(id);
  if (listingId === null) return null;
  return withDatabase((db) => selectPublicListingById(db, listingId));
}

function partnerRateSummary(city) {
  const term = normalizeSearchTerm(city);
  if (!term) return { listings: 0, averageNetRate: null };
  return withDatabase((db) => summarizePartnerRates(db, term));
}

module.exports = { findHotelById, partnerRateSummary, searchHotelsByCity };
