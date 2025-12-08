// ========================
// 탭 전환 & 사이드바 토글
// ========================

// 사이드바 내 탭 버튼들 (큰 버튼 + 미니 아이콘)
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

// 현재 탭을 저장해 둘 키
const TAB_STORAGE_KEY = "fixerActiveTab";

function switchTab(targetId) {
  // 존재하지 않는 id가 들어오면 안전하게 runner로 되돌리기
  const validIds = Array.from(panels).map((p) => p.id);
  if (!validIds.includes(targetId)) {
    targetId = "runner";
  }

  // 네비 버튼 active
  navItems.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === targetId);
  });

  // 패널 전환
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  // 현재 탭을 localStorage에 기억해 둠
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, targetId);
  } catch (e) {
    // localStorage 사용 불가해도 그냥 무시
  }

  // 시각화 도구 들어올 때 캔버스 리사이즈
  if (targetId === "visualizer") {
    resizeCanvas();
  }
}

// 탭 전환 이벤트 등록
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetId = item.dataset.tab;
    if (!targetId) return;
    switchTab(targetId);
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
  } else if (currentTool === "text") {
    const x1 = Math.min(startX, x);
    const y1 = Math.min(startY, y);
    const w = Math.abs(x - startX);
    const h = Math.abs(y - startY);
    previewShape = { type: "text", x: x1, y: y1, w, h, text: "" };
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
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      // 드래그해서 반지름을 정한 경우
      newShape = { type: "circle", cx: startX, cy: startY, r: dist };
    } else {
      // 거의 움직이지 않은 경우 → "클릭"으로 간주, 고정 크기 원
      const fixedRadius = 24; // 원하는 기본 크기
      newShape = { type: "circle", cx: startX, cy: startY, r: fixedRadius };
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
  } else if (currentTool === "text") {
    const x1 = Math.min(startX, x);
    const y1 = Math.min(startY, y);
    let w = Math.abs(x - startX);
    let h = Math.abs(y - startY);

    // 거의 움직이지 않았으면 클릭으로 간주하고 기본 크기
    if (w <= 4 && h <= 4) {
      w = 120;
      h = 40;
    }

    // 중심 기준으로 놓고 싶으면 다음 두 줄을 사용 (지금은 좌상단 기준으로 둬도 됨)
    // const boxX = startX - w / 2;
    // const boxY = startY - h / 2;
    const boxX = x1;
    const boxY = y1;

    const text = window.prompt("텍스트 내용을 입력하세요:");
    if (text && text.trim() !== "") {
      newShape = {
        type: "text",
        x: boxX,
        y: boxY,
        w,
        h,
        text: text.trim(),
      };
    }
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

  if (shape.type === "rect" || shape.type === "text") {
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
  } else if (shape.type === "text") {
    if (isPreview) {
    // 드래그 중일 때만 윤곽 박스로 보여 주기
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    ctx.setLineDash([]);
    } else if (shape.text) {
      // 실제로 그릴 때는 글자만
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillStyle = "#000000";
      const padding = 4;
      const lineHeight = 16;
      const lines = String(shape.text).split(/\r?\n/);

      lines.forEach((line, idx) => {
        const tx = shape.x + padding;
        const ty = shape.y + padding + lineHeight * (idx + 1) - 4;
        ctx.fillText(line, tx, ty);
      });
    }
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
const todayShortcutsEl = document.getElementById("todayHistoryShortcuts");

const STORAGE_KEY = "algoHelperProblemNotes";

let entries = []; // { id, site, title, content, createdAt, updatedAt }
let selectedEntryId = null;

// 오늘 날짜인지 확인하는 헬퍼
function isTodayTimestamp(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// 사이드바에 오늘 푼 문제 최대 5개 렌더링
function renderTodayShortcuts() {
  if (!todayShortcutsEl) return;

  todayShortcutsEl.innerHTML = "";

  if (!entries || entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "nav-quick-empty";
    empty.textContent = "오늘 기록 없음";
    todayShortcutsEl.appendChild(empty);
    return;
  }

  const todayEntries = entries
    .filter((e) => isTodayTimestamp(e.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  if (todayEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "nav-quick-empty";
    empty.textContent = "오늘 기록 없음";
    todayShortcutsEl.appendChild(empty);
    return;
  }

  todayEntries.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = "nav-quick-item";
    btn.textContent = entry.title || "(제목 없음)";
    btn.title = `${entry.site || ""} ${entry.title || ""}`.trim();

    btn.addEventListener("click", () => {
      // 탭을 문제풀이 기록으로 전환하고 해당 글 열기
      switchTab("history");
      selectEntry(entry.id);
    });

    todayShortcutsEl.appendChild(btn);
  });
}

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
  renderTodayShortcuts();
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

if (saveEntryBtn) {
  saveEntryBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!entryTitleEl || !entryContentEl || !entrySiteEl) return;

    const site = entrySiteEl.value || "BOJ";
    const title = entryTitleEl.value.trim();
    const content = entryContentEl.value.trim();

    if (!title) {
      setStatus("제목/번호는 반드시 입력해야 합니다.");
      return;
    }

    const now = Date.now();

    // 1) localStorage 먼저 반영
    let currentEntry = null;
    const isNew = selectedEntryId === null;

    if (isNew) {
      const newEntry = {
        id: now + Math.random(), // 일단 임시 ID (로그인 안 했을 수도 있으니까)
        site,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(newEntry);
      currentEntry = newEntry;
      selectedEntryId = newEntry.id;
      setStatus("새 문제풀이 기록이 저장되었습니다.");
    } else {
      const entry = entries.find((e) => e.id === selectedEntryId);
      if (entry) {
        entry.site = site;
        entry.title = title;
        entry.content = content;
        entry.updatedAt = now;
        currentEntry = entry;
        setStatus("기존 문제풀이 기록이 업데이트되었습니다.");
      } else {
        const newEntry = {
          id: now + Math.random(),
          site,
          title,
          content,
          createdAt: now,
          updatedAt: now,
        };
        entries.push(newEntry);
        currentEntry = newEntry;
        selectedEntryId = newEntry.id;
        setStatus("새 문제풀이 기록이 저장되었습니다.");
      }
    }

    saveEntries();
    renderHistoryList();
    setStatus("문제풀이 기록이 저장되었습니다.");

    // 2) 서버와 동기화
    try {
      // 로그인 안 된 경우 401 → catch로 떨어짐, localStorage만 유지
      if (currentEntry && Number.isInteger(currentEntry.id)) {
        // 이미 DB에서 가져온 기록 (id가 정수) → 수정으로 취급
        const updated = await updateStudyLogOnServer(currentEntry.id, {
          problemId: currentEntry.title,
          title: currentEntry.title,
          language: currentEntry.site,
          code: currentEntry.content,
          isSolved: false,
        });
        currentEntry.updatedAt = new Date(updated.updated_at).getTime();
      } else {
        // 새로 만든 로컬 기록 → DB에 생성 요청
        const created = await saveStudyLog({
          problemId: currentEntry.title,
          title: currentEntry.title,
          language: currentEntry.site,
          code: currentEntry.content,
          isSolved: false,
        });
        // 응답으로 받은 DB id / 날짜로 로컬 엔트리 교체
        currentEntry.id = created.id;
        currentEntry.createdAt = new Date(created.created_at).getTime();
        currentEntry.updatedAt = new Date(created.updated_at).getTime();
        selectedEntryId = created.id;
      }

      saveEntries();
      renderHistoryList();
    } catch (err) {
      console.warn("서버 학습 기록 저장/수정 실패(로그인 안 되어 있거나 에러):", err);
    }
  });
}

if (deleteEntryBtn) {
  deleteEntryBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (selectedEntryId === null) {
      setStatus("삭제할 기록을 먼저 선택하세요.");
      return;
    }

    const entry = entries.find((e) => e.id === selectedEntryId);
    if (!entry) {
      setStatus("이미 삭제되었거나 찾을 수 없는 기록입니다.");
      return;
    }

    const ok = confirm("현재 보고 있는 문제풀이 기록을 삭제할까요?");
    if (!ok) return;

    // 1) 로컬에서 삭제
    const deleteId = entry.id;
    entries = entries.filter((e) => e.id !== deleteId);
    saveEntries();

    selectedEntryId = null;
    renderHistoryList();
    prepareEditorForNew();
    showListView();
    setStatus("선택한 기록이 삭제되었습니다.");
    switchTab("history");

    // 2) 서버에서도 삭제 시도 (로그인 안 되어 있으면 401)
    try {
      if (Number.isInteger(deleteId)) {
        await deleteStudyLogOnServer(deleteId);
      }
    } catch (err) {
      console.warn("서버 학습 기록 삭제 실패:", err);
    }
  });
}

