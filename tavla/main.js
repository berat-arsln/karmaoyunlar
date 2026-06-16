"use strict";
/* ==========================================================
   main.js — Tavla
   AI (kolay/orta/zor/efsane), sürükle-bırak, hamle geri alma,
   bar girişi, yatay iki panelli düzen.
========================================================== */

/* ---------- SABİTLER ---------- */
const P1 = 1, P2 = 2;
const POINTS = 24, CHECKERS_PER = 15;

const HOME = {
  [P1]: { min: 1,  max: 6  },
  [P2]: { min: 19, max: 24 }
};

function entryPoint(player, die) {
  return player === P1 ? (25 - die) : die;
}

function initialBoard() {
  const b = {};
  for (let i = 1; i <= POINTS; i++) b[i] = { owner: 0, count: 0 };
  b[24] = { owner: P1, count: 2 };
  b[13] = { owner: P1, count: 5 };
  b[8]  = { owner: P1, count: 3 };
  b[6]  = { owner: P1, count: 5 };
  b[1]  = { owner: P2, count: 2 };
  b[12] = { owner: P2, count: 5 };
  b[17] = { owner: P2, count: 3 };
  b[19] = { owner: P2, count: 5 };
  return b;
}

/* ---------- STATE ---------- */
const state = {
  board:      initialBoard(),
  bar:        { [P1]: 0, [P2]: 0 },
  borneOff:   { [P1]: 0, [P2]: 0 },
  current:    P1,
  dice:       [],
  movesLeft:  [],
  selected:   null,
  phase:      "idle",
  winner:     0,
  history:    [],
  gameMode:   "pvp",
  aiDiff:     "easy",
  theme:      "light",
  sound:      true,
  volume:     0.6
};

/* ---------- DOM ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const dom = {
  board:        $("#board"),
  bar:          $("#bar"),
  barSlotP1:    $("#barSlotP1 .checkers"),
  barSlotP2:    $("#barSlotP2 .checkers"),
  bearoff:      $("#bearoff"),
  trayP1:       $("#trayP1 .checkers"),
  trayP2:       $("#trayP2 .checkers"),
  turnDot:      $("#turnDot"),
  turnText:     $("#turnText"),
  aiThinking:   $("#aiThinking"),
  offP1:        $("#offP1"),
  offP2:        $("#offP2"),
  barCountP1:   $("#barP1"),
  barCountP2:   $("#barP2"),
  panelP1:      $("#panelP1"),
  panelP2:      $("#panelP2"),
  aiBadgeP2:    $("#aiBadgeP2"),
  diceZoneP1:   $("#diceZoneP1"),
  diceZoneP2:   $("#diceZoneP2"),
  movesValP1:   $("#movesValuesP1"),
  movesValP2:   $("#movesValuesP2"),
  rollBtnP1:    $("#rollBtnP1"),
  rollBtnP2:    $("#rollBtnP2"),
  passBtnP1:    $("#passBtnP1"),
  passBtnP2:    $("#passBtnP2"),
  undoBtnP1:    $("#undoBtnP1"),
  undoBtnP2:    $("#undoBtnP2"),
  toastArea:    $("#toastArea"),
  winOverlay:   $("#winOverlay"),
  winTitle:     $("#winTitle"),
  winSub:       $("#winSub"),
  aiDiffGroup:  $("#aiDiffGroup"),
  diffHint:     $("#diffHint")
};

/* ==========================================================
   RENDER
========================================================== */
function makeChecker(owner, label) {
  const el = document.createElement("div");
  el.className = "checker " + (owner === P1 ? "p1" : "p2");
  if (label) {
    const s = document.createElement("span");
    s.className = "count";
    s.textContent = label;
    el.appendChild(s);
  }
  return el;
}

function renderPoints() {
  for (let p = 1; p <= POINTS; p++) {
    const cell = $(`.point[data-point="${p}"] .checkers`, dom.board);
    if (!cell) continue;
    cell.innerHTML = "";
    const { owner, count } = state.board[p];
    if (!count) continue;
    const vis = Math.min(count, 5);
    for (let i = 0; i < vis; i++) {
      const lbl = (i === vis - 1 && count > 5) ? String(count) : null;
      const ch = makeChecker(owner, lbl);
      ch.classList.add("placing");
      cell.appendChild(ch);
    }
  }
}

function renderBar() {
  dom.barSlotP1.innerHTML = "";
  dom.barSlotP2.innerHTML = "";
  for (let i = 0; i < state.bar[P1]; i++) dom.barSlotP1.appendChild(makeChecker(P1));
  for (let i = 0; i < state.bar[P2]; i++) dom.barSlotP2.appendChild(makeChecker(P2));
}

function renderBearoff() {
  dom.trayP1.innerHTML = "";
  dom.trayP2.innerHTML = "";
  for (let i = 0; i < state.borneOff[P1]; i++) dom.trayP1.appendChild(makeChecker(P1));
  for (let i = 0; i < state.borneOff[P2]; i++) dom.trayP2.appendChild(makeChecker(P2));
}

function renderStats() {
  dom.offP1.textContent      = state.borneOff[P1];
  dom.offP2.textContent      = state.borneOff[P2];
  dom.barCountP1.textContent = state.bar[P1];
  dom.barCountP2.textContent = state.bar[P2];
  dom.panelP1.classList.toggle("is-active", state.current === P1);
  dom.panelP2.classList.toggle("is-active", state.current === P2);
}

