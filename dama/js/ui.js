/* ===================================================================
   ui.js — 1. Parça
   Başlangıç, DOM referansları, durum kısayolları ve ses motoru
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const Game = TD.Game;

  /* ---------- DOM referansları ---------- */
  const dom = {
    body: document.body,
    board: document.getElementById("board"),

    // Durum çubuğu
    countWhite: document.getElementById("countWhite"),
    countBlack: document.getElementById("countBlack"),
    turnIndicator: document.getElementById("turnIndicator"),
    infoWhite: document.getElementById("infoWhite"),
    infoBlack: document.getElementById("infoBlack"),

    // Üst bar butonları
    btnNewGame: document.getElementById("btnNewGame"),
    btnSettings: document.getElementById("btnSettings"),

    // Ayarlar paneli
    settingsPanel: document.getElementById("settingsPanel"),
    btnCloseSettings: document.getElementById("btnCloseSettings"),
    btnSound: document.getElementById("btnSound"),
    themeControl: document.getElementById("themeControl"),
    btnHowTo: document.getElementById("btnHowTo"),

    // Overlay
    overlay: document.getElementById("overlay"),

    // Yeni oyun modalı
    newGameModal: document.getElementById("newGameModal"),
    modeControl: document.getElementById("modeControl"),
    difficultyWrap: document.getElementById("difficultyWrap"),
    difficultyControl: document.getElementById("difficultyControl"),
    btnCancelNewGame: document.getElementById("btnCancelNewGame"),
    btnStartGame: document.getElementById("btnStartGame"),

    // Nasıl oynanır modalı
    howToModal: document.getElementById("howToModal"),
    btnCloseHowTo: document.getElementById("btnCloseHowTo"),      
    // Oyun sonu modalı
    gameOverModal: document.getElementById("gameOverModal"),          winnerText: document.getElementById("winnerText"),
    winnerSub: document.getElementById("winnerSub"),
    btnReplay: document.getElementById("btnReplay"),
    btnPlayCpu: document.getElementById("btnPlayCpu"),
  };

  /* ---------- Arayüz durumu ---------- */
  const UI = {
    cells: [],          // square DOM elemanları [r][c]
    pieceEls: [],       // taş DOM elemanları [r][c] veya null
    busy: false,        // animasyon / AI sırasında girişi kilitle
    soundOn: true,
    theme: "light",
    // Seçili yeni oyun ayarları (modal içi geçici)
    pendingMode: "pvp",
    pendingDiff: "medium",
  };

  /* ---------- localStorage anahtarları ---------- */
  const STORAGE = {
    sound: "turkdama_sound",
    theme: "turkdama_theme",
  };

  /* ===================================================================
     SES MOTORU — WebAudio ile basit ton üretimi (dosya gerektirmez)
     =================================================================== */
  const Sound = (function () {
    let ctx = null;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      return ctx;
    }                                                             
    function tone(freq, duration, type, gainVal) {
      if (!UI.soundOn) return;                                          const ac = ensureCtx();
      if (!ac) return;
      // Bazı tarayıcılarda kullanıcı etkileşimi sonrası resume gerekir
      if (ac.state === "suspended") {
        ac.resume().catch(function () {});
      }
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ac.destination);

      const now = ac.currentTime;
      const peak = gainVal || 0.12;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.012);             gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
                                                                        osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    return {
      // Taş bırakma sesi
      move: function () {
        tone(320, 0.12, "triangle", 0.10);
      },
      // Yeme sesi (iki tonlu)
      capture: function () {
        tone(220, 0.10, "sawtooth", 0.10);
        setTimeout(function () { tone(160, 0.14, "sawtooth", 0.10); }, 70);
      },
      // Dama olma sesi (yükselen)                                      promote: function () {                                              tone(523, 0.10, "sine", 0.12);
        setTimeout(function () { tone(659, 0.10, "sine", 0.12); }, 90);
        setTimeout(function () { tone(784, 0.16, "sine", 0.12); }, 180);                                                                  },
      // Seçme/tık sesi                                                 select: function () {                                               tone(440, 0.05, "sine", 0.06);
      },                                                                // Oyun sonu sesi
      win: function () {
        tone(523, 0.12, "sine", 0.12);                                    setTimeout(function () { tone(659, 0.12, "sine", 0.12); }, 120);                                                                    setTimeout(function () { tone(784, 0.12, "sine", 0.12); }, 240);
        setTimeout(function () { tone(1046, 0.22, "sine", 0.12); }, 360);
      },
      // Geçersiz hamle                                                 invalid: function () {
        tone(140, 0.12, "square", 0.07);
      },
    };                                                              })();

  /* ===================================================================
     Dışa aktarım — sonraki parçalar bu nesneleri kullanır
     (window.TurkDamaUI altında toplanır)
     =================================================================== */
  window.TurkDamaUI = {
    dom: dom,
    UI: UI,
    STORAGE: STORAGE,
    Sound: Sound,
  };

})();