if (deleteAllBtn) {
  deleteAllBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    if (entries.length === 0) {
      setStatus("삭제할 기록이 없습니다.");
      return;
    }

    const ok = confirm(
      "모든 문제풀이 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    // 1) 로컬 전체 삭제
    entries = [];
    saveEntries();

    selectedEntryId = null;
    renderHistoryList();
    prepareEditorForNew();
    showListView();
    setStatus("모든 문제풀이 기록이 삭제되었습니다.");
    switchTab("history");

    // 2) 서버 전체 삭제 시도
    try {
      await deleteAllStudyLogsOnServer();
    } catch (err) {
      console.warn("서버 전체 학습 기록 삭제 실패:", err);
    }
  });
}

// 초기화: 페이지 로드시 기록 불러오기
async function initHistoryTab() {
  if (!historyListEl) return; // 해당 탭이 없으면 무시

  // 1) 기존처럼 localStorage에서 먼저 로드
  loadEntries();

  // 2) 서버에 로그인되어 있다면, DB에서 학습 기록 불러오기
  try {
    const logs = await fetchStudyLogs(); // GET /api/study-logs

    const serverEntries = logs.map((log) => {
      // DB에서 오는 created_at / updated_at은 문자열이니까
      // 나중에 정렬/“오늘 기록” 체크하려면 숫자로 바꿔줘야 함
      const createdTs = log.created_at
        ? new Date(log.created_at).getTime()
        : Date.now();
      const updatedTs = log.updated_at
        ? new Date(log.updated_at).getTime()
        : createdTs;

      return {
        id: log.id,                     // DB id
        site: log.language || "BOJ",    // language 없으면 BOJ
        title: log.title || log.problem_id || "(제목 없음)",
        content: log.code || "",
        createdAt: createdTs,
        updatedAt: updatedTs,
      };
    });

    // 🔥 서버 응답이 성공했다면, 길이가 0이어도 무조건 서버 상태로 덮어쓰기
    entries = serverEntries;
    saveEntries(); // 브라우저에도 캐싱
  } catch (err) {
    // 로그인 안 됐거나(401), 서버 에러면 그냥 localStorage 것만 사용
    console.warn("서버 학습 기록 불러오기 실패:", err);
  }

  renderHistoryList();
  prepareEditorForNew();
  showListView(); // 첫 화면은 목록 모드
}


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

