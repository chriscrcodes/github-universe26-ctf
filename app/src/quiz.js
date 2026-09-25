const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const QUIZ_PHASES = ["red", "purple", "green", "blue"];

function questionBankPath() {
  return path.resolve(
    process.env.QUIZ_BANK_FILE || path.join(__dirname, "..", "..", "workshop", "quiz", "questions.json")
  );
}

function loadQuestionBank() {
  const bank = JSON.parse(fs.readFileSync(questionBankPath(), "utf8"));
  if (
    bank.schemaVersion !== 1
    || typeof bank.salt !== "string"
    || bank.minimumAnswers !== 3
    || bank.minimumTopics !== 3
    || !Array.isArray(bank.questions)
    || bank.questions.length === 0
  ) {
    throw new Error("The quiz question bank is invalid.");
  }
  const questionIds = new Set();
  for (const question of bank.questions) {
    if (!question || typeof question !== "object") {
      throw new Error("The quiz question <unknown> is invalid.");
    }
    const options = Array.isArray(question.options) ? question.options : [];
    const optionIds = new Set(options.map((option) => option?.id));
    if (
      typeof question.id !== "string"
      || questionIds.has(question.id)
      || typeof question.topic !== "string"
      || typeof question.prompt !== "string"
      || !QUIZ_PHASES.includes(question.phase)
      || options.length !== 3
      || optionIds.size !== 3
      || options.some((option) => !option || typeof option.text !== "string")
      || !/^[a-f0-9]{64}$/.test(question.answerHash)
      || options.filter((option) => answerHash(bank.salt, question.id, option.id) === question.answerHash).length !== 1
    ) {
      throw new Error(`The quiz question ${question.id || "<unknown>"} is invalid.`);
    }
    questionIds.add(question.id);
  }
  return bank;
}

function answerHash(salt, questionId, optionId) {
  return crypto.createHash("sha256").update(`${salt}:${questionId}:${optionId}`).digest("hex");
}

function parseAnswers(value) {
  return String(value || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [questionId, optionId] = pair.split(":").map((part) => (part || "").trim());
      if (!questionId || !optionId) {
        throw new Error(`Expected answers in <question-id>:<option-id> form, received "${pair}".`);
      }
      return { questionId, optionId };
    });
}

function questionsForPhase(bank, phase) {
  if (!QUIZ_PHASES.includes(phase)) {
    throw new Error(`Expected a quiz phase from ${QUIZ_PHASES.join(", ")}.`);
  }
  return bank.questions.filter((question) => (question.phase || "purple") === phase);
}

function selectQuestions(bank, phase, random = Math.random) {
  const phaseQuestions = questionsForPhase(bank, phase);
  const byTopic = new Map();
  for (const question of phaseQuestions) {
    if (!byTopic.has(question.topic)) byTopic.set(question.topic, []);
    byTopic.get(question.topic).push(question);
  }
  if (byTopic.size < bank.minimumTopics) {
    throw new Error(`The ${phase} quiz does not cover ${bank.minimumTopics} topics.`);
  }

  const topics = [...byTopic.keys()];
  for (let index = topics.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [topics[index], topics[swapIndex]] = [topics[swapIndex], topics[index]];
  }
  return topics.slice(0, bank.minimumTopics).map((topic) => {
    const candidates = byTopic.get(topic);
    const question = candidates[Math.floor(random() * candidates.length) % candidates.length];
    return { id: question.id, topic: question.topic, prompt: question.prompt, options: question.options };
  });
}

