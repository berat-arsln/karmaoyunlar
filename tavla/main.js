/* ==========================================================
   main.js — Parça 1/?
   BÖLÜM 1: Durum (state) & sabitler
   ----------------------------------------------------------
   Oyunun tüm verisi tek bir state nesnesinde tutulur.
   Tahta dizilimi 1..24 numaralı haneler + bar + bear-off
   üzerinden modellenir.

   Oyuncu yönü (önemli):
   - Oyuncu 1 (P1): pulları 24 → 1 yönünde hareket eder,
     ev (home) bölgesi 1..6, bear-off'a 1'den çıkar.
   - Oyuncu 2 (P2): pulları 1 → 24 yönünde hareket eder,
     ev (home) bölgesi 19..24, bear-off'a 24'ten çıkar.
========================================================== */

"use strict";

/* ---------- SABİTLER ---------- */
const P1 = 1;            // Oyuncu 1 (koyu pullar)
const P2 = 2;            // Oyuncu 2 (açık pullar)
const POINTS = 24;       // toplam hane sayısı
const CHECKERS_PER = 15; // oyuncu başına pul sayısı

/* Her oyuncunun ev (home) bölgesi hane aralığı */
const HOME = {
  [P1]: { min: 1,  max: 6  },   // P1 evi: 1..6
  [P2]: { min: 19, max: 24 }    // P2 evi: 19..24
};

/* Her oyuncunun bardan tahtaya giriş yaptığı bölge
   (rakibin evinin karşılığı). Zar değeri d için giriş hanesi:
   - P1 için: 25 - d   (24,23,...,19)
   - P2 için: d        (1,2,...,6)              */
function entryPoint(player, dieValue) {
  return player === P1 ? (25 - dieValue) : dieValue;
}

/* ---------- BAŞLANGIÇ DİZİLİMİ ----------
   Klasik tavla açılışı. Anahtar = hane no, değer = { owner, count }.
   P1 (24→1 yönünde) ve P2 (1→24 yönünde) simetrik dizilir. */
function initialBoard() {
  const board = {};
  for (let i = 1; i <= POINTS; i++) board[i] = { owner: 0, count: 0 };

  // Oyuncu 1 (P1) pulları
  board[24] = { owner: P1, count: 2 };
  board[13] = { owner: P1, count: 5 };
  board[8]  = { owner: P1, count: 3 };
  board[6]  = { owner: P1, count: 5 };

  // Oyuncu 2 (P2) pulları (simetrik)
  board[1]  = { owner: P2, count: 2 };
  board[12] = { owner: P2, count: 5 };
  board[17] = { owner: P2, count: 3 };
  board[19] = { owner: P2, count: 5 };

  return board;
}

/* ---------- MERKEZİ STATE ---------- */
const state = {
  board: initialBoard(),

  // Bardaki (vurulmuş) pullar
  bar: { [P1]: 0, [P2]: 0 },

  // Toplanan (bear-off edilmiş) pullar
  borneOff: { [P1]: 0, [P2]: 0 },

  // Sıradaki oyuncu
  current: P1,

  // Bu turda atılan zarlar ve kalan (kullanılabilir) hamle değerleri
  dice: [],          // örn. [3, 5] veya çift gelince [4, 4, 4, 4]
  movesLeft: [],     // kullanıldıkça çıkarılır

  // Seçili kaynak hane (UI etkileşimi için)
  selected: null,    // hane no | "bar" | null

  // Oyun durumu
  phase: "idle",     // "idle" | "rolling" | "moving" | "won"
  winner: 0,

  // Oyuncu başına zar modu ("auto" = CSS zar, "manual" = 3D)
  diceMode: { [P1]: "auto", [P2]: "auto" },

  // Ayarlar
  settings: {
    theme: "light",  // "light" | "dark"
    sound: true,
    volume: 0.6
  }
};


/* ==========================================================
   main.js — Parça 2/?
   BÖLÜM 2: DOM referansları & tahta render
   ----------------------------------------------------------
   State'ten okuyup ekrana çizen "tek yönlü" render mantığı:
   state değişir → render() çağrılır → DOM güncellenir.
========================================================== */

/* ---------- DOM REFERANSLARI ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const dom = {
  board:        $("#board"),
  bar:          $("#bar"),
  barSlotP1:    $("#barSlotP1 .checkers"),
  barSlotP2:    $("#barSlotP2 .checkers"),
  bearoff:      $("#bearoff"),
  trayP1:       $("#trayP1 .checkers"),
  trayP2:       $("#trayP2 .checkers"),

  turnIndicator:$("#turnIndicator"),
  turnDot:      $("#turnDot"),
  turnText:     $("#turnText"),

  offP1:        $("#offP1"),
  offP2:        $("#offP2"),
  barCountP1:   $("#barP1"),
  barCountP2:   $("#barP2"),
  panelP1:      $("#panelP1"),
  panelP2:      $("#panelP2"),

  diceZone:     $("#diceZone"),
  movesValues:  $("#movesValues"),
  rollBtn:      $("#rollBtn"),
  passBtn:      $("#passBtn"),

  toastArea:    $("#toastArea"),
  winOverlay:   $("#winOverlay"),
  winTitle:     $("#winTitle"),
  winSub:       $("#winSub")
};

/* ---------- YARDIMCI: pul DOM elemanı oluştur ---------- */
function makeChecker(owner, countLabel = null) {
  const el = document.createElement("div");
  el.className = "checker " + (owner === P1 ? "p1" : "p2");
  if (countLabel) {
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = countLabel;
    el.appendChild(c);
  }
  return el;
}

