import {
  PHASE_DETAILS,
  MISSION_PHASES,
  avatarFor,
  displayNameFor,
  LABELLED_FORMATION_MAX,
  formationPositions,
  missionPhaseFor,
} from "./mission-progress.js";
import { ARCADE_LEVELS, flagProgress } from "./arcade-stage.js";

const POLL_INTERVAL_MS = 2_000;
const MAX_TEAMS = 60;

const stageElement = document.querySelector("#arcade-stage");
const arcadeGauge = document.querySelector("#arcade-integrity");
const arcadeFlagStatus = document.querySelector("#arcade-flag-status");
const teamListElement = document.querySelector("#team-list");
const statusElement = document.querySelector("#board-status");
const countElement = document.querySelector("#team-count");
const investigatingElement = document.querySelector("#collective-investigating");
const fixingElement = document.querySelector("#collective-fixing");
const completeElement = document.querySelector("#collective-complete");
const previousPositions = new Map();

let latestTeams = [];
let pollInFlight = false;

function teamsFrom(payload) {
  return Array.isArray(payload?.teams) ? payload.teams : [];
}

function normalizeTeam(team, index) {
  if (!team || typeof team !== "object") return null;
  const teamId = typeof team.teamId === "string" ? team.teamId.trim() : "";
  const phase = missionPhaseFor(team.phase);
  const name = displayNameFor(team, index);
  if (!teamId || !phase || !name) return null;

  return {
    teamId,
    name,
    phase,
    ciStatus: team.ciStatus === "clean" ? "clean" : "pending",
    updatedAt: typeof team.updatedAt === "string" ? team.updatedAt : null,
  };
}

function renderCollectiveProgress(teams) {
  investigatingElement.textContent = `${
    teams.filter((team) => ["onboarding", "red", "purple"].includes(team.phase)).length
  }`;
  fixingElement.textContent = `${teams.filter((team) => team.phase === "green").length}`;
  completeElement.textContent = `${teams.filter((team) => team.phase === "blue" && team.ciStatus === "clean").length}`;
}

function formatUpdatedAt(value) {
  const timestamp = Date.parse(value || "");
  if (Number.isNaN(timestamp)) return "Update time unavailable";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  return seconds < 60 ? `Updated ${seconds}s ago` : `Updated ${Math.floor(seconds / 60)}m ago`;
}

function didAdvance(team) {
  const previous = previousPositions.get(team.teamId);
  const nextIndex = MISSION_PHASES.indexOf(team.phase);
  const previousIndex = previous ? MISSION_PHASES.indexOf(previous.phase) : nextIndex;
  previousPositions.set(team.teamId, { phase: team.phase });
  return previous && nextIndex > previousIndex;
}

function renderStage(teams) {
  const positions = formationPositions(teams, ARCADE_LEVELS);
  const currentMarkers = new Map(
    Array.from(stageElement.querySelectorAll(".team-marker")).map((marker) => [marker.dataset.teamId, marker])
  );

  for (const team of teams) {
    const position = positions.get(team.teamId);
    if (!position) continue;

    const avatar = avatarFor(team.teamId);
    let marker = currentMarkers.get(team.teamId);
    if (!marker) {
      marker = document.createElement("div");
      marker.className = `team-marker team-marker--${avatar.color}`;
      marker.dataset.teamId = team.teamId;
      marker.dataset.facing = avatar.facing;

      const sprite = document.createElement("span");
      sprite.className = "team-marker__sprite";
      sprite.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "team-marker__label";
      marker.append(sprite, label);
      stageElement.append(marker);
    }

    marker.style.setProperty("--x", `${position.x}%`);
    marker.style.setProperty("--y", `${position.y}%`);
    marker.dataset.label = teams.filter((entry) => entry.phase === team.phase).length <= LABELLED_FORMATION_MAX
      ? "visible"
      : "hidden";
    marker.title = `${team.name}: ${PHASE_DETAILS[team.phase].title}${team.phase === "blue" ? ` (${team.ciStatus === "clean" ? "CodeQL clean" : "CI pending"})` : ""}`;
    marker.querySelector(".team-marker__label").textContent = team.name;

    if (didAdvance(team) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      marker.dataset.moving = "true";
    }
    currentMarkers.delete(team.teamId);
  }

  currentMarkers.forEach((marker) => marker.remove());
  renderPhaseCounts(teams);
  renderArcadeHud(teams);
}

function renderArcadeHud(teams) {
  const { captured, total } = flagProgress(teams);
  const repaired = teams.filter((team) => team.phase === "green" || team.phase === "blue").length;
  const fill = total ? Math.round((repaired / total) * 100) : 0;
  arcadeGauge.style.setProperty("--fill", `${fill}`);
  arcadeGauge.dataset.level = fill < 34 ? "low" : fill < 67 ? "mid" : "high";
  arcadeFlagStatus.textContent = total
    ? `${captured} / ${total} squad${total === 1 ? "" : "s"}`
    : "Awaiting squads";
}

function renderPhaseCounts(teams) {
  const counts = Object.fromEntries(MISSION_PHASES.map((phase) => [phase, 0]));
  teams.forEach((team) => { counts[team.phase] += 1; });
  document.querySelectorAll("[data-phase-count]").forEach((element) => {
    element.textContent = `${counts[element.dataset.phaseCount] || 0}`;
  });
}

function renderList(teams) {
  teamListElement.replaceChildren();
  if (!teams.length) {
    const empty = document.createElement("p");
    empty.className = "team-list__empty";
    empty.textContent = "Waiting for squads to enter the briefing level.";
    teamListElement.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const team of teams) {
    const details = PHASE_DETAILS[team.phase];
    const item = document.createElement("li");
    item.className = "team-list__item";
    item.dataset.phase = team.phase;

    const name = document.createElement("strong");
    name.textContent = team.name;
    const squad = document.createElement("span");
    squad.className = "team-list__phase";
    squad.textContent = details.squad;
    const mission = document.createElement("span");
    mission.textContent = details.title;
    const verification = document.createElement("span");
    verification.textContent = team.phase === "blue"
      ? (team.ciStatus === "clean" ? "CodeQL clean" : "CI pending")
      : "Local verification";
    const updated = document.createElement("time");
    updated.className = "team-list__updated";
    updated.dateTime = team.updatedAt || "";
    updated.textContent = formatUpdatedAt(team.updatedAt);
    item.append(name, squad, mission, verification, updated);
    fragment.append(item);
  }
  teamListElement.append(fragment);
}

function render(teams) {
  document.body.dataset.cohortSize = `${teams.length}`;
  document.body.dataset.density = teams.length > 40 ? "full" : teams.length > 25 ? "busy" : "open";
  renderStage(teams);
  renderCollectiveProgress(teams);
  renderList(teams);
  countElement.textContent = `${teams.length} active squad${teams.length === 1 ? "" : "s"} · capacity ${MAX_TEAMS}`;
}

async function pollState() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const response = await fetch("/api/state", { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Board responded with ${response.status}`);
    latestTeams = teamsFrom(await response.json())
      .map(normalizeTeam)
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, MAX_TEAMS);
    render(latestTeams);
    statusElement.textContent = "Live board connected";
    statusElement.dataset.tone = "ok";
  } catch {
    render(latestTeams);
    statusElement.textContent = "Connection issue — retrying";
    statusElement.dataset.tone = "warning";
  } finally {
    pollInFlight = false;
  }
}

render(latestTeams);
pollState();
window.setInterval(pollState, POLL_INTERVAL_MS);