function renderTurn() {
  const isP1 = state.current === P1;
  dom.turnDot.className   = "turn-dot " + (isP1 ? "p1" : "p2");
  dom.turnText.textContent = isP1 ? "Sıra: Oyuncu 1" : "Sıra: Oyuncu 2";
}

function renderMoves() {
  [P1, P2].forEach(pl => {
    const valEl = pl === P1 ? dom.movesValP1 : dom.movesValP2;
    valEl.innerHTML = "";
    if (state.current !== pl || !state.dice.length) {
      valEl.textContent = "—";
      return;
    }
    const usedMap = {};
    state.dice.forEach(v => (usedMap[v] = (usedMap[v] || 0) + 1));
    state.movesLeft.forEach(v => (usedMap[v] = (usedMap[v] || 0) - 1));

    state.dice.forEach(v => {
      const chip = document.createElement("span");
      chip.className = "move-chip";
      chip.textContent = v;
      if ((usedMap[v] || 0) > 0) {
        chip.classList.add("used");
        usedMap[v]--;
      }
      valEl.appendChild(chip);
    });
  });
}

function renderButtons() {
  const isAI    = state.gameMode === "ai" && state.current === P2;
  const canRoll = state.dice.length === 0 && state.phase !== "won" && !isAI;

  dom.rollBtnP1.disabled = !(state.current === P1 && canRoll);
  dom.rollBtnP2.disabled = !(state.current === P2 && canRoll);

  const stuck1 = state.current === P1 && state.dice.length > 0 && !hasAnyLegalMove(P1);
  const stuck2 = state.current === P2 && state.dice.length > 0 && !hasAnyLegalMove(P2) && !isAI;
  dom.passBtnP1.hidden = !stuck1;
  dom.passBtnP2.hidden = !stuck2;

  const canUndo = state.history.length > 0 && state.phase === "moving";
  dom.undoBtnP1.disabled = !(state.current === P1 && canUndo && !isAI);
  dom.undoBtnP2.disabled = !(state.current === P2 && canUndo && !isAI);

  if (dom.aiBadgeP2) dom.aiBadgeP2.hidden = state.gameMode !== "ai";

  dom.aiThinking.classList.toggle("visible",
    state.gameMode === "ai" && state.current === P2 && state.phase !== "won");
}

function ensureAutoDiceMounted(zone) {
  if ($(".dice-auto", zone)) return;
  const tpl = $("#diceTemplate");
  if (!tpl) return;
  zone.innerHTML = "";
  zone.appendChild(tpl.content.cloneNode(true));
}

function renderDice() {
  const zone = state.current === P1 ? dom.diceZoneP1 : dom.diceZoneP2;
  ensureAutoDiceMounted(zone);
  const dice = $$(".die", zone);
  if (state.dice.length >= 2) {
    if (dice[0]) dice[0].setAttribute("data-value", state.dice[0]);
    if (dice[1]) dice[1].setAttribute("data-value", state.dice[1]);
  } else {
    dice.forEach(d => d.setAttribute("data-value", "0"));
  }
}

function render() {
  renderPoints();
  renderBar();
  renderBearoff();
  renderStats();
  renderTurn();
  renderMoves();
  renderButtons();
  renderDice();
  markMovable();
}

/* ==========================================================
   KURAL MOTORU
========================================================== */
function isOpenPoint(pt, player) {
  const cell = state.board[pt];
  if (!cell || cell.count === 0) return true;
  if (cell.owner === player)     return true;
  if (cell.count === 1)          return true;
  return false;
}

function canBearOff(player) {
  if (state.bar[player] > 0) return false;
  const h = HOME[player];
  let total = state.borneOff[player];
  for (let p = h.min; p <= h.max; p++) {
    if (state.board[p].owner === player) total += state.board[p].count;
  }
  return total === CHECKERS_PER;
}

function bearOffLegal(player, die) {
  if (!canBearOff(player)) return false;
  const h = HOME[player];

  if (player === P1) {
    if (die > 6) return false;
    if (state.board[die]?.owner === P1 && state.board[die].count > 0) return true;
    for (let p = die + 1; p <= h.max; p++) {
      if (state.board[p].owner === P1 && state.board[p].count > 0) return false;
    }
    for (let p = h.min; p <= h.max; p++) {
      if (state.board[p].owner === P1 && state.board[p].count > 0) return true;
    }
  } else {
    if (die > 6) return false;
    const target = 25 - die;
    if (target >= h.min && target <= h.max &&
        state.board[target]?.owner === P2 && state.board[target].count > 0) return true;
    for (let p = h.min; p < target; p++) {
      if (state.board[p].owner === P2 && state.board[p].count > 0) return false;
    }
    for (let p = h.min; p <= h.max; p++) {
      if (state.board[p].owner === P2 && state.board[p].count > 0) return true;
    }
  }
  return false;
}

function isLegalMove(from, die, player) {
  const opp = player === P1 ? P2 : P1;

  if (from === "bar") {
    if (state.bar[player] === 0) return { legal: false };
    const to = entryPoint(player, die);
    if (to < 1 || to > 24)      return { legal: false };
    if (!isOpenPoint(to, player)) return { legal: false };
    const hit = state.board[to].owner === opp && state.board[to].count === 1;
    return { legal: true, to, hit };
  }

  if (state.bar[player] > 0) return { legal: false };

  const cell = state.board[from];
  if (!cell || cell.owner !== player || cell.count === 0) return { legal: false };

  const to = player === P1 ? from - die : from + die;

  if (player === P1 && to < 1)  return { legal: bearOffLegal(player, die), to: "bearoff", hit: false };
  if (player === P2 && to > 24) return { legal: bearOffLegal(player, die), to: "bearoff", hit: false };
  if (to < 1 || to > 24)        return { legal: false };
  if (!isOpenPoint(to, player)) return { legal: false };

  const hit = state.board[to].owner === opp && state.board[to].count === 1;
  return { legal: true, to, hit };
}