/* ===================================================================
   ui.js — 2. Parça
   Tahta çizimi, taş & taç yerleştirme, durum çubuğu güncelleme
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const Game = TD.Game;
  const UINS = window.TurkDamaUI;
  const dom = UINS.dom;
  const UI = UINS.UI;
  const SIZE = TD.SIZE;

  /* ---------- Taç SVG (dama işareti) ---------- */
  // Taşın rengine göre CSS .piece__crown rengi devralır (currentColor).
  const CROWN_SVG =
    '<svg class="piece__crown" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M5 16h14l1.5-9-4.5 3.5L12 4 8 10.5 3.5 7 5 16zm0 2v2h14v-2H5z"/>' +
    '</svg>';

  /* ---------- Koordinat etiketleri ---------- */
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  /* ===================================================================
     TAHTA İSKELETİNİ OLUŞTUR
     Sadece bir kez çağrılır; kareleri ve referansları kurar.
     =================================================================== */
  function buildBoard() {
    dom.board.innerHTML = "";
    UI.cells = [];
    UI.pieceEls = [];

    for (let r = 0; r < SIZE; r++) {
      const cellRow = [];
      const pieceRow = [];
      for (let c = 0; c < SIZE; c++) {
        const sq = document.createElement("div");
        // Türk damasında tüm kareler kullanılır; renk deseni görseldir.
        const isLight = (r + c) % 2 === 0;
        sq.className = "square " + (isLight ? "square--light" : "square--dark");
        sq.dataset.r = String(r);
        sq.dataset.c = String(c);

        // Kenar koordinatları (alt satır harf, sol sütun rakam)
        if (r === SIZE - 1) {
          const f = document.createElement("span");
          f.className = "square__coord square__coord--file";
          f.textContent = FILES[c];
          sq.appendChild(f);
        }
        if (c === 0) {
          const rk = document.createElement("span");
          rk.className = "square__coord square__coord--rank";
          rk.textContent = String(SIZE - r);
          sq.appendChild(rk);
        }

        dom.board.appendChild(sq);
        cellRow.push(sq);
        pieceRow.push(null);
      }
      UI.cells.push(cellRow);
      UI.pieceEls.push(pieceRow);
    }
  }

  /* ---------- Tek bir taş elemanı oluştur ---------- */
  function createPieceEl(piece) {
    const el = document.createElement("div");
    el.className = "piece piece--" + piece.color;
    if (piece.king) {
      el.classList.add("piece--king");
      el.innerHTML = CROWN_SVG;
    }                                                                 return el;
  }

  /* ===================================================================
     TAHTAYI DURUMA GÖRE TAMAMEN YENİDEN ÇİZ
     Taşları temizleyip Game.board'a göre yeniden yerleştirir.
     =================================================================== */
  function renderPieces() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const existing = UI.pieceEls[r][c];
        if (existing) {
          existing.remove();
          UI.pieceEls[r][c] = null;                                       }
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const piece = Game.board[r][c];
        if (piece) {
          const el = createPieceEl(piece);
          UI.cells[r][c].appendChild(el);
          UI.pieceEls[r][c] = el;
        }
      }
    }
  }

  /* ---------- Tek bir kareye taç ekle/çıkar (dama güncellemesi) ---------- */
  function refreshPieceVisual(r, c) {
    const piece = Game.board[r][c];
    const el = UI.pieceEls[r][c];
    if (!piece || !el) return;
    if (piece.king && !el.classList.contains("piece--king")) {          el.classList.add("piece--king");
      el.innerHTML = CROWN_SVG;
    } else if (!piece.king && el.classList.contains("piece--king")) {
      el.classList.remove("piece--king");
      el.innerHTML = "";
    }
  }

  /* ===================================================================
     DURUM ÇUBUĞU GÜNCELLEME
     =================================================================== */
  function updateStatus() {
    dom.countWhite.textContent = String(Game.counts.white);
    dom.countBlack.textContent = String(Game.counts.black);

    // Sıra metni
    let turnText;
    if (Game.over) {
      turnText = "Oyun bitti";
    } else if (Game.mode === "cpu" && Game.turn === Game.cpuColor) {
      turnText = "Bilgisayar düşünüyor…";
    } else {
      turnText = (Game.turn === TD.WHITE ? "Beyazın" : "Siyahın") + " sırası";
    }
    dom.turnIndicator.textContent = turnText;

    // Sıradaki oyuncuyu vurgula
    dom.infoWhite.classList.toggle("is-waiting", Game.turn !== TD.WHITE);
    dom.infoBlack.classList.toggle("is-waiting", Game.turn !== TD.BLACK);
  }

  /* ===================================================================
     Dışa aktarım — sonraki parçalar kullanır
     =================================================================== */
  UINS.render = {
    buildBoard: buildBoard,
    createPieceEl: createPieceEl,
    renderPieces: renderPieces,
    refreshPieceVisual: refreshPieceVisual,
    updateStatus: updateStatus,
    CROWN_SVG: CROWN_SVG,
  };

})();

