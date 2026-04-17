const DEFAULT_API_CONFIG = {
  apiBase: "https://common-ai-api.makiron19831014.workers.dev",
  appId: "coaching-company-web",
  guestId: "logic-lab",
  studentKey: "company-demo-student",
  questionMode: "past_exam",
};

const elements = {
  loadStateButton: document.getElementById("loadStateButton"),
  loadQuestionButton: document.getElementById("loadQuestionButton"),
  clearLogButton: document.getElementById("clearLogButton"),
  logOutput: document.getElementById("logOutput"),
  reflectionForm: document.getElementById("reflectionForm"),
  reflectionLabel: document.getElementById("reflectionLabel"),
  reflectionInput: document.getElementById("reflectionInput"),
};

let currentApiQuestion = null;
let sessionState = {
  step: "idle",
  availableTime: null,
  plan: null,
  branchIndex: 0,
  branchAnswers: [],
  wholeAnswer: null,
};
let derivedState = {
  riskLevel: "medium",
  recentWeakTopic: "",
  selectedOptionIndex: 1,
  correctOptionIndex: null,
};

function appendLog(label, payload) {
  const timestamp = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  const block = [`[${timestamp}] ${label}`, typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)].join("\n");
  elements.logOutput.textContent = elements.logOutput.textContent
    ? `${elements.logOutput.textContent}\n\n${block}`
    : block;
  elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
}

function readApiConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    apiBase: params.get("apiBase") || DEFAULT_API_CONFIG.apiBase,
    appId: params.get("appId") || DEFAULT_API_CONFIG.appId,
    guestId: params.get("guestId") || DEFAULT_API_CONFIG.guestId,
    studentKey: params.get("studentKey") || DEFAULT_API_CONFIG.studentKey,
    questionMode: params.get("questionMode") || DEFAULT_API_CONFIG.questionMode,
  };
}

function setApiStatus(message, isError = false) {
  appendLog("api-status", { message, isError });
}

function setSessionStepLabel(text) {
  document.getElementById("sessionStepLabel").textContent = text;
}

function setCoachMessage(text) {
  document.getElementById("coachMessage").textContent = text;
}

function setSessionCard(label, title, body) {
  document.getElementById("sessionPromptLabel").textContent = label;
  document.getElementById("sessionPromptTitle").textContent = title;
  document.getElementById("sessionPromptBody").textContent = body;
}

function toggleElement(id, hidden) {
  document.getElementById(id).hidden = hidden;
}

function setSessionModeBadge(text) {
  document.getElementById("sessionModeBadge").textContent = text;
}

function updateSessionTopic() {
  document.getElementById("sessionTopic").textContent = currentApiQuestion?.subject || "問題を読み込むと表示されます";
}

