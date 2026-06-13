/* =====================================================
   js/ui.js — UI Controller
   DOM Manipulation, Event Handling, SVG Icons,
   Board Rendering, Overlay, LCD Updates
   ===================================================== */

'use strict';

/* =====================================================
   BÖLÜM 1/3 — SVG İkonlar & Yardımcı Fonksiyonlar
   ===================================================== */

/* ── SVG Tanımları ─────────────────────────────────── */
const SVG = {

  /* Mayın ikonu */
  mine() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="6" fill="#1a1a1a"/>
      <rect x="11" y="2" width="2" height="4" rx="1" fill="#1a1a1a"/>
      <rect x="11" y="18" width="2" height="4" rx="1" fill="#1a1a1a"/>
      <rect x="2" y="11" width="4" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="18" y="11" width="4" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="4.93" y="4.93" width="2" height="4" rx="1"
            transform="rotate(45 5.93 6.93)" fill="#1a1a1a"/>
      <rect x="16.14" y="4.93" width="2" height="4" rx="1"
            transform="rotate(-45 17.14 6.93)" fill="#1a1a1a"/>
      <rect x="4.93" y="15.07" width="2" height="4" rx="1"
            transform="rotate(-45 5.93 17.07)" fill="#1a1a1a"/>
      <rect x="16.14" y="15.07" width="2" height="4" rx="1"
            transform="rotate(45 17.14 17.07)" fill="#1a1a1a"/>
      <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.45)"/>
    </svg>`;
  },

  /* Bayrak ikonu */
  flag() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="10.5" y="4" width="2" height="16" rx="1" fill="#444"/>
      <polygon points="12,4 20,8 12,12" fill="#e94560"/>
      <rect x="7" y="19" width="9" height="2" rx="1" fill="#444"/>
    </svg>`;
  },

  /* Yanlış bayrak — X işareti üstünde bayrak */
  wrongFlag() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="10.5" y="4" width="2" height="16" rx="1" fill="#444"/>
      <polygon points="12,4 20,8 12,12" fill="#e94560"/>
      <rect x="7" y="19" width="9" height="2" rx="1" fill="#444"/>
      <line x1="4" y1="4" x2="20" y2="20" stroke="#ff0000" stroke-width="2.5"
            stroke-linecap="round"/>
      <line x1="20" y1="4" x2="4" y2="20" stroke="#ff0000" stroke-width="2.5"
            stroke-linecap="round"/>
    </svg>`;
  },

  /* Smiley — normal oyun durumu */
  faceNormal() {
    return `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#ffd700" stroke="#b8960c" stroke-width="1.5"/>
      <circle cx="10" cy="11" r="1.8" fill="#333"/>
      <circle cx="18" cy="11" r="1.8" fill="#333"/>
      <path d="M9 17 Q14 22 19 17" stroke="#333" stroke-width="1.8"
            fill="none" stroke-linecap="round"/>
    </svg>`;
  },

  /* Shocked — sol tık basılı tutulurken */
  faceShocked() {
    return `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#ffd700" stroke="#b8960c" stroke-width="1.5"/>
      <circle cx="10" cy="11" r="2.2" fill="#333"/>
      <circle cx="18" cy="11" r="2.2" fill="#333"/>
      <ellipse cx="14" cy="18" rx="3" ry="2.5" fill="#333"/>
    </svg>`;
  },

  /* Win — kazanıldığında */
  faceWin() {
    return `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#ffd700" stroke="#b8960c" stroke-width="1.5"/>
      <circle cx="10" cy="11" r="1.8" fill="#333"/>
      <circle cx="18" cy="11" r="1.8" fill="#333"/>
      <path d="M8 16 Q14 23 20 16" stroke="#333" stroke-width="2"
            fill="none" stroke-linecap="round"/>
      <!-- Güneş gözlüğü -->
      <rect x="7" y="9" width="5" height="3.5" rx="1.5" fill="#333"/>
      <rect x="16" y="9" width="5" height="3.5" rx="1.5" fill="#333"/>
      <line x1="12" y1="10.5" x2="16" y2="10.5" stroke="#333" stroke-width="1.2"/>
    </svg>`;
  },

  /* Dead — kaybedildiğinde */
  faceDead() {
    return `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#ffd700" stroke="#b8960c" stroke-width="1.5"/>
      <!-- X gözler -->
      <line x1="8"  y1="9"  x2="12" y2="13" stroke="#333" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="9"  x2="8"  y2="13" stroke="#333" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="9"  x2="20" y2="13" stroke="#333" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="9"  x2="16" y2="13" stroke="#333" stroke-width="2" stroke-linecap="round"/>
      <!-- Üzgün ağız -->
      <path d="M9 20 Q14 15 19 20" stroke="#333" stroke-width="1.8"
            fill="none" stroke-linecap="round"/>
    </svg>`;
  },

  /* Overlay — kazanma ikonu */
  overlayWin() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#2ecc71" opacity="0.15"/>
      <circle cx="32" cy="32" r="24" fill="none" stroke="#2ecc71" stroke-width="2.5"/>
      <path d="M20 33 L28 41 L44 23" stroke="#2ecc71" stroke-width="3.5"
            fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  },

  /* Overlay — kaybetme ikonu */
  overlayLose() {
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#e74c3c" opacity="0.15"/>
      <circle cx="32" cy="32" r="24" fill="none" stroke="#e74c3c" stroke-width="2.5"/>
      <!-- Mayın -->
      <circle cx="32" cy="32" r="10" fill="#e74c3c"/>
      <rect x="30.5" y="14" width="3" height="7" rx="1.5" fill="#e74c3c"/>
      <rect x="30.5" y="43" width="3" height="7" rx="1.5" fill="#e74c3c"/>
      <rect x="14" y="30.5" width="7" height="3" rx="1.5" fill="#e74c3c"/>
      <rect x="43" y="30.5" width="7" height="3" rx="1.5" fill="#e74c3c"/>
      <rect x="19.5" y="18" width="3" height="7" rx="1.5"
            transform="rotate(45 21 21.5)" fill="#e74c3c"/>
      <rect x="41.5" y="18" width="3" height="7" rx="1.5"
            transform="rotate(-45 43 21.5)" fill="#e74c3c"/>
      <rect x="19.5" y="39" width="3" height="7" rx="1.5"
            transform="rotate(-45 21 42.5)" fill="#e74c3c"/>
      <rect x="41.5" y="39" width="3" height="7" rx="1.5"
            transform="rotate(45 43 42.5)" fill="#e74c3c"/>
      <circle cx="28" cy="28" r="2.5" fill="rgba(255,255,255,0.4)"/>
    </svg>`;
  },
};

