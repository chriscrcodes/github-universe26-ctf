const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function questionBankPath() {
  return path.resolve(
    process.env.QUIZ_BANK_FILE || path.join(__dirname, "..", "..", "workshop", "quiz", "questions.json")
  );
}

function loadQuestionBank() {
  const bank = JSON.parse(fs.readFileSync(questionBankPath(), "utf8"));
  if (bank.schemaVersion !== 1 || !Array.isArray(bank.questions) || bank.questions.length === 0) {
    throw new Error("The quiz question bank is invalid.");
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

// Mentor selects the questions; this grader only confirms that enough distinct
// topics were answered correctly, and never reveals the expected option.
function gradeAnswers(bank, answers) {
  if (answers.length < bank.minimumAnswers) {
    return { passed: false, error: `Answer at least ${bank.minimumAnswers} questions.` };
  }

  const seen = new Set();
  const topics = new Set();
  for (const { questionId, optionId } of answers) {
    if (seen.has(questionId)) {
      return { passed: false, error: `Question ${questionId} was answered twice.` };
    }
    seen.add(questionId);

    const question = bank.questions.find((candidate) => candidate.id === questionId);
    if (!question) {
      return { passed: false, error: `Unknown question: ${questionId}.` };
    }
    if (!question.options.some((option) => option.id === optionId)) {
      return { passed: false, error: `Unknown option "${optionId}" for question ${questionId}.` };
    }
    if (answerHash(bank.salt, questionId, optionId) !== question.answerHash) {
      return { passed: false, error: `Answer to ${questionId} is incorrect.`, incorrect: questionId };
    }
    topics.add(question.topic);
  }

  if (topics.size < bank.minimumTopics) {
    return {
      passed: false,
      error: `Cover at least ${bank.minimumTopics} different topics; only ${topics.size} were covered.`,
    };
  }

  return { passed: true, topics: [...topics] };
}

function selectQuestions(bank, count = bank.minimumTopics, random = Math.random) {
  const byTopic = new Map();
  for (const question of bank.questions) {
    if (!byTopic.has(question.topic)) byTopic.set(question.topic, []);
    byTopic.get(question.topic).push(question);
  }

  const topics = [...byTopic.keys()].sort(() => random() - 0.5);
  return topics.slice(0, count).map((topic) => {
    const candidates = byTopic.get(topic);
    const question = candidates[Math.floor(random() * candidates.length) % candidates.length];
    return { id: question.id, topic: question.topic, prompt: question.prompt, options: question.options };
  });
}

module.exports = {
  answerHash,
  gradeAnswers,
  loadQuestionBank,
  parseAnswers,
  questionBankPath,
  selectQuestions,
};