async function postApi(path, body) {
  const config = readApiConfig();
  appendLog("api-request", { path, body, headers: { "x-app-id": config.appId, "x-guest-id": config.guestId } });
  const response = await fetch(`${config.apiBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-app-id": config.appId,
      "x-guest-id": config.guestId,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  appendLog("api-response", { path, status: response.status, payload });
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || `Request failed: ${path}`);
  }
  return payload;
}

function renderStudentState(payload) {
  const studentState = payload.studentState || {};
  if (studentState.currentSubject) {
    derivedState.recentWeakTopic = studentState.currentSubject;
  }
  if (studentState.riskLevel) {
    derivedState.riskLevel = studentState.riskLevel;
  }
  if (studentState.currentSubject) {
    document.getElementById("sessionTopic").textContent = studentState.currentSubject;
  }
}

function renderQuestionFromApi(question) {
  currentApiQuestion = question;
  sessionState = {
    step: "idle",
    availableTime: null,
    plan: null,
    branchIndex: 0,
    branchAnswers: [],
    wholeAnswer: null,
  };
  if (question?.stem) {
    derivedState.stem = question.stem;
  }
  derivedState.correctOptionIndex = getCorrectOptionIndexFromQuestion(question);
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  if (choices.length > 0) {
    derivedState.selectedOptionIndex = 1;
  }
  appendLog("question-answer-key", {
    questionId: question?.id || null,
    correctOptionIndex: derivedState.correctOptionIndex,
  });
  renderSession();
}

async function loadStudentStateFromApi() {
  setApiStatus("学習状態を読み込み中...");
  elements.loadStateButton.disabled = true;

  try {
    const payload = await postApi("/coaching/student-state", {});
    renderStudentState(payload);
    setApiStatus("学習状態を読み込みました。");
  } catch (error) {
    setApiStatus(error instanceof Error ? error.message : "学習状態の読み込みに失敗しました。", true);
  } finally {
    elements.loadStateButton.disabled = false;
  }
}

async function loadQuestionFromApi() {
  const config = readApiConfig();
  setApiStatus("問題を読み込み中...");
  elements.loadQuestionButton.disabled = true;

  try {
    const payload = await postApi("/coaching/company-question", {
      studentKey: config.studentKey,
      questionMode: config.questionMode,
    });
    renderQuestionFromApi(payload.question);
    setApiStatus("問題を読み込みました。");
  } catch (error) {
    setApiStatus(error instanceof Error ? error.message : "問題の読み込みに失敗しました。", true);
  } finally {
    elements.loadQuestionButton.disabled = false;
  }
}

async function submitSelectedAnswerToApi() {
  if (!currentApiQuestion?.id) {
    setApiStatus("先に問題を読み込んでください。", true);
    return;
  }

  const config = readApiConfig();
  const selected = Number(derivedState.selectedOptionIndex || sessionState.wholeAnswer || 1);
  setApiStatus("回答を送信中...");

  try {
    const payload = await postApi("/coaching/company-submit-answer", {
      studentKey: config.studentKey,
      questionId: currentApiQuestion.id,
      selected,
      questionMode: config.questionMode,
    });
    renderStudentState(payload);
    sessionState.step = "whole_feedback";
    renderSession(payload.result);
    setApiStatus("回答を送信しました。");
  } catch (error) {
    setApiStatus(error instanceof Error ? error.message : "回答送信に失敗しました。", true);
  }
}

function buildSessionPlanText() {
  const plan = deriveSessionPlan({
    availableTime: sessionState.availableTime,
    riskLevel: derivedState.riskLevel,
    recentWeakTopic: derivedState.recentWeakTopic,
  });
  setSessionModeBadge(plan.sessionMode);
  return plan;
}

function renderSession(resultPayload = null) {
  updateSessionTopic();
  toggleElement("timeChoiceRow", true);
  toggleElement("branchActionRow", true);
  toggleElement("wholeActionRow", true);
  toggleElement("nextSessionButton", true);
  toggleElement("reflectionForm", true);

  if (!currentApiQuestion) {
    setSessionStepLabel("Step 0 / 5");
    setSessionModeBadge("未開始");
    setCoachMessage("まずは common-ai-api から問題を読み込みます。読み込めたら、時間を決めて1肢ずつ進めましょう。");
    setSessionCard("Session", "準備中", "「問題を読む」で過去問を取り込むと、ここにセッション本体を表示します。");
    return;
  }

  if (sessionState.step === "idle") {
    setSessionStepLabel("Step 1 / 5");
    setSessionModeBadge("start");
    setCoachMessage("今日も短く進めましょう。まずは使える時間を決めます。");
    setSessionCard("Start", "今日の時間を決めます", "この1問は 1肢ずつ確認してから、本問4択に戻します。");
    return;
  }

  if (sessionState.step === "time_check") {
    setSessionStepLabel("Step 1 / 5");
    setSessionModeBadge("time_check");
    setCoachMessage("今日は何分くらい取れそうですか？");
    setSessionCard("Time Check", "可処分時間を選択してください", "時間に合わせて、今日の進め方をこちらで決めます。");
    toggleElement("timeChoiceRow", false);
    return;
  }

  if (sessionState.step === "branch_question") {
    const currentChoice = currentApiQuestion.choices[sessionState.branchIndex];
    const plan = sessionState.plan || buildSessionPlanText();
    setSessionStepLabel(`Step 3 / 5`);
    setSessionModeBadge("branch_review");
    setCoachMessage(
      sessionState.branchIndex === 0
        ? `今日は ${plan.reason} ${plan.nextAction} まずは ${sessionState.branchIndex + 1}肢目です。この記述をどう見ますか？`
        : `次は ${sessionState.branchIndex + 1}肢目です。この記述をどう見ますか？`,
    );
    setSessionCard(
      `Choice ${sessionState.branchIndex + 1}`,
      "この記述は正しいと思いますか？",
      `${sessionState.branchIndex + 1}. ${currentChoice}`,
    );
    toggleElement("branchActionRow", false);
    return;
  }

  if (sessionState.step === "branch_feedback") {
    const latest = sessionState.branchAnswers[sessionState.branchAnswers.length - 1];
    const branchTruth = evaluateBranchAnswer(latest);
    const title = branchTruth.isKnown
      ? branchTruth.isCorrect
        ? "正解です"
        : "今回は誤りです"
      : "この肢の正誤は未判定です";
    const lead = branchTruth.isKnown
      ? branchTruth.isCorrect
        ? "その判断で大丈夫です。短く根拠を残して次へ進みます。"
        : "ここは見直し候補です。どこでそう見えたかを短く残します。"
      : "この問題データには正答肢情報が含まれていないため、この肢の正誤は後段で確認します。";
    setSessionStepLabel("Step 3 / 5");
    setCoachMessage(lead);
    setSessionCard(
      "Review",
      title,
      [
        "今の問題",
        currentApiQuestion.stem,
        "",
        "今ここ",
        `${latest.index + 1}. ${currentApiQuestion.choices[latest.index] || ""}`,
        "",
        `あなたの判断: ${formatBranchAnswer(latest.answer)}`,
        branchTruth.isKnown ? `この肢の正誤: ${branchTruth.actualTruthLabel}` : "この肢の正誤: 判定情報なし",
        branchTruth.reason ? branchTruth.reason : "",
      ].join("\n"),
    );
    elements.reflectionLabel.textContent = buildReflectionPrompt(latest.answer);
    elements.reflectionInput.placeholder = buildReflectionPlaceholder(latest.answer);
    elements.reflectionInput.value = latest.reflection || "";
    toggleElement("reflectionForm", false);
    if (latest.reflection) {
      setCoachMessage(branchTruth.isKnown ? "整理できました。次の肢へ進みます。" : "整理を記録しました。次の肢へ進みます。");
      toggleElement("nextSessionButton", false);
    }
    return;
  }

  if (sessionState.step === "whole_question") {
    setSessionStepLabel("Step 4 / 5");
    setSessionModeBadge("whole_question");
    setCoachMessage("4肢を見終わったので、本問形式でまとめます。正しいものを1つ選んでください。");
    setSessionCard("Whole Question", currentApiQuestion.stem, currentApiQuestion.choices.map((choice, index) => `${index + 1}. ${choice}`).join("\n"));
    toggleElement("wholeActionRow", false);
    return;
  }

  if (sessionState.step === "whole_feedback" && resultPayload) {
    const diagnostic = decideDiagnosticBranch({
      understanding: sessionState.branchAnswers.some((item) => item.answer === "unknown") ? "uneven" : "stable",
      wholeQuestionResult: resultPayload.isCorrect ? "correct" : "incorrect",
      unknownCount: sessionState.branchAnswers.filter((item) => item.answer === "unknown").length,
    });
    setSessionStepLabel("Step 5 / 5");
    setSessionModeBadge(resultPayload.isCorrect ? "summary" : "diagnostic_check");
    setCoachMessage(
      resultPayload.isCorrect
        ? "正解です。今回は大きく崩れていません。まとめに進めます。"
        : "今回は誤答でした。原因を切り分けるための追加確認が必要です。",
    );
    setSessionCard(
      resultPayload.isCorrect ? "Summary" : "Diagnostic Trigger",
      resultPayload.isCorrect ? "この1問は取れています" : "追加診断が必要です",
      `${diagnostic.reason} 正答は ${resultPayload.correct} です。 ${resultPayload.explanation || ""}`,
    );
    return;
  }
}

function startSession() {
  if (!currentApiQuestion) {
    setCoachMessage("先に問題を読み込むと、セッションを開始できます。");
    appendLog("session-warning", "question_not_loaded");
    return;
  }
  sessionState.step = "time_check";
  setCoachMessage("今日は何分くらい取れそうですか？");
  appendLog("session-step", sessionState);
  renderSession();
}

function handleTimeChoice(time) {
  sessionState.availableTime = time;
  sessionState.plan = buildSessionPlanText();
  sessionState.step = "branch_question";
  appendLog("session-time-selected", sessionState);
  renderSession();
}

function handleNextSession() {
  if (sessionState.step === "branch_feedback") {
    if (sessionState.branchIndex >= 3) {
      sessionState.step = "whole_question";
    } else {
      sessionState.branchIndex += 1;
      sessionState.step = "branch_question";
    }
  }
  appendLog("session-next", sessionState);
  renderSession();
}

function handleBranchAnswer(answer) {
  sessionState.branchAnswers.push({
    index: sessionState.branchIndex,
    answer,
    reflection: "",
  });
  sessionState.step = "branch_feedback";
  appendLog("session-branch-answer", sessionState.branchAnswers[sessionState.branchAnswers.length - 1]);
  renderSession();
}

function formatBranchAnswer(answer) {
  if (answer === "correct") return "この記述は正しいと思った";
  if (answer === "incorrect") return "この記述は誤りだと思った";
  return "まだ判断がつかなかった";
}

function getCorrectOptionIndexFromQuestion(question) {
  const candidates = [
    question?.correctChoice,
    question?.correct_choice,
    question?.correct,
    question?.answer,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 4) {
      return numeric;
    }
  }
  return null;
}

function getQuestionModeForBranchReview() {
  return inferQuestionMode(currentApiQuestion?.stem || derivedState.stem || "");
}

function evaluateBranchAnswer(latest) {
  const correctOptionIndex = derivedState.correctOptionIndex;
  if (!latest || !correctOptionIndex) {
    return {
      isKnown: false,
      isCorrect: false,
      actualTruthLabel: "",
      reason: "",
    };
  }

  const questionMode = getQuestionModeForBranchReview();
  const selectedOptionTruth = getSelectedOptionTruth({
    questionMode,
    selectedOptionIndex: latest.index + 1,
    correctOptionIndex,
  });

  let learnerBelief = "unknown";
  if (latest.answer === "correct") learnerBelief = "thought_true";
  if (latest.answer === "incorrect") learnerBelief = "thought_false";

  let isCorrect = false;
  if (latest.answer === "unknown") {
    isCorrect = false;
  } else if (learnerBelief === "thought_true" && selectedOptionTruth === true) {
    isCorrect = true;
  } else if (learnerBelief === "thought_false" && selectedOptionTruth === false) {
    isCorrect = true;
  }

  return {
    isKnown: true,
    isCorrect,
    actualTruthLabel: selectedOptionTruth ? "正しい記述" : "誤りの記述",
    reason:
      latest.answer === "unknown"
        ? "今回は「わからない」で保留しています。"
        : selectedOptionTruth
          ? "この肢は客観的には正しい記述です。"
          : "この肢は客観的には誤りの記述です。",
  };
}

function buildReflectionPrompt(answer) {
  if (answer === "correct") {
    return "そのように見た理由を一言で整理してください";
  }
  if (answer === "incorrect") {
    return "どの部分に違和感があったかを一言で整理してください";
  }
  return "いま迷っている点を一言で整理してください";
}

function buildReflectionPlaceholder(answer) {
  if (answer === "correct") {
    return "例: 原則どおりの記述だと見ました";
  }
  if (answer === "incorrect") {
    return "例: この言い方が強すぎると思いました";
  }
  return "例: 要件と例外の区別で迷っています";
}

function handleReflectionSubmit(event) {
  event.preventDefault();
  if (sessionState.step !== "branch_feedback") return;

  const latest = sessionState.branchAnswers[sessionState.branchAnswers.length - 1];
  const reflection = elements.reflectionInput.value.trim();
  if (!latest || !reflection) return;

  latest.reflection = reflection;
  appendLog("session-branch-reflection", {
    index: latest.index,
    answer: latest.answer,
    reflection,
  });
  renderSession();
}

function handleWholeAnswer(choice) {
  sessionState.wholeAnswer = Number(choice);
  derivedState.selectedOptionIndex = Number(choice);
  appendLog("session-whole-answer", { choice: sessionState.wholeAnswer });
  submitSelectedAnswerToApi();
}

function inferQuestionMode(stem = "") {
  const normalized = String(stem);
  const asksTrue = /正しいものはどれか|適切なものはどれか/.test(normalized);
  const asksFalse = /不適切|誤っている|誤り/.test(normalized);

  if (asksTrue && !asksFalse) return "pick_true";
  if (asksFalse) return "pick_false";
  return "pick_true";
}

function getSelectedOptionTruth({ questionMode, selectedOptionIndex, correctOptionIndex }) {
  if (questionMode === "pick_true") {
    return selectedOptionIndex === correctOptionIndex;
  }
  return selectedOptionIndex !== correctOptionIndex;
}

function getFollowup(input) {
  const {
    questionMode,
    selectedOptionTruth,
    learnerBeliefAboutSelected,
    selectedOptionIndex,
    correctOptionIndex,
  } = input;

  if (questionMode === "pick_true") {
    if (selectedOptionTruth === false && learnerBeliefAboutSelected === "thought_true") {
      return {
        step1: `今、考え直すと、${selectedOptionIndex}のどこが間違っていると思いますか？`,
        step2: `${correctOptionIndex}はなぜ正しくないと思ったのですか？`,
        mode: "reconsider_selected_then_check_correct",
      };
    }

    if (selectedOptionTruth === true && learnerBeliefAboutSelected === "thought_true") {
      return {
        step1: "はい、この肢は正しいです。ポイントを確認しましょう。",
        step2: "",
        mode: "explain",
      };
    }

    if (selectedOptionTruth === true && learnerBeliefAboutSelected === "thought_false") {
      return {
        step1: "この肢は正しい内容です。どの部分を誤りだと思いましたか？",
        step2: "",
        mode: "reconsider_why_rejected_true_option",
      };
    }

    if (selectedOptionTruth === false && learnerBeliefAboutSelected === "thought_false") {
      return {
        step1: "この肢は誤りです。どこがポイントか確認しましょう。",
        step2: "",
        mode: "explain",
      };
    }
  }

  if (questionMode === "pick_false") {
    if (selectedOptionTruth === true && learnerBeliefAboutSelected === "thought_false") {
      return {
        step1: `今、考え直すと、${selectedOptionIndex}のどこを誤りだと思ったのですか？`,
        step2: `${correctOptionIndex}はなぜ残したのですか？`,
        mode: "reconsider_selected_then_check_correct",
      };
    }

    if (selectedOptionTruth === false && learnerBeliefAboutSelected === "thought_false") {
      return {
        step1: "はい、この肢は誤りです。ポイントを確認しましょう。",
        step2: "",
        mode: "explain",
      };
    }

    if (selectedOptionTruth === false && learnerBeliefAboutSelected === "thought_true") {
      return {
        step1: "この肢は誤りです。どの部分を正しいと思いましたか？",
        step2: "",
        mode: "reconsider_why_accepted_false_option",
      };
    }

    if (selectedOptionTruth === true && learnerBeliefAboutSelected === "thought_true") {
      return {
        step1: "この肢は正しいです。ポイントを確認しましょう。",
        step2: "",
        mode: "explain",
      };
    }
  }

  return {
    step1: "判定できませんでした。分岐条件を見直してください。",
    step2: "",
    mode: "error",
  };
}

function deriveSessionPlan({ availableTime, riskLevel, recentWeakTopic }) {
  let sessionMode = "advance";

  if (riskLevel === "high") {
    sessionMode = "recovery";
  } else if (riskLevel === "medium" || recentWeakTopic) {
    sessionMode = "stabilize";
  }

  let questionCount = 3;
  if (availableTime === "short") {
    questionCount = 2;
  } else if (availableTime === "long") {
    questionCount = sessionMode === "advance" ? 4 : 3;
  } else {
    questionCount = sessionMode === "advance" ? 3 : 2;
  }

  const introTopic = recentWeakTopic || "前回の弱点トピック";
  const reason =
    sessionMode === "recovery"
      ? "直近リスクが高いため、まずは立て直しを優先します。"
      : sessionMode === "stabilize"
        ? "理解がまだ揺れやすいため、今日は定着を優先します。"
        : "理解が比較的安定しているため、今日は前進を優先します。";
  const nextAction =
    sessionMode === "recovery"
      ? `導入1問＋本題1問で軽く立て直します。`
      : sessionMode === "stabilize"
        ? `導入1問＋本題${Math.max(1, questionCount - 1)}問で固めます。`
        : `導入1問＋本題${Math.max(1, questionCount - 1)}問で前に進めます。`;

  return {
    sessionMode,
    questionCount,
    introTopic,
    reason,
    nextAction,
  };
}

function decideDiagnosticBranch({ understanding, wholeQuestionResult, unknownCount }) {
  const reasons = [];

  if (understanding === "uneven") {
    reasons.push("肢ごとの理解にばらつきがあります。");
  }

  if (wholeQuestionResult === "incorrect") {
    reasons.push("4択統合で比較に失敗しています。");
  }

  if (Number(unknownCount) >= 2) {
    reasons.push("「わからない」が続いています。");
  }

  if (reasons.length === 0) {
    return {
      shouldDiagnose: false,
      reason: "今回は追加診断なしでまとめへ進めます。",
      next: "summary",
    };
  }

  return {
    shouldDiagnose: true,
    reason: reasons.join(" "),
    next: "diagnostic_intro -> diagnostic_step -> intervention",
  };
}

function init() {
  elements.loadStateButton.addEventListener("click", loadStudentStateFromApi);
  elements.loadQuestionButton.addEventListener("click", loadQuestionFromApi);
  elements.clearLogButton.addEventListener("click", () => {
    elements.logOutput.textContent = "";
  });
  elements.reflectionForm.addEventListener("submit", handleReflectionSubmit);
  document.getElementById("startSessionButton").addEventListener("click", startSession);
  document.getElementById("nextSessionButton").addEventListener("click", handleNextSession);
  document.querySelectorAll(".time-choice-button").forEach((button) => {
    button.addEventListener("click", () => handleTimeChoice(button.dataset.time));
  });
  document.querySelectorAll(".branch-answer-button").forEach((button) => {
    button.addEventListener("click", () => handleBranchAnswer(button.dataset.answer));
  });
  document.querySelectorAll(".whole-answer-button").forEach((button) => {
    button.addEventListener("click", () => handleWholeAnswer(button.dataset.choice));
  });
  renderSession();
}

init();