/* ── LCD Formatı — 3 basamaklı, önde sıfır ─────────── */
function lcdFormat(n) {
  const clamped = Math.max(-99, Math.min(999, n));
  if (clamped < 0) {
    return '-' + String(Math.abs(clamped)).padStart(2, '0');
  }
  return String(clamped).padStart(3, '0');
}

/* =====================================================
   BÖLÜM 2/3 — Tahta Oluşturma & Hücre Güncelleme
   ===================================================== */

/* ── DOM Referansları ──────────────────────────────── */
const DOM = {
  board:            document.getElementById('board'),
  mineCountDisplay: document.getElementById('mine-count-display'),
  timerCountDisplay:document.getElementById('timer-count-display'),
  resetBtn:         document.getElementById('reset-btn'),
  diffBtns:         document.querySelectorAll('.diff-btn'),
  customPanel:      document.getElementById('custom-panel'),
  customRows:       document.getElementById('custom-rows'),
  customCols:       document.getElementById('custom-cols'),
  customMines:      document.getElementById('custom-mines'),
  customApplyBtn:   document.getElementById('custom-apply-btn'),
  overlay:          document.getElementById('overlay'),
  overlayIcon:      document.getElementById('overlay-icon'),
  overlayTitle:     document.getElementById('overlay-title'),
  overlayMessage:   document.getElementById('overlay-message'),
  statTime:         document.getElementById('stat-time'),
  statMines:        document.getElementById('stat-mines'),
  overlayRestartBtn:document.getElementById('overlay-restart-btn'),
};

/* ── Mevcut zorluk takibi ──────────────────────────── */
let currentDifficulty = 'easy';