/* ---------- HANELERİ ÇİZ ----------
   Her hane için en fazla 5 pul gösterilir; fazlası sayaçla
   ifade edilir (en üstteki pula "+N" yazılır). */
function renderPoints() {
  for (let p = 1; p <= POINTS; p++) {
    const cell = $(`.point[data-point="${p}"] .checkers`, dom.board);
    if (!cell) continue;
    cell.innerHTML = "";

    const { owner, count } = state.board[p];
    if (count === 0) continue;

    const visible = Math.min(count, 5);
    for (let i = 0; i < visible; i++) {
      // Son görünen pula, taşma varsa toplam sayıyı yaz
      const isTop = i === visible - 1;
      const label = isTop && count > 5 ? String(count) : null;
      cell.appendChild(makeChecker(owner, label));
    }
  }
}

/* ---------- BARI ÇİZ ---------- */
function renderBar() {
  dom.barSlotP1.innerHTML = "";
  dom.barSlotP2.innerHTML = "";

  for (let i = 0; i < state.bar[P1]; i++) {
    dom.barSlotP1.appendChild(makeChecker(P1));
  }
  for (let i = 0; i < state.bar[P2]; i++) {
    dom.barSlotP2.appendChild(makeChecker(P2));
  }
}

/* ---------- BEAR-OFF (TOPLAMA) ÇİZ ---------- */
function renderBearoff() {
  dom.trayP1.innerHTML = "";
  dom.trayP2.innerHTML = "";

  for (let i = 0; i < state.borneOff[P1]; i++) {
    dom.trayP1.appendChild(makeChecker(P1));
  }
  for (let i = 0; i < state.borneOff[P2]; i++) {
    dom.trayP2.appendChild(makeChecker(P2));
  }
}

/* ---------- SAYAÇ & PANELLERİ GÜNCELLE ---------- */
function renderStats() {
  dom.offP1.textContent = state.borneOff[P1];
  dom.offP2.textContent = state.borneOff[P2];
  dom.barCountP1.textContent = state.bar[P1];
  dom.barCountP2.textContent = state.bar[P2];

  dom.panelP1.classList.toggle("is-active", state.current === P1);
  dom.panelP2.classList.toggle("is-active", state.current === P2);
}

/* ---------- SIRA GÖSTERGESİNİ GÜNCELLE ---------- */
function renderTurn() {
  const isP

1 = state.current === P1;
  dom.turnDot.className = "turn-dot " + (isP1 ? "p1" : "p2");
  dom.turnText.textContent = isP1 ? "Sıra: Oyuncu 1" : "Sıra: Oyuncu 2";
}

/* ---------- KALAN HAMLELERİ ÇİZ ---------- */
function renderMoves() {
  dom.movesValues.innerHTML = "";
  // Atılan tüm zarları göster; kullanılanları üstü çizili işaretle
  const used = countUsed(state.dice, state.movesLeft);

  state.dice.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "move-chip";
    chip.textContent = value;
    // Bu değerden kaç tane kullanıldıysa o kadarını "used" yap
    if (used[value] > 0) {
      chip.classList.add("used");
      used[value]--;
    }
    dom.movesValues.appendChild(chip);
  });
}

/* Atılan vs. kalan hamleleri karşılaştırıp her değerden
   kaç tanesinin kullanıldığını hesaplar. */
function countUsed(dice, left) {
  const tally = {};
  dice.forEach((v) => (tally[v] = (tally[v] || 0) + 1));
  left.forEach((v) => (tally[v] = (tally[v] || 0) - 1));
  return tally; // value → kullanılan adet
}

/* ---------- BUTON DURUMLARI ---------- */
function renderButtons() {
  // "Zar At": yalnızca tur başında (zar atılmamışken) aktif
  dom.rollBtn.disabled = state.dice.length > 0 || state.phase === "won";

  // "Sıra geç": zar atılmış ama oynanabilir hamle yokken aktif
  const stuck = state.dice.length > 0 && !hasAnyLegalMove(state.current);
  dom.passBtn.hidden = !stuck;
}

/* ---------- ANA RENDER DÖNGÜSÜ ---------- */
function render() {
  renderPoints();
  renderBar();
  renderBearoff();
  renderStats();
  renderTurn();
  renderMoves();
  renderButtons();
}



/* ==========================================================
   main.js — Parça 3/?
   BÖLÜM 3: Zar atma (otomatik + manuel), movesLeft üretimi,
   sıra geçişi
   ----------------------------------------------------------
   Manuel (3D) mod, sonuç değerini Three.js sahnesinden
   onResult(d1, d2) geri çağrısıyla verir; otomatik mod ise
   doğrudan rastgele üretir. İki yol da applyRoll() ile
   birleşir.
========================================================== */

/* ---------- RASTGELE ZAR (1..6) ---------- */
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

/* ---------- ZAR SONUCUNU UYGULA ----------
   d1, d2 değerlerinden movesLeft listesini kurar.
   Çift (d1 === d2) gelirse dört hamle hakkı doğar. */
