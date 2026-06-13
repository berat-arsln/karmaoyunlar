/* =====================================================
   js/game.js — Core Game Logic (Part 1/3)
   Constants, State, Board Generation
   ===================================================== */

'use strict';

/* ── Difficulty Presets ────────────────────────────── */
const DIFFICULTIES = {
  easy:       { rows: 9,  cols: 9,  mines: 10  },
  medium:     { rows: 16, cols: 16, mines: 40  },
  hard:       { rows: 16, cols: 30, mines: 99  },
  impossible: { rows: 20, cols: 40, mines: 220 },
};

/* ── Game State ────────────────────────────────────── */
const State = {
  rows:        0,
  cols:        0,
  totalMines:  0,
  difficulty:  'easy',

  board:       [],   // 2D array of cell objects
  mineSet:     new Set(), // flat indices of mines

  revealed:    0,    // number of revealed cells
  flagCount:   0,    // flags placed
  gameStarted: false,
  gameOver:    false,
  won:         false,

  timerInterval: null,
  elapsedSeconds: 0,
};

/* ── Cell Factory ──────────────────────────────────── */
function makeCell() {
  return {
    isMine:    false,
    revealed:  false,
    flagged:   false,
    number:    0,      // adjacent mine count (0–8)
  };
}

/* ── Board Initialisation ──────────────────────────── */
function initBoard(rows, cols) {
  State.rows = rows;
  State.cols = cols;
  State.board = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(makeCell());
    }
    State.board.push(row);
  }
}

/* ── Mine Placement (after first click) ────────────── */
function placeMines(safeRow, safeCol) {
  const { rows, cols, totalMines } = State;
  const total = rows * cols;

  // Build exclusion zone (3×3 around first click)
  const excluded = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeRow + dr;
      const nc = safeCol + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        excluded.add(nr * cols + nc);
      }
    }
  }

  // Clamp mine count if board is too small
  const available = total - excluded.size;
  const mineCount = Math.min(totalMines, available);

  State.mineSet = new Set();

  while (State.mineSet.size < mineCount) {
    const idx = Math.floor(Math.random() * total);
    if (!excluded.has(idx)) {
      State.mineSet.add(idx);
    }
  }

  // Apply mines to board
  for (const idx of State.mineSet) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    State.board[r][c].isMine = true;
  }

  // Compute adjacency numbers
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!State.board[r][c].isMine) {
        State.board[r][c].number = countAdjacentMines(r, c);
      }
    }
  }
}

/* ── Adjacency Helpers ─────────────────────────────── */
function getNeighbours(r, c) {
  const { rows, cols } = State;
  const neighbours = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbours.push([nr, nc]);
      }
    }
  }
  return neighbours;
}

function countAdjacentMines(r, c) {
  return getNeighbours(r, c).filter(([nr, nc]) => State.board[nr][nc].isMine).length;
}

function countAdjacentFlags(r, c) {
  return getNeighbours(r, c).filter(([nr, nc]) => State.board[nr][nc].flagged).length;
}

/* ── Reset ─────────────────────────────────────────── */
function resetGame(rows, cols, mines, difficulty) {
  clearInterval(State.timerInterval);

  State.difficulty    = difficulty || 'easy';
  State.totalMines    = mines;
  State.revealed      = 0;
  State.flagCount     = 0;
  State.gameStarted   = false;
  State.gameOver      = false;
  State.won           = false;
  State.elapsedSeconds = 0;
  State.mineSet       = new Set();

  initBoard(rows, cols);
}

/* =====================================================
   js/game.js — Core Game Logic (Part 2/3)
   Reveal, Flag, Chord, Win/Lose Logic, Timer
   ===================================================== */

/* ── Reveal Cell ───────────────────────────────────── */
function revealCell(r, c) {
  const cell = State.board[r][c];

  if (State.gameOver || cell.revealed || cell.flagged) return;

  // First click — place mines, start timer
  if (!State.gameStarted) {
    State.gameStarted = true;
    placeMines(r, c);
    startTimer();
  }

  cell.revealed = true;
  State.revealed++;

  if (cell.isMine) {
    triggerLoss(r, c);
    return;
  }

  // Flood-fill for empty cells
  if (cell.number === 0) {
    floodReveal(r, c);
  }

  checkWin();
}

/* ── Flood Fill (BFS) ──────────────────────────────── */
function floodReveal(startR, startC) {
  const queue = [[startR, startC]];
  const visited = new Set();
  visited.add(startR * State.cols + startC);

  while (queue.length > 0) {
    const [r, c] = queue.shift();

    for (const [nr, nc] of getNeighbours(r, c)) {
      const key = nr * State.cols + nc;
      if (visited.has(key)) continue;
      visited.add(key);

      const neighbour = State.board[nr][nc];
      if (neighbour.revealed || neighbour.flagged || neighbour.isMine) continue;

      neighbour.revealed = true;
      State.revealed++;

      if (neighbour.number === 0) {
        queue.push([nr, nc]);
      }
    }
  }
}