/* ── Tahta DOM'unu sıfırdan oluştur ────────────────── */
function buildBoard() {
  const rows = Game.getRows();
  const cols = Game.getCols();
  const board = Game.getBoard();

  DOM.board.innerHTML = '';
  DOM.board.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
  DOM.board.style.gridTemplateRows    = `repeat(${rows}, 32px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement('div');
      el.className  = 'cell';
      el.dataset.r  = r;
      el.dataset.c  = c;
      DOM.board.appendChild(el);
    }
  }

  renderAllCells();
}

/* ── Tüm hücreleri yeniden çiz ─────────────────────── */
function renderAllCells() {
  const rows  = Game.getRows();
  const cols  = Game.getCols();
  const board = Game.getBoard();
  const cells = DOM.board.querySelectorAll('.cell');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      renderCell(cells[r * cols + c], board[r][c]);
    }
  }
}

/* ── Tek bir hücreyi güncelle ──────────────────────── */
function renderCell(el, cell) {
  /* CSS sınıflarını sıfırla */
  el.className = 'cell';
  el.innerHTML = '';
  el.removeAttribute('data-number');

  if (cell.wrongFlag) {
    /* Yanlış bayrak göster */
    el.classList.add('wrong-flag');
    el.innerHTML = SVG.wrongFlag();
    return;
  }

  if (cell.flagged && !cell.revealed) {
    /* Bayraklı hücre */
    el.classList.add('flagged');
    el.innerHTML = SVG.flag();
    return;
  }

  if (!cell.revealed) {
    /* Kapalı hücre — hiçbir şey yapma */
    return;
  }

  /* — Açık hücre — */
  if (cell.isMine) {
    if (cell.hitMine) {
      el.classList.add('revealed', 'mine-hit');
    } else {
      el.classList.add('revealed', 'mine-revealed');
    }
    el.innerHTML = SVG.mine();
    return;
  }

  el.classList.add('revealed');

  if (cell.number > 0) {
    el.dataset.number = cell.number;
    el.textContent    = cell.number;
  }
}

/* ── LCD sayaçlarını güncelle ──────────────────────── */
function updateMineCounter() {
  DOM.mineCountDisplay.textContent = lcdFormat(Game.getRemainingMines());
}

function updateTimerDisplay(seconds) {
  DOM.timerCountDisplay.textContent = lcdFormat(seconds);
}

/* ── Reset düğmesi yüzünü güncelle ────────────────── */
function setFace(type) {
  const faces = {
    normal:  SVG.faceNormal(),
    shocked: SVG.faceShocked(),
    win:     SVG.faceWin(),
    dead:    SVG.faceDead(),
  };
  DOM.resetBtn.innerHTML = faces[type] || faces.normal;
}

/* =====================================================
   BÖLÜM 3/3 — Olay Dinleyicileri & Oyun Akışı
   ===================================================== */

/* ── Yeni oyun başlat ──────────────────────────────── */
function startGame(difficulty, rows, cols, mines) {
  currentDifficulty = difficulty;

  Game.newGame(rows, cols, mines, difficulty);

  buildBoard();
  setFace('normal');
  updateMineCounter();
  updateTimerDisplay(0);
  hideOverlay();
}

/* ── Zorluk seçici ─────────────────────────────────── */
DOM.diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const diff = btn.dataset.difficulty;

    /* Aktif sınıfı taşı */
    DOM.diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (diff === 'custom') {
      /* Özel panel göster */
      DOM.customPanel.classList.remove('hidden');
      return;
    }

    DOM.customPanel.classList.add('hidden');

    const preset = Game.getPreset(diff);
    startGame(diff, preset.rows, preset.cols, preset.mines);
  });
});

/* ── Özel ayarları uygula ──────────────────────────── */
DOM.customApplyBtn.addEventListener('click', () => {
  const rows  = Math.min(30, Math.max(5,  parseInt(DOM.customRows.value,  10) || 10));
  const cols  = Math.min(50, Math.max(5,  parseInt(DOM.customCols.value,  10) || 10));
  let   mines = Math.min(500, Math.max(1, parseInt(DOM.customMines.value, 10) || 15));

  /* Güvenli alan bırak (en az 9 boş hücre) */
  const maxMines = Math.max(1, rows * cols - 9);
  mines = Math.min(mines, maxMines);
  DOM.customMines.value = mines;

  startGame('custom', rows, cols, mines);
});

/* ── Reset düğmesi ─────────────────────────────────── */
DOM.resetBtn.addEventListener('click', () => {
  if (currentDifficulty === 'custom') {
    const rows  = parseInt(DOM.customRows.value,  10) || 10;
    const cols  = parseInt(DOM.customCols.value,  10) || 10;
    const mines = parseInt(DOM.customMines.value, 10) || 15;
    startGame('custom', rows, cols, mines);
  } else {
    const preset = Game.getPreset(currentDifficulty);
    startGame(currentDifficulty, preset.rows, preset.cols, preset.mines);
  }
});

/* ── Overlay yeniden oyna ──────────────────────────── */
DOM.overlayRestartBtn.addEventListener('click', () => {
  DOM.resetBtn.click();
});

/* ── Tahta tıklama olayları ────────────────────────── */
DOM.board.addEventListener('click', e => {
  const el = e.target.closest('.cell');
  if (!el) return;

  const r = parseInt(el.dataset.r, 10);
  const c = parseInt(el.dataset.c, 10);

  Game.handleReveal(r, c);
  renderAllCells();
  updateMineCounter();
});

DOM.board.addEventListener('contextmenu', e => {
  e.preventDefault();
  const el = e.target.closest('.cell');
  if (!el) return;

  const r = parseInt(el.dataset.r, 10);
  const c = parseInt(el.dataset.c, 10);

  Game.handleFlag(r, c);
  renderAllCells();
  updateMineCounter();
});

/* Çift tıklama — chord (komşuları açma) */
DOM.board.addEventListener('dblclick', e => {
  const el = e.target.closest('.cell');
  if (!el) return;

  const r = parseInt(el.dataset.r, 10);
  const c = parseInt(el.dataset.c, 10);

  Game.handleChord(r, c);
  renderAllCells();
  updateMineCounter();
});

/* Orta tık — chord */
DOM.board.addEventListener('mousedown', e => {
  if (e.button !== 1) return;
  e.preventDefault();

  const el = e.target.closest('.cell');
  if (!el) return;

  const r = parseInt(el.dataset.r, 10);
  const c = parseInt(el.dataset.c, 10);

  Game.handleChord(r, c);
  renderAllCells();
  updateMineCounter();
});

/* Sol tık basılı — shocked yüzü göster */
DOM.board.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const el = e.target.closest('.cell');
  if (!el || Game.isGameOver()) return;
  setFace('shocked');
});

document.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  if (!Game.isGameOver()) setFace('normal');
});

/* ── Oyun Kazanıldı Geri Çağrısı ───────────────────── */
Game.onWin(() => {
  setFace('win');
  renderAllCells();
  updateMineCounter();

  setTimeout(() => {
    showOverlay(
      true,
      'Tebrikler!',
      'Tüm mayınları başarıyla işaretledin.',
      Game.getElapsed(),
      Game.getMineCount()
    );
  }, 300);
});

/* ── Oyun Kaybedildi Geri Çağrısı ──────────────────── */
Game.onLose(() => {
  setFace('dead');
  renderAllCells();

  setTimeout(() => {
    showOverlay(
      false,
      'Oyun Bitti!',
      'Bir mayına bastın. Daha dikkatli ol!',
      Game.getElapsed(),
      Game.getMineCount()
    );
  }, 300);
});

/* ── Zamanlayıcı Geri Çağrısı ──────────────────────── */
Game.onTick(seconds => {
  updateTimerDisplay(seconds);
});

/* ── Overlay Yardımcıları ───────────────────────────── */
function showOverlay(won, title, message, time, mines) {
  DOM.overlayIcon.innerHTML  = won ? SVG.overlayWin() : SVG.overlayLose();
  DOM.overlayTitle.textContent  = title;
  DOM.overlayTitle.className    = won ? 'win' : 'lose';
  DOM.overlayMessage.textContent = message;
  DOM.statTime.textContent   = time + 's';
  DOM.statMines.textContent  = mines;
  DOM.overlay.classList.remove('hidden');
}

function hideOverlay() {
  DOM.overlay.classList.add('hidden');
}

/* ── Sayfa yüklendiğinde ilk oyunu başlat ──────────── */
(function init() {
  const preset = Game.getPreset('easy');
  setFace('normal');
  startGame('easy', preset.rows, preset.cols, preset.mines);
})();