function applyRoll(d1, d2) {
  state.dice = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
  state.movesLeft = [...state.dice];
  state.phase = "moving";
  state.selected = null;

  // Bardan girişi zorunlu kıl: barı olan oyuncu önce girmeli
  refreshBarConstraint();

  render();
  updateAutoDiceFaces(d1, d2);

  // Hiç yasal hamle yoksa, kısa bekleyip otomatik "sıra geç" öner
  if (!hasAnyLegalMove(state.current)) {
    toast("Oynanabilir hamle yok — sırayı geçebilirsin.", "warn");
  }
}

/* ---------- ANA ZAR ATMA AKIŞI ---------- */
function doRoll() {
  if (state.dice.length > 0 || state.phase === "won") return;

  state.phase = "rolling";
  dom.rollBtn.disabled = true;
  playSound("roll");

  const mode = state.diceMode[state.current];

  if (mode === "manual" && window.Dice3D && window.Dice3D.isReady()) {
    // MANUEL: 3D sahne sonucu geri çağrı ile verir
    window.Dice3D.throwDice((d1, d2) => applyRoll(d1, d2));
  } else {
    // OTOMATİK: rastgele üret + kısa CSS animasyonu
    const d1 = rollDie();
    const d2 = rollDie();
    animateAutoDice(() => applyRoll(d1, d2), d1, d2);
  }
}

/* ---------- OTOMATİK ZAR ANİMASYONU ---------- */
function animateAutoDice(done, d1, d2) {
  ensureAutoDiceMounted();
  const dice = $$(".die", dom.diceZone);

  // Sallama animasyonu sırasında rastgele yüzler göster
  let ticks = 0;
  const iv = setInterval(() => {
    dice.forEach((die) => die.setAttribute("data-value", rollDie()));
    ticks++;
    if (ticks >= 8) {
      clearInterval(iv);
      // Gerçek sonucu yerleştir
      if (dice[0]) dice[0].setAttribute("data-value", d1);
      if (dice[1]) dice[1].setAttribute("data-value", d2);
      dice.forEach((die) => die.classList.remove("rolling", "used"));
      done();
    }
  }, 55);

  dice.forEach((die) => die.classList.add("rolling"));
}

/* ---------- OTOMATİK ZAR YÜZLERİNİ GÜNCELLE ---------- */
function updateAutoDiceFaces(d1, d2) {
  if (state.diceMode[state.current] !== "auto") return;
  const dice = $$(".die", dom.diceZone);
  if (dice[0]) dice[0].setAttribute("data-value", d1);
  if (dice[1]) dice[1].setAttribute("data-value", d2);
}

/* Otomatik zar şablonunu (template) diceZone'a yerleştirir. */
function ensureAutoDiceMounted() {
  if ($(".dice-auto", dom.diceZone)) return; // zaten var
  const tpl = $("#diceTemplate")?.content?.querySelector(".dice-auto");
  if (tpl) {
    dom.diceZone.innerHTML = "";
    dom.diceZone.appendChild(tpl.cloneNode(true));
  }
}

/* ---------- SIRA GEÇİŞİ ---------- */
function endTurn() {
  // Zar ve hamle durumunu temizle
  state.dice = [];
  state.movesLeft = [];
  state.selected = null;
  state.phase = "idle";

  // Sırayı diğer oyuncuya devret
  state.current = (state.current === P1) ? P2 : P1;

  // Otomatik zar yüzlerini sıfırla / doğru modu hazırla
  prepareDiceZoneForCurrent();

  render();

toast(state.current === P1 ? "Sıra Oyuncu 1'de." : "Sıra Oyuncu 2'de.");
}

/* "Sıra geç" butonu: yalnız oynanabilir hamle yokken anlamlı. */
function doPass() {
  if (state.dice.length === 0) return;          // önce zar atılmalı
  if (hasAnyLegalMove(state.current)) {
    toast("Hâlâ oynayabileceğin bir hamle var.", "warn");
    return;
  }
  endTurn();
}

/* Aktif oyuncunun moduna göre zar alanını hazırlar:
   otomatik → CSS zar şablonu; manuel → 3D canvas. */
function prepareDiceZoneForCurrent() {
  const mode = state.diceMode[state.current];
  if (mode === "manual" && window.Dice3D) {
    window.Dice3D.mount(dom.diceZone);
  } else {
    ensureAutoDiceMounted();
    // Yüzleri nötr (boş) hâle getir
    $$(".die", dom.diceZone).forEach((die) =>
      die.setAttribute("data-value", "0")
    );
  }
}


/* ==========================================================
   main.js — Parça 4/?
   BÖLÜM 4: Kural motoru
   ----------------------------------------------------------
   isLegalMove      → tek bir hamlenin geçerliliği
   hasAnyLegalMove  → oyuncunun en az bir hamlesi var mı
   refreshBarConstraint → bar zorunluluğunu uygula
   canBearOff       → bearing off koşulu sağlanıyor mu
   bearOffPoint     → zar değerinden hedef hane hesabı
========================================================== */

/* ---------- BAR KISITI ----------
   Barı olan oyuncu başka hiçbir hamle yapamaz;
   yalnızca bardan giriş yapabilir. Bu fonksiyon state'e
   doğrudan dokunmaz, render katmanı zaten bar slot'unu
   seçili gösterir; ancak isLegalMove içinde kontrol edilir. */