/* ===================================================================
   ui.js — 3. Parça
   Taş seçme, hamle ipuçları, vurgulamalar ve seçim/iptal mantığı
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const Game = TD.Game;
  const UINS = window.TurkDamaUI;
  const dom = UINS.dom;
  const UI = UINS.UI;
  const Sound = UINS.Sound;
  const SIZE = TD.SIZE;

  /* ===================================================================
     VURGULAMALARI TEMİZLE
     =================================================================== */
  function clearHighlights() {
    // Hamle ipuçlarını kaldır
    const hints = dom.board.querySelectorAll(".move-hint");
    for (let i = 0; i < hints.length; i++) {
      hints[i].remove();
    }
    // Seçili kare / aktif taş sınıflarını kaldır
    for (let r = 0; r < SIZE; r++) {                                    for (let c = 0; c < SIZE; c++) {
        UI.cells[r][c].classList.remove("is-selected");
        const pe = UI.pieceEls[r][c];
        if (pe) {
          pe.classList.remove("is-active");                                 pe.classList.remove("is-movable");
        }
      }                                                               }
  }                                                               
  /* ===================================================================
     SON HAMLE İZİNİ GÖSTER
     =================================================================== */
  function clearLastMoveTrail() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        UI.cells[r][c].classList.remove("is-last-from", "is-last-to");
      }
    }
  }

  function showLastMoveTrail() {
    clearLastMoveTrail();
    if (!Game.lastMove) return;
    const f = Game.lastMove.from;
    const t = Game.lastMove.to;
    if (f && UI.cells[f.r] && UI.cells[f.r][f.c]) {
      UI.cells[f.r][f.c].classList.add("is-last-from");
    }
    if (t && UI.cells[t.r] && UI.cells[t.r][t.c]) {
      UI.cells[t.r][t.c].classList.add("is-last-to");
    }
  }

  /* ===================================================================
     OYNANABİLİR TAŞLARI İŞARETLE
     Sırası gelen oyuncunun hamlesi olan taşlarına "is-movable" ekler.
     =================================================================== */
  function markMovablePieces() {
    if (Game.over) return;
    if (Game.mode === "cpu" && Game.turn === Game.cpuColor) return;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const piece = Game.board[r][c];
        if (piece && piece.color === Game.turn) {
          const moves = TD.getLegalMovesForPiece(r, c);
          if (moves.length > 0 && UI.pieceEls[r][c]) {
            UI.pieceEls[r][c].classList.add("is-movable");
          }
        }
      }
    }
  }

  /* ===================================================================
     TAŞ SEÇ
     =================================================================== */
  function selectPiece(r, c) {
    const moves = TD.getLegalMovesForPiece(r, c);
    if (moves.length === 0) {
      Sound.invalid();
      return false;
    }

    clearHighlights();
    markMovablePieces();

    Game.selected = { r: r, c: c };
    Game.legalMoves = moves;

    // Seçili kare ve aktif taş
    UI.cells[r][c].classList.add("is-selected");
    if (UI.pieceEls[r][c]) {
      UI.pieceEls[r][c].classList.add("is-active");
    }

    // Hamle ipuçlarını göster
    showMoveHints(moves);
    Sound.select();
    return true;
  }

  /* ---------- Seçimi iptal et ---------- */
  function deselect() {
    Game.selected = null;
    Game.legalMoves = [];
    clearHighlights();
    markMovablePieces();
  }

  /* ===================================================================
     HAMLE İPUÇLARINI GÖSTER
     Boş kareye nokta, yenebilecek hedefe halka.
     =================================================================== */
  function showMoveHints(moves)

