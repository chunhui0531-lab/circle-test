document.addEventListener("DOMContentLoaded", () => {
  /* =====================
     一、學習筆記儲存功能
     ===================== */
  const saveButton = document.getElementById("save-note-btn");
  const noteTextarea = document.getElementById("student-note");
  const feedbackMessage = document.getElementById("save-feedback");
  const notebookSection = document.getElementById("notebookSection");
  const summaryPreview = document.getElementById("summaryPreview");

  // 載入總結筆記
  if (noteTextarea) {
    const savedNote = localStorage.getItem("module3_note_summary");
    if (savedNote) noteTextarea.value = savedNote;
  }

  if (saveButton && noteTextarea && feedbackMessage) {
    saveButton.addEventListener("click", () => {
      const content = noteTextarea.value.trim();
      if (!content) {
        alert("可以試著寫下至少一兩句你的收穫喔！");
        return;
      }
      try {
        localStorage.setItem("module3_note_summary", content);
        feedbackMessage.classList.remove("feedback-hidden");
        setTimeout(() => {
          feedbackMessage.classList.add("feedback-hidden");
        }, 1500);
      } catch (e) {
        console.error("儲存失敗：", e);
        alert("儲存時發生問題，請稍後再試。");
      }
    });
  }

  /* =============================
     二、圓 + 伸縮曲尺 + 關卡控制
     ============================= */
  const canvas = document.getElementById("circleCanvas");
  const angleDisplay = document.getElementById("angleDisplay");
  const statusMessage = document.getElementById("statusMessage");

  const levelTitle = document.getElementById("levelTitle");
  const levelDesc = document.getElementById("levelDesc");
  const promptList = document.getElementById("promptList");
  const levelBadges = document.querySelectorAll(".level-badge");
  const nextLevelBtn = document.getElementById("nextLevelBtn");
  const resetLevelBtn = document.getElementById("resetLevelBtn");

  const level3RecordList = document.getElementById("level3RecordList");
  // const rightCountSpan = document.getElementById("rightCount"); // Removed

  const toggleProtractorBtn = document.getElementById("toggleProtractorBtn");
  const measureInput = document.getElementById("measureInput");
  const recordMeasureBtn = document.getElementById("recordMeasureBtn");

  const level4Question = document.getElementById("level4Question");
  const checkQ4Btn = document.getElementById("checkQ4Btn");
  const q4Feedback = document.getElementById("q4Feedback");
  const q4ShortAnswer = document.getElementById("q4ShortAnswer");

  const levelNote = document.getElementById("levelNote");

  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const TOTAL_LEVELS = 4;
  let currentLevel = 1;
  const levelPassed = { 1: false, 2: false, 3: false, 4: false };

  const levelConfig = {
    1: {
      title: "第 1 關：先玩玩看這把曲尺",
      desc: "透過三個小觀察，先熟悉 A、B、C 拖曳後，角度與弦 AB 的變化。",
      prompts: [], // 第 1 關的漫畫提問由 setLevelUI 客製
      statusDefault:
        "依照漫畫中的三個『觀察任務』操作曲尺，勾選自己的感覺。",
      statusSuccess:
        "好！你已經試玩過工具，也完成三個觀察，準備更仔細地研究直角了。",
    },
    2: {
      title: "第 2 關：找到一個直角圓周角",
      desc: "試著讓 ∠ACB 接近 90°，看看這時 AB 有什麼特別的位置。",
      prompts: [
        "調整 A、B、C，讓 ∠ACB 約是 90°。",
        "這一刻 AB 在圓心附近看起來像什麼樣子？",
      ],
      statusDefault: "請開啟量角器，測量當 AB 變成紅色(直徑)時，∠ACB 是幾度？",
      statusSuccess:
        "沒錯！是 90 度。注意 AB 變紅時，它很可能是直徑。",
    },
    3: {
      title: "第 3 關：在不同位置重複驗證",
      desc: "把 C 移到不同位置，再做出直角圓周角，並用量角器測量確認。",
      prompts: [
        "移動 C 點到任意新位置。",
        "調整 A、B 做出直角（AB變紅）。",
        "用量角器量測並記錄數據（需要 3 次成功）。",
      ],
      statusDefault:
        "請在不同位置做出直角，並記錄測量結果。",
      statusSuccess:
        "太棒了！三組數據都驗證了 90 度與直徑的關係。",
    },
    4: {
      title: "第 4 關：回到劇院例子做應用",
      desc: "用你剛才歸納出的規律，判斷劇院中的燈軌 AB 是否為直徑。",
      prompts: [
        "讀題後，先回想你在前幾關看到的：『直角』跟『直徑』的關係。",
        "作答後，用一兩句話說明你的理由。",
      ],
      statusDefault: "先完成右側的選擇題與簡短說明，檢查自己是否真的理解。",
      statusSuccess:
        "恭喜！你已能用同一個劇院例子做應用，代表概念相當清楚。",
    },
  };

  // 幾何參數與點位置
  let cx = 0;
  let cy = 0;
  let radius = 0;

  const points = {
    A: { angle: 0, color: "#c0392b" },
    B: { angle: Math.PI * 0.65, color: "#2980b9" },
    C: { angle: Math.PI * 1.3, color: "#27ae60" },
  };

  let rect = canvas.getBoundingClientRect();
  let activeKey = null;
  let movedOnce = false;

  // 第 3 關：不同位置的直角紀錄
  let level3Records = []; // Store objects {angle: 90, result: "OK"}
  let lastActualAngleDeg = null;
  let lastIsRightish = false;

  // 量角器狀態
  let protractor = {
    x: 0,
    y: 0,
    angle: 0, // radians
    radius: 100,
    visible: false,
    isDragging: false,
    isRotating: false
  };

  /* ===== Canvas 尺寸自適應 ===== */
  function resizeCanvas() {
    const parent = canvas.parentElement;
    const parentWidth = parent.clientWidth || 600;
    const desiredWidth = parentWidth;
    const desiredHeight = parentWidth * 0.75;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = desiredWidth * dpr;
    canvas.height = desiredHeight * dpr;
    canvas.style.width = desiredWidth + "px";
    canvas.style.height = desiredHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = desiredWidth / 2;
    cy = desiredHeight / 2;
    radius = Math.min(desiredWidth, desiredHeight) * 0.38;

    // 初始化量角器位置
    protractor.x = cx;
    protractor.y = cy + 50;
    protractor.radius = radius * 0.6;

    // rect = canvas.getBoundingClientRect(); // Moved to pointer events
    requestAnimationFrame(draw);
  }

  function getPointPosition(name) {
    const p = points[name];
    return {
      x: cx + radius * Math.cos(p.angle),
      y: cy + radius * Math.sin(p.angle),
    };
  }

  function getPointerPos(evt) {
    if (evt.touches && evt.touches.length > 0) {
      return {
        x: evt.touches[0].clientX - rect.left,
        y: evt.touches[0].clientY - rect.top,
      };
    }
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function findActivePoint(pos) {
    // 1. Check Protractor Controls first (if visible)
    if (protractor.visible) {
      // Check Rotation Handle (small circle at edge)
      const handleX = protractor.x + protractor.radius * Math.cos(protractor.angle);
      const handleY = protractor.y + protractor.radius * Math.sin(protractor.angle);
      const distHandle = Math.hypot(pos.x - handleX, pos.y - handleY);

      // Increased hit area for touch
      if (distHandle <= 40) return "PROT_ROTATE";

      // Check Drag Body (near center)
      const distCenter = Math.hypot(pos.x - protractor.x, pos.y - protractor.y);
      if (distCenter <= protractor.radius * 0.5) return "PROT_MOVE";

      // Check Resize Handle (NEW: Top of the arc)
      // Apex at -90 deg (relative to base)
      const resizeAngle = protractor.angle - Math.PI / 2;
      const resizeX = protractor.x + protractor.radius * Math.cos(resizeAngle);
      const resizeY = protractor.y + protractor.radius * Math.sin(resizeAngle);
      const distResize = Math.hypot(pos.x - resizeX, pos.y - resizeY);
      if (distResize <= 40) return "PROT_RESIZE";
    }

    // 2. Check Geometry Points
    const hitRadius = 40; // Increased from 16 for better touch
    const names = ["A", "B", "C"];
    for (let i = names.length - 1; i >= 0; i--) {
      const name = names[i];
      const p = getPointPosition(name);
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      if (Math.hypot(dx, dy) <= hitRadius) return name;
    }
    return null;
  }

  function drawProtractor() {
    if (!protractor.visible) return;

    const { x, y, angle, radius } = protractor;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 半圓主體
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI, 0); // Upper half (before rotation) is simpler, let's draw typical 180 protractor
    // Actually, usually protractor flat side is down. Let's draw standard semi-circle.
    // Let's assume angle 0 means flat side is horizontal.
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // Bottom line
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    // Center point marker
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();

    // Ticks & Labels
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px sans-serif";

    for (let i = 0; i <= 180; i += 10) {
      const rad = (Math.PI / 180) * (180 + i); // Start from left (180) to right (0) via top
      // Actually standard protractor: 0 is right, 180 is left. Arc goes counter-clockwise?
      // Let's draw standard: right=0, top=90, left=180. Canvas arc 0 is right.
      // So verify arc: Math.PI (left) to 0 (right).
      // If we loop i from 0 to 180:
      // i=0 -> right -> 0 rad
      // i=90 -> top -> -PI/2 rad (Canvas y is down) => Actually we want visual top.

      // Let's stick to: We draw an arc from PI to 2*PI (top half).
      // Angle logic:
      // 0 deg -> right (at x=r, y=0)
      // 90 deg -> top (at x=0, y=-r)
      // 180 deg -> left (at x=-r, y=0)

      const tickAngle = Math.PI + (i * Math.PI) / 180; // PI (left) -> 2PI (right)
      const isMajor = i % 10 === 0;
      const len = isMajor ? 10 : 5;

      const tx_out = radius * Math.cos(tickAngle);
      const ty_out = radius * Math.sin(tickAngle);
      const tx_in = (radius - len) * Math.cos(tickAngle);
      const ty_in = (radius - len) * Math.sin(tickAngle);

      ctx.beginPath();
      ctx.moveTo(tx_in, ty_in);
      ctx.lineTo(tx_out, ty_out);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isMajor) { // 0, 10, ... 180
        // Calculate text pos
        const textR = radius - 20;
        const txtX = textR * Math.cos(tickAngle);
        const txtY = textR * Math.sin(tickAngle);
        // Display value: i is 0(left)..180(right) if we iterate that way?
        // No, tickAngle starts at PI (left).
        // If i=0 in loop, tickAngle=PI (left). Usually this is 180 or 0? 
        // Let's label 0 on right, 180 on left.
        // tickAngle=PI -> x=-r (left) -> Label 180?
        // tickAngle=2PI -> x=r (right) -> Label 0?
        // Let's calculate label based on angle from right.

        // 180 - i
        let label = 180 - i;
        ctx.fillText(label, txtX, txtY);
      }
    }

    // Draw Rotate Handle
    ctx.restore(); // Back to non-rotated context for a moment? No, stay in rotated.
    // Handle is at global angle 0 relative to protractor (the "right" side)
    const hx = radius;
    const hy = 0;

    ctx.beginPath();
    ctx.arc(hx, hy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(243, 156, 18, 0.8)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Handle Icon (Rotate)
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.fillText("↻", hx, hy + 1);

    // Draw Resize Handle (NEW: Top)
    const rx = 0;
    const ry = -radius;

    ctx.beginPath();
    ctx.arc(rx, ry, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(41, 128, 185, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.fillText("↕", rx, ry + 1);

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 畫圓
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const A = getPointPosition("A");
    const B = getPointPosition("B");
    const C = getPointPosition("C");

    // 計算 ∠ACB
    lastActualAngleDeg = null;
    lastIsRightish = false;

    const v1x = A.x - C.x;
    const v1y = A.y - C.y;
    const v2x = B.x - C.x;
    const v2y = B.y - C.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 > 0 && len2 > 0) {
      let cosTheta = (v1x * v2x + v1y * v2y) / (len1 * len2);
      cosTheta = Math.max(-1, Math.min(1, cosTheta));
      const theta = Math.acos(cosTheta);
      const deg = (theta * 180) / Math.PI;
      lastActualAngleDeg = deg;
      const diff = Math.abs(deg - 90);
      lastIsRightish = diff <= 2;
    }

    // 畫曲尺 CA、CB
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 10;
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(A.x, A.y);
    ctx.strokeStyle = "#2980b9";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(B.x, B.y);
    ctx.strokeStyle = "#27ae60";
    ctx.stroke();
    ctx.restore();

    // 畫弦 AB（直角時變紅）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineWidth = lastIsRightish ? 6 : 3;
    ctx.strokeStyle = lastIsRightish ? "#e53935" : "#6d4c41";
    ctx.setLineDash(lastIsRightish ? [] : [6, 6]);
    ctx.stroke();
    ctx.restore();

    // Remove old angle display near C
    // if (lastActualAngleDeg !== null) { ... }

    // Draw Protractor if visible
    drawProtractor();

    // 畫三個控制點
    ["A", "B", "C"].forEach((name) => {
      const p = getPointPosition(name);
      const color = points[name].color;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = "11px 'Noto Sans TC'";
      ctx.fillStyle = "#7b6a58";
      const offsetY = name === "C" ? -14 : 16;
      ctx.fillText(name, p.x + 10, p.y + offsetY);
      ctx.restore();
    });

    updateInfoPanelAndCheckLevel();
  }

  /* ===== 關卡 UI & 過關判定 ===== */

  function loadLevelNote(level) {
    if (!levelNote) return;
    const key = "module3_levelNote_" + level;
    const saved = localStorage.getItem(key);
    levelNote.value = saved || "";
  }

  function saveLevelNote(level, content) {
    const key = "module3_levelNote_" + level;
    try {
      localStorage.setItem(key, content);
    } catch (e) {
      console.warn("無法儲存本關記錄：", e);
    }
  }

  function updateSummaryPreview() {
    if (!summaryPreview) return;
    summaryPreview.innerHTML = "";
    for (let l = 1; l <= TOTAL_LEVELS; l++) {
      const key = "module3_levelNote_" + l;
      const txt = (localStorage.getItem(key) || "").trim();
      if (!txt) continue;
      const block = document.createElement("div");
      block.className = "summary-preview-block";

      const title = document.createElement("div");
      title.className = "summary-preview-title";
      title.textContent = `第 ${l} 關記錄：`;
      const body = document.createElement("div");
      body.textContent = txt;

      block.appendChild(title);
      block.appendChild(body);
      summaryPreview.appendChild(block);
    }
    if (!summaryPreview.innerHTML.trim()) {
      const empty = document.createElement("div");
      empty.textContent =
        "目前還沒有任何關卡記錄，可以回到上面每關的「本關小記錄」區塊補充。";
      summaryPreview.appendChild(empty);
    }
  }

  function setLevelUI(level) {
    currentLevel = level;

    // 更新關卡 badge
    levelBadges.forEach((badge) => {
      const l = Number(badge.getAttribute("data-level"));
      badge.classList.toggle("active", l === level);
    });

    const conf = levelConfig[level];
    if (!conf) return;

    if (levelTitle) levelTitle.textContent = conf.title;
    if (levelDesc) levelDesc.textContent = conf.desc;

    if (promptList) {
      if (level === 1) {
        // 第 1 關：漫畫＋核取方塊版本
        promptList.innerHTML = `
          <li class="comic-row">
            <div class="avatar">🔧</div>
            <div class="speech">
              <div class="speech-name">技師阿光：</div>
              <div class="speech-text">
                先隨便拖拖 A、B、C 看看，感受一下這把曲尺怎麼動吧！
              </div>
            </div>
          </li>

          <li class="comic-row">
            <div class="avatar">🕵️‍♀️</div>
            <div class="speech">
              <div class="speech-name">小偵探：</div>
              <div class="speech-text">
                觀察一：自由拖曳 A、B、C，感受角度變化與弦 AB 的動態。<br>
                你有沒有覺得 <strong>AB 線段的長度常常在改變？</strong>
              </div>
              <div class="obs-checks">
                <label>
                  <input type="checkbox" name="obs1" value="yes">
                  有，AB 的長度常常在改變
                </label>
                <label>
                  <input type="checkbox" name="obs1" value="no">
                  沒有特別感覺到 AB 長度在變
                </label>
              </div>
            </div>
          </li>

          <li class="comic-row">
            <div class="avatar">🕵️‍♀️</div>
            <div class="speech">
              <div class="speech-name">小偵探：</div>
              <div class="speech-text">
                觀察二：先讓 A、B 不動，只拖曳 C 點，<br>
                看一看 <strong>∠ACB 會怎麼變？</strong>
              </div>
              <div class="obs-checks">
                <label>
                  <input type="checkbox" name="obs2" value="change">
                  有變化
                </label>
                <label>
                  <input type="checkbox" name="obs2" value="nochange">
                  沒有變化
                </label>
              </div>
            </div>
          </li>

          <li class="comic-row">
            <div class="avatar">🕵️‍♀️</div>
            <div class="speech">
              <div class="speech-name">小偵探：</div>
              <div class="speech-text">
                觀察三：讓 C 點不動，改拖曳 A 或 B，<br>
                看一看 <strong>∠ACB 會怎麼變？</strong>
              </div>
              <div class="obs-checks">
                <label>
                  <input type="checkbox" name="obs3" value="change">
                  有變化
                </label>
                <label>
                  <input type="checkbox" name="obs3" value="nochange">
                  沒有變化
                </label>
              </div>
            </div>
          </li>
        `;
      } else {
        // 其他關卡：原本簡短提問
        promptList.innerHTML = "";
        conf.prompts.forEach((p) => {
          const li = document.createElement("li");
          const icon = document.createElement("span");
          icon.className = "prompt-icon";
          icon.textContent = "🔍";
          const text = document.createElement("span");
          text.textContent = p;
          li.appendChild(icon);
          li.appendChild(text);
          promptList.appendChild(li);
        });
      }
    }

    // 額外區塊顯示控制
    if (level3RecordList) {
      level3RecordList.classList.toggle("hidden", level !== 3);
      updateLevel3RecordUI();
    }
    if (level4Question) {
      level4Question.classList.toggle("hidden", level !== 4);
    }

    // 下一關按鈕狀態
    if (nextLevelBtn) {
      nextLevelBtn.disabled = !levelPassed[level] || level === TOTAL_LEVELS;
    }

    // 狀態訊息
    if (statusMessage) {
      statusMessage.textContent = conf.statusDefault;
      statusMessage.classList.remove("success");
    }

    // 載入本關小記錄
    loadLevelNote(level);

    // 筆記總結區顯示（第 4 關過關後）
    if (notebookSection) {
      if (levelPassed[4]) {
        notebookSection.classList.remove("hidden");
        updateSummaryPreview();
      } else {
        notebookSection.classList.add("hidden");
      }
    }

    // 第 3 關顯示次數: now handled by measurement list
    // if (rightCountSpan) { ... }
  }

  function updateInfoPanelAndCheckLevel() {
    // 角度顯示: 手動模式下移除自動顯示
    // if (angleDisplay) { angleDisplay.textContent = ... }

    const conf = levelConfig[currentLevel];
    if (!conf || !statusMessage) return;

    // 基本引導
    if (!levelPassed[currentLevel]) {
      // 第 2、3 關：當偵測到直角時，給短句回饋
      if (
        (currentLevel === 2 || currentLevel === 3) &&
        lastActualAngleDeg !== null &&
        lastIsRightish
      ) {
        statusMessage.textContent =
          currentLevel === 2
            ? "你現在就做出一個直角圓周角，留意 AB 變成紅色。"
            : "這也是一個直角圓周角，看看 AB 是否和前幾次一樣。";
      } else {
        statusMessage.textContent = conf.statusDefault;
      }
      statusMessage.classList.remove("success");
    }

    // 各關過關條件
    // 第 1 關：有拖曳過任一點
    if (currentLevel === 1 && !levelPassed[1] && movedOnce) {
      passLevel(1);
    }

    // 第 2 關：至少一次直角
    if (
      currentLevel === 2 &&
      !levelPassed[2] &&
      lastActualAngleDeg !== null &&
      lastIsRightish
    ) {
      passLevel(2);
    }

    // 第 3 關：Manual checks now, so passive check removed or simplified
    // Logic moved to record button handler

  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  function passLevel(level) {
    levelPassed[level] = true;
    const conf = levelConfig[level];
    if (statusMessage && conf) {
      statusMessage.textContent = conf.statusSuccess;
      statusMessage.classList.add("success");
    }
    if (nextLevelBtn && level !== TOTAL_LEVELS) {
      nextLevelBtn.disabled = false;
    }
    if (level === 4 && notebookSection) {
      notebookSection.classList.remove("hidden");
      updateSummaryPreview();
    }
  }

  /* ===== 關卡按鈕事件 ===== */

  if (nextLevelBtn) {
    nextLevelBtn.addEventListener("click", () => {
      if (currentLevel >= TOTAL_LEVELS) return;
      const next = currentLevel + 1;
      setLevelUI(next);
      draw();
    });
  }

  if (resetLevelBtn) {
    resetLevelBtn.addEventListener("click", () => {
      resetGeometry();
      if (currentLevel === 1) movedOnce = false;
      if (currentLevel === 3) {
        level3Records = [];
        updateLevel3RecordUI();
      }
      levelPassed[currentLevel] = false;
      if (nextLevelBtn && currentLevel !== TOTAL_LEVELS) {
        nextLevelBtn.disabled = true;
      }
      if (currentLevel === 4 && q4Feedback) {
        const radios = document.querySelectorAll('input[name="q4"]');
        radios.forEach((r) => (r.checked = false));
        q4Feedback.textContent = "";
        q4ShortAnswer && (q4ShortAnswer.value = "");
      }

      const conf = levelConfig[currentLevel];
      if (conf && statusMessage) {
        statusMessage.textContent = conf.statusDefault;
        statusMessage.classList.remove("success");
      }
      draw();
    });
  }

  // 第 4 關：檢查應用題
  if (checkQ4Btn && q4Feedback) {
    checkQ4Btn.addEventListener("click", () => {
      const radios = document.querySelectorAll('input[name="q4"]');
      let value = null;
      radios.forEach((r) => {
        if (r.checked) value = r.value;
      });
      if (!value) {
        alert("請先選一個答案喔！");
        return;
      }
      if (value === "A") {
        q4Feedback.textContent =
          "✅ 正確！你把探索到的『直角 ⇒ 直徑』成功用在劇院例子裡。";
        q4Feedback.style.color = "#0b7c26";
        if (!levelPassed[4]) {
          passLevel(4);
        }
      } else {
        q4Feedback.textContent =
          "❌ 想想看：只有哪一個選項提到了『直徑』與『穿過圓心』？";
        q4Feedback.style.color = "#b33a3a";
      }
    });
  }

  // 量角器 Toggle
  if (toggleProtractorBtn) {
    toggleProtractorBtn.addEventListener("click", () => {
      protractor.visible = !protractor.visible;
      toggleProtractorBtn.classList.toggle("active", protractor.visible);
      draw();
    });
  }

  // 記錄量測按鈕
  if (recordMeasureBtn && measureInput) {
    recordMeasureBtn.addEventListener("click", () => {
      // 1. Validate Input
      const val = parseFloat(measureInput.value);
      if (isNaN(val)) {
        alert("請輸入數字！");
        return;
      }

      // 2. Check current state
      if (!lastActualAngleDeg) {
        alert("目前無法計算角度，請調整 A/B/C。");
        return;
      }

      // 3. Logic per level
      if (currentLevel === 3) {
        // Must be near 90 deg actual
        if (!lastIsRightish) {
          alert("目前看起來不是直角（AB沒變紅），請先做出直角再來量測。");
          return;
        }

        // Measure Error
        const err = Math.abs(val - lastActualAngleDeg);
        if (err > 5) {
          alert(`測量值 ${val}° 與實際角度有點差距喔，請再仔細量量看！`);
          return;
        }

        // Position Check (unique position)
        const cAngle = points.C.angle;
        // Check if this position is already recorded
        const minDiff = 0.25; // rad
        let isDuplicate = false;
        for (const rec of level3Records) {
          if (Math.abs(normalizeAngle(cAngle - rec.posAngle)) < minDiff) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) {
          alert("這個位置你已經量過囉！請把點 C 移到遠一點的地方再量一次。");
          return;
        }

        // Success
        level3Records.push({
          posAngle: cAngle,
          userVal: val,
          actual: lastActualAngleDeg
        });
        measureInput.value = "";
        updateLevel3RecordUI();

        if (level3Records.length >= 3) {
          passLevel(3);
        } else {
          alert(`記錄成功！目前累積 ${level3Records.length} 筆數據。`);
        }
      } else {
        // Other levels: just simple feedback
        const err = Math.abs(val - lastActualAngleDeg);
        if (err <= 5) {
          statusMessage.textContent = `測量準確！你的讀數 ${val}° 與實際角度相當接近。`;
          statusMessage.classList.add("success");
        } else {
          statusMessage.textContent = `測量值 ${val}° 稍有誤差，實際大約是 ${lastActualAngleDeg.toFixed(1)}° 左右。`;
          statusMessage.classList.remove("success");
        }
      }
    });
  }

  function updateLevel3RecordUI() {
    if (!level3RecordList) return;
    level3RecordList.innerHTML = "";
    if (level3Records.length === 0) {
      level3RecordList.innerHTML = "<div class='record-item' style='color:#999'>尚未有記錄</div>";
      return;
    }
    level3Records.forEach((rec, idx) => {
      const div = document.createElement("div");
      div.className = "record-item";
      div.innerHTML = `
        <span>第 ${idx + 1} 次</span>
        <span class="record-success">測量: ${rec.userVal}° (OK)</span>
      `;
      level3RecordList.appendChild(div);
    });
  }

  // 本關小記錄自動儲存
  if (levelNote) {
    levelNote.addEventListener("input", () => {
      saveLevelNote(currentLevel, levelNote.value);
    });
  }

  function resetGeometry() {
    points.A.angle = 0;
    points.B.angle = Math.PI * 0.65;
    points.C.angle = Math.PI * 1.3;
  }

  /* ===== 滑鼠 / 觸控事件 ===== */

  function handlePointerDown(evt) {
    evt.preventDefault();
    rect = canvas.getBoundingClientRect();
    const pos = getPointerPos(evt);
    const targetName = findActivePoint(pos);
    activeKey = targetName;
  }

  function handlePointerMove(evt) {
    if (!activeKey) {
      if (evt.target === canvas) {
        rect = canvas.getBoundingClientRect();
        const pos = getPointerPos(evt);
        const target = findActivePoint(pos);
        if (target === "PROT_MOVE") canvas.style.cursor = "move";
        else if (target) canvas.style.cursor = "pointer";
        else canvas.style.cursor = "default";
      }
      return;
    }

    evt.preventDefault();
    const pos = getPointerPos(evt);

    if (activeKey === "PROT_MOVE") {
      protractor.x = pos.x;
      protractor.y = pos.y;
      requestAnimationFrame(draw);
      return;
    }

    if (activeKey === "PROT_ROTATE") {
      const dx = pos.x - protractor.x;
      const dy = pos.y - protractor.y;
      protractor.angle = Math.atan2(dy, dx);
      requestAnimationFrame(draw);
      return;
    }

    if (activeKey === "PROT_RESIZE") {
      const dx = pos.x - protractor.x;
      const dy = pos.y - protractor.y;
      let newR = Math.hypot(dx, dy);
      // Clamp size
      newR = Math.max(50, Math.min(newR, 400));
      protractor.radius = newR;
      requestAnimationFrame(draw);
      return;
    }

    const dx = pos.x - cx;
    const dy = pos.y - cy;
    if (dx === 0 && dy === 0) return;
    points[activeKey].angle = Math.atan2(dy, dx);
    movedOnce = true;
    requestAnimationFrame(draw);
  }

  function handlePointerUp() {
    activeKey = null;
  }

  canvas.addEventListener("mousedown", handlePointerDown);
  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("mouseup", handlePointerUp);

  canvas.addEventListener("touchstart", handlePointerDown, { passive: false });
  window.addEventListener("touchmove", handlePointerMove, { passive: false });
  window.addEventListener("touchend", handlePointerUp);

  window.addEventListener("resize", resizeCanvas);

  // 初始化
  resetGeometry();
  resizeCanvas();
  setLevelUI(1);

  // 若第 4 關已通過（例如重整頁面），更新預覽
  if (levelPassed[4]) updateSummaryPreview();
});