function refreshBarConstraint() {
  // Barı varsa seçimi bar'a kilitle
  if (state.bar[state.current] > 0) {
    state.selected = "bar";
  }
}

/* ---------- HANE SAHİPLİĞİ KONTROLÜ ----------
   Bir hedef hane oynanabilir mi?
   - Boşsa: evet
   - Aktif oyuncunun pulları varsa: evet
   - Rakibin tek pulu (blot) varsa: evet (hit yapılır)
   - Rakibin 2+ pulu varsa: hayır (bloke) */
function isOpenPoint(point, player) {
  const cell = state.board[point];
  if (!cell || cell.count === 0) return true;
  if (cell.owner === player) return true;
  if (cell.owner !== player && cell.count === 1) return true; // blot → hit
  return false;
}

/* ---------- BEARING OFF KOŞulu ----------
   Oyuncu tüm pullarını ev bölgesine toplamışsa bearing off yapabilir. */
function canBearOff(player) {
  // Bar'da pul varsa hayır
  if (state.bar[player] > 0) return false;

  const h = HOME[player];
  let total = 0;
  for (let p = h.min; p <= h.max; p++) {
    if (state.board[p].owner === player) total += state.board[p].count;
  }
  total += state.borneOff[player];
  // Tüm 15 pul ev + dışarıda mı?
  return total === CHECKERS_PER;
}

/* ---------- BEARING OFF HEDEF NOKTA ----------
   Zar değeri d için oyuncunun bearing off yapacağı hane.
   P1: en yüksek hane önce (1'den çıkar, d=1 → hane 1)
   P2: en düşük hane önce (24'ten çıkar, d=1 → hane 24)

   Eğer tam eşleşen hane boşsa en yakın yüksek haneden çıkılır
   (bearing off kuralı: yeterli zar değeriyle çıkış yapılabilir). */
function bearOffLegal(player, dieValue) {
  if (!canBearOff(player)) return false;
  const h = HOME[player];

  if (player === P1) {
    // P1: d → hane d. Hane doluysa doğrudan.
    if (state.board[dieValue]?.owner === P1 && state.board[dieValue].count > 0) return true;
    // Değer ev aralığının dışındaysa (d > 6) geçersiz
    if (dieValue > 6) return false;
    // "Yeterli zar" kuralı: d'den büyük hane yoksa, en yüksek dolu haneden çık
    for (let p = dieValue + 1; p <= h.max; p++) {
      if (state.board[p].owner === P1 && state.board[p].count > 0) return false;
    }
    // d'ye eşit veya daha düşük dolu hane var mı?
    for (let p = h.min; p <= h.max; p++) {
      if (state.board[p].owner === P1 && state.board[p].count > 0) return true;
    }
  } else {
    // P2: d → hane (25 - d). Örn. d=1 → hane 24.
    const target = 25 - dieValue;
    if (target >= h.min && target <= h.max &&
        state.board[target]?.owner === P2 && state.board[target].count > 0) return true;
    if (dieValue > 6) return false;
    // "Yeterli zar" kuralı (P2 için ters yön)
    for (let p = h.min; p < target; p++) {
      if (state.board[p].owner === P2 && state.board[p].count > 0) return false;
    }
    for (let p = h.min; p <= h.max; p++) {
      if (state.board[p].owner === P2 && state.board[p].count > 0) return true;
    }
  }
  return false;
}

/* ---------- TEK HAMLENİN GEÇERLİLİĞİ ----------
   from : hane no (1..24) | "bar"
   die  : kullanılacak zar değeri
   player: P1 | P2
   Dönüş: { legal: bool, to: number|"bearoff", hit: bool } */
function isLegalMove(from, die, player) {
  const opp = player === P1 ? P2 : P1;

  /* --- BARDAN GİRİŞ --- */
  if (from === "bar") {
    if (state.bar[player] === 0) return { legal: false };
    const to = entryPoint(player, die);
    if (to < 1 || to > 24) return { legal: false };
    const open = isOpenPoint(to, player);
    if (!open) return { legal: false };
    const hit = state.board[to].owner === opp && state.board[to].count === 1;
    return { legal: true, to, hit };
  }

  /* --- BARDAN GİRİŞ ZORUNLULUĞU --- */
  if (state.bar[player] > 0) return { legal: false };

  /* --- NORMAL HAMLE --- */
  const cell = state.board[from];
  if (!cell || cell.owner !== player || cell.count === 0) return { legal: false };

  // Hedef hane hesabı (yön: P1 azalan, P2 artan)
  const to = player === P1 ? from - die : from + die;

  /* --- BEARING OFF --- */
  if (player === P1 && to < 1) {
    return { legal: bearOffLegal(player, die), to: "bearoff", hit: false };
  }
  if (player === P2 && to > 24) {
    return { legal: bearOffLegal(player, die), to: "bearoff", hit: false };
  }

  /* --- TAHTA İÇİ HAMLE --- */
  if (to < 1 || to > 24) return { legal: false };
  if (!isOpenPoint(to, player)) return { legal: false };

  const hit = state.board[to].owner === opp && state.board[to].count === 1;
  return { legal: true, to, hit };
}