```javascript
  function showMoveHints(moves) {
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const targetCell = UI.cells[m.to.r][m.to.c];

      const hint = document.createElement("div");
      hint.className = "move-hint";
      // Yeme hamlesi ise vurgulu halka, adi hamle ise nokta
      if (m.isCapture || (m.captured && m.captured.length > 0)) {
        hint.classList.add("move-hint--capture");
      } else {
        hint.classList.add("move-hint--simple");
      }

      hint.dataset.r = String(m.to.r);
      hint.dataset.c = String(m.to.c);

      targetCell.appendChild(hint);
    }
  }

  /* ===================================================================
     BİR HEDEF KARENİN SEÇİLİ TAŞ İÇİN GEÇERLİ HAMLESİNİ BUL
     =================================================================== */
  function findMoveTo(r, c) {
    for (let i = 0; i < Game.legalMoves.length; i++) {
      const m = Game.legalMoves[i];
      if (m.to.r === r && m.to.c === c) {
        return m;
      }
    }
    return null;                                                    }                                                               
  /* ===================================================================                                                                 Dışa aktarım — sonraki parçalar kullanır                          =================================================================== */
  UINS.interact = {
    clearHighlights: clearHighlights,
    clearLastMoveTrail: clearLastMoveTrail,                           showLastMoveTrail: showLastMoveTrail,
    markMovablePieces: markMovablePieces,
    selectPiece: selectPiece,
    deselect: deselect,                                               showMoveHints: showMoveHints,
    findMoveTo: findMoveTo,
  };

})();


/* ===================================================================
   ui.js — 4. Parça
   Tıklama mantığı, hamle uygulama akışı ve zincirleme yeme yönetimi
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const Game = TD.Game;
  const UINS = window.TurkDamaUI;
  const dom = UINS.dom;
  const UI = UINS.UI;
  const Sound = UINS.Sound;
  const render = UINS.render;
  const interact = UINS.interact;
  const SIZE = TD.SIZE;

  /* ===================================================================
     TAHTA TIKLAMA OLAYI
     Tek bir dinleyici; tıklanan kareyi/taşı dataset üzerinden çözer.
     =================================================================== */
  function onBoardClick(ev) {
    if (UI.busy || Game.over) return;

    // CPU sırasında insan giriş yapamaz
    if (Game.mode === "cpu" && Game.turn === Game.cpuColor) return;

    // Tıklanan hücreyi bul (taş, ipucu veya kare olabilir)
    const cell = ev.target.closest(".square");
    if (!cell) return;

    const r = parseInt(cell.dataset.r, 10);
    const c = parseInt(cell.dataset.c, 10);
    if (Number.isNaN(r) || Number.isNaN(c)) return;

    handleCellTap(r, c);
  }

  /* ===================================================================
     KARE/ TAŞ DOKUNUŞUNU YORUMLA
     - Seçili taş varsa ve hedef geçerli hamleyse → hamleyi uygula
     - Kendi taşına tıklandıysa → seç / değiştir
     - Boş/geçersiz yere tıklandıysa → seçimi iptal et
     =================================================================== */
  function handleCellTap(r, c) {
    const clickedPiece = Game.board[r][c];

    // 1) Seçili bir taş varsa ve burası geçerli hedefse → oyna
    if (Game.selected) {
      const move = interact.findMoveTo(r, c);
      if (move) {
        executeMove(move);
        return;
      }
    }

    // 2) Zincir kilidi varken başka taşa tıklanamaz
    if (Game.mustCaptureFrom) {
      // Sadece kilitli taş yeniden seçilebilir
      if (Game.mustCaptureFrom.r === r && Game.mustCaptureFrom.c === c) {
        interact.selectPiece(r, c);
      } else {
        Sound.invalid();
      }
      return;
    }

    // 3) Kendi taşına tıklandıysa seç (veya değiştir)
    if (clickedPiece && clickedPiece.color === Game.turn) {
      if (Game.selected && Game.selected.r === r && Game.selected.c === c) {
        // Aynı taşa tekrar tıklama → seçimi kaldır
        interact.deselect();
      } else {
        interact.selectPiece(r, c);
      }
      return;
    }

    // 4) Geçersiz yere tıklama → seçimi iptal et
    if (Game.selected) {
      interact.deselect();
    }
  }

  /* ===================================================================
     HAMLEYİ UYGULA (tek adım) + animasyon + akış yönetimi
     =================================================================== */
  function executeMove(move) {
    UI.busy = true;
    interact.clearHighlights();

    const fromEl = UI.pieceEls[move.from.r][move.from.c];
    const wasCapture = move.captured && move.captured.length > 0;

    // Taş kayma animasyonu için hedef ofsetini hesapla
    animatePieceMove(fromEl, move, function () {
      // Animasyon bitince mantığı uygula
      const result = TD.applyMove(move);

      // Yenen taşların görsellerini kaldır
      if (result.captured && result.captured.length) {
        for (let i = 0; i < result.captured.length; i++) {
          const cap = result.captured[i];
          const capEl = UI.pieceEls[cap.r][cap.c];
          if (capEl) {
            capEl.classList.add("piece--captured");
            (function (el) {
              setTimeout(function () { if (el) el.remove(); }, 300);
            })(capEl);
          }
          UI.pieceEls[cap.r][cap.c] = null;
        }
      }

      // Taş referansını yeni konuma taşı
      UI.pieceEls[move.to.r][move.to.c] = fromEl;
      UI.pieceEls[move.from.r][move.from.c] = null;
      // Konumlandırma sınıflarını sıfırla (DOM'da yeni kareye al)
      if (fromEl) {
        fromEl.classList.remove("piece--moving");
        fromEl.style.transform = "";
        UI.cells[move.to.r][move.to.c].appendChild(fromEl);
      }

      // Ses
      if (wasCapture) Sound.capture();
      else Sound.move();

      // Dama olduysa taç ekle + animasyon + ses
      if (result.promoted) {
        render.refreshPieceVisual(move.to.r, move.to.c);
        const promotedEl = UI.pieceEls[move.to.r][move.to.c];
        if (promotedEl) {
          promotedEl.classList.add("piece--just-promoted");
          (function (el) {
            setTimeout(function () {
              if (el) el.classList.remove("piece--just-promoted");
            }, 500);
          })(promotedEl);
        }
        Sound.promote();
      }

      render.updateStatus();
      interact.showLastMoveTrail();

      // Zincir devam ediyorsa: aynı taşla yemeyi sürdür
      if (result.continued) {                                             // Kilitli taşı otomatik yeniden seç
        Game.selected = null;
        UI.busy = false;                                                  interact.selectPiece(move.to.r, move.to.c);
        return;
      }

      // Hamle tamamlandı → sırayı geçir ve akışı sürdür
      finishTurn();
    });
  }

  /* ===================================================================
     TAŞ KAYMA ANİMASYONU
     Kaynak taşı hedefe doğru transform ile kaydırır.
     =================================================================== */
  function animatePieceMove(el, move, done) {
    if (!el) { done(); return; }

    const fromCell = UI.cells[move.from.r][move.from.c];
    const toCell = UI.cells[move.to.r][move.to.c];
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    // Hareket azaltma tercihi varsa anında bitir
    const reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { done(); return; }

    el.classList.add("piece--moving");
    // reflow tetikle
    void el.offsetWidth;
    el.style.transform = "translate(" + dx + "px," + dy + "px)";

    let finished = false;
    function finalize() {
      if (finished) return;                                             finished = true;
      el.removeEventListener("transitionend", finalize);
      done();
    }
    el.addEventListener("transitionend", finalize);
    // Güvenlik: transitionend tetiklenmezse
    setTimeout(finalize, 300);
  }

  /* ===================================================================
     SIRAYI BİTİR — sıra geçişi + oyun sonu kontrolü + CPU tetikleme
     (CPU çağrısı 5. parçadaki akış yöneticisine devredilir)
     =================================================================== */
  function finishTurn() {
    TD.switchTurn();
    render.updateStatus();
                                                                      const winner = TD.checkGameOver();                                if (winner) {
      UI.busy = false;
      UINS.flow.endGame(winner);
      return;
    }                                                             
    interact.clearHighlights();
    interact.markMovablePieces();                                     UI.busy = false;
                                                                      // CPU sırası ise hamlesini tetikle
    UINS.flow.maybeTriggerCPU();
  }

  /* ===================================================================
     Dışa aktarım
     =================================================================== */
  UINS.play = {
    onBoardClick: onBoardClick,
    handleCellTap: handleCellTap,
    executeMove: executeMove,
    animatePieceMove: animatePieceMove,
    finishTurn: finishTurn,
  };

})();


Claude: ```javascript
/* ===================================================================
   ui.js — 5. Parça
   Akış yöneticisi: CPU hamlesi, zincir oynatma ve oyun sonu işleme
   =================================================================== */