/* ── Flag / Unflag ─────────────────────────────────── */
function toggleFlag(r, c) {
  const cell = State.board[r][c];
  if (State.gameOver || cell.revealed) return;

  if (cell.flagged) {
    cell.flagged = false;
    State.flagCount--;
  } else {
    cell.flagged = true;
    State.flagCount++;
  }
}

/* ── Chord (reveal neighbours when flags match number) */
function chordReveal(r, c) {
  const cell = State.board[r][c];
  if (!cell.revealed || cell.number === 0 || State.gameOver) return;

  const adjFlags = countAdjacentFlags(r, c);
  if (adjFlags !== cell.number) return;

  for (const [nr, nc] of getNeighbours(r, c)) {
    const neighbour = State.board[nr][nc];
    if (!neighbour.revealed && !neighbour.flagged) {
      revealCell(nr, nc);
      if (State.gameOver) return; // hit a mine during chord
    }
  }
}

/* ── Win Check ─────────────────────────────────────── */
function checkWin() {
  const { rows, cols, totalMines, revealed } = State;
  const safeCells = rows * cols - totalMines;

  if (revealed >= safeCells) {
    State.gameOver = true;
    State.won      = true;
    stopTimer();
    autoFlagRemaining();
    onGameWon();
  }
}

/* ── Auto-flag remaining mines on win ─────────────── */
function autoFlagRemaining() {
  const { rows, cols } = State;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = State.board[r][c];
      if (cell.isMine && !cell.flagged) {
        cell.flagged = true;
        State.flagCount++;
      }
    }
  }
}

/* ── Loss ──────────────────────────────────────────── */
function triggerLoss(hitR, hitC) {
  State.gameOver = true;
  State.won      = false;
  stopTimer();
  revealAllMines(hitR, hitC);
  onGameLost(hitR, hitC);
}

/* ── Reveal all mines after loss ───────────────────── */
function revealAllMines(hitR, hitC) {
  const { rows, cols } = State;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = State.board[r][c];
      // Show unflagged mines
      if (cell.isMine && !cell.flagged) {
        cell.revealed = true;
      }
      // Mark wrong flags (flagged but not a mine)
      if (!cell.isMine && cell.flagged) {
        cell.wrongFlag = true;
      }
    }
  }
  // Mark the cell that was hit
  State.board[hitR][hitC].hitMine = true;
}

/* ── Timer ─────────────────────────────────────────── */
function startTimer() {
  State.elapsedSeconds = 0;
  clearInterval(State.timerInterval);

  State.timerInterval = setInterval(() => {
    State.elapsedSeconds++;
    if (State.elapsedSeconds >= 999) {
      State.elapsedSeconds = 999;
      clearInterval(State.timerInterval);
    }
    onTimerTick(State.elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(State.timerInterval);
}

/* ── Callbacks (implemented in ui.js) ─────────────── */
// These are assigned by ui.js at runtime:
let onGameWon   = () => {};
let onGameLost  = () => {};
let onTimerTick = () => {};
/* =====================================================
   js/game.js — Core Game Logic (Part 3/3)
   Public API
   ===================================================== */

/* ── Public API ────────────────────────────────────── */
const Game = {

  /* Start a new game with given config */
  newGame(rows, cols, mines, difficulty) {
    resetGame(rows, cols, mines, difficulty);
  },

  /* Called when a cell is left-clicked */
  handleReveal(r, c) {
    if (State.gameOver) return;
    revealCell(r, c);
  },

  /* Called when a cell is right-clicked */
  handleFlag(r, c) {
    if (State.gameOver) return;
    toggleFlag(r, c);
  },

  /* Called on double-click or middle-click (chord) */
  handleChord(r, c) {
    if (State.gameOver) return;
    chordReveal(r, c);
  },

  /* Register UI callbacks */
  onWin(fn)       { onGameWon   = fn; },
  onLose(fn)      { onGameLost  = fn; },
  onTick(fn)      { onTimerTick = fn; },

  /* State accessors */
  getBoard()      { return State.board; },
  getRows()       { return State.rows; },
  getCols()       { return State.cols; },
  getMineCount()  { return State.totalMines; },
  getFlagCount()  { return State.flagCount; },
  getElapsed()    { return State.elapsedSeconds; },
  isGameOver()    { return State.gameOver; },
  isWon()         { return State.won; },
  isStarted()     { return State.gameStarted; },

  /* Remaining mines display value (can go negative) */
  getRemainingMines() {
    return State.totalMines - State.flagCount;
  },

  /* Difficulty presets */
  getPreset(difficulty) {
    return DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
  },

  DIFFICULTIES,
};