/* ---------- EN AZ BİR YASAL HAMLE VAR MI ---------- */
function hasAnyLegalMove(player) {
  const movesAvail = [...new Set(state.movesLeft)]; // tekrarları çıkar

  // Bar kontrolü önce
  if (state.bar[player] > 0) {
    return movesAvail.some(d => isLegalMove("bar", d, player).legal);
  }

  // Tüm haneleri tara
  for (let p = 1; p <= POINTS; p++) {
    if (state.board[p].owner !== player || state.board[p].count === 0) continue;
    if (movesAvail.some(d => isLegalMove(p, d, player).legal)) return true;
  }
  return false;
}

/* ---------- BELİRLİ BİR FROM İÇİN OYNAYILACAK ZARLAR ----------
   UI'ın "bu haneden hangi zarlarla gidilebilir?" sorusuna yanıt verir. */
function legalDiceFor(from, player) {
  const unique = [...new Set(state.movesLeft)];
  return unique.filter(d => isLegalMove(from, d, player).legal);
}

/* ---------- BELİRLİ BİR FROM→TO İÇİN ZAR SEÇ ----------
   Aynı from→to'yu sağlayan birden fazla zar varsa birini döndürür.
   Öncelik: tam eşleşme, sonra bearing-off için en küçük yeterli değer. */
function chooseDie(from, to, player) {
  const unique = [...new Set(state.movesLeft)];
  for (const d of unique) {
    const result = isLegalMove(from, d, player);
    if (!result.legal) continue;
    if (result.to === to) return d;
  }
  return null;
}



/* ==========================================================
   main.js — Parça 5/?
   BÖLÜM 5: Hamle uygulama, hit, bearing off, kazanma
   ----------------------------------------------------------
   applyMove      → state'i günceller, sesi çalar, render eder
   checkWin       → kazanma + mars/çift mars tespiti
   consumeDie     → movesLeft'ten bir değer çıkarır
========================================================== */

/* ---------- ZAR TÜKETİMİ ----------
   movesLeft listesinden verilen değeri bir kez çıkarır. */
function consumeDie(value) {
  const idx = state.movesLeft.indexOf(value);
  if (idx !== -1) state.movesLeft.splice(idx, 1);
}

/* ---------- HAMLEYİ UYGULA ----------
   from   : hane no (1..24) | "bar"
   to     : hane no (1..24) | "bearoff"
   die    : kullanılan zar değeri
   player : P1 | P2                         */
function applyMove(from, to, die, player) {
  const opp = player === P1 ? P2 : P1;

  /* --- KAYNAKTAN PUL KALDIR --- */
  if (from === "bar") {
    state.bar[player] = Math.max(0, state.bar[player] - 1);
  } else {
    state.board[from].count--;
    if (state.board[from].count === 0) state.board[from].owner = 0;
  }

  /* --- BEARING OFF --- */
  if (to === "bearoff") {
    state.borneOff[player]++;
    consumeDie(die);
    playSound("bearoff");

    // Kazanma kontrolü
    if (checkWin(player)) return; // render checkWin içinde yapılır

    // Tüm hamleler bitti mi?
    if (state.movesLeft.length === 0) {
      setTimeout(endTurn, 400);
    } else if (!hasAnyLegalMove(player)) {
      toast("Başka hamle yok.", "warn");
      setTimeout(endTurn, 600);
    } else {
      render();
    }
    return;
  }

  /* --- HIT: rakip blot'u bara düşür --- */
  if (state.board[to].owner === opp && state.board[to].count === 1) {
    state.board[to].count = 0;
    state.board[to].owner = 0;
    state.bar[opp]++;
    playSound("hit");
    toast(
      opp === P1 ? "Oyuncu 1'in pulu vuruldu!" : "Oyuncu 2'nin pulu vuruldu!",
      "warn"
    );
  } else {
    playSound("place");
  }

  /* --- HEDEFE PUL EKLE --- */
  state.board[to].owner = player;
  state.board[to].count++;

  /* --- ZAR TÜKEt --- */
  consumeDie(die);

  /* --- BAR KISITINI GÜNCELLE (opp için) --- */
  // Opp'un barı varsa ve sıra onunkine geçecekse zaten endTurn halleder.

  /* --- SIRA/HAMLe KONTROLÜ --- */
  if (state.movesLeft.length === 0) {
    state.selected = null;
    render();
    setTimeout(endTurn, 400);
  } else if (!hasAnyLegalMove(player)) {
    state.selected = null;
    render();
    toast("Başka oynanabilir hamle yok.", "warn");
    setTimeout(endTurn, 700);
  } else {
    // Bar zorunluluğunu güncelle (opp vurulduysa ilgisiz,
    // ama aktif oyuncunun kendi barı varsa kilitle)
    refreshBarConstraint();
    state.selected = null;
    render();
  }
}

/* ---------- KAZANMA KONTROLÜ ----------
   Tüm 15 pul toplanmışsa oyun biter.
   Mars  (gammon)       : rakip hiç pul toplamadıysa.
   Çift mars (backgammon): rakip ayrıca bar'da veya
                           aktif oyuncunun ev bölgesinde pulu varsa. */
