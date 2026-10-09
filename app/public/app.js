const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const resultsTitle = document.querySelector("#results-title");
const resultsSummary = document.querySelector("#results-summary");
const resultsGrid = document.querySelector("#results-grid");
const resultsSection = document.querySelector(".results-section");
const quickSearchButtons = Array.from(document.querySelectorAll("[data-city]"));
const numberFormatter = new Intl.NumberFormat("en-US");

function formatPrice(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

  const roomList = document.createElement("ul");
  roomList.className = "hotel-card__rooms";
  const roomOptions = hotel.roomOptions?.length ? hotel.roomOptions : [hotel];
  roomOptions.forEach((room) => {
    const item = document.createElement("li");
    item.className = "hotel-card__room";

    const details = document.createElement("div");
    details.className = "hotel-card__room-details";
    const type = document.createElement("strong");
    type.textContent = room.roomType;
    const bedDetails = document.createElement("span");
    bedDetails.textContent = `${room.bedConfiguration} · Up to ${room.maxGuests} guests`;
    details.append(type, bedDetails);

    const price = document.createElement("strong");
    price.className = "hotel-card__room-price";
    price.textContent = formatPrice(room.pricePerNight, hotel.currency);
    item.append(details, price);
    roomList.append(item);
  });

  const options = document.createElement("p");
  options.className = "hotel-card__options";
  options.textContent = [
    hotel.breakfastIncluded ? "Breakfast included" : "Breakfast not included",
    hotel.freeCancellation ? "Free cancellation" : "Non-refundable",
  ].join(" · ");

  card.append(icon, location, name);
  if (isUnpublished) {
    const status = document.createElement("span");
    status.className = "hotel-card__status hotel-card__status--unpublished";
    status.textContent = "Internal — unpublished";

    const businessMeta = document.createElement("dl");
    businessMeta.className = "hotel-card__business-meta";
    [
      ["Partner net rate", formatPrice(hotel.partnerNetRate, hotel.currency)],
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

    card.append(status, roomList, options, businessMeta);
    return card;
  }
  card.append(roomList, options);
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
  resultsSummary.textContent = "Example stay: 10-11 Oct 2026 · 2 adults. Synthetic prices and options only; not live or bookable.";
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
    const payload = await response.json();
    if (response.status === 501 && payload.code === "CITY_SEARCH_NOT_IMPLEMENTED") {
      renderMessage("Search is not available yet", payload.error);
      return;
    }
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

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
