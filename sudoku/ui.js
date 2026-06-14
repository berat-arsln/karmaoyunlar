document.addEventListener('DOMContentLoaded', () => {

    // ── ELEMENTLER ───────────────────────────────────────────────────
    const boardEl       = document.getElementById('sudoku-board');
    const newGameBtn    = document.getElementById('new-game-btn');
    const difficultyEl  = document.getElementById('difficulty');
    const timerEl       = document.getElementById('timer');
    const mistakeEl     = document.getElementById('mistake-count');
    const undoBtn       = document.getElementById('undo-btn');
    const winMsg        = document.getElementById('win-message');
    const winDetails    = document.getElementById('win-details');
    const backBtn       = document.getElementById('back-btn');
    const settingsBtn   = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const showErrorsEl  = document.getElementById('show-errors');
    const highlightCrossEl = document.getElementById('highlight-cross');
    const highlightSameEl  = document.getElementById('highlight-same');
    const numpadEl      = document.getElementById('numpad');
    const numBtns       = document.querySelectorAll('.num-btn');

    // ── DURUM ────────────────────────────────────────────────────────
    let currentBoard = [];   // oyuncunun gördüğü tahta
    let fixedCells   = [];   // sabit mi?
    let solution     = [];
    let selectedRow  = -1;
    let selectedCol  = -1;
    let mistakes     = 0;
    let maxMistakes  = 5;
    let timerInterval = null;
    let seconds      = 0;
    let gameOver     = false;
    let history      = [];   // geri al için

    // ── ZAMANLAYICI ──────────────────────────────────────────────────
    function startTimer() {
        clearInterval(timerInterval);
        seconds = 0;
        timerEl.textContent = '00:00';
        timerInterval = setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // ── YENİ OYUN ────────────────────────────────────────────────────
    function startNewGame() {
        const diff = difficultyEl.value;
        const data = SudokuGame.generateBoard(diff);

        currentBoard = data.board.map(r => [...r]);
        solution     = data.solution.map(r => [...r]);
        fixedCells   = data.fixed.map(r => [...r]);
        mistakes     = 0;
        gameOver     = false;
        history      = [];

        mistakeEl.textContent = '0';
        winMsg.classList.remove('show');

        renderBoard();
        updateNumpad();
        startTimer();
    }

    // ── TAHTA ÇİZİMİ ─────────────────────────────────────────────────
    function renderBoard() {
        boardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = currentBoard[r][c];
                if (val !== 0) cell.textContent = val;

                if (fixedCells[r][c]) {
                    cell.classList.add('fixed');
                } else if (val !== 0) {
                    cell.classList.add('user-input');
                    if (showErrorsEl.checked && val !== solution[r][c]) {
                        cell.classList.add('error');
                    }
                }

                cell.addEventListener('click', () => handleCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }
        applyHighlights();
    }

    // ── HÜCRE TIKLAMA ────────────────────────────────────────────────
    function handleCellClick(row, col) {
        if (gameOver) return;
        selectedRow = row;
        selectedCol = col;
        applyHighlights();
    }

    // ── VURGULAMALAR ─────────────────────────────────────────────────
    function applyHighlights() {
        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'highlight-cross', 'highlight-box', 'highlight-same');
        });

        if (selectedRow === -1) return;

        const selectedVal = currentBoard[selectedRow][selectedCol];

        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);

            if (r === selectedRow && c === selectedCol) {
                cell.classList.add('selected');
                return;
            }

            // Satır/sütun vurgula
            if (highlightCrossEl.checked) {
                if (r === selectedRow || c === selectedCol) {
                    cell.classList.add('highlight-cross');
                }
            }

            // 3x3 kutu vurgula
            const sameBox =
                Math.floor(r / 3) === Math.floor(selectedRow / 3) &&
                Math.floor(c / 3) === Math.floor(selectedCol / 3);
            if (sameBox) {
                cell.classList.add('highlight-box');
            }

            // Aynı rakam vurgula
            if (highlightSameEl.checked && selectedVal !== 0 && currentBoard[r][c] === selectedVal) {
                cell.classList.add('highlight-same');
            }
        });
    }

    // ── RAKAM GİRİŞİ ─────────────────────────────────────────────────
    function enterNumber(num) {
        if (gameOver) return;
        if (selectedRow === -1 || selectedCol === -1) return;
        if (fixedCells[selectedRow][selectedCol]) return;

        const prev = currentBoard[selectedRow][selectedCol];
        history.push({ row: selectedRow, col: selectedCol, prev });

        currentBoard[selectedRow][selectedCol] = num;

        if (num !== 0 && num !== solution[selectedRow][selectedCol]) {
            mistakes++;
            mistakeEl.textContent = mistakes;
            if (mistakes >= maxMistakes) {
                gameOver = true;
                stopTimer();
                setTimeout(() => {
                    alert('3 hata yaptın! Oyun bitti.');
                    startNewGame();
                }, 300);
                return;
            }
        }

        renderBoard();
        updateNumpad();

        if (SudokuGame.isSolved(currentBoard)) {
            stopTimer();
            gameOver = true;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            winDetails.textContent = `Süre: ${m}:${s} — Hata: ${mistakes}`;
            winMsg.classList.add('show');
        }
    }

    // ── GERİ AL ──────────────────────────────────────────────────────
    function undoMove() {
        if (history.length === 0) return;
        const last = history.pop();
        currentBoard[last.row][last.col] = last.prev;
        selectedRow = last.row;
        selectedCol = last.col;
        renderBoard();
        updateNumpad();
    }

    // ── TUŞ TAKIMI GÜNCELLE ───────────────────────────────────────────
    function updateNumpad() {
        numBtns.forEach(btn => {
            const num = parseInt(btn.dataset.num);
            const placed = SudokuGame.countPlaced(currentBoard, num);
            if (placed >= 9) {
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed');
            }
        });
    }

    // ── KLAVYE DESTEĞİ ────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '9') {
            enterNumber(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            enterNumber(0);
        } else if (e.key === 'ArrowUp' && selectedRow > 0) {
            selectedRow--;
            applyHighlights();
        } else if (e.key === 'ArrowDown' && selectedRow < 8) {
            selectedRow++;
            applyHighlights();
        } else if (e.key === 'ArrowLeft' && selectedCol > 0) {
            selectedCol--;
            applyHighlights();
        } else if (e.key === 'ArrowRight' && selectedCol < 8) {
            selectedCol++;
            applyHighlights();
        }
    });

    // ── OLAYLAR ──────────────────────────────────────────────────────
    newGameBtn.addEventListener('click', startNewGame);

    undoBtn.addEventListener('click', undoMove);

    numBtns.forEach(btn => {
        btn.addEventListener('click', () => enterNumber(parseInt(btn.dataset.num)));
    });

    backBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('open');
    });

    modalCloseBtn.addEventListener('click', () => {
        settingsModal.classList.remove('open');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('open');
    });

    // Ayar değişince tahtayı yeniden çiz
    showErrorsEl.addEventListener('change', renderBoard);
    highlightCrossEl.addEventListener('change', () => applyHighlights());
    highlightSameEl.addEventListener('change', () => applyHighlights());

    // ── BAŞLANGIÇ ────────────────────────────────────────────────────
    startNewGame();
});