// 백엔드 주소
// - 로컬에서 index.html 열고 테스트할 때: localhost:3000
// - GitHub Pages 등 배포본에서는 Render 서버 주소 사용
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://fixer-backend-xj93.onrender.com";


function setTcStatus(msg) {
  if (tcStatusEl) tcStatusEl.textContent = msg || "";
}

const AUTH_BASE = API_BASE; // 편의상 별칭

// 현재 경로 기준으로 로그인 페이지(index.html) URL 만들기
function getLoginUrl() {
  const { origin, pathname } = window.location;
  // /FIXER/app.html → /FIXER/ 로, /app.html → / 로
  const basePath = pathname.replace(/\/[^\/]*$/, "/");
  return origin + basePath + "index.html";
}

async function updateLoginStatus() {
  const nameEl = document.getElementById("sidebarUserName");
  const emailEl = document.getElementById("sidebarUserEmail");
  const avatarEl = document.getElementById("sidebarUserAvatar");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!nameEl || !logoutBtn) return;

  try {
    const res = await fetch(`${AUTH_BASE}/auth/me`, {
      credentials: "include", // 세션 쿠키 포함
    });
    const data = await res.json();

    if (data.loggedIn && data.user) {
      const name =
        data.user.name ||
        data.user.displayName ||
        data.user.email ||
        "로그인 사용자";
      const email = data.user.email || "";

      // ✅ 관리자/테스트 계정 여부 확인
      // 1) 백엔드에서 내려주는 isAdmin 플래그를 우선 사용
      // 2) 혹시 몰라서 google_id / email / name도 한 번 더 체크
      const isAdminAccount =
        data.user.isAdmin === true ||
        data.user.google_id === "local:test" ||
        data.user.email === "admin@test.local" ||
        data.user.name === "테스트 계정";

      if (isAdminAccount) {
        // 이름 라인에 '(관리자용 계정)' 붙이기
        nameEl.textContent = `${name} (관리자용 계정)`;
        if (emailEl) emailEl.textContent = "관리자용 테스트 계정";
      } else {
        nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
      }

      if (avatarEl) {
        if (data.user.picture) {
          avatarEl.style.backgroundImage = `url(${data.user.picture})`;
          avatarEl.classList.add("has-image");
          avatarEl.textContent = "";
        } else {
          avatarEl.style.backgroundImage = "none";
          avatarEl.classList.remove("has-image");
          avatarEl.textContent = name.charAt(0).toUpperCase();
        }
      }

      logoutBtn.style.display = "inline-flex";
    } else {
      nameEl.textContent = "로그인하지 않음";
      if (emailEl) emailEl.textContent = "";
      if (avatarEl) {
        avatarEl.style.backgroundImage = "none";
        avatarEl.classList.remove("has-image");
        avatarEl.textContent = "?";
      }
      logoutBtn.style.display = "none";
    }
  } catch (err) {
    console.error("로그인 상태 확인 실패:", err);
    nameEl.textContent = "로그인 상태 확인 실패";
    if (emailEl) emailEl.textContent = "";
    if (avatarEl) {
      avatarEl.style.backgroundImage = "none";
      avatarEl.classList.remove("has-image");
      avatarEl.textContent = "!";
    }
    logoutBtn.style.display = "none";
  }
}