function hasAnyLegalMove(player) {
  const unique = [...new Set(state.movesLeft)];
  if (state.bar[player] > 0) {
    return unique.some(d => isLegalMove("bar", d, player).legal);
  }
  for (let p = 1; p <= POINTS; p++) {
    if (state.board[p].owner !== player || !state.board[p].count) continue;
    if (unique.some(d => isLegalMove(p, d, player).legal)) return true;
  }
  return false;
}

function legalDiceFor(from, player) {
  return [...new Set(state.movesLeft)].filter(d => isLegalMove(from, d, player).legal);
}

function chooseDie(from, to, player) {
  for (const d of [...new Set(state.movesLeft)]) {
    const r = isLegalMove(from, d, player);
    if (r.legal && r.to === to) return d;
  }
  return null;
}

/* ==========================================================
   ZAR & SIRA
========================================================== */
function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function applyRoll(d1, d2) {
  state.dice      = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
  state.movesLeft = [...state.dice];
  state.phase     = "moving";
  state.selected  = null;
  state.history   = [];
  if (state.bar[state.current] > 0) state.selected = "bar";
  render();
  if (!hasAnyLegalMove(state.current)) {
    toast("Oynanabilir hamle yok — sırayı geç.", "warn");
  }
}

function doRoll(player) {
  if (state.current !== player) return;
  if (state.dice.length > 0 || state.phase === "won") return;

  state.phase = "rolling";
  renderButtons();
  playSound("roll");

  const d1 = rollDie(), d2 = rollDie();

  const zone = player === P1 ? dom.diceZoneP1 : dom.diceZoneP2;
  ensureAutoDiceMounted(zone);
  const diceEls = $$(".die", zone);
  let ticks = 0;
  const iv = setInterval(() => {
    diceEls.forEach(d => d.setAttribute("data-value", rollDie()));
    ticks++;
    if (ticks >= 8) {
      clearInterval(iv);
      applyRoll(d1, d2);
    }
  }, 55);
}

function endTurn() {
  state.dice      = [];
  state.movesLeft = [];
  state.selected  = null;
  state.phase     = "idle";
  state.history   = [];
  state.current   = state.current === P1 ? P2 : P1;
  clearHighlights();
  render();
  toast(state.current === P1 ? "Sıra Oyuncu 1'de." : "Sıra Oyuncu 2'de.");
  if (state.gameMode === "ai" && state.current === P2 && state.phase !== "won") {
    scheduleAITurn();
  }
}

function doPass(player) {
  if (state.current !== player || state.dice.length === 0) return;
  if (hasAnyLegalMove(state.current)) {
    toast("Hâlâ oynanabilecek hamle var.", "warn");
    return;
  }
  endTurn();
}

/* ==========================================================
   HAMLEYİ UYGULA
========================================================== */
function consumeDie(v) {
  const idx = state.movesLeft.indexOf(v);
  if (idx !== -1) state.movesLeft.splice(idx, 1);
}

function saveSnapshot() {
  state.history.push({
    board:     JSON.parse(JSON.stringify(state.board)),
    bar:       { ...state.bar },
    borneOff:  { ...state.borneOff },
    dice:      [...state.dice],
    movesLeft: [...state.movesLeft],
    selected:  state.selected,
    phase:     state.phase
  });
}

function undoMove() {
  if (!state.history.length) return;
  const snap = state.history.pop();
  state.board     = snap.board;
  state.bar       = snap.bar;
  state.borneOff  = snap.borneOff;
  state.dice      = snap.dice;
  state.movesLeft = snap.movesLeft;
  state.selected  = snap.selected;
  state.phase     = snap.phase;
  clearHighlights();
  render();
  toast("Hamle geri alındı.");
}

function applyMove(from, to, die, player) {
  saveSnapshot();
  const opp = player === P1 ? P2 : P1;

  if (from === "bar") {
    state.bar[player] = Math.max(0, state.bar[player] - 1);
  } else {
    state.board[from].count--;
    if (state.board[from].count === 0) state.board[from].owner = 0;
  }

  if (to === "bearoff") {
    state.borneOff[player]++;
    consumeDie(die);
    playSound("bearoff");
    if (checkWin(player)) return;
    clearHighlights();
    render();
    if (!state.movesLeft.length || !hasAnyLegalMove(player)) {
      setTimeout(endTurn, 420);
    }
    return;
  }

  if (state.board[to].owner === opp && state.board[to].count === 1) {
    state.board[to].count = 0;
    state.board[to].owner = 0;
    state.bar[opp]++;
    playSound("hit");
    toast(opp === P1 ? "Oyuncu 1 vuruldu!" : "Oyuncu 2 vuruldu!", "warn");
  } else {
    playSound("place");
  }

  state.board[to].owner = player;
  state.board[to].count++;
  consumeDie(die);

  if (state.bar[player] > 0) {
    state.selected = "bar";
  } else {
    state.selected = null;
  }

  clearHighlights();

  if (!state.movesLeft.length) {
    render();
    setTimeout(endTurn, 420);
  } else if (!hasAnyLegalMove(player)) {
    render();
    toast("Başka oynanabilir hamle yok.", "warn");
    setTimeout(endTurn, 700);
  } else {
    render();
  }
}

