const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildCityFilter,
  buildMaxPriceFilter,
  buildNameFilter,
  buildOrderByClause,
  buildPublicListingQuery,
} = require("../src/search-query");
const { escapeLikePattern, normalizeSearchTerm, parsePositiveInteger } = require("../src/input-normalizer");

test("normalization collapses noise but is not a SQL defence", () => {
  assert.equal(normalizeSearchTerm("  Paris\n"), "Paris");
  assert.equal(normalizeSearchTerm("Sao   Paulo"), "Sao Paulo");
  assert.equal(normalizeSearchTerm("a; DROP"), "");
  assert.equal(normalizeSearchTerm("a /* comment */"), "");
  assert.equal(normalizeSearchTerm(42), "");
  assert.equal(
    normalizeSearchTerm("' OR 1=1 -- "),
    "' OR 1=1 --",
    "the quote survives normalization, which is why binding is required"
  );
});

test("helper parsing rejects unusable values", () => {
  assert.equal(parsePositiveInteger("12"), 12);
  assert.equal(parsePositiveInteger("0"), null);
  assert.equal(parsePositiveInteger("abc"), null);
  assert.equal(escapeLikePattern("100%_x"), "100\\%\\_x");
});

test("the sort key is allowlisted", () => {
  assert.equal(buildOrderByClause("price"), "ORDER BY pricePerNight");
  assert.equal(buildOrderByClause("' OR 1=1 -- "), "ORDER BY id");
  assert.equal(buildOrderByClause(), "ORDER BY id");
});

test("the price and name filters bind their values", () => {
  assert.deepEqual(buildMaxPriceFilter(200), { clause: "pricePerNight <= ?", parameters: [200] });
  assert.deepEqual(buildNameFilter("Saint"), {
    clause: "name LIKE ? ESCAPE '\\'",
    parameters: ["%Saint%"],
  });
  const query = buildPublicListingQuery([buildCityFilter("Paris"), buildMaxPriceFilter(200)]);
  assert.match(query.sql, /listingStatus = 'PUBLIC'/);
  assert.match(query.sql, /city = 'Paris' COLLATE NOCASE/);
  // Before the approved fix the city value is inlined; afterwards it is bound.
  assert.deepEqual(
    query.parameters.filter((value) => value !== "Paris"),
    [200]
  );
});