function checkWin(player) {
  if (state.borneOff[player] < CHECKERS_PER) return false;

  state.phase = "won";
  state.winner = player;

  const opp = player === P1 ? P2 : P1;
  const oppOff = state.borneOff[opp];
  const oppBar = state.bar[opp];

  // Rakibin ev bölgesindeki pul sayısı (çift mars için)
  const myHome = HOME[player];
  let oppInMyHome = 0;
  for (let p = myHome.min; p <= myHome.max; p++) {
    if (state.board[p].owner === opp) oppInMyHome += state.board[p].count;
  }

  let resultType = "normal";
  if (oppOff === 0) {
    resultType = (oppBar > 0 || oppInMyHome > 0) ? "backgammon" : "gammon";
  }

  const labels = {
    normal:      "Normal galibiyet",
    gammon:      "Mars! (Gammon)",
    backgammon:  "Çift Mars! (Backgammon)"
  };

  const winnerName = player === P1 ? "Oyuncu 1" : "Oyuncu 2";
  dom.winTitle.textContent = `${winnerName} kazandı!`;
  dom.winSub.textContent   = labels[resultType];
  dom.winOverlay.hidden    = false;

  playSound("win");
  render();
  return true;
}

/* ---------- YENİDEN BAŞLAT ---------- */
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

  dom.winOverlay.hidden = true;
  clearHighlights();
  prepareDiceZoneForCurrent();
  render();
  toast("Yeni oyun başladı. Sıra Oyuncu 1'de.");
}



/* ==========================================================
   main.js — Parça 6/?
   BÖLÜM 6: UI etkileşimi — tıklama, seçim, vurgulama
   ----------------------------------------------------------
   handlePointClick  → hane tıklaması (seç / hamle yap)
   handleBarClick    → bar tıklaması
   handleBearoffClick→ bear-off tepsisi tıklaması
   highlightTargets  → geçerli hedefleri yeşil vurgular
   clearHighlights   → tüm vurguları temizler
========================================================== */

/* ---------- VURGU TEMİZLE ---------- */
function clearHighlights() {
  $$(".point", dom.board).forEach(el => {
    el.classList.remove("selected", "valid-target", "invalid-flash");
  });
  dom.bearoff?.classList.remove("valid-target");
  dom.bar?.classList.remove("must-enter");
}

/* ---------- GEÇERLİ HEDEFLERİ VURGULA ----------
   from: hane no | "bar"
   Seçili kaynaktan gidilebilecek hane/bear-off'ları yeşil yapar. */
function highlightTargets(from, player) {
  clearHighlights();

  // Kaynak haneyi seçili göster
  if (from !== "bar") {
    const srcEl = $(`.point[data-point="${from}"]`, dom.board);
    if (srcEl) srcEl.classList.add("selected");
  }

  // Bar zorunluluğu varsa barı vurgula
  if (state.bar[player] > 0) {
    dom.bar?.classList.add("must-enter");
  }

  const unique = [...new Set(state.movesLeft)];
  let anyTarget = false;

  unique.forEach(die => {
    const result = isLegalMove(from, die, player);
    if (!result.legal) return;

    if (result.to === "bearoff") {
      dom.bearoff?.classList.add("valid-target");
      anyTarget = true;
    } else {
      const el = $(`.point[data-point="${result.to}"]`, dom.board);
      if (el) {
        el.classList.add("valid-target");
        anyTarget = true;
      }
    }
  });

  return anyTarget;
}

/* ---------- HANE TIKLAMA ---------- */
function handlePointClick(pointNo) {
  if (state.phase !== "moving") return;
  const player = state.current;

  // Bar'da pul varken hane tıklama engellenir
  if (state.bar[player] > 0) {
    flashInvalid(null);
    toast("Önce bar'daki pulunu oyna.", "warn");
    playSound("invalid");
    return;
  }

  /* --- SEÇİM YOK: bu haneyi seç --- */
  if (state.selected === null) {
    const cell = state.board[pointNo];
    if (cell.owner !== player || cell.count === 0) {
      flashInvalid(pointNo);
      playSound("invalid");
      return;
    }
    state.selected = pointNo;
    const hasTargets = highlightTargets(pointNo, player);
    if (!hasTargets) {
      // Bu haneden hamle yapılamıyor
      state.selected = null;
      clearHighlights();
      flashInvalid(pointNo);
      toast("Bu haneden oynanabilecek hamle yok.", "warn");
      playSound("invalid");
    }
    return;
  }

  /* --- AYNI HANE: seçimi iptal et --- */
  if (state.selected === pointNo) {
    state.selected = null;
    clearHighlights();
    return;
  }

  /* --- FARKLI HANE TIKLANDI --- */
  const from = state.selected;

  // Hedef geçerli mi?
  const die = chooseDie(from, pointNo, player);
  if (die === null) {
    // Geçersiz hedef — ama belki aktif oyuncunun kendi pulu?
    const cell = state.board[pointNo];
    if (cell.owner === player && cell.count > 0) {
      // Kaynağı değiştir
      state.selected = pointNo;
      const hasTargets = highlightTargets(pointNo, player);
      if (!hasTargets) {
        state.selected = null;
        clearHighlights();
        flashInvalid(pointNo);
        toast("Bu haneden oynanabilecek hamle yok.", "warn");
        playSound("invalid");
      }
    } else {
      flashInvalid(pointNo);
      playSound("invalid");
    }
    return;
  }

  // Hamleyi uygula
  const result = isLegalMove(from, die, player);
  clearHighlights();
  applyMove(from, result.to, die, player);
}