/* ==========================================================
   KAZANMA
========================================================== */
function checkWin(player) {
  if (state.borneOff[player] < CHECKERS_PER) return false;

  state.phase  = "won";
  state.winner = player;

  const opp      = player === P1 ? P2 : P1;
  const oppOff   = state.borneOff[opp];
  const oppBar   = state.bar[opp];
  const myHome   = HOME[player];
  let oppInHome  = 0;
  for (let p = myHome.min; p <= myHome.max; p++) {
    if (state.board[p].owner === opp) oppInHome += state.board[p].count;
  }

  let type = "normal";
  if (oppOff === 0) {
    type = (oppBar > 0 || oppInHome > 0) ? "backgammon" : "gammon";
  }

  const labels = {
    normal:     "Normal galibiyet",
    gammon:     "Mars! (Gammon)",
    backgammon: "Çift Mars! (Backgammon)"
  };

  const pName = player === P1 ? "Oyuncu 1" : (state.gameMode === "ai" ? "AI" : "Oyuncu 2");
  dom.winTitle.textContent = pName + " kazandı!";
  dom.winSub.textContent   = labels[type];
  dom.winOverlay.hidden    = false;
  playSound("win");
  render();
  return true;
}

function restartGame() {
  state.board     = initialBoard();
  state.bar       = { [P1]: 0, [P2]: 0 };
  state.borneOff  = { [P1]: 0, [P2]: 0 };
  state.current   = P1;
  state.dice      = [];
  state.movesLeft = [];
  state.selected  = null;
  state.phase     = "idle";
  state.winner    = 0;
  state.history   = [];
  dom.winOverlay.hidden = true;
  dom.aiThinking.classList.remove("visible");
  clearHighlights();
  render();
  toast("Yeni oyun başladı. Sıra Oyuncu 1'de.");
}

/* ==========================================================
   VURGULAMA & HAREKETLİ PUL İŞARETLEME
========================================================== */
function clearHighlights() {
  $$(".point", dom.board).forEach(el =>
    el.classList.remove("selected", "valid-target", "invalid-flash", "drag-over"));
  dom.bearoff?.classList.remove("valid-target", "drag-over");
  dom.bar?.classList.remove("must-enter", "drag-over");
}

function highlightTargets(from, player) {
  clearHighlights();
  if (from !== "bar") {
    const src = $(`.point[data-point="${from}"]`, dom.board);
    if (src) src.classList.add("selected");
  }
  if (state.bar[player] > 0) dom.bar?.classList.add("must-enter");

  const unique = [...new Set(state.movesLeft)];
  let any = false;
  unique.forEach(die => {
    const r = isLegalMove(from, die, player);
    if (!r.legal) return;
    if (r.to === "bearoff") {
      dom.bearoff?.classList.add("valid-target");
      any = true;
    } else {
      const el = $(`.point[data-point="${r.to}"]`, dom.board);
      if (el) { el.classList.add("valid-target"); any = true; }
    }
  });
  return any;
}

function markMovable() {
  $$(".checker", dom.board).forEach(el => el.classList.remove("movable"));
  $$(".checker", dom.barSlotP1).forEach(el => el.classList.remove("movable"));
  $$(".checker", dom.barSlotP2).forEach(el => el.classList.remove("movable"));

  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && state.current === P2) return;

  const player = state.current;

  if (state.bar[player] > 0) {
    const slot = player === P1 ? dom.barSlotP1 : dom.barSlotP2;
    const chs  = $$(".checker", slot);
    if (chs.length) chs[chs.length - 1].classList.add("movable");
    return;
  }

  for (let p = 1; p <= POINTS; p++) {
    if (state.board[p].owner !== player || !state.board[p].count) continue;
    if (legalDiceFor(p, player).length > 0) {
      const chs = $$(`.point[data-point="${p}"] .checker`, dom.board);
      if (chs.length) chs[chs.length - 1].classList.add("movable");
    }
  }
}

function flashInvalid(ptNo) {
  if (ptNo === null) return;
  const el = $(`.point[data-point="${ptNo}"]`, dom.board);
  if (!el) return;
  el.classList.remove("invalid-flash");
  void el.offsetWidth;
  el.classList.add("invalid-flash");
  setTimeout(() => el.classList.remove("invalid-flash"), 450);
}

/* ==========================================================
   TIKLAMA İŞLEYİCİLERİ
========================================================== */
function handlePointClick(ptNo) {
  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && state.current === P2) return;
  const player = state.current;

  if (state.bar[player] > 0) {
    toast("Önce bar'daki pulunu oyna.", "warn");
    playSound("invalid");
    return;
  }

  if (state.selected === null) {
    const cell = state.board[ptNo];
    if (cell.owner !== player || !cell.count) {
      flashInvalid(ptNo);
      playSound("invalid");
      return;
    }
    state.selected = ptNo;
    if (!highlightTargets(ptNo, player)) {
      state.selected = null;
      clearHighlights();
      toast("Bu haneden oynanabilecek hamle yok.", "warn");
      playSound("invalid");
    }
    return;
  }

  if (state.selected === ptNo) {
    state.selected = null;
    clearHighlights();
    return;
  }

  const from = state.selected;
  const die  = chooseDie(from, ptNo, player);

  if (die === null) {
    const cell = state.board[ptNo];
    if (cell.owner === player && cell.count > 0) {
      state.selected = ptNo;
      if (!highlightTargets(ptNo, player)) {
        state.selected = null;
        clearHighlights();
        toast("Bu haneden oynanabilecek hamle yok.", "warn");
        playSound("invalid");
      }
    } else {
      flashInvalid(ptNo);
      playSound("invalid");
    }
    return;
  }

  const result = isLegalMove(from, die, player);
  clearHighlights();
  state.selected = null;
  applyMove(from, result.to, die, player);
}

