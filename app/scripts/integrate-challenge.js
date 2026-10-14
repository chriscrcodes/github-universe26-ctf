const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const prototypePath = path.join(appRoot, "data", "city-search-prototype.txt");
const hotelsPath = path.join(appRoot, "src", "hotels.js");
const functionSignature = "function searchHotelsByCity(city, options = {}) {";
const followingFunction = "\n\nfunction findHotelById(";

function searchFunctionBlock(source) {
  const start = source.indexOf(functionSignature);
  const end = source.indexOf(followingFunction, start);
  if (start === -1 || end === -1 || source.indexOf(functionSignature, start + 1) !== -1) {
    throw new Error("Could not identify the unique searchHotelsByCity function in app/src/hotels.js.");
  }
  return { start, end, text: source.slice(start, end).trimEnd() };
}

function validatePrototype(prototype) {
  const implementation = prototype.trim();
  if (!implementation.startsWith(functionSignature) || !implementation.endsWith("}")) {
    throw new Error("The supplied city-search prototype has an unexpected format.");
  }
  return implementation;
}

function matchesChallengeSource(source, prototype) {
  return searchFunctionBlock(source).text === validatePrototype(prototype);
}

function integratePrototypeSource(source, prototype) {
  const block = searchFunctionBlock(source);
  const implementation = validatePrototype(prototype);
  if (block.text === implementation) return source;
  return `${source.slice(0, block.start)}${implementation}${source.slice(block.end)}`;
}

function assertChallengeIntegrated() {
  const source = fs.readFileSync(hotelsPath, "utf8");
  const prototype = fs.readFileSync(prototypePath, "utf8");
  if (!matchesChallengeSource(source, prototype)) {
    throw new Error("The delivered search function differs from the supplied workshop prototype. Run `npm run workshop:baseline`, review the diff, then commit and push the feature branch.");
  }
}

function integrateChallenge() {
  const source = fs.readFileSync(hotelsPath, "utf8");
  const prototype = fs.readFileSync(prototypePath, "utf8");
  const integrated = integratePrototypeSource(source, prototype);
  if (integrated === source) {
    console.log("The supplied workshop prototype is already integrated.");
    return;
  }
  fs.writeFileSync(hotelsPath, integrated, "utf8");
  console.log("Integrated the supplied city-search prototype into app/src/hotels.js.");
  console.log("Review the diff before committing and pushing the feature branch.");
}

if (require.main === module) {
  try {
    integrateChallenge();
  } catch (error) {
    console.error(`Workshop baseline integration failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { assertChallengeIntegrated, integratePrototypeSource, matchesChallengeSource };