async function logout() {
  try {
    await fetch(`${AUTH_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("로그아웃 실패:", err);
  } finally {
    // 어쨌든 UI는 다시 체크
    updateLoginStatus();
  }
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

  const statement = tcStatementEl ? tcStatementEl.value.trim() : "";

  if (!statement) {
    alert("문제 설명을 먼저 입력해 주세요.");
    return;
  }

  // 🔹 문제 설명 최소 길이/단어 수 체크
  const wordCount = statement.split(/\s+/).filter(Boolean).length;
  if (statement.length < 30 || wordCount < 5) {
    alert("문제 설명을 조금 더 자세히 입력해 주세요.\n(최소 30자, 5단어 이상 권장)");
    return;
  }

  // 🔹 알파벳만 잔뜩인데 짧은 경우 (asdf류)
  const normalized = statement.replace(/\s+/g, "");
  if (/^[a-zA-Z]+$/.test(normalized) && normalized.length <= 8) {
    alert("문제 전문이 아닌 것 같습니다. 알고리즘 문제 전체를 붙여 넣어 주세요.");
    return;
  }

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
    statement,
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


// ----- 코드 실행기 요소 -----
const runnerLanguageEl = document.getElementById("runnerLanguage");
const runnerSourceEl = document.getElementById("runnerSource");
const runnerConsoleEl = document.getElementById("runnerConsole");
const runnerRunBtn = document.getElementById("runnerRunBtn");
const runnerClearConsoleBtn = document.getElementById("runnerClearConsoleBtn");
const runnerStatusEl = document.getElementById("runnerStatus");

// 언어별 기본 템플릿
const RUNNER_TEMPLATES = {
  c: `#include <stdio.h>

int main(void) {
    printf("Hello, world!\\n");
    return 0;
}
`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, world!" << '\\n';
    return 0;
}
`,

  java: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}
`,

  python: `print("Hello, world!")
`,
};

// 템플릿 적용 함수
function applyRunnerTemplate(lang, force = false) {
  if (!runnerSourceEl) return;
  const template = RUNNER_TEMPLATES[lang];
  if (!template) return;

  // force = true면 무조건 덮어쓰기, false면 비어 있을 때만
  if (force || !runnerSourceEl.value.trim()) {
    runnerSourceEl.value = template;
  }
}

function setRunnerStatus(msg) {
  if (runnerStatusEl) runnerStatusEl.textContent = msg || "";
}

// 콘솔 지우기 버튼
if (runnerClearConsoleBtn && runnerConsoleEl) {
  runnerClearConsoleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    runnerConsoleEl.value = "";
    setRunnerStatus("");
  });
}

const runnerTemplateBtn = document.getElementById("runnerTemplateBtn");

if (runnerTemplateBtn && runnerLanguageEl) {
  runnerTemplateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const lang = runnerLanguageEl.value || "cpp";
    applyRunnerTemplate(lang, true); // 무조건 덮어쓰기
    setRunnerStatus("현재 선택된 언어의 기본 코드가 입력되었습니다.");
  });
}

// 언어 변경 시 템플릿 자동 적용
if (runnerLanguageEl) {
  runnerLanguageEl.addEventListener("change", () => {
    const lang = runnerLanguageEl.value || "cpp";
    applyRunnerTemplate(lang, false); // 비어 있을 때만 채우기
    setRunnerStatus("");              // 상태 메시지 초기화
  });
}

// 코드 실행 버튼
if (runnerRunBtn && runnerLanguageEl && runnerSourceEl && runnerConsoleEl) {
  runnerRunBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const language = runnerLanguageEl.value || "cpp";
    const source = runnerSourceEl.value || "";
    const consoleText = runnerConsoleEl.value || "";

    if (!source.trim()) {
      setRunnerStatus("코드를 입력해 주세요.");
      return;
    }

    setRunnerStatus("코드 실행 중...");
    runnerRunBtn.disabled = true;
    const originalText = runnerRunBtn.textContent;
    runnerRunBtn.textContent = "실행 중...";

    try {
      // 콘솔 전체 내용을 stdin으로 사용
      const stdin = consoleText;

      const res = await fetch(`${API_BASE}/api/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language, source, stdin }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok === false) {
        const msg =
          (data && data.message) ||
          `코드 실행 실패 (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // 출력 문자열 구성
      const parts = [];
      if (data.stdout) {
        parts.push(String(data.stdout));
      }
      if (data.stderr) {
        parts.push("\n[stderr]\n" + String(data.stderr));
      }
      if (!parts.length) {
        parts.push("(출력 없음)");
      }

      const footer = `\n(exit code: ${
        data.statusCode ?? "?"
      }, time: ${data.cpuTime ?? "?"}s, memory: ${data.memory ?? "?"} KB)`;

      // 기존 콘솔 내용 뒤에 결과를 이어 붙임
      let newConsole = consoleText;
      if (newConsole && !newConsole.endsWith("\n")) {
        newConsole += "\n";
      }
      newConsole += "\n[출력]\n" + parts.join("") + "\n" + footer + "\n";

      runnerConsoleEl.value = newConsole;
      runnerConsoleEl.scrollTop = runnerConsoleEl.scrollHeight;

      setRunnerStatus("실행 완료.");
    } catch (err) {
      console.error(err);
      let newConsole = consoleText;
      if (newConsole && !newConsole.endsWith("\n")) {
        newConsole += "\n";
      }
      newConsole +=
        "\n[오류]\n" +
        ((err && err.message) || "코드 실행 중 오류가 발생했습니다.") +
        "\n";
      runnerConsoleEl.value = newConsole;
      runnerConsoleEl.scrollTop = runnerConsoleEl.scrollHeight;
      setRunnerStatus("실행 중 오류가 발생했습니다.");
    } finally {
      runnerRunBtn.disabled = false;
      runnerRunBtn.textContent = originalText;
    }
  });
}


// ==============================
// 풀이 힌트 패널
// ==============================
// ==============================
// 풀이 힌트 패널
// ==============================
const solDescriptionEl = document.getElementById("solDescription");
const solRequestBtn = document.getElementById("solRequestBtn");
const solStatusEl = document.getElementById("solStatus");
const solResultEl = document.getElementById("solResult");
const solClearBtn = document.getElementById("solClearBtn");
const solLoadingOverlay = document.getElementById("solLoadingOverlay");

function setSolutionStatus(msg, isError = false) {
  if (!solStatusEl) return;
  solStatusEl.textContent = msg || "";
  solStatusEl.classList.toggle("error", !!isError);
}

function renderSolution(result) {
  if (!solResultEl) return;
  solResultEl.innerHTML = "";

  if (!result || !result.content) {
    solResultEl.textContent = "결과를 불러오지 못했습니다.";
    return;
  }

  const type = result.mode || result.responseType || "outline";

  const header = document.createElement("div");
  header.className = "solution-result-type";
  header.textContent =
    type === "full"
      ? "모드: 상세 풀이"
      : type === "hint"
      ? "모드: 가벼운 힌트"
      : "모드: 풀이 개요";

  const content = document.createElement("p");
  content.className = "solution-result-content";
  content.textContent = result.content;

  solResultEl.appendChild(header);
  solResultEl.appendChild(content);

  if (Array.isArray(result.steps) && result.steps.length > 0) {
    const ul = document.createElement("ol");
    ul.className = "solution-result-steps";

    result.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      ul.appendChild(li);
    });

    solResultEl.appendChild(ul);
  }
}

if (solRequestBtn && solDescriptionEl) {
  solRequestBtn.addEventListener("click", async () => {
    const description = solDescriptionEl.value.trim();
    if (!description) {
      alert("문제 전문을 먼저 입력해 주세요.");
      return;
    }

    // 🔹 1) 너무 짧은 입력(문장 최소 길이 / 단어 수 체크)
    const wordCount = description.split(/\s+/).filter(Boolean).length;
    if (description.length < 30 || wordCount < 5) {
      alert("문제 설명을 조금 더 자세히 입력해 주세요.\n(최소 30자, 5단어 이상 권장)");
      return;
    }

    // 🔹 2) 진짜 쌩잡글(asdf, qwer, zxcv 같은 것) 잡기
    const normalized = description.replace(/\s+/g, "");
    if (/^[a-zA-Z]+$/.test(normalized) && normalized.length <= 8) {
      alert("문제 전문이 아닌 것 같습니다. 알고리즘 문제 전체를 붙여 넣어 주세요.");
      return;
    }

    setSolutionStatus("AI에게 풀이 힌트를 요청 중입니다...", false);

    // 이전 결과 잠깐 비우고 로딩 오버레이 켜기
    if (solResultEl) {
      solResultEl.innerHTML = "";
    }
    if (solLoadingOverlay) {
      solLoadingOverlay.classList.add("visible");
    }

    try {
      const body = {
        description,
        mode: "outline", // 항상 '풀이 개요'
      };

      const resp = await fetch(`${API_BASE}/api/solution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        setSolutionStatus(`HTTP 오류: ${resp.status}`, true);
        return;
      }

      const data = await resp.json();
      if (!data.ok) {
        setSolutionStatus(data.message || "풀이 힌트 생성 실패", true);
        return;
      }

      setSolutionStatus("풀이 힌트를 불러왔습니다.", false);
      renderSolution(data);
    } catch (err) {
      console.error(err);
      setSolutionStatus("요청 중 오류가 발생했습니다.", true);
      if (solResultEl) {
        solResultEl.textContent =
          "풀이 힌트를 불러오는 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.";
      }
    } finally {
      // 성공/실패와 상관없이 로딩 끄기
      if (solLoadingOverlay) {
        solLoadingOverlay.classList.remove("visible");
      }
    }
  });
}