function handleBarClick() {
  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && state.current === P2) return;
  const player = state.current;
  if (!state.bar[player]) return;

  if (state.selected === "bar") {
    state.selected = null;
    clearHighlights();
    return;
  }
  state.selected = "bar";
  if (!highlightTargets("bar", player)) {
    state.selected = null;
    clearHighlights();
    toast("Bar'dan giriş yapılacak hane kapalı.", "warn");
    playSound("invalid");
  }
}

function handleBearoffClick() {
  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && state.current === P2) return;
  const player = state.current;
  if (!state.selected || state.selected === "bar") {
    toast("Önce çıkaracağın pulu seç.", "warn");
    return;
  }
  const from = state.selected;
  const die  = chooseDie(from, "bearoff", player);
  if (die === null) {
    toast("Bu pulu şu an çıkaramazsın.", "warn");
    playSound("invalid");
    return;
  }
  clearHighlights();
  state.selected = null;
  applyMove(from, "bearoff", die, player);
}

/* ==========================================================
   SÜRÜKLE-BIRAK
========================================================== */
let dragState = null;

function startDrag(e, from, player) {
  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && player === P2) return;
  if (state.current !== player) return;
  if (state.bar[player] > 0 && from !== "bar") return;
  if (from !== "bar" && legalDiceFor(from, player).length === 0) return;

  e.preventDefault();
  const touch = e.touches ? e.touches[0] : e;

  const ghost = document.createElement("div");
  ghost.className = "drag-ghost " + (player === P1 ? "p1" : "p2");
  ghost.style.left = touch.clientX + "px";
  ghost.style.top  = touch.clientY + "px";
  document.body.appendChild(ghost);

  dragState = { from, player, ghost };

  state.selected = from;
  highlightTargets(from, player);

  const slot = from === "bar"
    ? (player === P1 ? dom.barSlotP1 : dom.barSlotP2)
    : null;
  const chs = slot
    ? $$(".checker", slot)
    : $$(`.point[data-point="${from}"] .checker`, dom.board);
  if (chs.length) chs[chs.length - 1].classList.add("dragging");
}

function moveDrag(e) {
  if (!dragState) return;
  e.preventDefault();
  const touch = e.touches ? e.touches[0] : e;
  dragState.ghost.style.left = touch.clientX + "px";
  dragState.ghost.style.top  = touch.clientY + "px";

  $$(".point.drag-over", dom.board).forEach(el => el.classList.remove("drag-over"));
  dom.bearoff.classList.remove("drag-over");

  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el) return;
  const pt = el.closest(".point[data-point]");
  if (pt) {
    const no  = parseInt(pt.dataset.point, 10);
    const die = chooseDie(dragState.from, no, dragState.player);
    if (die !== null) pt.classList.add("drag-over");
  }
  const bo = el.closest(".bearoff");
  if (bo && chooseDie(dragState.from, "bearoff", dragState.player) !== null) {
    bo.classList.add("drag-over");
  }
}

function endDrag(e) {
  if (!dragState) return;
  e.preventDefault();
  const touch = e.changedTouches ? e.changedTouches[0] : e;
  const { from, player, ghost } = dragState;

  ghost.remove();
  dragState = null;
  $$(".checker.dragging").forEach(el => el.classList.remove("dragging"));
  $$(".point.drag-over", dom.board).forEach(el => el.classList.remove("drag-over"));
  dom.bearoff.classList.remove("drag-over");

  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el) { clearHighlights(); state.selected = null; render(); return; }

  const ptEl = el.closest(".point[data-point]");
  const boEl = el.closest(".bearoff");

  if (ptEl) {
    const to  = parseInt(ptEl.dataset.point, 10);
    const die = chooseDie(from, to, player);
    if (die !== null) {
      clearHighlights(); state.selected = null;
      applyMove(from, to, die, player);
      return;
    }
  }
  if (boEl) {
    const die = chooseDie(from, "bearoff", player);
    if (die !== null) {
      clearHighlights(); state.selected = null;
      applyMove(from, "bearoff", die, player);
      return;
    }
  }

  clearHighlights();
  state.selected = null;
  render();
}