/* ---------- BAR TIKLAMA ---------- */
function handleBarClick() {
  if (state.phase !== "moving") return;
  const player = state.current;

  if (state.bar[player] === 0) return; // barımız yok

  if (state.selected === "bar") {
    // Zaten seçili — iptal
    state.selected = null;
    clearHighlights();
    return;
  }

  state.selected = "bar";
  const hasTargets = highlightTargets("bar", player);
  if (!hasTargets) {
    state.selected = null;
    clearHighlights();
    toast("Bar'dan giriş yapılacak hane kapalı.", "warn");
    playSound("invalid");
  }
}

/* ---------- BEAR-OFF TEPSİSİ TIKLAMA ---------- */
function handleBearoffClick() {
  if (state.phase !== "moving") return;
  const player = state.current;

  if (state.selected === null || state.selected === "bar") {
    toast("Önce çıkaracağın pulu seç.", "warn");
    return;
  }

  const from = state.selected;
  const die  = chooseDie(from, "bearoff", player);

  if (die === null) {
    flashInvalid(null);
    toast("Bu pulu şu an çıkaramazsın.", "warn");
    playSound("invalid");
    return;
  }

  clearHighlights();
  applyMove(from, "bearoff", die, player);
}

/* ---------- GEÇERSİZ HAMLE FLASH ----------
   pointNo null ise tüm tahtayı değil sadece genel uyarı. */
function flashInvalid(pointNo) {
  if (pointNo === null) return;
  const el = $(`.point[data-point="${pointNo}"]`, dom.board);
  if (!el) return;
  el.classList.remove("invalid-flash");
  // reflow zorla ki animasyon yeniden tetiklensin
  void el.offsetWidth;
  el.classList.add("invalid-flash");
  setTimeout(() => el.classList.remove("invalid-flash"), 450);
}

/* ---------- MOVABLE PULları İŞARETLE ----------
   Render sonrası aktif oyuncunun oynanabilir pullarına
   .movable sınıfı ekler (hover efekti için). */
function markMovable() {
  // Tüm movable'ları temizle
  $$(".checker.movable", dom.board).forEach(el => el.classList.remove("movable"));

  if (state.phase !== "moving") return;
  const player = state.current;

  if (state.bar[player] > 0) {
    // Sadece bar slot'undaki pullar
    $$(player === P1 ? "#barSlotP1 .checker" : "#barSlotP2 .checker")
      .forEach(el => el.classList.add("movable"));
    return;
  }

  for (let p = 1; p <= POINTS; p++) {
    if (state.board[p].owner !== player || state.board[p].count === 0) continue;
    if (legalDiceFor(p, player).length > 0) {
      const checkers = $$(`.point[data-point="${p}"] .checker`, dom.board);
      // En üstteki pul tıklanabilir
      if (checkers.length > 0) checkers[checkers.length - 1].classList.add("movable");
    }
  }
}

/* ---------- EVENT LİSTENER'LARI BAĞLA ---------- */
function bindBoardEvents() {
  // Hane tıklamaları (event delegation)
  dom.board.addEventListener("click", e => {
    const pointEl = e.target.closest(".point[data-point]");
    if (pointEl) {
      handlePointClick(parseInt(pointEl.dataset.point, 10));
      return;
    }
    const barSlot = e.target.closest(".bar-slot, .bar");
    if (barSlot) {
      handleBarClick();
      return;
    }
  });

  // Bear-off tepsisi tıklaması
  dom.bearoff?.addEventListener("click", handleBearoffClick);

  // Zar at butonu
  dom.rollBtn?.addEventListener("click", doRoll);

  // Sıra geç butonu
  dom.passBtn?.addEventListener("click", doPass);

  // Yeniden başlat butonu (header)
  $("#restartBtn")?.addEventListener("click", restartGame);

  // Kazanma ekranı yeniden başlat
  $("#winRestartBtn")?.addEventListener("click", restartGame);
}

/* ==========================================================
   main.js — Parça 7/?
   BÖLÜM 7: Ses motoru (Web Audio API)
   ----------------------------------------------------------
   Tüm sesler kod ile üretilir; harici dosya yok.
   playSound(name) → ilgili efekti çalar.
   Olaylar: roll, place, hit, bearoff, invalid, win
========================================================== */

/* ---------- AUDIO CONTEXT ---------- */
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Tarayıcı otomatik oynatmayı askıya almışsa devam ettir
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

/* ---------- YARDIMCI: zarf (envelope) uygula ----------
   gain node'una hızlı attack → decay → sustain → release. */
function applyEnvelope(gainNode, ctx, { attack = 0.005, decay = 0.1,
                                        sustain = 0.3, release = 0.2,
                                        peak = 1.0 } = {}) {
  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + attack);
  gainNode.gain.linearRampToValueAtTime(sustain * peak, now + attack + decay);
  gainNode.gain.setValueAtTime(sustain * peak, now + attack + decay);
  gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + release);
  return now + attack + decay + release;
}

/* ---------- YARDIMCI: ses seviyesini uygula ---------- */
function masterGain(ctx) {
  const g = ctx.createGain();
  g.gain.value = state.settings.sound ? state.settings.volume : 0;
  g.connect(ctx.destination);
  return g;
}

/* ============================================================
   SES EFEKTLERİ
   Her fonksiyon kendi oscillator/buffer zincirini kurar,
   çalar ve otomatik temizler.
============================================================ */

