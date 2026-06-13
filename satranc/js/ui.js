(function () {
  'use strict';

  const Oyun = window.SatrancOyun;
  const AI = window.SatrancAI;

  const TAS_SVG = {};

  function svgIcerik(tip) {
    const yollar = {
      p: '<g><path d="M22.5,9c-2.21,0-4,1.79-4,4 0,0.89 0.29,1.71 0.78,2.38C17.33,16.5 16,18.59 16,21c0,2.03 0.94,3.84 2.41,5.03C15.41,27.09 11,31.58 11,39.5H34c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62C26.21,14.71 26.5,13.89 26.5,13c0-2.21-1.79-4-4-4z" stroke-width="1.5" stroke-linecap="round"/></g>',
      r: '<g stroke-width="1.5" stroke-linejoin="round"><path d="M9,39h27v-3H9v3zM12,36v-4h21v4H12zM11,14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34,14l-3,3H14l-3-3"/><path d="M31,17v12.5H14V17"/><path d="M31,29.5l1.5,2.5h-20l1.5-2.5"/><path d="M11,14h23" fill="none"/></g>',
      f: '<g stroke-width="1.5" stroke-linecap="round"><g stroke-linejoin="round"><path d="M9,36c3.39-0.97 10.11,0.43 13.5-2 3.39,2.43 10.11,1.03 13.5,2 0,0 1.65,0.54 3,2-0.68,0.97-1.65,0.99-3,0.5-3.39-0.97-10.11,0.46-13.5-1-3.39,1.46-10.11,0.03-13.5,1-1.354,0.49-2.323,0.47-3-0.5 1.354-1.94 3-2 3-2z"/><path d="M15,32c2.5,2.5 12.5,2.5 15,0 0.5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11,4-10.5,14-5,15.5 0,0-2.5,1.5-2.5,4 0,0-0.5,0.5 0,2z"/><path d="M25,8a2.5,2.5 0 1,1-5,0 2.5,2.5 0 1,1 5,0z"/></g><path d="M17.5,26h10M15,30h15M22.5,15.5v5M20,18h5" fill="none" stroke-linejoin="miter"/></g>',
      a: '<g stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22,10c10.5,1 16.5,8 16,29H15c0-9 10-6.5 8-21"/><path d="M24,18c0.38,2.91-5.55,7.37-8,9-3,2-2.82,4.34-5,4-1.042-0.94 1.41-3.04 0-3-1,0 0.19,1.23-1,2-1,0-4.003,1-4-4 0-2 6-12 6-12 0,0 1.89-1.9 2-3.5-0.73-0.994-0.5-2-0.5-3 1-1 3,2.5 3,2.5h2c0,0 0.78-1.992 2.5-3 1,0 1,3 1,3"/><path d="M9.5,25.5a0.5,0.5 0 1,1-1,0 0.5,0.5 0 1,1 1,0z" fill="#000" stroke="#000"/><path d="M14.933,15.75a0.5,1.5 30 1,1-0.866-0.5 0.5,1.5 30 1,1 0.866,0.5z" fill="#000" stroke="#000"/></g>',
      v: '<g stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9,26c8.5-1.5 21-1.5 27,0l2-12-7,11V11l-5.5,13.5-3-15-3,15-5.5-14V25L7,14l2,12z"/><path d="M9,26c0,2 1.5,2 2.5,4 1,1.5 1,1 0.5,3.5-1.5,1-1,2.5-1,2.5-1.5,1.5 0,2.5 0,2.5 6.5,1 16.5,1 23,0 0,0 1.5-1 0-2.5 0,0 0.5-1.5-1-2.5-0.5-2.5-0.5-2 0.5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27,0z"/><path d="M11.5,30c3.5-1 18.5-1 22,0M12,33.5c6-1 15-1 21,0" fill="none"/><circle cx="6" cy="12" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="31" cy="9" r="2"/><circle cx="39" cy="12" r="2"/></g>',
      k: '<g stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5,11.63V6M20,8h5" fill="none"/><path d="M22.5,25c0,0 4.5-7.5 3-10.5 0,0-1-2.5-3-2.5s-3,2.5-3,2.5c-1.5,3 3,10.5 3,10.5"/><path d="M11.5,37c5.5,3.5 15.5,3.5 21,0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16,4V27v-3.5c-2.5-7.5-12-10.5-16-4-3,6 6,10.5 6,10.5V37z"/><path d="M11.5,30c5.5-3 15.5-3 21,0M11.5,33.5c5.5-3 15.5-3 21,0M11.5,37c5.5-3 15.5-3 21,0" fill="none"/></g>'
    };
    return yollar[tip] || '';
  }

  function tasSvg(tip, renk) {
    const anahtar = renk + tip;
    if (TAS_SVG[anahtar]) return TAS_SVG[anahtar];
    const fill = renk === 'b' ? '#FFFFFF' : '#333333';
    const stroke = '#000000';
    const svg = '<svg viewBox="0 0 45 45" fill="' + fill + '" stroke="' + stroke + '" xmlns="http://www.w3.org/2000/svg">' + svgIcerik(tip) + '</svg>';
    TAS_SVG[anahtar] = svg;
    return svg;
  }

  let durum = {
    mod: 'ikiKisi',
    zorluk: 'orta',
    tasRengi: 'beyaz',
    sureDk: 'suresiz',
    ekSureSn: '0',
    oyuncuRengi: 'b',
    aiRengi: 's',
    tersCevrik: false,
    sesAcik: true,
    tema: 'koyu',
    oyunBitti: false,
    sureRakip: 0,
    sureOyuncu: 0,
    ekSure: 0,
    sayacAktif: false,
    sonZaman: 0,
    raf: null,
    seciliKare: null,
    gecerliHamleler: [],
    aiDusunuyor: false,
    terfiBekleyen: null
  };

  let sesContext = null;

  function el(id) { return document.getElementById(id); }
  function elall(sec) { return Array.prototype.slice.call(document.querySelectorAll(sec)); }

  function sesBaslat() {
    if (sesContext) return;
    try {
      sesContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      sesContext = null;
    }
  }

  function sesCal(tip) {
    if (!durum.sesAcik || !sesContext) return;
    const ctx = sesContext;
    if (ctx.state === 'suspended') ctx.resume();
    const simdi = ctx.currentTime;

    function ton(frek, baslangic, sure, hacim, dalga) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = dalga || 'sine';
      osc.frequency.setValueAtTime(frek, simdi + baslangic);
      gain.gain.setValueAtTime(0, simdi + baslangic);
      gain.gain.linearRampToValueAtTime(hacim, simdi + baslangic + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, simdi + baslangic + sure);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(simdi + baslangic);
      osc.stop(simdi + baslangic + sure + 0.02);
    }

    switch (tip) {
      case 'hareket':
        ton(320, 0, 0.08, 0.18, 'triangle');
        break;
      case 'yeme':
        ton(180, 0, 0.12, 0.28, 'square');
        ton(90, 0.01, 0.14, 0.2, 'triangle');
        break;
      case 'sah':
        ton(660, 0, 0.12, 0.22, 'sawtooth');
        ton(880, 0.1, 0.14, 0.2, 'sawtooth');
        break;
      case 'bitis':
        ton(523, 0, 0.18, 0.22, 'sine');
        ton(659, 0.14, 0.18, 0.22, 'sine');
        ton(784, 0.28, 0.3, 0.24, 'sine');
        break;
      case 'tiktak':
        ton(1000, 0, 0.04, 0.15, 'square');
        break;
    }
  }

  function ayarOku() {
    let kayit = null;
    try {
      if (window.KarmaOyunlar && typeof window.KarmaOyunlar.getAyar === 'function') {
        const t = window.KarmaOyunlar.getAyar('tema');
        if (t) durum.tema = t;
      }
      const ham = localStorage.getItem('karmaOyunlarAyarlar');
      if (ham) kayit = JSON.parse(ham);
    } catch (e) {
      kayit = null;
    }
    if (kayit) {
      if (kayit.tema) durum.tema = kayit.tema;
      if (typeof kayit.satrancSes === 'boolean') durum.sesAcik = kayit.satrancSes;
    }
  }

  function ayarYaz() {
    try {
      let kayit = {};
      const ham = localStorage.getItem('karmaOyunlarAyarlar');
      if (ham) kayit = JSON.parse(ham) || {};
      kayit.tema = durum.tema;
      kayit.satrancSes = durum.sesAcik;
      localStorage.setItem('karmaOyunlarAyarlar', JSON.stringify(kayit));
    } catch (e) {}
  }

  function temaUygula() {
    document.documentElement.setAttribute('data-tema', durum.tema === 'açık' || durum.tema === 'acik' ? 'açık' : 'koyu');
  }

  function toggleGuncelle(btn, aktif) {
    if (aktif) {
      btn.classList.add('aktif');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('aktif');
      btn.setAttribute('aria-checked', 'false');
    }
  }

  function temaToggleGuncelle() {
    const btn = el('temaToggle');
    if (!btn) return;
    toggleGuncelle(btn, durum.tema === 'açık' || durum.tema === 'acik');
  }

  function sesToggleGuncelle() {
    const btn = el('sesToggle');
    if (!btn) return;
    toggleGuncelle(btn, durum.sesAcik);
  }

  // ---- Ekran geçişi ----
  function ekranGoster(ekranId) {
    elall('.ekran').forEach(function (e) { e.classList.remove('aktif'); });
    const hedef = el(ekranId);
    if (hedef) hedef.classList.add('aktif');
  }

  // ---- Seçim grupları ----
  function secimKur() {
    elall('.secimGrup').forEach(function (grup) {
      grup.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.secimBtn');
        if (!btn || !grup.contains(btn)) return;
        grup.querySelectorAll('.secimBtn').forEach(function (b) { b.classList.remove('aktif'); });
        btn.classList.add('aktif');
        secimDegerleriOku();
        bilgisayarAyarGorunurluk();
      });
    });
  }

  function grupDeger(grupId) {
    const grup = el(grupId);
    if (!grup) return null;
    const aktif = grup.querySelector('.secimBtn.aktif');
    return aktif ? aktif.getAttribute('data-deger') : null;
  }

  function secimDegerleriOku() {
    const mod = grupDeger('modSecim');
    if (mod) durum.mod = mod;
    const zor = grupDeger('zorlukSecim');
    if (zor) durum.zorluk = zor;
    const renk = grupDeger('tasRengiSecim');
    if (renk) durum.tasRengi = renk;
    const sure = grupDeger('sureSecim');
    if (sure) durum.sureDk = sure;
    const ek = grupDeger('ekSureSecim');
    if (ek) durum.ekSureSn = ek;
  }

  function bilgisayarAyarGorunurluk() {
    const goster = durum.mod === 'bilgisayar';
    elall('.bilgisayarAyar').forEach(function (g) {
      if (goster) g.classList.remove('gizli');
      else g.classList.add('gizli');
    });
  }

  // ---- Oyun başlatma ----
  function oyunuBaslat() {
    secimDegerleriOku();
    sesBaslat();

    if (durum.mod === 'bilgisayar') {
      durum.oyuncuRengi = durum.tasRengi === 'siyah' ? 's' : 'b';
      durum.aiRengi = durum.oyuncuRengi === 'b' ? 's' : 'b';
      durum.tersCevrik = durum.oyuncuRengi === 's';
    } else {
      durum.oyuncuRengi = 'b';
      durum.aiRengi = null;
      durum.tersCevrik = false;
    }

    durum.oyunBitti = false;
    durum.seciliKare = null;
    durum.gecerliHamleler = [];
    durum.aiDusunuyor = false;
    durum.terfiBekleyen = null;

    // Süre kurulumu
    if (durum.sureDk === 'suresiz') {
      durum.sureRakip = -1;
      durum.sureOyuncu = -1;
    } else {
      const sn = parseInt(durum.sureDk, 10) * 60;
      durum.sureRakip = sn;
      durum.sureOyuncu = sn;
    }
    durum.ekSure = parseInt(durum.ekSureSn, 10) || 0;
    durum.sayacAktif = false;
    durum.sonZaman = 0;

    Oyun.yeniOyun();

    ekranGoster('oyunEkrani');
    tahtaKur();
    aiTarafBarGuncelle();
    tahtaCizle();
    sureEtiketleriKur();
    sureGuncelleGorsel();
    durumMesajGuncelle();
    hamleListesiTemizle();
    sayaclariBaslatGerekirse();
    aiSiraKontrol();
  }

  // ---- Tahta kurulumu ----
  function tahtaKur() {
    const tahta = el('tahta');
    if (!tahta) return;
    tahta.innerHTML = '';
    if (durum.tersCevrik) tahta.classList.add('tersCevrik');
    else tahta.classList.remove('tersCevrik');

    for (let satir = 0; satir < 8; satir++) {
      for (let sutun = 0; sutun < 8; sutun++) {
        const kare = document.createElement('div');
        kare.className = 'kare ' + (((satir + sutun) % 2 === 0) ? 'acikKare' : 'koyuKare');
        kare.setAttribute('data-satir', satir);
        kare.setAttribute('data-sutun', sutun);

        if (sutun === 0) {
          const ks = document.createElement('span');
          ks.className = 'koordSatir';
          ks.textContent = String(8 - satir);
          kare.appendChild(ks);
        }
        if (satir === 7) {
          const kc = document.createElement('span');
          kc.className = 'koordSutun';
          kc.textContent = String.fromCharCode(97 + sutun);
          kare.appendChild(kc);
        }
        tahta.appendChild(kare);
      }
    }
  }

  function kareEl(satir, sutun) {
    const tahta = el('tahta');
    if (!tahta) return null;
    return tahta.querySelector('.kare[data-satir="' + satir + '"][data-sutun="' + sutun + '"]');
  }

  function tasYerlestir(kare, tip, renk, animasyon) {
    const eski = kare.querySelector('svg');
    if (eski) eski.remove();
    kare.classList.add('tasli');
    const sar = document.createElement('div');
    sar.innerHTML = tasSvg(tip, renk);
    const svg = sar.firstChild;
    if (animasyon) {
      svg.classList.add('tasGiris');
      setTimeout(function () { svg.classList.remove('tasGiris'); }, 220);
    }
    kare.appendChild(svg);
  }

  function kareTemizleTas(kare) {
    const eski = kare.querySelector('svg');
    if (eski) eski.remove();
    kare.classList.remove('tasli');
  }

  // ---- Tahta çizimi ----
  function tahtaCizle() {
    const tahtaVerisi = Oyun.tahtaGetir();
    for (let satir = 0; satir < 8; satir++) {
      for (let sutun = 0; sutun < 8; sutun++) {
        const kare = kareEl(satir, sutun);
        if (!kare) continue;
        const tas = tahtaVerisi[satir][sutun];
        const mevcut = kare.querySelector('svg');
        if (tas) {
          tasYerlestir(kare, tas.tip, tas.renk, false);
        } else if (mevcut) {
          kareTemizleTas(kare);
        }
      }
    }
  }

  // ---- Vurgu yönetimi ----
  function vurgulariTemizle(secimDe) {
    elall('#tahta .kare').forEach(function (k) {
      if (secimDe) {
        k.classList.remove('secili', 'gecerliHamle', 'gecerliYeme');
      }
    });
  }

  function sonHamleVurgula() {
    elall('#tahta .kare.sonHamle').forEach(function (k) { k.classList.remove('sonHamle'); });
    const son = Oyun.sonHamleGetir();
    if (!son) return;
    const k1 = kareEl(son.kaynakSatir, son.kaynakSutun);
    const k2 = kareEl(son.hedefSatir, son.hedefSutun);
    if (k1) k1.classList.add('sonHamle');
    if (k2) k2.classList.add('sonHamle');
  }

  function sahVurgula() {
    elall('#tahta .