/* ==========================================================
   EVENT BINDING
========================================================== */
function bindBoardEvents() {
  dom.board.addEventListener("click", e => {
    const ptEl  = e.target.closest(".point[data-point]");
    if (ptEl) { handlePointClick(parseInt(ptEl.dataset.point, 10)); return; }
    const barEl = e.target.closest(".bar, .bar-slot");
    if (barEl) { handleBarClick(); return; }
  });

  dom.bearoff?.addEventListener("click", handleBearoffClick);

  document.addEventListener("mousemove",  moveDrag);
  document.addEventListener("mouseup",    endDrag);
  document.addEventListener("touchmove",  moveDrag, { passive: false });
  document.addEventListener("touchend",   endDrag,  { passive: false });

  // Sürükle olaylarını .movable pullara bağla — render sonrası MutationObserver ile
  new MutationObserver(() => rebindDragListeners())
    .observe(dom.board, { childList: true, subtree: true });

  // Bar sürükle
  const bindBarDrag = (slot, player) => {
    slot.parentElement?.addEventListener("mousedown",  e => { if (e.button !== 0) return; startDrag(e, "bar", player); });
    slot.parentElement?.addEventListener("touchstart", e => startDrag(e, "bar", player), { passive: false });
  };
  bindBarDrag(dom.barSlotP1, P1);
  bindBarDrag(dom.barSlotP2, P2);
}

function rebindDragListeners() {
  if (state.phase !== "moving") return;
  if (state.gameMode === "ai" && state.current === P2) return;
  const player = state.current;

  $$(".checker.movable", dom.board).forEach(el => {
    if (el._dragBound) return;
    el._dragBound = true;
    const ptEl = el.closest(".point[data-point]");
    if (!ptEl) return;
    const from = parseInt(ptEl.dataset.point, 10);
    el.addEventListener("mousedown",  e => { if (e.button !== 0) return; startDrag(e, from, player); });
    el.addEventListener("touchstart", e => startDrag(e, from, player), { passive: false });
  });

  const barSlot = player === P1 ? dom.barSlotP1 : dom.barSlotP2;
  $$(".checker.movable", barSlot).forEach(el => {
    if (el._dragBound) return;
    el._dragBound = true;
    el.addEventListener("mousedown",  e => { if (e.button !== 0) return; startDrag(e, "bar", player); });
    el.addEventListener("touchstart", e => startDrag(e, "bar", player), { passive: false });
  });
}

function bindPanelEvents() {
  dom.rollBtnP1?.addEventListener("click", () => doRoll(P1));
  dom.rollBtnP2?.addEventListener("click", () => doRoll(P2));
  dom.passBtnP1?.addEventListener("click", () => doPass(P1));
  dom.passBtnP2?.addEventListener("click", () => doPass(P2));
  dom.undoBtnP1?.addEventListener("click", () => { if (state.current === P1) undoMove(); });
  dom.undoBtnP2?.addEventListener("click", () => { if (state.current === P2) undoMove(); });
  $("#restartBtn")?.addEventListener("click", restartGame);
  $("#winRestartBtn")?.addEventListener("click", restartGame);
}

function bindSettingsEvents() {
  $("#settingsBtn")?.addEventListener("click",      openSettings);
  $("#settingsCloseBtn")?.addEventListener("click", closeSettings);
  $("#settingsOverlay")?.addEventListener("click",  closeSettings);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSettings(); });

  $$("#themeSwitch .seg-btn").forEach(btn =>
    btn.addEventListener("click", () => applyTheme(btn.dataset.themeVal)));

  $("#soundToggle")?.addEventListener("click", () => applySound(!state.sound));
  $("#volumeSlider")?.addEventListener("input", e => applyVolume(Number(e.target.value)));

  $$("#gameModeSwitch .seg-btn").forEach(btn =>
    btn.addEventListener("click", () => applyGameMode(btn.dataset.mode)));

  $$("#aiDiffSwitch .seg-btn").forEach(btn =>
    btn.addEventListener("click", () => applyAIDiff(btn.dataset.diff)));
}

/* ==========================================================
   AYARLAR
========================================================== */
function openSettings() {
  const p = $("#settingsPanel"), o = $("#settingsOverlay");
  if (!p || !o) return;
  o.hidden = false;
  p.classList.add("open");
  p.removeAttribute("aria-hidden");
}