(function () {
  "use strict";

  const TD = window.TurkDama;
  const Game = TD.Game;
  const UINS = window.TurkDamaUI;
  const dom = UINS.dom;
  const UI = UINS.UI;
  const Sound = UINS.Sound;
  const render = UINS.render;
  const interact = UINS.interact;
  const play = UINS.play;

  /* ===================================================================
     CPU SIRASINI TETİKLE
     İnsan hamlesi bitince finishTurn buradan çağırır.
     =================================================================== */
  function maybeTriggerCPU() {
    if (Game.over) return;
    if (Game.mode !== "cpu") return;
    if (Game.turn !== Game.cpuColor) return;

    UI.busy = true;
    interact.clearHighlights();
    render.updateStatus();

    // Düşünme hissi için kısa gecikme (zorluğa göre hafif değişir)
    const thinkDelay =
      Game.difficulty === "impossible" ? 480 :
      Game.difficulty === "hard" ? 420 :
      Game.difficulty === "medium" ? 340 : 260;

    setTimeout(function () {
      // Hesaplama ağır olabileceğinden bir tık daha geciktir
      runCPUMove();
    }, thinkDelay);
  }

  /* ===================================================================
     CPU HAMLESİNİ HESAPLA VE OYNAT
     chooseAIMove tam bir hamle (zincir dahil) döndürür.
     Zincirdeki her adım sırayla, animasyonlu oynatılır.
     =================================================================== */
  function runCPUMove() {
    if (Game.over) { UI.busy = false; return; }

    const full = TD.chooseAIMove();
    if (!full || !full.sequence || full.sequence.length === 0) {
      // Hamle yoksa oyun sonu kontrolü (güvenlik)
      const winner = TD.checkGameOver();                                UI.busy = false;
      if (winner) endGame(winner);
      return;
    }

    playSequence(full.sequence, 0);
  }

  /* ---------- Zincirdeki adımları sırayla oynat ---------- */
  function playSequence(sequence, index) {
    if (index >= sequence.length) {
      // Tüm adımlar bitti → sırayı devret
      afterCPUDone();
      return;
    }

    const move = sequence[index];
    const fromEl = UI.pieceEls[move.from.r][move.from.c];
    const wasCapture = move.captured && move.captured.length > 0;

    play.animatePieceMove(fromEl, move, function () {
      const result = TD.applyMove(move);

      // Yenen taşları temizle
      if (result.captured && result.captured.length) {
        for (let i = 0; i < result.captured.length; i++) {
          const cap = result.captured[i];
          const capEl = UI.pieceEls[cap.r][cap.c];
          if (capEl) {
            capEl.classList.add("piece--captured");
            (function (el) {
              setTimeout(function () { if (el) el.remove(); }, 300);
            })(capEl);
          }
          UI.pieceEls[cap.r][cap.c] = null;
        }
      }

      // Taş referansını taşı
      UI.pieceEls[move.to.r][move.to.c] = fromEl;
      UI.pieceEls[move.from.r][move.from.c] = null;
      if (fromEl) {
        fromEl.classList.remove("piece--moving");
        fromEl.style.transform = "";
        UI.cells[move.to.r][move.to.c].appendChild(fromEl);
      }

      if (wasCapture) Sound.capture();
      else Sound.move();

      // Dama olduysa taç + efekt
      if (result.promoted) {
        render.refreshPieceVisual(move.to.r, move.to.c);
        const pEl = UI.pieceEls[move.to.r][move.to.c];
        if (pEl) {
          pEl.classList.add("piece--just-promoted");
          (function (el) {
            setTimeout(function () {                                            if (el) el.classList.remove("piece--just-promoted");
            }, 500);
          })(pEl);                                                        }
        Sound.promote();
      }

      render.updateStatus();
      interact.showLastMoveTrail();

      // Sonraki adıma geç (zincir devam ediyorsa kısa ara)
      const next = index + 1;
      if (next < sequence.length) {
        setTimeout(function () {
          playSequence(sequence, next);
        }, 220);
      } else {
        afterCPUDone();
      }
    });
  }

  /* ---------- CPU hamlesi tamamen bitince ---------- */
  function afterCPUDone() {
    // applyMove zincir kilidini yönetmiş olabilir; tam hamle bittiği için sıfırla
    Game.mustCaptureFrom = null;
    TD.switchTurn();
    render.updateStatus();

    const winner = TD.checkGameOver();
    if (winner) {
      UI.busy = false;
      endGame(winner);
      return;
    }

    interact.clearHighlights();
    interact.markMovablePieces();
    UI.busy = false;

    // Olası durum: CPU vs CPU değil; ama güvenlik için tekrar kontrol
    maybeTriggerCPU();
  }

  /* ===================================================================
     OYUN SONU İŞLEME
     =================================================================== */
  function endGame(winner) {
    Game.over = true;
    Game.winner = winner;
    Game.selected = null;
    Game.legalMoves = [];
    Game.mustCaptureFrom = null;

    interact.clearHighlights();                                       render.updateStatus();

    // Kazanan metnini hazırla                                        let title;
    let sub;

    if (winner === "draw") {
      title = "Berabere!";
      sub = "İki taraf da hamle yapamıyor.";
    } else if (Game.mode === "cpu") {
      if (winner === Game.cpuColor) {
        title = "Bilgisayar Kazandı!";
        sub = "Bir dahaki sefere şansın açık olsun.";
      } else {
        title = "Kazandın!";
        sub = "Bilgisayarı yendin, tebrikler.";
      }
    } else {
      title = (winner === TD.WHITE ? "Beyaz" : "Siyah") + " Kazandı!";
      sub = "Tebrikler, tüm rakip taşları etkisiz hâle getirdin.";
    }

    dom.winnerText.textContent = title;
    dom.winnerSub.textContent = sub;

    // Ses
    if (winner === "draw") {
      Sound.invalid();
    } else {
      Sound.win();
    }

    // Modalı kısa gecikmeyle aç (son animasyon görünsün)
    setTimeout(function () {
      UINS.modals.openGameOver();
    }, 450);
  }

  /* ===================================================================
     Dışa aktarım
     =================================================================== */
  UINS.flow = {
    maybeTriggerCPU: maybeTriggerCPU,
    runCPUMove: runCPUMove,
    playSequence: playSequence,
    afterCPUDone: afterCPUDone,
    endGame: endGame,
  };

})();

