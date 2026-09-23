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
  const term = normalizeSearchTerm(city);
  if (!term) return [];

  const filters = [buildCityFilter(term)];
  const maxPrice = parsePositiveInteger(options.maxPrice);
  if (maxPrice !== null) filters.push(buildMaxPriceFilter(maxPrice));
  const name = normalizeSearchTerm(options.name);
  if (name) filters.push(buildNameFilter(name));

  const query = buildPublicListingQuery(filters, options.sort);
  return withDatabase((db) => db.prepare(query.sql).all(...query.parameters));
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