/* --- ZAR ATIŞI: beyaz gürültü patlaması + hafif pitch --- */
function sfx_roll() {
  const ctx = getAudioCtx();
  const mg  = masterGain(ctx);

  // Beyaz gürültü buffer'ı
  const bufLen = ctx.sampleRate * 0.18;
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type            = "bandpass";
  filter.frequency.value = 800;
  filter.Q.value         = 0.8;

  const gainN = ctx.createGain();
  const end   = applyEnvelope(gainN, ctx, {
    attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.12, peak: 0.55
  });

  noise.connect(filter);
  filter.connect(gainN);
  gainN.connect(mg);
  noise.start();
  noise.stop(ctx.currentTime + end + 0.02);

  // Hafif "tık" sesi (zar masaya değiyor hissi)
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const ctx2 = getAudioCtx();
      const osc  = ctx2.createOscillator();
      const gn   = ctx2.createGain();
      osc.type            = "sine";
      osc.frequency.value = 220 + Math.random() * 120;
      applyEnvelope(gn, ctx2, {
        attack: 0.002, decay: 0.04, sustain: 0, release: 0.03, peak: 0.3
      });
      osc.connect(gn);
      gn.connect(masterGain(ctx2));
      osc.start();
      osc.stop(ctx2.currentTime + 0.08);
    }, i * 55 + Math.random() * 30);
  }
}

/* --- PUL YERLEŞTİRME: kısa, yumuşak "tık" --- */
function sfx_place() {
  const ctx = getAudioCtx();
  const mg  = masterGain(ctx);

  const osc = ctx.createOscillator();
  const gn  = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(340, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.07);

  applyEnvelope(gn, ctx, {
    attack: 0.003, decay: 0.05, sustain: 0.1, release: 0.08, peak: 0.45
  });

  osc.connect(gn);
  gn.connect(mg);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

/* --- VURUŞ (HIT): keskin, dikkat çekici darbe --- */
function sfx_hit() {
  const ctx = getAudioCtx();
  const mg  = masterGain(ctx);

  // Gürültü katmanı
  const bufLen = ctx.sampleRate * 0.12;
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type            = "highpass";
  filter.frequency.value = 1200;

  const gnN = ctx.createGain();
  applyEnvelope(gnN, ctx, {
    attack: 0.002, decay: 0.08, sustain: 0, release: 0.05, peak: 0.6
  });

  noise.connect(filter);
  filter.connect(gnN);
  gnN.connect(mg);
  noise.start();
  noise.stop(ctx.currentTime + 0.18);

  // Tonal katman
  const osc = ctx.createOscillator();
  const gnO = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.15);
  applyEnvelope(gnO, ctx, {
    attack: 0.002, decay: 0.1, sustain: 0, release: 0.05, peak: 0.35
  });
  osc.connect(gnO);
  gnO.connect(mg);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/* --- BEARING OFF: hafif "pling" — pul dışarı çıkıyor --- */
function sfx_bearoff() {
  const ctx = getAudioCtx();
  const mg  = masterGain(ctx);

  [660, 880].forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type            = "sine";
      osc.frequency.value = freq;
      applyEnvelope(gn, ctx, {
        attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.25, peak: 0.4
      });
      osc.connect(gn);
      gn.connect(mg);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }, i * 80);
  });
}

/* --- GEÇERSİZ HAMLE: kısa, düşük "bzzzt" --- */
function sfx_invalid() {
  const ctx = getAudioCtx();
  const mg  = masterGain(ctx);

  const osc = ctx.createOscillator();
  const gn  = ctx.createGain();

  osc.type            = "sawtooth";
  osc.frequency.value = 120;

  applyEnvelope(gn, ctx, {
    attack: 0.005, decay: 0.07, sustain: 0.1, release: 0.1, peak: 0.3
  });

  osc.connect(gn);
  gn.connect(mg);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

/* --- KAZANMA: yükselen arpej --- */
function sfx_win() {
  const ctx   = getAudioCtx();
  const mg    = masterGain(ctx);
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type            = "sine";
      osc.frequency.value = freq;
      applyEnvelope(gn, ctx, {
        attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.35, peak: 0.5
      });
      osc.connect(gn);
      gn.connect(mg);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    }, i * 130);
  });
}

/* ---------- ANA OYNATICI ---------- */
function playSound(name) {
  if (!state.settings.sound) return;
  try {
    switch (name) {
      case "roll":    sfx_roll();    break;
      case "place":   sfx_place();   break;
      case "hit":     sfx_hit();     break;
      case "bearoff": sfx_bearoff(); break;
      case "invalid": sfx_invalid(); break;
      case "win":     sfx_win();     break;
    }
  } catch (e) {
    // Ses hatası oyunu durdurmasın
    console.warn("Ses efekti çalınamadı:", e);
  }
}

/* ---------- TOAST BİLDİRİMİ ----------
   (ses motorunun yanında buraya koymak mantıklı;
    toast genellikle sesle birlikte tetiklenir)     */
function toast(msg, type = "info", duration = 2800) {
  const area = dom.toastArea;
  if (!area) return;

  const el = document.createElement("div");
  el.className = "toast" + (type !== "info" ? ` toast-${type}` : "");
  el.textContent = msg;
  area.appendChild(el);

  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, duration);
}