/* ===================================================================
   ui.js — 6. Parça
   Modal ve panel yönetimi: ayarlar paneli, overlay ve tüm modallar
   =================================================================== */

(function () {
  "use strict";                                                   
  const TD = window.TurkDama;
  const Game = TD.Game;
  const UINS = window.TurkDamaUI;
  const dom = UINS.dom;                                             const UI = UINS.UI;
  const Sound = UINS.Sound;

  /* ===================================================================
     OVERLAY KONTROLÜ
     Panel veya bir modal açıkken arka plan karartmasını yönetir.
     =================================================================== */
  function showOverlay() {
    dom.overlay.classList.add("is-open");
    dom.overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    dom.overlay.classList.remove("is-open");
    dom.overlay.setAttribute("aria-hidden", "true");
  }

  // Açık herhangi bir panel/modal var mı? (overlay'i ona göre kapat)
  function anyLayerOpen() {
    return (
      dom.settingsPanel.classList.contains("is-open") ||
      dom.newGameModal.classList.contains("is-open") ||
      dom.howToModal.classList.contains("is-open") ||
      dom.gameOverModal.classList.contains("is-open")
    );
  }

  function syncOverlay() {
    if (anyLayerOpen()) showOverlay();
    else hideOverlay();
  }

  /* ===================================================================
     AYARLAR PANELİ                                                    =================================================================== */                                                           function openSettings() {
    dom.settingsPanel.classList.add("is-open");
    dom.settingsPanel.setAttribute("aria-hidden", "false");
    syncOverlay();
  }

  function closeSettings() {
    dom.settingsPanel.classList.remove("is-open");
    dom.settingsPanel.setAttribute("aria-hidden", "true");
    syncOverlay();
  }

  /* ===================================================================
     YENİ OYUN MODALI
     Açıldığında mevcut mod/zorluğa göre seçimleri yansıtır.
     =================================================================== */
  function openNewGame() {
    // Panel açıksa kapat (modal öne gelsin)
    closeSettings();

    // Bekleyen seçimleri mevcut oyun ayarlarından başlat
    UI.pendingMode = Game.mode || "pvp";
    UI.pendingDiff = Game.difficulty || "medium";

    syncModeButtons();
    syncDifficultyButtons();                                          updateDifficultyVisibility();
                                                                      dom.newGameModal.classList.add("is-open");
    dom.newGameModal.setAttribute("aria-hidden", "false");
    syncOverlay();
  }

  function closeNewGame() {
    dom.newGameModal.classList.remove("is-open");
    dom.newGameModal.setAttribute("aria-hidden", "true");
    syncOverlay();
  }

  /* ---------- Mod butonlarını seçime göre güncelle ---------- */
  function syncModeButtons() {
    const btns = dom.modeControl.querySelectorAll(".seg-control__btn");                                                                 for (let i = 0; i < btns.length; i++) {
      const active = btns[i].dataset.mode === UI.pendingMode;
      btns[i].classList.toggle("is-active", active);                  }
  }

  /* ---------- Zorluk butonlarını seçime göre güncelle ---------- */
  function syncDifficultyButtons() {
    const btns = dom.difficultyControl.querySelectorAll(".seg-control__btn");
    for (let i = 0; i < btns.length; i++) {
      const active = btns[i].dataset.diff === UI.pendingDiff;
      btns[i].classList.toggle("is-active", active);                  }
  }

  /* ---------- Zorluk seçimini yalnızca CPU modunda göster ---------- */
  function updateDifficultyVisibility() {                             if (UI.pendingMode === "cpu") {
      dom.difficultyWrap.hidden = false;
    } else {
      dom.difficultyWrap.hidden = true;
    }                                                               }
                                                                    /* ===================================================================                                                                 NASIL OYNANIR MODALI                                              =================================================================== */                                                           function openHowTo() {                                              closeSettings();                                                  dom.howToModal.classList.add("is-open");                          dom.howToModal.setAttribute("aria-hidden", "false");              syncOverlay();                                                  }                                                                                                                                   function closeHowTo() {                                             dom.howToModal.classList.remove("is-open");                       dom.howToModal.setAttribute("aria-hidden", "true");               syncOverlay();                                                  }                                                                                                                                   /* ===================================================================                                                                 OYUN SONU MODALI                                                  =================================================================== */                                                           function openGameOver() {
    dom.gameOverModal.classList.add("is-open");                       dom.gameOverModal.setAttribute("aria-hidden", "false");
    syncOverlay();
  }

  function closeGameOver() {
    dom.gameOverModal.classList.remove("is-open");
    dom.gameOverModal.setAttribute("aria-hidden", "true");
    syncOverlay();
  }
                                                                    /* ===================================================================                                                                 TÜM KATMANLARI KAPAT (ESC / overlay tıklama için)
     Oyun sonu modalı overlay tıklamasıyla kapanmaz (zorunlu seçim).                                                                     =================================================================== */
  function closeAllDismissable() {
    closeSettings();
    closeNewGame();
    closeHowTo();
    // gameOverModal bilerek kapatılmaz
    syncOverlay();
  }

  /* ===================================================================
     Dışa aktarım
     =================================================================== */
  UINS.modals = {
    showOverlay: showOverlay,                                         hideOverlay: hideOverlay,                                         syncOverlay: syncOverlay,                                         anyLayerOpen: anyLayerOpen,                                   
    openSettings: openSettings,
    closeSettings: closeSettings,

    openNewGame: openNewGame,
    closeNewGame: closeNewGame,                                       syncModeButtons: syncModeButtons,
    syncDifficultyButtons: syncDifficultyButtons,                     updateDifficultyVisibility: updateDifficultyVisibility,

    openHowTo: openHowTo,
    closeHowTo: closeHowTo,

    openGameOver: openGameOver,
    closeGameOver: closeGameOver,
                                                                      closeAllDismissable: closeAllDismissable,
  };

})();


