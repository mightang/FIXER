// ========================
// 탭 전환 & 사이드바 토글
// ========================

// 사이드바 내 탭 버튼들
const navItems = document.querySelectorAll(".nav-item");
// 메인 패널들
const panels = document.querySelectorAll(".panel");

// 탭 전환
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.dataset.tab;

    // 사이드바 탭 활성/비활성
    navItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    // 패널 전환
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === targetId);
    });

    // 시각화 도구 탭으로 돌아올 때 캔버스 크기 재조정
    if (targetId === "visualizer") {
      resizeCanvas();
    }
  });
});

// 사이드바 토글
const appRoot = document.querySelector(".app");
const sidebarToggleBtn = document.getElementById("sidebarToggle");

// 초기 아이콘: 펼쳐진 상태니까 "⮜" (접기)
sidebarToggleBtn.textContent = "⮜";

sidebarToggleBtn.addEventListener("click", () => {
  const collapsed = appRoot.classList.toggle("sidebar-collapsed");
  sidebarToggleBtn.textContent = collapsed ? "☰" : "⮜";
  resizeCanvas();
});

// ========================
// 시각화 도구 - 그림판
// ========================

const canvas = document.getElementById("drawCanvas");
const canvasWrapper = document.querySelector(".canvas-wrapper");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const clearButton = document.getElementById("clearBoardBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

let currentTool = "circle"; // 기본 도구: 정점(원)
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentFreehand = null; // 자유곡선 임시 저장
let shapes = []; // 그려진 모든 도형을 저장

// Undo/Redo 스택
let history = [];
let redoStack = [];

function setCurrentTool(tool) {
  currentTool = tool;
  toolButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });
}

// 히스토리 스냅샷 저장
function saveHistory(initial = false) {
  const snapshot = JSON.parse(JSON.stringify(shapes));
  history.push(snapshot);
  if (!initial) {
    // 새로운 작업이 생기면 redo 스택은 비워짐
    redoStack = [];
  }
  updateHistoryButtons();
}

// undo/redo 버튼 활성/비활성 업데이트
function updateHistoryButtons() {
  if (!undoBtn || !redoBtn) return;
  undoBtn.disabled = history.length <= 1; // 초기 상태 1개일 때는 되돌릴 수 없음
  redoBtn.disabled = redoStack.length === 0;
}

// Undo
function undo() {
  if (history.length <= 1) return;
  const current = history.pop(); // 현재 상태를 redoStack으로
  redoStack.push(current);

  const prev = history[history.length - 1];
  shapes = JSON.parse(JSON.stringify(prev));
  redraw();
  updateHistoryButtons();
}

// Redo
function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  history.push(JSON.parse(JSON.stringify(next)));
  shapes = JSON.parse(JSON.stringify(next));
  redraw();
  updateHistoryButtons();
}

// 도구 버튼 이벤트
if (toolButtons.length > 0) {
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      setCurrentTool(tool);
    });
  });
}

// 초기화 버튼
if (clearButton) {
  clearButton.addEventListener("click", () => {
    shapes = [];
    saveHistory(); // 초기화도 하나의 작업으로 기록
    redraw();
  });
}

// undo/redo 버튼
if (undoBtn) {
  undoBtn.addEventListener("click", undo);
}
if (redoBtn) {
  redoBtn.addEventListener("click", redo);
}

let ctx = null;

// 캔버스 리사이즈
function resizeCanvas() {
  if (!canvas || !canvasWrapper) return;
  const rect = canvasWrapper.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width;
  canvas.height = rect.height;

  // 크기 변경 후 다시 그리기
  redraw();
}

if (canvas) {
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 최초 상태 히스토리 저장 (빈 보드)
  saveHistory(true);

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);

  // 우클릭 메뉴 막고, 도형 삭제 처리
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    handleRightClick(e);
  });
}