if (solClearBtn && solDescriptionEl && solResultEl) {
  solClearBtn.addEventListener("click", () => {
    solDescriptionEl.value = "";
    solResultEl.innerHTML =
      '<p class="solution-placeholder">왼쪽에 문제를 붙여 넣고 "풀이 힌트 요청"을 누르면, 여기에서 단계별 설명을 확인할 수 있습니다.</p>';
    setSolutionStatus("");
    if (solLoadingOverlay) {
      solLoadingOverlay.classList.remove("visible"); // 추가
    }
  });
}

// =====================
// 로그인 상태 초기화 & 로그아웃 버튼 연결
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // 0) 마지막으로 사용한 탭 복원 (없으면 기본 runner)
  let initialTab = "runner";
  try {
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (saved) {
      initialTab = saved;
    }
  } catch (e) {
    // localStorage 사용 불가 시 그냥 runner 유지
  }
  switchTab(initialTab);

  // 1) 로그인 상태 확인
  updateLoginStatus();

  // 2) 학습 기록 탭 초기화 (목록 불러오기 + 에디터 초기화)
  initHistoryTab();

  // 3) 코드 실행기 기본 템플릿 한 번 채우기 (기본 언어: C++)
  if (runnerLanguageEl) {
    const lang = runnerLanguageEl.value || "cpp";
    applyRunnerTemplate(lang, false);
  }

  // 4) 로그아웃 버튼 클릭 이벤트
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const ok = window.confirm("정말 로그아웃 하시겠습니까?");
      if (!ok) return;

      await logout();
      window.location.href = getLoginUrl();
    });
  }
});

