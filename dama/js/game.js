/* ================================================================= */

(function () {
  "use strict";

  /* ---------- Sabitler ---------- */
  const SIZE = 8;        // 8x8 tahta
  const EMPTY = 0;
  const WHITE = "white";
  const BLACK = "black";

  // Taş gösterimi: { color: "white"|"black", king: true|false }

  /* ---------- Oyun durumu ---------- */
  const Game = {
    board: [],            // 2D dizi [satır][sütun] -> taş veya null
    turn: WHITE,          // sıradaki oyuncu
    mode: "pvp",          // "pvp" | "cpu"
    difficulty: "medium", // "easy" | "medium" | "hard" | "impossible"
    cpuColor: BLACK,      // bilgisayar modunda bilgisayarın rengi
    selected: null,       // { r, c } seçili taş
    legalMoves: [],       // seçili taş için geçerli hamleler
    mustCaptureFrom: null,// zincirleme yemede kilitli taş { r, c }
    over: false,
    winner: null,
    counts: { white: 16, black: 16 },
    lastMove: null,       // { from:{r,c}, to:{r,c} }
  };

  /* ---------- Yardımcılar ---------- */
  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function opponent(color) {
    return color === WHITE ? BLACK : WHITE;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { color: cell.color, king: cell.king } : null;
      });
    });
  }

  function countPieces(board) {
    const counts = { white: 0, black: 0 };
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p) counts[p.color]++;
      }
    }
    return counts;
  }

  /* ---------- Tahta kurulumu ---------- */
  function setupBoard() {
    const board = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(null);
      }
      board.push(row);
    }

    // Siyah taşlar: satır 1 ve 2
    for (let c = 0; c < SIZE; c++) {
      board[1][c] = { color: BLACK, king: false };
      board[2][c] = { color: BLACK, king: false };
    }

    // Beyaz taşlar: satır 5 ve 6
    for (let c = 0; c < SIZE; c++) {
      board[5][c] = { color: WHITE, king: false };
      board[6][c] = { color: WHITE, king: false };
    }

    return board;
  }

  /* ---------- Yön tanımları ---------- */
  const ORTHO = [
    { dr: -1, dc: 0 }, // yukarı
    { dr: 1, dc: 0 },  // aşağı
    { dr: 0, dc: -1 }, // sol
    { dr: 0, dc: 1 },  // sağ
  ];

  function forwardDir(color) {
    return color === WHITE ? -1 : 1;
  }

  /* ===================================================================
     HAMLE ÜRETİMİ
     =================================================================== */

  /* --- Tek bir taşın yeme hamlelerini bul ---
     bannedAxis: ağa zincirleme yemede yasak eksen
       null   → kısıtlama yok
       "row"  → dikey yönler (dr!=0) yasak — satır boyunca yedikten sonra
       "col"  → yatay yönler (dc!=0) yasak — sütun boyunca yedikten sonra
  */
  function getCapturesForPiece(board, r, c, bannedAxis) {
    const piece = board[r][c];
    if (!piece) return [];
    const captures = [];

    if (!piece.king) {
      // Normal taş: ileri + yan 3 yönde yeme (geriye yeme YOK)
      const fwd = forwardDir(piece.color);
      const captureDirs = [
        { dr: fwd,  dc: 0  }, // ileri
        { dr: 0,    dc: -1 }, // sol
        { dr: 0,    dc: 1  }, // sağ
      ];
      for (let i = 0; i < captureDirs.length; i++) {
        const d = captureDirs[i];
        const mr = r + d.dr;
        const mc = c + d.dc;
        const lr = r + d.dr * 2;
        const lc = c + d.dc * 2;
        if (!inBounds(lr, lc)) continue;
        const mid = board[mr][mc];
        const landing = board[lr][lc];
        if (mid && mid.color === opponent(piece.color) && !landing) {
          captures.push({
            from: { r: r, c: c },
            to: { r: lr, c: lc },
            captured: [{ r: mr, c: mc }],
            isCapture: true,
          });
        }
      }
    } else {
      // Dama: her dik yönde uzaktan
      // Zincirleme yemede aynı eksen yasak (bannedAxis)
      for (let i = 0; i < ORTHO.length; i++) {
        const d = ORTHO[i];
        if (bannedAxis === "row" && d.dr !== 0) continue;
        if (bannedAxis === "col" && d.dc !== 0) continue;

        let cr = r + d.dr;
        let cc = c + d.dc;
        // Önce boş kareleri geç
        while (inBounds(cr, cc) && !board[cr][cc]) {
          cr += d.dr;
          cc += d.dc;
        }
        // İlk dolu kare rakip mi?
        if (inBounds(cr, cc) && board[cr][cc] &&
            board[cr][cc].color === opponent(piece.color)) {
          const capR = cr;
          const capC = cc;
          // Rakibin arkasındaki boş karelere inebilir
          let lr = cr + d.dr;
          let lc = cc + d.dc;
          while (inBounds(lr, lc) && !board[lr][lc]) {
            captures.push({
              from: { r: r, c: c },
              to: { r: lr, c: lc },
              captured: [{ r: capR, c: capC }],
              isCapture: true,
            });
            lr += d.dr;
            lc += d.dc;
          }
        }
      }
    }
    return captures;
  }

  /* --- Tek bir taşın yemesiz (adi) hamlelerini bul --- */
  function getSimpleMovesForPiece(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];

    if (!piece.king) {
      // Normal taş: ileri, sağ, sol (geri yok), birer kare
      const fwd = forwardDir(piece.color);
      const dirs = [
        { dr: fwd, dc: 0 }, // ileri
        { dr: 0, dc: -1 },  // sol
        { dr: 0, dc: 1 },   // sağ
      ];
      for (let i = 0; i < dirs.length; i++) {
        const nr = r + dirs[i].dr;
        const nc = c + dirs[i].dc;
        if (inBounds(nr, nc) && !board[nr][nc]) {
          moves.push({
            from: { r: r, c: c },
            to: { r: nr, c: nc },
            captured: [],
            isCapture: false,
          });
        }
      }
    } else {
      // Dama: 4 dik yönde uzun mesafe boş karelere
      for (let i = 0; i < ORTHO.length; i++) {
        const d = ORTHO[i];
        let nr = r + d.dr;
        let nc = c + d.dc;
        while (inBounds(nr, nc) && !board[nr][nc]) {
          moves.push({
            from: { r: r, c: c },
            to: { r: nr, c: nc },
            captured: [],
            isCapture: false,
          });
          nr += d.dr;
          nc += d.dc;
        }
      }
    }
    return moves;
  }

  /* --- Bir oyuncunun tüm yeme hamleleri --- */
  function getAllCaptures(board, color) {
    let all = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          all = all.concat(getCapturesForPiece(board, r, c));
        }
      }
    }
    return all;
  }

  /* --- Bir oyuncunun tüm adi hamleleri --- */
  function getAllSimpleMoves(board, color) {
    let all = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          all = all.concat(getSimpleMovesForPiece(board, r, c));
        }
      }
    }
    return all;
  }

  /* ===================================================================
     ZİNCİRLEME YEME
     =================================================================== */

  function getCaptureChains(board, r, c, startBannedAxis) {
    const piece = board[r][c];
    if (!piece) return [];

    const results = [];

    function recurse(curBoard, cr, cc, accMoves, accCaptured, bannedAxis) {
      const caps = getCapturesForPiece(curBoard, cr, cc, bannedAxis);
      if (caps.length === 0) {
        if (accMoves.length > 0) {
          results.push({
            sequence: accMoves.slice(),
            totalCaptured: accCaptured,
            end: { r: cr, c: cc },
          });
        }
        return;
      }
      for (let i = 0; i < caps.length; i++) {
        const cap = caps[i];
        const nb = cloneBoard(curBoard);
        const moving = nb[cr][cc];
        for (let k = 0; k < cap.captured.length; k++) {
          nb[cap.captured[k].r][cap.captured[k].c] = null;
        }
        nb[cr][cc] = null;
        nb[cap.to.r][cap.to.c] = moving;

        let nextBanned = bannedAxis;
        if (moving && moving.king) {
          const dr = cap.to.r - cr;
          const dc = cap.to.c - cc;
          nextBanned = (dr !== 0) ? "col" : "row";
        }

        recurse(
          nb,
          cap.to.r,
          cap.to.c,
          accMoves.concat([cap]),
          accCaptured + cap.captured.length,
          nextBanned
        );
      }
    }

    recurse(cloneBoard(board), r, c, [], 0, startBannedAxis || null);
    return results;
  }

  function getBestCaptureChains(board, color) {
    let chains = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          chains = chains.concat(getCaptureChains(board, r, c));
        }
      }
    }
    if (chains.length === 0) return [];
    let max = 0;
    for (let i = 0; i < chains.length; i++) {
      if (chains[i].totalCaptured > max) max = chains[i].totalCaptured;
    }
    return chains.filter(function (ch) {
      return ch.totalCaptured === max;
    });
  }

  /* ===================================================================
     GEÇERLİ HAMLELER
     =================================================================== */

  function getLegalMovesForPiece(r, c) {
    const piece = Game.board[r][c];
    if (!piece || piece.color !== Game.turn) return [];

    if (Game.mustCaptureFrom) {
      if (Game.mustCaptureFrom.r !== r || Game.mustCaptureFrom.c !== c) {
        return [];
      }
      // Zincir ortasında: bu noktadan itibaren maksimum uzantıyı bul,
      // sadece o uzantıların ilk adımlarını göster (kısa yol kapansın)
      const bannedAxis = Game.mustCaptureFrom.bannedAxis || null;
      const subChains = getCaptureChains(Game.board, r, c, bannedAxis);
      if (subChains.length === 0) return [];
      let maxSub = 0;
      for (let i = 0; i < subChains.length; i++) {
        if (subChains[i].totalCaptured > maxSub) maxSub = subChains[i].totalCaptured;
      }
      const bestSub = subChains.filter(function (ch) { return ch.totalCaptured === maxSub; });
      const firstSteps = [];
      for (let i = 0; i < bestSub.length; i++) {
        const first = bestSub[i].sequence[0];
        const exists = firstSteps.some(function (m) {
          return m.to.r === first.to.r && m.to.c === first.to.c;
        });
        if (!exists) firstSteps.push(first);
      }
      return firstSteps;
    }

    const bestChains = getBestCaptureChains(Game.board, Game.turn);
    if (bestChains.length > 0) {
      const firstSteps = [];
      for (let i = 0; i < bestChains.length; i++) {
        const ch = bestChains[i];
        const first = ch.sequence[0];
        if (first.from.r === r && first.from.c === c) {
          const exists = firstSteps.some(function (m) {
            return m.to.r === first.to.r && m.to.c === first.to.c;
          });
          if (!exists) firstSteps.push(first);
        }
      }
      return firstSteps;
    }

    return getSimpleMovesForPiece(Game.board, r, c);
  }

  // Dışa aktarım
  window.TurkDama = {
    SIZE: SIZE,
    WHITE: WHITE,
    BLACK: BLACK,
    Game: Game,
    inBounds: inBounds,
    opponent: opponent,
    cloneBoard: cloneBoard,
    countPieces: countPieces,
    setupBoard: setupBoard,
    forwardDir: forwardDir,
    ORTHO: ORTHO,
    getCapturesForPiece: getCapturesForPiece,
    getSimpleMovesForPiece: getSimpleMovesForPiece,
    getAllCaptures: getAllCaptures,
    getAllSimpleMoves: getAllSimpleMoves,
    getCaptureChains: getCaptureChains,
    getBestCaptureChains: getBestCaptureChains,
    getLegalMovesForPiece: getLegalMovesForPiece,
  };

})();