function gradeAnswers(bank, answers, { phase, seed }) {
  const selected = selectQuestions(bank, phase, seededRandom(seed));
  if (answers.length !== selected.length) {
    return { passed: false, error: `Answer exactly ${selected.length} selected questions.` };
  }

  const seen = new Set();
  const topics = new Set();
  const selectedIds = new Set(selected.map((question) => question.id));
  const coached = [];
  const answerHashes = [];
  for (const { questionId, optionId } of answers) {
    if (seen.has(questionId)) {
      return { passed: false, error: `Question ${questionId} was answered twice.` };
    }
    seen.add(questionId);

    const question = bank.questions.find((candidate) => candidate.id === questionId);
    if (!question) {
      return { passed: false, error: `Unknown question: ${questionId}.` };
    }
    if (!selectedIds.has(questionId)) {
      return { passed: false, error: `Question ${questionId} was not selected for this checkpoint.` };
    }
    if (!question.options.some((option) => option.id === optionId)) {
      return { passed: false, error: `Unknown option "${optionId}" for question ${questionId}.` };
    }
    if (answerHash(bank.salt, questionId, optionId) !== question.answerHash) {
      const correctOption = question.options.find((option) => (
        answerHash(bank.salt, questionId, option.id) === question.answerHash
      ));
      coached.push({
        questionId,
        correctOptionId: correctOption.id,
        correctOptionText: correctOption.text,
      });
    }
    topics.add(question.topic);
    answerHashes.push({ questionId, answerHash: question.answerHash });
  }

  if (topics.size !== bank.minimumTopics) {
    return {
      passed: false,
      error: `Cover exactly ${bank.minimumTopics} different topics; only ${topics.size} were covered.`,
    };
  }

  return {
    passed: true,
    topics: [...topics].sort(),
    questionIds: selected.map((question) => question.id),
    answerHashes,
    coached,
  };
}

function checkAnswer(bank, questionId, optionId, { phase, seed }) {
  const selected = selectQuestions(bank, phase, seededRandom(seed));
  const question = selected.find((candidate) => candidate.id === questionId);
  if (!question) return { error: `Question ${questionId} was not selected for this checkpoint.` };
  if (!question.options.some((option) => option.id === optionId)) {
    return { error: `Unknown option "${optionId}" for question ${questionId}.` };
  }
  const sourceQuestion = bank.questions.find((candidate) => candidate.id === questionId);
  const correctOption = question.options.find((option) => (
    answerHash(bank.salt, questionId, option.id) === sourceQuestion.answerHash
  ));
  if (optionId === correctOption.id) return { correct: true };
  return {
    correct: false,
    correctOptionId: correctOption.id,
    correctOptionText: correctOption.text,
  };
}

function seededRandom(seed) {
  let state = 0;
  for (const character of String(seed)) state = (state * 31 + character.charCodeAt(0)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function validateCheckpoint(bank, phase, seed, receipt) {
  if (
    !receipt
    || receipt.version !== 1
    || receipt.phase !== phase
    || receipt.seed !== seed
    || receipt.passed !== true
    || !Array.isArray(receipt.questionIds)
    || !Array.isArray(receipt.answerHashes)
    || !Array.isArray(receipt.topics)
  ) {
    return "Missing or invalid quiz receipt.";
  }

  const expected = selectQuestions(bank, phase, seededRandom(seed));
  const expectedIds = expected.map((question) => question.id);
  if (JSON.stringify(receipt.questionIds) !== JSON.stringify(expectedIds)) {
    return "Quiz receipt does not match the deterministic question set.";
  }
  if (receipt.answerHashes.length !== expected.length) {
    return "Quiz receipt does not contain exactly one answer per question.";
  }
  const coachedQuestionIds = receipt.coachedQuestions || [];
  if (!Array.isArray(coachedQuestionIds)
    || new Set(coachedQuestionIds).size !== coachedQuestionIds.length
    || coachedQuestionIds.some((questionId) => !expectedIds.includes(questionId))) {
    return "Quiz receipt contains invalid coached question records.";
  }
  const answersByQuestion = new Map(receipt.answerHashes.map((answer) => [answer.questionId, answer.answerHash]));
  if (
    answersByQuestion.size !== expected.length
    || expected.some((question) => (
      answersByQuestion.get(question.id) !== bank.questions.find((entry) => entry.id === question.id)?.answerHash
    ))
  ) {
    return "Quiz receipt contains an incorrect or duplicate answer.";
  }

  const expectedTopics = [...new Set(expected.map((question) => question.topic))].sort();
  if (JSON.stringify(receipt.topics) !== JSON.stringify(expectedTopics)) {
    return "Quiz receipt topic coverage is invalid.";
  }
  return null;
}

module.exports = {
  QUIZ_PHASES,
  answerHash,
  checkAnswer,
  gradeAnswers,
  loadQuestionBank,
  parseAnswers,
  questionsForPhase,
  questionBankPath,
  seededRandom,
  selectQuestions,
  validateCheckpoint,
};
