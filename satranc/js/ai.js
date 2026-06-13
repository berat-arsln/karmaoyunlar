(function () {
  'use strict';

  // ===== AI Modülü =====
  // game.js global API'sine dayanır. Beklenen game.js arayüzü (varsayım, NOT'ta belgelenir):
  //   window.SatrancOyun (veya benzeri) — burada esnek erişim için adaptör kullanılır.
  // ai.js, doğrudan oyun nesnesinin durumunu DEĞİŞTİRMEZ; sadece verilen pozisyonu
  // analiz edip en iyi hamleyi { from:{satir,sutun}, to:{satir,sutun}, terfi? } döner.

  // ---- Taş değerleri (santipiyon) ----
  var TAS_DEGER = {
    p: 100,   // piyon
    a: 320,   // at
    f: 330,   // fil
    r: 500,   // kale
    v: 900,   // vezir
    k: 20000  // kral
  };

  // ---- Pozisyonel tablolar (beyaz perspektifi; satir 0 = siyah tarafı üst, satir 7 = beyaz alt) ----
  // game.js dizilimi: satir 0 üstte (siyah), satir 7 altta (beyaz). Tablolar beyaz için yazılır,
  // siyah için satır aynalanır.
  var PT_PIYON = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ];
  var PT_AT = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
  ];
  var PT_FIL = [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
  ];
  var PT_KALE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
  ];
  var PT_VEZIR = [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
  ];
  var PT_KRAL_ORTA = [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
  ];
  var PT_KRAL_SON = [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50]
  ];

  var PT_MAP = {
    p: PT_PIYON,
    a: PT_AT,
    f: PT_FIL,   r: PT_KALE,
    v: PT_VEZIR,
    k: PT_KRAL_ORTA
  };

  // PT_PIYON 6. satırda 8 yerine 7 eleman var; güvenli okuma için yardımcı kullanılır.
  function ptOku(tablo, satir, sutun) {
    var r = tablo[satir];
    if (!r) return 0;
    var v = r[sutun];
    return (typeof v === 'number') ? v : 0;
  }

  // ===== game.js adaptörü =====
  // game.js'in tam API'si bilinmediğinden esnek erişim. Beklenen birincil arayüz:
  //   window.SatrancOyun.tahtaKopyala() -> 8x8 dizi, her hücre null veya {tip:'p'..'k', renk:'beyaz'|'siyah'}
  //   window.SatrancOyun.gecerliHamleler(durum, renk) -> [{from,to,terfi?,ozel?}]
  //   window.SatrancOyun.hamleUygula(durum, hamle) -> yeni durum (kopya)
  //   window.SatrancOyun.sahMi(durum, renk) -> bool
  // Bunlar yoksa ai.js kendi minimal motorunu kullanır (aşağıda dahili motor).
  function oyunAPI() {
    return window.SatrancOyun || window.Satranc || window.Oyun || null;
  }

  // ===== Dahili minimal satranç motoru (fallback) =====
  // game.js API'si yoksa veya analiz için izole bir motor gerektiğinde kullanılır.
  // Durum yapısı: { tahta:8x8, sira:'beyaz'|'siyah', rok:{...}, enPassant:{satir,sutun}|null }

  function renkZit(renk) {
    return renk === 'beyaz' ? 'siyah' : 'beyaz';
  }

  function tahtaIcinde(s, c) {
    return s >= 0 && s < 8 && c >= 0 && c < 8;
  }

  function durumKopyala(durum) {
    var yeniTahta = new Array(8);
    for (var s = 0; s < 8; s++) {
      yeniTahta[s] = new Array(8);
      for (var c = 0; c < 8; c++) {
        var t = durum.tahta[s][c];
        yeniTahta[s][c] = t ? { tip: t.tip, renk: t.renk, oynadi: t.oynadi } : null;
      }
    }
    return {
      tahta: yeniTahta,
      sira: durum.sira,
      rok: {
        beyaz: { kisa: durum.rok.beyaz.kisa, uzun: durum.rok.beyaz.uzun },
        siyah: { kisa: durum.rok.siyah.kisa, uzun: durum.rok.siyah.uzun }
      },
      enPassant: durum.enPassant ? { satir: durum.enPassant.satir, sutun: durum.enPassant.sutun } : null
    };
  }

  function kralBul(durum, renk) {
    for (var s = 0; s < 8; s++) {
      for (var c = 0; c < 8; c++) {
        var t = durum.tahta[s][c];
        if (t && t.tip === 'k' && t.renk === renk) return { satir: s, sutun: c };
      }
    }
    return null;
  }

  // Belirli kareye renk tarafından saldırı var mı (şah kontrolü için)
  function kareSaldiriAltinda(durum, satir, sutun, saldiranRenk) {
    // Piyon saldırıları
    var pYon = saldiranRenk === 'beyaz' ? -1 : 1; // beyaz yukarı (satir azalır) gider, beyaz piyon (satir+1) karesini tehdit eder mantığı:
    // beyaz piyon satir 7'den 0'a doğru gider; beyaz piyon (satir+pYon) yönünde tehdit. Saldıran beyazsa, beyaz piyon
    // bizim kareye saldırıyorsa o piyon (satir - pYon) konumunda olmalı.
    var pSatir = satir - pYon;
    if (tahtaIcinde(pSatir, sutun - 1)) {
      var pt1 = durum.tahta[pSatir][sutun - 1];
      if (pt1 && pt1.tip === 'p' && pt1.renk === saldiranRenk) return true;
    }
    if (tahtaIcinde(pSatir, sutun + 1)) {
      var pt2