// 좌표 변환
function getCanvasCoords(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function handleMouseDown(e) {
  if (e.button === 2) {
    // 우클릭은 삭제 처리 전용
    return;
  }
  if (!ctx) return;

  const { x, y } = getCanvasCoords(e);
  isDrawing = true;
  startX = x;
  startY = y;

  if (currentTool === "free") {
    currentFreehand = [{ x, y }];
  }
}

function handleMouseMove(e) {
  if (!isDrawing || !ctx) return;
  const { x, y } = getCanvasCoords(e);

  let previewShape = null;

  if (currentTool === "circle") {
    const dx = x - startX;
    const dy = y - startY;
    const r = Math.sqrt(dx * dx + dy * dy);
    previewShape = { type: "circle", cx: startX, cy: startY, r };
  } else if (currentTool === "rect") {
    const x1 = Math.min(startX, x);
    const y1 = Math.min(startY, y);
    const w = Math.abs(x - startX);
    const h = Math.abs(y - startY);
    previewShape = { type: "rect", x: x1, y: y1, w, h };
  } else if (currentTool === "line") {
    previewShape = { type: "line", x1: startX, y1: startY, x2: x, y2: y };
  } else if (currentTool === "free") {
    if (currentFreehand) {
      currentFreehand.push({ x, y });
      previewShape = { type: "free", points: currentFreehand };
    }
  }

  redraw(previewShape);
}

function handleMouseUp(e) {
  if (!isDrawing || !ctx) return;
  isDrawing = false;
  const { x, y } = getCanvasCoords(e);

  let newShape = null;

  if (currentTool === "circle") {
    const dx = x - startX;
    const dy = y - startY;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 2) {
      newShape = { type: "circle", cx: startX, cy: startY, r };
    }
  } else if (currentTool === "rect") {
    const x1 = Math.min(startX, x);
    const y1 = Math.min(startY, y);
    const w = Math.abs(x - startX);
    const h = Math.abs(y - startY);
    if (w > 2 && h > 2) {
      newShape = { type: "rect", x: x1, y: y1, w, h };
    }
  } else if (currentTool === "line") {
    const dx = x - startX;
    const dy = y - startY;
    if (Math.hypot(dx, dy) > 2) {
      newShape = { type: "line", x1: startX, y1: startY, x2: x, y2: y };
    }
  } else if (currentTool === "free") {
    if (currentFreehand && currentFreehand.length > 1) {
      newShape = { type: "free", points: currentFreehand.slice() };
    }
    currentFreehand = null;
  }

  if (newShape) {
    shapes.push(newShape);
    saveHistory(); // 새로운 도형 추가도 히스토리에 기록
  }

  redraw();
}

function handleRightClick(e) {
  if (!ctx) return;
  const { x, y } = getCanvasCoords(e);
  // 마지막에 그린 도형부터 역순으로 검사해서 삭제
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTestShape(shapes[i], x, y)) {
      shapes.splice(i, 1);
      saveHistory();
      redraw();
      break;
    }
  }
}

// 도형 히트 테스트
function hitTestShape(shape, x, y) {
  const tolerance = 6;

  if (shape.type === "circle") {
    const dx = x - shape.cx;
    const dy = y - shape.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= shape.r + tolerance;
  }

  if (shape.type === "rect") {
    return (
      x >= shape.x &&
      x <= shape.x + shape.w &&
      y >= shape.y &&
      y <= shape.y + shape.h
    );
  }

  if (shape.type === "line") {
    return (
      pointToSegmentDistance(x, y, shape.x1, shape.y1, shape.x2, shape.y2) <= tolerance
    );
  }

  if (shape.type === "free" && shape.points && shape.points.length > 1) {
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      if (pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y) <= tolerance) {
        return true;
      }
    }
  }

  return false;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    // 선분이 한 점인 경우
    return Math.hypot(px - x1, py - y1);
  }
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const projX = x1 + clampedT * dx;
  const projY = y1 + clampedT * dy;
  return Math.hypot(px - projX, py - projY);
}

// 다시 그리기
function redraw(previewShape) {
  if (!ctx || !canvas) return;

  // 배경을 흰색으로 채움
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 기존 도형들
  shapes.forEach((shape) => drawShape(shape));

  // 드래그 중인 미리보기
  if (previewShape) {
    drawShape(previewShape, true);
  }
}