// 예: script.js

async function fetchStudyLogs() {
  const res = await fetch(`${API_BASE}/api/study-logs`, {
    credentials: "include", // 세션 유지
  });
  const data = await res.json();
  if (!data.ok) throw new Error("학습 기록 조회 실패");
  return data.logs;
}

async function saveStudyLog(log) {
  const res = await fetch(`${API_BASE}/api/study-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(log),
  });
  const data = await res.json();
  if (!data.ok) throw new Error("학습 기록 저장 실패");
  return data.log;
}

async function updateStudyLogOnServer(id, log) {
  const res = await fetch(`${API_BASE}/api/study-logs/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(log),
  });
  const data = await res.json();
  if (!data.ok) throw new Error("학습 기록 수정 실패");
  return data.log;
}

// 새로 추가: 서버의 단일 기록 삭제 (DELETE /:id)
async function deleteStudyLogOnServer(id) {
  const res = await fetch(`${API_BASE}/api/study-logs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!data.ok) throw new Error("학습 기록 삭제 실패");
  return true;
}

// 새로 추가: 서버의 내 기록 전체 삭제 (DELETE /)
async function deleteAllStudyLogsOnServer() {
  const res = await fetch(`${API_BASE}/api/study-logs`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  if (!data.ok) throw new Error("전체 학습 기록 삭제 실패");
  return true;
}