function closeSettings() {
  const p = $("#settingsPanel"), o = $("#settingsOverlay");
  if (!p || !o) return;
  p.classList.remove("open");
  p.setAttribute("aria-hidden", "true");
  setTimeout(() => { o.hidden = true; }, 260);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  state.theme = theme;
  $$("#themeSwitch .seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.themeVal === theme));
  try { localStorage.setItem("tavla_theme", theme); } catch(_) {}
}

function applySound(on) {
  state.sound = on;
  const t = $("#soundToggle");
  if (t) { t.dataset.on = String(on); t.setAttribute("aria-checked", String(on)); }
  const s = $("#volumeSlider");
  if (s) s.disabled = !on;
  try { localStorage.setItem("tavla_sound", String(on)); } catch(_) {}
}

function applyVolume(v) {
  state.volume = v / 100;
  try { localStorage.setItem("tavla_volume", String(v)); } catch(_) {}
}

function applyGameMode(mode) {
  state.gameMode = mode;
  $$("#gameModeSwitch .seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === mode));
  if (dom.aiDiffGroup) dom.aiDiffGroup.style.display = mode === "ai" ? "" : "none";
  const nameEl = $("#nameP2");
  if (nameEl) nameEl.textContent = mode === "ai" ? "AI" : "Oyuncu 2";
  try { localStorage.setItem("tavla_mode", mode); } catch(_) {}
  restartGame();
}

function applyAIDiff(diff) {
  state.aiDiff = diff;
  $$("#aiDiffSwitch .seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.diff === diff));
  const hints = {
    easy:   "AI basit hamleler yapar.",
    medium: "AI iyi hamleler düşünür.",
    hard:   "AI gelişmiş strateji kullanır.",
    legend: "AI neredeyse yenilmez."
  };
  if (dom.diffHint) dom.diffHint.textContent = hints[diff] || "";
  try { localStorage.setItem("tavla_diff", diff); } catch(_) {}
}

function loadPreferences() {
  try {
    const theme  = localStorage.getItem("tavla_theme");
    const sound  = localStorage.getItem("tavla_sound");
    const volume = localStorage.getItem("tavla_volume");
    const mode   = localStorage.getItem("tavla_mode");
    const diff   = localStorage.getItem("tavla_diff");
    if (theme)        applyTheme(theme);
    if (sound != null) applySound(sound === "true");
    if (volume != null) {
      applyVolume(Number(volume));
      const s = $("#volumeSlider");
      if (s) s.value = volume;
    }
    if (mode) {
      state.gameMode = mode;
      $$("#gameModeSwitch .seg-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.mode === mode));
      if (dom.aiDiffGroup) dom.aiDiffGroup.style.display = mode === "ai" ? "" : "none";
      const nameEl = $("#nameP2");
      if (nameEl && mode === "ai") nameEl.textContent = "AI";
    }
    if (diff) applyAIDiff(diff);
  } catch(_) {}
}

/* ==========================================================
   YAPAY ZEKA
========================================================== */
function aiDelay() {
  return { easy: 600, medium: 900, hard: 1200, legend: 1500 }[state.aiDiff] || 800;
}

function scheduleAITurn() {
  dom.aiThinking.classList.add("visible");
  setTimeout(() => {
    if (state.current !== P2 || state.phase !== "idle") return;
    aiRollAndPlay();
  }, aiDelay());
}

function aiRollAndPlay() {
  if (state.current !== P2 || state.phase !== "idle") return;
  playSound("roll");
  const d1 = rollDie(), d2 = rollDie();
  applyRoll(d1, d2);
  setTimeout(aiPlayAllMoves, aiDelay());
}

function aiPlayAllMoves() {
  if (state.current !== P2 || state.phase !== "moving") return;
  if (!state.movesLeft.length || !hasAnyLegalMove(P2)) {
    dom.aiThinking.classList.remove("visible");
    endTurn();
    return;
  }
  const move = pickAIMove();
  if (!move) {
    dom.aiThinking.classList.remove("visible");
    endTurn();
    return;
  }
  applyMoveAI(move);
}

function applyMoveAI(move) {
  // Hamleyi doğrudan uygula; sonra kalan varsa devam et
  applyMove(move.from, move.to, move.die, P2);
  setTimeout(() => {
    if (state.current === P2 && state.phase === "moving" && state.movesLeft.length > 0) {
      if (hasAnyLegalMove(P2)) {
        aiPlayAllMoves();
      } else {
        dom.aiThinking.classList.remove("visible");
      }
    } else {
      dom.aiThinking.classList.remove("visible");
    }
  }, Math.round(aiDelay() * 0.65));
}

function getAllLegalMoves(player) {
  const unique = [...new Set(state.movesLeft)];
  const moves  = [];
  const froms  = [];

  if (state.bar[player] > 0) {
    froms.push("bar");
  } else {
    for (let p = 1; p <= POINTS; p++) {
      if (state.board[p].owner === player && state.board[p].count > 0) froms.push(p);
    }
  }

  for (const from of froms) {
    for (const die of unique) {
      const r = isLegalMove(from, die, player);
      if (r.legal) moves.push({ from, to: r.to, die, hit: r.hit });
    }
  }
  return moves;
}

function pickAIMove() {
  const moves = getAllLegalMoves(P2);
  if (!moves.length) return null;

  if (state.aiDiff === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (state.aiDiff === "medium") {
    const hits = moves.filter(m => m.hit);
    if (hits.length) return hits[Math.floor(Math.random() * hits.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return scoreBestMove(moves, P2, state.aiDiff === "legend" ? 2 : 1);
}

function scoreMove(move, player) {
  let score = 0;
  const opp = player === P1 ? P2 : P1;
  if (move.to === "bearoff") return 200;
  if (move.hit)              score += 60;
  if (move.from === "bar")   score += 50;
  if (typeof move.to === "number") {
    const cell = state.board[move.to];
    if (cell.owner === player && cell.count >= 2) score += 20;
    else if (!cell.count)                          score -= 10;
    const progress = player === P2 ? move.to : (25 - move.to);
    score += progress * 0.5;
  }
  if (typeof move.from === "number" && state.board[move.from].count === 1) score -= 8;
  return score;
}

function scoreBestMove(moves, player, depth) {
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    let s = scoreMove(m, player);
    if (depth > 1) s += simulateScore(m, player);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

function simulateScore(move, player) {
  const opp = player === P1 ? P2 : P1;
  const savedBoard    = JSON.parse(JSON.stringify(state.board));
  const savedBar      = { ...state.bar };
  const savedBorneOff = { ...state.borneOff };
  const savedLeft     = [...state.movesLeft];

  let bonus = 0;

  if (move.from === "bar") {
    state.bar[player] = Math.max(0, state.bar[player] - 1);
  } else if (typeof move.from === "number") {
    state.board[move.from].count--;
    if (!state.board[move.from].count) state.board[move.from].owner = 0;
  }
  if (move.to !== "bearoff" && typeof move.to === "number") {
    if (state.board[move.to].owner === opp && state.board[move.to].count === 1) {
      state.board[move.to].count = 0; state.board[move.to].owner = 0;
      state.bar[opp]++; bonus += 30;
    }
    state.board[move.to].owner = player;
    state.board[move.to].count++;
  } else if (move.to === "bearoff") {
    state.borneOff[player]++; bonus += 40;
  }
  const idx = state.movesLeft.indexOf(move.die);
  if (idx !== -1) state.movesLeft.splice(idx, 1);

  const nextMoves = getAllLegalMoves(player);
  if (nextMoves.length) {
    bonus += Math.max(...nextMoves.map(m => scoreMove(m, player))) * 0.3;
  }

  state.board     = savedBoard;
  state.bar       = savedBar;
  state.borneOff  = savedBorneOff;
  state.movesLeft = savedLeft;
  return bonus;
}

/* ==========================================================
   SES
========================================================== */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function masterGain(ctx) {
  const g = ctx.createGain();
  g.gain.value = state.sound ? state.volume : 0;
  g.connect(ctx.destination);
  return g;
}

function applyEnv(gn, ctx, { attack=.005, decay=.1, sustain=.3, release=.2, peak=1 } = {}) {
  const now = ctx.currentTime;
  gn.gain.setValueAtTime(0, now);
  gn.gain.linearRampToValueAtTime(peak, now + attack);
  gn.gain.linearRampToValueAtTime(sustain * peak, now + attack + decay);
  gn.gain.linearRampToValueAtTime(0, now + attack + decay + release);
  return now + attack + decay + release;
}

function sfx_roll() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  const buf  = ctx.createBuffer(1, ctx.sampleRate * .18, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 800; f.Q.value = .8;
  const gn = ctx.createGain();
  const end = applyEnv(gn, ctx, { attack:.01, decay:.06, sustain:.4, release:.12, peak:.55 });
  noise.connect(f); f.connect(gn); gn.connect(mg);
  noise.start(); noise.stop(ctx.currentTime + end + .02);
}

function sfx_place() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  const osc = ctx.createOscillator(), gn = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(340, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + .07);
  applyEnv(gn, ctx, { attack:.003, decay:.05, sustain:.1, release:.08, peak:.45 });
  osc.connect(gn); gn.connect(mg);
  osc.start(); osc.stop(ctx.currentTime + .18);
}

function sfx_hit() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  const buf  = ctx.createBuffer(1, ctx.sampleRate * .12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200;
  const gnN = ctx.createGain();
  applyEnv(gnN, ctx, { attack:.002, decay:.08, sustain:0, release:.05, peak:.6 });
  noise.connect(f); f.connect(gnN); gnN.connect(mg);
  noise.start(); noise.stop(ctx.currentTime + .18);
  const osc = ctx.createOscillator(), gnO = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + .15);
  applyEnv(gnO, ctx, { attack:.002, decay:.1, sustain:0, release:.05, peak:.35 });
  osc.connect(gnO); gnO.connect(mg);
  osc.start(); osc.stop(ctx.currentTime + .2);
}

function sfx_bearoff() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  [660, 880].forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator(), gn = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      applyEnv(gn, ctx, { attack:.005, decay:.08, sustain:.2, release:.25, peak:.4 });
      osc.connect(gn); gn.connect(mg);
      osc.start(); osc.stop(ctx.currentTime + .4);
    }, i * 80);
  });
}

function sfx_invalid() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  const osc = ctx.createOscillator(), gn = ctx.createGain();
  osc.type = "sawtooth"; osc.frequency.value = 120;
  applyEnv(gn, ctx, { attack:.005, decay:.07, sustain:.1, release:.1, peak:.3 });
  osc.connect(gn); gn.connect(mg);
  osc.start(); osc.stop(ctx.currentTime + .22);
}

function sfx_win() {
  const ctx = getAudioCtx(), mg = masterGain(ctx);
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator(), gn = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      applyEnv(gn, ctx, { attack:.01, decay:.1, sustain:.5, release:.35, peak:.5 });
      osc.connect(gn); gn.connect(mg);
      osc.start(); osc.stop(ctx.currentTime + .55);
    }, i * 130);
  });
}