// 도형 그리기
function drawShape(shape, isPreview = false) {
  if (!ctx) return;
  ctx.save();
  ctx.lineWidth = isPreview ? 1 : 2;
  ctx.strokeStyle = isPreview ? "#888888" : "#000000";
  ctx.fillStyle = "transparent";

  if (shape.type === "circle") {
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape.type === "rect") {
    ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
  } else if (shape.type === "line") {
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();
  } else if (shape.type === "free" && shape.points && shape.points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ========================
// 문제풀이 기록 탭 - 블로그형 기록
// (목록 화면 / 에디터 화면 전환)
// ========================

const historyListEl = document.getElementById("historyList");
const historyCountEl = document.getElementById("historyCount");
const newEntryBtn = document.getElementById("newEntryBtn");
const saveEntryBtn = document.getElementById("saveEntryBtn");
const deleteEntryBtn = document.getElementById("deleteEntryBtn");
const entrySiteEl = document.getElementById("entrySite");
const entryTitleEl = document.getElementById("entryTitle");
const entryContentEl = document.getElementById("entryContent");
const historyStatusEl = document.getElementById("historyStatus");
const historyListView = document.getElementById("historyListView");
const historyEditorView = document.getElementById("historyEditorView");
const editorModeLabel = document.getElementById("editorModeLabel");
const backToListBtn = document.getElementById("backToListBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

const STORAGE_KEY = "algoHelperProblemNotes";

let entries = []; // { id, site, title, content, createdAt, updatedAt }
let selectedEntryId = null;

// -------- 화면 전환 --------
function showListView() {
  if (historyListView) historyListView.classList.remove("hidden");
  if (historyEditorView) historyEditorView.classList.remove("active");
  setStatus("");
}

function showEditorView(mode) {
  if (historyListView) historyListView.classList.add("hidden");
  if (historyEditorView) historyEditorView.classList.add("active");
  if (editorModeLabel) {
    editorModeLabel.textContent =
      mode === "edit" ? "문제풀이 기록 수정" : "새 문제풀이 기록 작성";
  }
}

// 저장소에서 불러오기
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load entries", e);
  }
}

// 저장소에 쓰기
function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save entries", e);
  }
}

// 리스트 렌더링
function renderHistoryList() {
  if (!historyListEl) return;

  historyListEl.innerHTML = "";

  entries
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-list-item";
      li.dataset.id = entry.id;

      if (entry.id === selectedEntryId) {
        li.classList.add("active");
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "history-list-title";
      titleDiv.textContent = entry.title || "(제목 없음)";

      const metaDiv = document.createElement("div");
      metaDiv.className = "history-list-meta";

      const badge = document.createElement("span");
      badge.className = `history-site-badge history-site-${entry.site || "BOJ"}`;
      badge.textContent = entry.site || "BOJ";

      const createdDate = new Date(entry.createdAt);
      const dateStr = createdDate.toLocaleDateString("ko-KR", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      });

      metaDiv.appendChild(badge);
      metaDiv.appendChild(document.createTextNode(` ${dateStr}`));

      li.appendChild(titleDiv);
      li.appendChild(metaDiv);

      li.addEventListener("click", () => {
        selectEntry(entry.id);
      });

      historyListEl.appendChild(li);
    });

  updateHistoryCount();
}

// 기록 개수 표시
function updateHistoryCount() {
  if (!historyCountEl) return;
  historyCountEl.textContent = `${entries.length}개 기록`;
}

// 에디터를 새 글용으로 채우기 (뷰 전환은 안 함)
function prepareEditorForNew() {
  selectedEntryId = null;
  if (entrySiteEl) entrySiteEl.value = "BOJ";
  if (entryTitleEl) entryTitleEl.value = "";
  if (entryContentEl) entryContentEl.value = "";
  if (deleteEntryBtn) deleteEntryBtn.disabled = true;
  setStatus("새 문제풀이 기록을 작성 중입니다.");
  renderHistoryList();
}

// 새 글 작성 시작 (뷰 전환 포함)
function startNewEntry() {
  prepareEditorForNew();
  showEditorView("new");
}

// 특정 기록 선택 → 에디터 열기
function selectEntry(id) {
  selectedEntryId = id;
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    prepareEditorForNew();
    showEditorView("new");
    return;
  }

  if (entrySiteEl) entrySiteEl.value = entry.site || "BOJ";
  if (entryTitleEl) entryTitleEl.value = entry.title || "";
  if (entryContentEl) entryContentEl.value = entry.content || "";
  if (deleteEntryBtn) deleteEntryBtn.disabled = false;

  setStatus("기존 문제풀이 기록을 수정할 수 있습니다.");
  renderHistoryList();
  showEditorView("edit");
}