/* ===================================================================
   game.js — 2. Parça
   Hamle uygulama, dama olma, sıra geçişi, oyun sonu ve yapay zeka
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const SIZE = TD.SIZE;
  const WHITE = TD.WHITE;
  const BLACK = TD.BLACK;
  const Game = TD.Game;

  /* ---------- Dama olma kontrolü ---------- */
  function promotionRow(color) {
    return color === WHITE ? 0 : SIZE - 1;
  }

  function shouldPromote(piece, r) {
    return !piece.king && r === promotionRow(piece.color);
  }

  /* ===================================================================
     HAMLE UYGULAMA
     =================================================================== */
  function applyMove(move) {
    const fromR = move.from.r;
    const fromC = move.from.c;
    const toR = move.to.r;
    const toC = move.to.c;
    const piece = Game.board[fromR][fromC];

    // Yenen taşları kaldır
    if (move.captured && move.captured.length) {
      for (let i = 0; i < move.captured.length; i++) {
        Game.board[move.captured[i].r][move.captured[i].c] = null;
      }
    }

    // Taşı taşı
    Game.board[fromR][fromC] = null;
    Game.board[toR][toC] = piece;

    Game.lastMove = { from: { r: fromR, c: fromC }, to: { r: toR, c: toC } };

    const result = {
      promoted: false,
      captured: move.captured ? move.captured.slice() : [],
      continued: false,
      endsTurn: true,
      end: { r: toR, c: toC },
    };

    const wasCapture = move.captured && move.captured.length > 0;

    if (wasCapture) {
      if (shouldPromote(piece, toR)) {
        piece.king = true;
        result.promoted = true;
      } else {
        // Ağa ise: bu hamlede kullanılan eksen yasak olacak
        let bannedAxis = null;
        if (piece.king) {
          const dr = toR - fromR;
          const dc = toC - fromC;
          bannedAxis = (dr !== 0) ? "col" : "row";
        }
        // Devam var mı? getCaptureChains ile kontrol et (bannedAxis dahil)
        const subChains = TD.getCaptureChains(Game.board, toR, toC, bannedAxis);
        if (subChains.length > 0) {
          result.continued = true;
          result.endsTurn = false;
          Game.mustCaptureFrom = { r: toR, c: toC, bannedAxis: bannedAxis };
        }
      }
    } else {
      if (shouldPromote(piece, toR)) {
        piece.king = true;
        result.promoted = true;
      }
    }

    if (result.endsTurn) {
      Game.mustCaptureFrom = null;
    }

    Game.counts = TD.countPieces(Game.board);
    return result;
  }

  /* ---------- Sıra geçişi ---------- */
  function switchTurn() {
    Game.turn = TD.opponent(Game.turn);
    Game.selected = null;
    Game.legalMoves = [];
    Game.mustCaptureFrom = null;
  }

  /* ===================================================================
     OYUN SONU KONTROLÜ
     =================================================================== */
  function hasAnyMove(board, color) {
    const caps = TD.getAllCaptures(board, color);
    if (caps.length > 0) return true;
    const simple = TD.getAllSimpleMoves(board, color);
    return simple.length > 0;
  }

  function checkGameOver() {
    const counts = TD.countPieces(Game.board);
    if (counts.white === 0) return BLACK;
    if (counts.black === 0) return WHITE;

    const current = Game.turn;
    if (!hasAnyMove(Game.board, current)) {
      if (!hasAnyMove(Game.board, TD.opponent(current))) return "draw";
      return TD.opponent(current);
    }
    return null;
  }

  /* ===================================================================
     YAPAY ZEKA
     =================================================================== */

  function getFullMoves(board, color) {
    const bestChains = TD.getBestCaptureChains(board, color);
    if (bestChains.length > 0) {
      return bestChains.map(function (ch) {
        return { sequence: ch.sequence, totalCaptured: ch.totalCaptured };
      });
    }
    const simple = TD.getAllSimpleMoves(board, color);
    return simple.map(function (m) {
      return { sequence: [m], totalCaptured: 0 };
    });
  }

  function simulateFullMove(board, full) {
    const nb = TD.cloneBoard(board);
    for (let i = 0; i < full.sequence.length; i++) {
      const m = full.sequence[i];
      const piece = nb[m.from.r][m.from.c];
      if (m.captured) {
        for (let k = 0; k < m.captured.length; k++) {
          nb[m.captured[k].r][m.captured[k].c] = null;
        }
      }
      nb[m.from.r][m.from.c] = null;
      nb[m.to.r][m.to.c] = piece;
      const isLast = i === full.sequence.length - 1;
      if (isLast && piece && !piece.king &&
          m.to.r === promotionRow(piece.color)) {
        piece.king = true;
      }
    }
    return nb;
  }

  /* ---------- Konum değerlendirme ---------- */
  function evaluate(board, color) {
    let score = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (!p) continue;
        let val = p.king ? 18 : 5;

        if (!p.king) {
          const adv = p.color === WHITE ? (SIZE - 1 - r) : r;
          val += adv * 0.25;
          if (c === 0 || c === SIZE - 1) val += 0.3;
        } else {
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          val += (7 - centerDist) * 0.15;
        }

        score += p.color === color ? val : -val;
      }
    }
    return score;
  }

  /* ---------- Minimax + alfa-beta ---------- */
  function minimax(board, depth, alpha, beta, maximizing, aiColor) {
    const moverColor = maximizing ? aiColor : TD.opponent(aiColor);

    const counts = TD.countPieces(board);
    if (counts[aiColor] === 0) return -10000 + (10 - depth);
    if (counts[TD.opponent(aiColor)] === 0) return 10000 - (10 - depth);

    const fullMoves = getFullMoves(board, moverColor);
    if (fullMoves.length === 0) {
      return maximizing ? -9000 + (10 - depth) : 9000 - (10 - depth);
    }

    if (depth === 0) {
      return evaluate(board, aiColor);
    }

    fullMoves.sort(function (a, b) {
      return b.totalCaptured - a.totalCaptured;
    });

    if (maximizing) {
      let best = -Infinity;
      for (let i = 0; i < fullMoves.length; i++) {
        const nb = simulateFullMove(board, fullMoves[i]);
        const val = minimax(nb, depth - 1, alpha, beta, false, aiColor);
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < fullMoves.length; i++) {
        const nb = simulateFullMove(board, fullMoves[i]);
        const val = minimax(nb, depth - 1, alpha, beta, true, aiColor);
        if (val < best) best = val;
        if (best < beta) beta = best;
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  /* ---------- En iyi hamle seçimi ---------- */
  function chooseAIMove() {
    const color = Game.cpuColor;
    const fullMoves = getFullMoves(Game.board, color);
    if (fullMoves.length === 0) return null;

    const diff = Game.difficulty;

    if (diff === "easy") {
      return fullMoves[Math.floor(Math.random() * fullMoves.length)];
    }

    if (diff === "medium") {
      let scored = fullMoves.map(function (fm) {
        const nb = simulateFullMove(Game.board, fm);
        let s = evaluate(nb, color) + fm.totalCaptured * 3;
        s += Math.random() * 1.5;
        return { move: fm, score: s };
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      return scored[0].move;
    }

    const depth = diff === "impossible" ? 7 : 4;

    fullMoves.sort(function (a, b) {
      return b.totalCaptured - a.totalCaptured;
    });

    let bestMove = fullMoves[0];
    let bestVal = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    const candidates = [];

    for (let i = 0; i < fullMoves.length; i++) {
      const nb = simulateFullMove(Game.board, fullMoves[i]);
      const val = minimax(nb, depth - 1, alpha, beta, false, color);
      if (val > bestVal) {
        bestVal = val;
        bestMove = fullMoves[i];
        candidates.length = 0;
        candidates.push(fullMoves[i]);
      } else if (val === bestVal) {
        candidates.push(fullMoves[i]);
      }
      if (bestVal > alpha) alpha = bestVal;
    }

    if (diff === "hard" && candidates.length > 1) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return bestMove;
  }

  /* ===================================================================
     YENİ OYUN / SIFIRLAMA
     =================================================================== */
  function newGame(options) {
    options = options || {};
    Game.board = TD.setupBoard();
    Game.turn = WHITE;
    Game.mode = options.mode || "pvp";
    Game.difficulty = options.difficulty || "medium";
    Game.cpuColor = BLACK;
    Game.selected = null;
    Game.legalMoves = [];
    Game.mustCaptureFrom = null;
    Game.over = false;
    Game.winner = null;
    Game.lastMove = null;
    Game.counts = TD.countPieces(Game.board);
  }

  /* ===================================================================
     Dışa aktarım
     =================================================================== */
  TD.promotionRow = promotionRow;
  TD.shouldPromote = shouldPromote;
  TD.applyMove = applyMove;
  TD.switchTurn = switchTurn;
  TD.hasAnyMove = hasAnyMove;
  TD.checkGameOver = checkGameOver;
  TD.getFullMoves = getFullMoves;
  TD.simulateFullMove = simulateFullMove;
  TD.evaluate = evaluate;
  TD.chooseAIMove = chooseAIMove;
  TD.newGame = newGame;

})();