function playSound(name) {
  if (!state.sound) return;
  try {
    if (name === "roll")    sfx_roll();
    else if (name === "place")   sfx_place();
    else if (name === "hit")     sfx_hit();
    else if (name === "bearoff") sfx_bearoff();
    else if (name === "invalid") sfx_invalid();
    else if (name === "win")     sfx_win();
  } catch(e) { console.warn("Ses:", e); }
}

/* ==========================================================
   TOAST
========================================================== */
function toast(msg, type, duration) {
  type     = type     || "info";
  duration = duration || 2600;
  const area = dom.toastArea;
  if (!area) return;
  const el = document.createElement("div");
  el.className  = "toast" + (type !== "info" ? " toast-" + type : "");
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(function() {
    el.classList.add("out");
    el.addEventListener("animationend", function() { el.remove(); }, { once: true });
  }, duration);
}

/* ==========================================================
   INIT
========================================================== */
function init() {
  loadPreferences();
  bindBoardEvents();
  bindPanelEvents();
  bindSettingsEvents();
  ensureAutoDiceMounted(dom.diceZoneP1);
  ensureAutoDiceMounted(dom.diceZoneP2);
  render();
  toast("Tavla başladı! Sıra Oyuncu 1'de — zar at.");
}

document.addEventListener("DOMContentLoaded", init);