// 상태 메시지
function setStatus(msg) {
  if (!historyStatusEl) return;
  historyStatusEl.textContent = msg || "";
}

// 새 기록 버튼
if (newEntryBtn) {
  newEntryBtn.addEventListener("click", () => {
    startNewEntry();
  });
}

// 목록으로 버튼
if (backToListBtn) {
  backToListBtn.addEventListener("click", () => {
    showListView();
  });
}

// 저장 버튼
if (saveEntryBtn) {
  saveEntryBtn.addEventListener("click", () => {
    if (!entryTitleEl || !entryContentEl || !entrySiteEl) return;

    const site = entrySiteEl.value || "BOJ";
    const title = entryTitleEl.value.trim();
    const content = entryContentEl.value.trim();

    if (!title) {
      setStatus("제목/번호는 반드시 입력해야 합니다.");
      return;
    }

    const now = Date.now();

    if (selectedEntryId === null) {
      // 새 기록
      const newEntry = {
        id: now + Math.random(),
        site,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(newEntry);
      saveEntries();
      selectedEntryId = newEntry.id;
      setStatus("새 문제풀이 기록이 저장되었습니다.");
    } else {
      // 기존 기록 업데이트
      const entry = entries.find((e) => e.id === selectedEntryId);
      if (entry) {
        entry.site = site;
        entry.title = title;
        entry.content = content;
        entry.updatedAt = now;
        saveEntries();
        setStatus("기존 문제풀이 기록이 업데이트되었습니다.");
      } else {
        // 리스트에서 사라져 있었다면 새로 생성
        const newEntry = {
          id: now + Math.random(),
          site,
          title,
          content,
          createdAt: now,
          updatedAt: now,
        };
        entries.push(newEntry);
        saveEntries();
        selectedEntryId = newEntry.id;
        setStatus("새 문제풀이 기록이 저장되었습니다.");
      }
    }

    renderHistoryList();
    // 저장이 끝나면 자동으로 목록 화면으로 돌아가기
    showListView();
  });
}

// 삭제 버튼
if (deleteEntryBtn) {
  deleteEntryBtn.addEventListener("click", () => {
    if (selectedEntryId === null) return;
    const ok = confirm("이 문제풀이 기록을 삭제할까요?");
    if (!ok) return;

    entries = entries.filter((e) => e.id !== selectedEntryId);
    saveEntries();
    setStatus("문제풀이 기록이 삭제되었습니다.");
    selectedEntryId = null;
    renderHistoryList();
    prepareEditorForNew();
    showListView();
  });
}

// 모두 삭제 버튼
if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", () => {
    if (entries.length === 0) {
      setStatus("삭제할 기록이 없습니다.");
      return;
    }

    const ok = confirm(
      "모든 문제풀이 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    // 전체 기록 비우기
    entries = [];
    saveEntries();

    // 선택 상태/에디터 초기화
    selectedEntryId = null;
    renderHistoryList();
    prepareEditorForNew();
    showListView();
    setStatus("모든 문제풀이 기록이 삭제되었습니다.");
  });
}

// 초기화: 페이지 로드시 기록 불러오기
(function initHistoryTab() {
  if (!historyListEl) return; // 해당 탭이 없으면 무시
  loadEntries();
  renderHistoryList();
  prepareEditorForNew();
  showListView(); // 첫 화면은 목록 모드
})();


// =====================
// 테스트 케이스 생성기 - 백엔드 호출
// =====================

const tcSiteEl = document.getElementById("tcSite");
const tcStatementEl = document.getElementById("tcStatement");
const tcExampleRawEl = document.getElementById("tcExampleRaw");
const tcDifficultyEl = document.getElementById("tcDifficulty");
const tcStyleEl = document.getElementById("tcStyle");
const tcGenerateBtn = document.getElementById("tcGenerateBtn");
const tcClearBtn = document.getElementById("tcClearBtn");
const tcCopyBtn = document.getElementById("tcCopyBtn");
const tcStatusEl = document.getElementById("tcStatus");
const tcResultEl = document.getElementById("tcResult");
const tcLoadingOverlay = document.getElementById("tcLoadingOverlay");