/* ===================================================================
   ui.js — 7. Parça                                                  Olay bağlama, klavye kısayolları, tema/ses geçişleri ve başlatma                                                                    =================================================================== */
                                                                  (function () {                                                      "use strict";                                                   
  const TD = window.TurkDama;
  const Game = TD.Game;                                             const UINS = window.TurkDamaUI;
  const dom = UINS.dom;                                             const UI = UINS.UI;                                               const STORAGE = UINS.STORAGE;
  const Sound = UINS.Sound;
  const render = UINS.render;
  const interact = UINS.interact;
  const play = UINS.play;
  const flow = UINS.flow;
  const modals = UINS.modals;
                                                                    /* ===================================================================
     TEMA UYGULAMA
     =================================================================== */
  function applyTheme(theme) {
    UI.theme = theme === "dark" ? "dark" : "light";
    dom.body.setAttribute("data-theme", UI.theme);

    // Tema kontrol butonlarını güncelle
    const btns = dom.themeControl.querySelectorAll(".seg-control__btn");
    for (let i = 0; i < btns.length; i++) {
      const active = btns[i].dataset.themeValue === UI.theme;
      btns[i].classList.toggle("is-active", active);
    }

    // theme-color meta'sını da uyumla
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {                                                         meta.setAttribute("content", UI.theme === "dark" ? "#120d08" : "#3a2817");                                                        }
                                                                      try {                                                               localStorage.setItem(STORAGE.theme, UI.theme);
    } catch (e) {}
  }

  /* ===================================================================                                                                 SES AÇ/KAPA
     =================================================================== */
  function applySound(on) {                                           UI.soundOn = !!on;                                                dom.btnSound.dataset.state = UI.soundOn ? "on" : "off";           dom.btnSound.setAttribute(                                          "aria-label",                                                     UI.soundOn ? "Sesi kapat" : "Sesi aç"                           );                                                                try {                                                               localStorage.setItem(STORAGE.sound, UI.soundOn ? "on" : "off");                                                                   } catch (e) {}
  }

  function toggleSound() {
    applySound(!UI.soundOn);
    if (UI.soundOn) Sound.select();
  }
                                                                    /* ===================================================================
     KAYITLI TERCİHLERİ YÜKLE
     =================================================================== */                                                           function loadPreferences() {                                        let savedTheme = "light";
    let savedSound = "on";
    try {
      savedTheme = localStorage.getItem(STORAGE.theme) || "light";
      savedSound = localStorage.getItem(STORAGE.sound) || "on";
    } catch (e) {}                                                    applyTheme(savedTheme);
    applySound(savedSound === "on");
  }                                                                                                                                   /* ===================================================================
     YENİ OYUN BAŞLAT (modaldaki seçimlerle)                           =================================================================== */
  function startGameFromModal() {
    TD.newGame({
      mode: UI.pendingMode,                                             difficulty: UI.pendingDiff,
    });
    modals.closeNewGame();                                            modals.closeGameOver();
    refreshFullBoard();

    // İnsan beyazla başlar; CPU siyahsa ve sıra ondaysa tetikle
    // (beyaz başladığı için ilk hamle her zaman insanın)
    flow.maybeTriggerCPU();
  }                                                               
  /* ---------- Hızlı başlat: belirli modla (oyun sonu butonları) ---------- */
  function quickStart(mode, difficulty) {
    UI.pendingMode = mode;                                            if (difficulty) UI.pendingDiff = difficulty;
    TD.newGame({                                                        mode: mode,
      difficulty: UI.pendingDiff,                                     });                                                               modals.closeGameOver();
    modals.closeNewGame();
    refreshFullBoard();
    flow.maybeTriggerCPU();
  }

  /* ===================================================================
     TAHTAYI TAM YENİLE (yeni oyun sonrası)
     =================================================================== */                                                           function refreshFullBoard() {
    render.renderPieces();                                            interact.clearLastMoveTrail();
    interact.clearHighlights();                                       render.updateStatus();                                            interact.markMovablePieces();
    UI.busy = false;
  }                                                               
  /* ===================================================================                                                                 OLAY BAĞLAMA                                                      =================================================================== */                                                           function bindEvents() {
    // --- Tahta tıklaması ---
    dom.board.addEventListener("click", play.onBoardClick);

    // --- Üst bar ---                                                dom.btnSettings.addEventListener("click", function () {
      modals.openSettings();                                          });
    dom.btnNewGame.addEventListener("click", function () {              modals.openNewGame();                                           });                                                                                                                                 // --- Ayarlar paneli ---                                         dom.btnCloseSettings.addEventListener("click", function () {        modals.closeSettings();                                         });                                                               dom.btnSound.addEventListener("click", toggleSound);              dom.btnHowTo.addEventListener("click", function () {                modals.openHowTo();                                             });                                                           
    // --- Tema seçimi ---
    dom.themeControl.addEventListener("click", function (ev) {          const btn = ev.target.closest(".seg-control__btn");
      if (!btn) return;                                                 applyTheme(btn.dataset.themeValue);
    });                                                           
    // --- Overlay tıklaması (kapatılabilir katmanları kapat) ---     dom.overlay.addEventListener("click", function () {                 modals.closeAllDismissable();
    });

    // --- Yeni oyun modalı: mod seçimi ---
    dom.modeControl.addEventListener("click", function (ev) {
      const btn = ev.target.closest(".seg-control__btn");
      if (!btn) return;
      UI.pendingMode = btn.dataset.mode;
      modals.syncModeButtons();
      modals.updateDifficultyVisibility();                            });
                                                                      // --- Yeni oyun modalı: zorluk seçimi ---
    dom.difficultyControl.addEventListener("click", function (ev) {                                                                       const btn = ev.target.closest(".seg-control__btn");               if (!btn) return;
      UI.pendingDiff = btn.dataset.diff;
      modals.syncDifficultyButtons();
    });
                                                                      // --- Yeni oyun modalı: aksiyonlar ---
    dom.btnCancelNewGame.addEventListener("click", function () {
      modals.closeNewGame();
    });                                                               dom.btnStartGame.addEventListener("click", startGameFromModal);                                                                 
    // --- Nasıl oynanır kapatma ---                                  dom.btnCloseHowTo.addEventListener("click", function () {
      modals.closeHowTo();
    });

    // --- Oyun sonu butonları ---
    dom.btnReplay.addEventListener("click", function () {
      // Aynı modla tekrar oyna                                         quickStart(Game.mode, Game.difficulty);
    });                                                               dom.btnPlayCpu.addEventListener("click", function () {
      // Bilgisayara karşı (mevcut zorlukla; varsayılan orta)           quickStart("cpu", Game.difficulty || "medium");
    });

    // --- Klavye kısayolları ---
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        modals.closeAllDismissable();                                   }
    });                                                           
    // --- Pencere yeniden boyutlandığında son hamle izini koru ---
    // (tahta oransal olduğu için yeniden çizim gerekmez; sadece      //  taşların konumu CSS ile otomatik ayarlanır)
    window.addEventListener("resize", function () {                     // Animasyon sırasında boyut değişirse taş transformlarını sıfırla
      if (!UI.busy) return;
      for (let r = 0; r < TD.SIZE; r++) {
        for (let c = 0; c < TD.SIZE; c++) {                                 const el = UI.pieceEls[r][c];                                     if (el) {
            el.classList.remove("piece--moving");                             el.style.transform = "";
          }
        }
      }
    });
                                                                      // --- Pull-to-refresh / taşma ek güvenlik (dokunmatik) ---
    document.addEventListener("touchmove", function (ev) {              // Panel/modal içi kaydırmaya izin ver; dışarıda engelle
      const scrollable = ev.target.closest(
        ".panel__body, .modal__box--scroll"
      );
      if (!scrollable) {                                                  ev.preventDefault();
      }                                                               }, { passive: false });
  }                                                                                                                                   /* ===================================================================
     BAŞLATMA
     =================================================================== */
  function init() {
    loadPreferences();
    render.buildBoard();                                              TD.newGame({ mode: "pvp", difficulty: "medium" });
    refreshFullBoard();
    bindEvents();
  }                                                                                                                                   // DOM hazır olduğunda başlat                                     if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }                                                                                                                                 })();                                                             