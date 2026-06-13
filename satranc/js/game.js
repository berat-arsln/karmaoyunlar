(function () {
  'use strict';

  const RENK = { BEYAZ: 'b', SIYAH: 's' };

  function digerRenk(renk) {
    return renk === RENK.BEYAZ ? RENK.SIYAH : RENK.BEYAZ;
  }

  function tasOlustur(tip, renk) {
    return { tip: tip, renk: renk, hareketEtti: false };
  }

  function baslangicDizilimi() {
    const t = [];
    for (let r = 0; r < 8; r++) {
      t.push(new Array(8).fill(null));
    }
    const arka = ['r', 'a', 'f', 'v', 'k', 'f', 'a', 'r'];
    for (let s = 0; s < 8; s++) {
      t[0][s] = tasOlustur(arka[s], RENK.SIYAH);
      t[1][s] = tasOlustur('p', RENK.SIYAH);
      t[6][s] = tasOlustur('p', RENK.BEYAZ);
      t[7][s] = tasOlustur(arka[s], RENK.BEYAZ);
    }
    return t;
  }

  function tahtaKopyala(tahta) {
    const yeni = [];
    for (let r = 0; r < 8; r++) {
      const satir = new Array(8);
      for (let s = 0; s < 8; s++) {
        const tas = tahta[r][s];
        satir[s] = tas ? { tip: tas.tip, renk: tas.renk, hareketEtti: tas.hareketEtti } : null;
      }
      yeni.push(satir);
    }
    return yeni;
  }

  function ictedeMi(r, s) {
    return r >= 0 && r < 8 && s >= 0 && s < 8;
  }

  function kareKodu(r, s) {
    const harf = 'abcdefgh'[s];
    const sayi = 8 - r;
    return harf + sayi;
  }

  const TAS_TUR_AD = { k: 'Kral', v: 'Vezir', r: 'Kale', f: 'Fil', a: 'At', p: 'Piyon' };
  const TAS_SAN_HARF = { k: 'Ş', v: 'V', r: 'K', f: 'F', a: 'A', p: '' };

  function Oyun() {
    this.tahta = baslangicDizilimi();
    this.siradakiRenk = RENK.BEYAZ;
    this.enPassantHedef = null;
    this.gecmis = [];
    this.hamleSayaci = 0;
    this.yarimHamleSayaci = 0;
    this.durum = 'devam';
    this.sebep = null;
    this.pozisyonGecmisi = {};
    this._pozisyonKaydet();
  }

  Oyun.prototype.tasAl = function (r, s) {
    if (!ictedeMi(r, s)) return null;
    return this.tahta[r][s];
  };

  Oyun.prototype._kralBul = function (renk, tahta) {
    tahta = tahta || this.tahta;
    for (let r = 0; r < 8; r++) {
      for (let s = 0; s < 8; s++) {
        const tas = tahta[r][s];
        if (tas && tas.tip === 'k' && tas.renk === renk) {
          return { r: r, s: s };
        }
      }
    }
    return null;
  };

  Oyun.prototype.kareSaldiriAltindaMi = function (r, s, saldiranRenk, tahta) {
    tahta = tahta || this.tahta;

    const piyonYon = saldiranRenk === RENK.BEYAZ ? -1 : 1;
    for (const ds of [-1, 1]) {
      const pr = r - piyonYon;
      const ps = s + ds;
      if (ictedeMi(pr, ps)) {
        const tas = tahta[pr][ps];
        if (tas && tas.renk === saldiranRenk && tas.tip === 'p') return true;
      }
    }

    const atHamleleri = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, ds] of atHamleleri) {
      const nr = r + dr;
      const ns = s + ds;
      if (ictedeMi(nr, ns)) {
        const tas = tahta[nr][ns];
        if (tas && tas.renk === saldiranRenk && tas.tip === 'a') return true;
      }
    }

    const carpYonler = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, ds] of carpYonler) {
      let nr = r + dr;
      let ns = s + ds;
      while (ictedeMi(nr, ns)) {
        const tas = tahta[nr][ns];
        if (tas) {
          if (tas.renk === saldiranRenk && (tas.tip === 'r' || tas.tip === 'v')) return true;
          break;
        }
        nr += dr;
        ns += ds;
      }
    }

    const caprazYonler = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, ds] of caprazYonler) {
      let nr = r + dr;
      let ns = s + ds;
      while (ictedeMi(nr, ns)) {
        const tas = tahta[nr][ns];
        if (tas) {
          if (tas.renk === saldiranRenk && (tas.tip === 'f' || tas.tip === 'v')) return true;
          break;
        }
        nr += dr;
        ns += ds;
      }
    }

    const kralYonler = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1],
      [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    for (const [dr, ds] of kralYonler) {
      const nr = r + dr;
      const ns = s + ds;
      if (ictedeMi(nr, ns)) {
        const tas = tahta[nr][ns];
        if (tas && tas.renk === saldiranRenk && tas.tip === 'k') return true;
      }
    }

    return false;
  };

  Oyun.prototype.sahtaMi = function (renk, tahta) {
    tahta = tahta || this.tahta;
    const kral = this._kralBul(renk, tahta);
    if (!kral) return false;
    return this.kareSaldiriAltindaMi(kral.r, kral.s, digerRenk(renk), tahta);
  };

  Oyun.prototype._hamHamleler = function (r, s, tahta, enPassantHedef) {
    tahta = tahta || this.tahta;
    const tas = tahta[r][s];
    if (!tas) return [];
    const renk = tas.renk;
    const hamleler = [];

    function ekle(hr, hs, ozellik) {
      const ozel = ozellik || {};
      const hedef = tahta[hr][hs];
      hamleler.push({
        baslangic: { r: r, s:s },
        hedef: { r: hr, s: hs },
        tas: tas.tip,
        renk: renk,
        yenen: hedef ? hedef.tip : (ozel.enPassant ? 'p' : null),
        rok: ozel.rok || null,
        enPassant: ozel.enPassant || false,
        terfi: ozel.terfi || null,
        ikiKareli: ozel.ikiKareli || false
      });
    }

    if (tas.tip === 'p') {
      const yon = renk === RENK.BEYAZ ? -1 : 1;
      const baslangicSatir = renk === RENK.BEYAZ ? 6 : 1;
      const terfiSatir = renk === RENK.BEYAZ ? 0 : 7;

      const ir = r + yon;
      if (ictedeMi(ir, s) && !tahta[ir][s]) {
        if (ir === terfiSatir) {
          for (const tt of ['v', 'r', 'f', 'a']) ekle(ir, s, { terfi: tt });
        } else {
          ekle(ir, s);
        }
        if (r === baslangicSatir) {
          const ir2 = r + 2 * yon;
          if (ictedeMi(ir2, s) && !tahta[ir2][s]) {
            ekle(ir2, s, { ikiKareli: true });
          }
        }
      }

      for (const ds of [-1, 1]) {
        const cr = r + yon;
        const cs = s + ds;
        if (!ictedeMi(cr, cs)) continue;
        const hedef = tahta[cr][cs];
        if (hedef && hedef.renk !== renk) {
          if (cr === terfiSatir) {
            for (const tt of ['v', 'r', 'f', 'a']) ekle(cr, cs, { terfi: tt });
          } else {
            ekle(cr, cs);
          }
        } else if (!hedef && enPassantHedef && enPassantHedef.r === cr && enPassantHedef.s === cs) {
          ekle(cr, cs, { enPassant: true });
        }
      }
    } else if (tas.tip === 'a') {
      const atHamleleri = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, ds] of atHamleleri) {
        const nr = r + dr;
        const ns = s + ds;
        if (!ictedeMi(nr, ns)) continue;
        const hedef = tahta[nr][ns];
        if (!hedef || hedef.renk !== renk) ekle(nr, ns);
      }
    } else if (tas.tip === 'k') {
      const kralYonler = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1]
      ];
      for (const [dr, ds] of kralYonler) {
        const nr = r + dr;
        const ns = s + ds;
        if (!ictedeMi(nr, ns)) continue;
        const hedef = tahta[nr][ns];
        if (!hedef || hedef.renk !== renk) ekle(nr, ns);
      }

      if (!tas.hareketEtti && !this.kareSaldiriAltindaMi(r, s, digerRenk(renk), tahta)) {
        const kisaKale = tahta[r][7];
        if (kisaKale && kisaKale.tip === 'r' && kisaKale.renk === renk && !kisaKale.hareketEtti) {
          if (!tahta[r][5] && !tahta[r][6] &&
              !this.kareSaldiriAltindaMi(r, 5, digerRenk(renk), tahta) &&
              !this.kareSaldiriAltindaMi(r, 6, digerRenk(renk), tahta)) {
            ekle(r, 6, { rok: 'kisa' });
          }
        }
        const uzunKale = tahta[r][0];
        if (uzunKale && uzunKale.tip === 'r' && uzunKale.renk === renk && !uzunKale.hareketEtti) {
          if (!tahta[r][1] && !tahta[r][2] && !tahta[r][3] &&
              !this.kareSaldiriAltindaMi(r, 3, digerRenk(renk), tahta) &&
              !this.kareSaldiriAltindaMi(r, 2, digerRenk(renk), tahta)) {
            ekle(r, 2, { rok: 'uzun' });
          }
        }
      }
    } else {
      let yonler;
      if (tas.tip === 'r') yonler = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      else if (tas.tip === 'f') yonler = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      else yonler = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, ds] of yonler) {
        let nr = r + dr;
        let ns = s + ds;
        while (ictedeMi(nr, ns)) {
          const hedef = tahta[nr][ns];
          if (!hedef) {
            ekle(nr, ns);
          } else {
            if (hedef.renk !== renk) ekle(nr, ns);
            break;
          }
          nr += dr;
          ns += ds;
        }
      }
    }

    return hamleler;
  };

  Oyun.prototype._hamleyiUygulaTahtada = function (tahta, hamle) {
    const b = hamle.baslangic;
    const h = hamle.hedef;
    const tas = tahta[b.r][b.s];
    tahta[h.r][h.s] = tas;
    tahta[b.r][b.s] = null;
    if (tas) tas.hareketEtti = true;

    if (hamle.enPassant) {
      const yon = hamle.renk === RENK.BEYAZ ? -1 : 1;
      tahta[h.r - yon][h.s] = null;
    }

    if (hamle.rok === 'kisa') {
      const kale = tahta[h.r][7];
      tahta[h.r][5] = kale;
      tahta[h.r][7] = null;
      if (kale) kale.hareketEtti = true;
    } else if (hamle.rok === 'uzun') {
      const kale = tahta[h.r][0];
      tahta[h.r][3] = kale;
      tahta[h.r][0] = null;
      if (kale) kale.hareketEtti = true;
    }

    if (hamle.terfi) {
      tahta[h.r][h.s] = { tip: hamle.terfi, renk: hamle.renk, hareketEtti: true };
    }
  };

  Oyun.prototype.gecerliHamleler = function (r, s) {
    const tas = this.tasAl(r, s);
    if (!tas || tas.renk !== this.siradakiRenk) return [];
    return this._yasalHamleler(r, s, this.tahta, this.enPassantHedef);
  };

  Oyun.prototype._yasalHamleler = function (r, s, tahta, enPassantHedef) {
    tahta = tahta || this.tahta;
    const tas = tahta[r][s];
    if (!tas) return [];
    const renk = tas.renk;
    const ham = this._hamHamleler(r, s, tahta, enPassantHedef);
    const yasal = [];
    for (const hamle of ham) {
      const kopya = tahtaKopyala(tahta);
      this._hamleyiUygulaTahtada(kopya, hamle);
      if (!this.sahtaMi(renk, kopya)) {
        yasal.push(hamle);
      }
    }
    return yasal;
  };

  Oyun.prototype.tumYasalHamleler = function (renk, tahta, enPassantHedef) {
    tahta = tahta || this.tahta;
    if (enPassantHedef === undefined) enPassantHedef = this.enPassantHedef;
    const sonuc = [];
    for (let r = 0; r < 8; r++) {
      for (let s = 0; s < 8; s++) {
        const tas = tahta[r][s];
        if (tas && tas.renk === renk) {
          const hamleler = this._yasalHamleler(r, s, tahta, enPassantHedef);
          for (const h of hamleler) sonuc.push(h);
        }
      }
    }
    return sonuc;
  };

  Oyun.prototype.hamleBul = function (br, bs, hr, hs, terfi) {
    const hamleler = this.gecerliHamleler(br, bs);
    for (const h of hamleler) {
      if (h.hedef.r === hr && h.hedef.s === hs) {
        if (h.terfi) {
          if (terfi && h.terfi === terfi) return h;
        } else {
          return h;
        }
      }
    }
    if (terfi) {
      for (const h of hamleler) {
        if (h.hedef.r === hr && h.hedef.s === hs && h.terfi === terfi) return h;
      }
    }
    return null;
  };

  Oyun.prototype._sanUret = function (hamle, tahta, enPassantHedef) {
    if (hamle.rok === 'kisa') return 'O-O';
    if (hamle.rok === 'uzun') return 'O-O-O';

    const tip = hamle.tas;
    let san = '';
    const hedefKare = kareKodu(hamle.hedef.r, hamle.hedef.s);

    if (tip === 'p') {
      if (hamle.yenen) {
        san += 'abcdefgh'[hamle.baslangic.s] + 'x';
      }
      san += hedefKare;
      if (hamle.terfi) san += '=' + TAS_SAN_HARF[hamle.terfi];
    } else {
      san += TAS_SAN_HARF[tip];

      const benzerler = [];
      for (let r = 0; r < 8; r++) {
        for (let s = 0; s < 8; s++) {
          if (r === hamle.baslangic.r && s === hamle.baslangic.s) continue;
          const t = tahta[r][s];
          if (t && t.tip === tip && t.renk === hamle.renk) {
            const hh = this._yasalHamleler(r, s, tahta, enPassantHedef);
            for (const x of hh) {
              if (x.hedef.r === hamle.hedef.r && x.hedef.s === hamle.hedef.s) {
                benzerler.push({ r: r, s: s });
              }
            }
          }
        }
      }

      if (benzerler.length > 0) {
        const ayniSutun = benzerler.some(b => b.s === hamle.baslangic.s);
        const ayniSatir = benzerler.some(b => b.r === hamle.baslangic.r);
        if (!ayniSutun) {
          san += 'abcdefgh'[hamle.baslangic.s];
        } else if (!ayniSatir) {
          san += (8 - hamle.baslangic.r);
        } else {
          san += 'abcdefgh'[hamle.baslangic.s] + (8 - hamle.baslangic.r);
        }
      }

      if (hamle.yenen) san += 'x';
      san += hedefKare;
    }

    return san;
  };

  Oyun.prototype.hamleYap = function (hamle) {
    if (!hamle) return null;
    if (this.durum !== 'devam') return null;

    const oncekiTahta = tahtaKopyala(this.tahta);