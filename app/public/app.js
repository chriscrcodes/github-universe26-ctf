const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const resultsTitle = document.querySelector("#results-title");
const resultsSummary = document.querySelector("#results-summary");
const resultsGrid = document.querySelector("#results-grid");
const resultsSection = document.querySelector(".results-section");
const quickSearchButtons = Array.from(document.querySelectorAll("[data-city]"));
const numberFormatter = new Intl.NumberFormat("en-US");

function setBusy(isBusy) {
  resultsSection.setAttribute("aria-busy", String(isBusy));
}

function renderMessage(title, message) {
  resultsTitle.textContent = title;
  resultsSummary.textContent = message;
  resultsGrid.replaceChildren(createMessageCard(message));
}

function createMessageCard(message) {
  const card = document.createElement("div");
  card.className = "results-message";
  card.textContent = message;
  return card;
}

function createHotelCard(hotel) {
  const card = document.createElement("article");
  card.className = "hotel-card";
  const isUnpublished = hotel.listingStatus === "UNPUBLISHED";
  if (isUnpublished) card.classList.add("hotel-card--unpublished");

  const icon = document.createElement("div");
  icon.className = "hotel-card__icon";
  icon.textContent = "🛎️";

  const location = document.createElement("p");
  location.className = "hotel-card__city";
  location.textContent = hotel.city;

  const name = document.createElement("h3");
  name.textContent = hotel.name;

  const meta = document.createElement("div");
  meta.className = "hotel-card__meta";

  const typeWrap = document.createElement("div");
  const typeLabel = document.createElement("span");
  typeLabel.className = "hotel-card__label";
  typeLabel.textContent = "Room type";
  const typeValue = document.createElement("strong");
  typeValue.textContent = "Standard stay";
  typeWrap.append(typeLabel, typeValue);

  const priceWrap = document.createElement("div");
  const priceLabel = document.createElement("span");
  priceLabel.className = "hotel-card__label";
  priceLabel.textContent = "Per night";
  const priceValue = document.createElement("div");
  priceValue.className = "hotel-card__price";
  priceValue.textContent = `$${hotel.pricePerNight}`;
  priceWrap.append(priceLabel, priceValue);

  meta.append(typeWrap, priceWrap);

  card.append(icon, location, name);
  if (isUnpublished) {
    const status = document.createElement("span");
    status.className = "hotel-card__status hotel-card__status--unpublished";
    status.textContent = "Internal — unpublished";

    const businessMeta = document.createElement("dl");
    businessMeta.className = "hotel-card__business-meta";
    [
      ["Partner net rate", `$${hotel.partnerNetRate}`],
      ["Forecast occupancy", `${hotel.forecastOccupancyPct}%`],
      ["Synthetic reservations", numberFormatter.format(hotel.syntheticReservationCount)],
      ["Internal reference", hotel.internalReference || "—"],
    ].forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = value;
      businessMeta.append(term, detail);
    });

    card.append(status, meta, businessMeta);
    return card;
  }
  card.append(meta);
  return card;
}

function renderHotels(city, hotels) {
  const normalizedCity = city.trim();

  if (hotels.length === 0) {
    renderMessage(
      normalizedCity ? `No hotels in ${normalizedCity}` : "Start with a city search",
      normalizedCity
        ? `No hotels found in ${normalizedCity}. Try another city from the workshop dataset.`
        : "Use the search box or a suggested city to load hotels."
    );
    return;
  }

  resultsTitle.textContent = `${hotels.length} stay${hotels.length === 1 ? "" : "s"} in ${normalizedCity}`;
  resultsSummary.textContent = "Prices shown are per night from the local workshop fixture.";
  resultsGrid.replaceChildren(...hotels.map(createHotelCard));
}

async function searchHotels(city) {
  const normalizedCity = city.trim();

  if (!normalizedCity) {
    renderMessage("Start with a city search", "Enter a city to view available hotels.");
    return;
  }

  setBusy(true);
  renderMessage("Searching hotels…", `Loading stays in ${normalizedCity}.`);

  try {
    const response = await fetch(`/api/hotels?city=${encodeURIComponent(normalizedCity)}`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const hotels = Array.isArray(payload.hotels) ? payload.hotels : [];
    renderHotels(normalizedCity, hotels);
  } catch (_error) {
    renderMessage(
      "Unable to load hotels",
      `We could not load stays for ${normalizedCity}. Please try again in a moment.`
    );
  } finally {
    setBusy(false);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchHotels(cityInput.value);
});

quickSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const { city } = button.dataset;
    cityInput.value = city || "";
    searchHotels(cityInput.value);
  });
});

renderMessage("Start with a city search", "Use the search box or a suggested city to load hotels.");