// 백엔드 주소 (로컬 개발용)
const API_BASE = "http://localhost:3000";

function setTcStatus(msg) {
  if (tcStatusEl) tcStatusEl.textContent = msg || "";
}

// 서버에서 받은 cases 배열을 보기 좋은 텍스트로 변환
function formatTestcaseResult(data) {
  if (!data || !Array.isArray(data.cases) || data.cases.length === 0) {
    return "생성된 테스트 케이스가 없습니다.";
  }
  const lines = [];
  data.cases.forEach((c, i) => {
    const label = c.note ? `케이스 ${i + 1} - ${c.note}` : `케이스 ${i + 1}`;
    lines.push(`// ${label}`);
    if (c.input != null && c.input !== "") {
      lines.push("[입력]");
      lines.push(String(c.input).trimEnd());
    }
    if (c.output != null && c.output !== "") {
      lines.push("[출력]");
      lines.push(String(c.output).trimEnd());
    }
    lines.push(""); // 케이스 사이 빈 줄
  });
  return lines.join("\n");
}

async function handleGenerateTestcases() {
  if (!tcGenerateBtn) return;

  // 예시 입력 블록 하나만 사용 (입력/출력 섞여 있어도 그대로 전달)
  const examples = [];
  if (tcExampleRawEl) {
    const raw = tcExampleRawEl.value.trim();
    if (raw) {
      // backend는 { input, output }을 기대하니까
      // raw 전체를 input에 넣고, output은 비워 둔다.
      examples.push({ input: raw, output: "" });
    }
  }

  const payload = {
    site: tcSiteEl ? tcSiteEl.value : undefined,
    statement: tcStatementEl ? tcStatementEl.value.trim() : "",
    // difficulty, style은 더 이상 입력받지 않지만,
    // 백엔드에서 기본값이 있으므로 생략해도 됨.
    examples,
  };

  try {
    tcGenerateBtn.disabled = true;
    setTcStatus("테스트 케이스 생성 중...");

    // 결과 영역 비우고 로딩 오버레이 표시
    if (tcResultEl) {
      tcResultEl.textContent = "";
      tcResultEl.classList.add("tc-result-placeholder");
    }
    if (tcLoadingOverlay) {
      tcLoadingOverlay.classList.add("visible");
    }

    const res = await fetch(`${API_BASE}/api/testcases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`서버 오류: ${res.status}`);
    }

    const data = await res.json();
    const text = formatTestcaseResult(data);

    if (tcLoadingOverlay) {
      tcLoadingOverlay.classList.remove("visible");
    }
    if (tcResultEl) {
      tcResultEl.textContent = text;
      tcResultEl.classList.remove("tc-result-placeholder");
    }
    setTcStatus("테스트 케이스 생성 완료.");
  } catch (err) {
    console.error(err);
    if (tcLoadingOverlay) {
      tcLoadingOverlay.classList.remove("visible");
    }
    if (tcResultEl) {
      tcResultEl.textContent =
        "테스트 케이스 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.";
      tcResultEl.classList.add("tc-result-placeholder");
    }
    setTcStatus(err.message || "오류가 발생했습니다.");
  } finally {
    tcGenerateBtn.disabled = false;
    if (tcLoadingOverlay) {
      tcLoadingOverlay.classList.remove("visible");
    }
  }
}

// 버튼 이벤트 연결
if (tcGenerateBtn) {
  tcGenerateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleGenerateTestcases();
  });
}

if (tcClearBtn) {
  tcClearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (tcStatementEl) tcStatementEl.value = "";
    if (tcExampleRawEl) tcExampleRawEl.value = "";
    setTcStatus("");

    if (tcResultEl) {
      tcResultEl.textContent = "";
      tcResultEl.classList.add("tc-result-placeholder");
    }
  });
}

if (tcCopyBtn && tcResultEl) {
  tcCopyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const text = tcResultEl.textContent || "";
    if (!text.trim()) {
      setTcStatus("복사할 내용이 없습니다.");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => setTcStatus("결과를 클립보드에 복사했습니다."))
      .catch((err) => {
        console.error(err);
        setTcStatus("복사 중 오류가 발생했습니다.");
      });
  });
}