// tavla/js/game.js
// Tavla oyununun temel mantığını içerir: tahta durumu, zar, hamleler ve kurallar.
// Yapay zeka ai.js'te, arayüz güncellemeleri ui.js'te yer alır.

(function (global) {
  "use strict";

  // Oyuncu sabitleri
  const OYUNCU = {
    BEYAZ: "beyaz",
    SIYAH: "siyah"
  };

  // Tahtada 24 nokta (point) bulunur. Ek olarak bar ve toplanan pullar tutulur.
  // Her nokta { oyuncu: null | "beyaz" | "siyah", adet: 0 } şeklinde tutulur.

  class TavlaOyunu {
    constructor() {
      this.tahta = [];          // 24 noktalık dizi
      this.bar = {};            // çubuğa kırılan pullar
      this.toplanan = {};       // dışarı toplanan pullar
      this.siraOyuncu = null;   // hamle sırası kimde
      this.zarlar = [];         // atılan zar değerleri
      this.kalanHamleler = [];  // kullanılabilir hamle değerleri
      this.oyunBitti = false;
      this.kazanan = null;
      this.sifirla();
    }

    // Tahtayı standart başlangıç dizilimine kurar.
    sifirla() {
      this.tahta = new Array(24).fill(null).map(() => ({ oyuncu: null, adet: 0 }));
      this.bar = { [OYUNCU.BEYAZ]: 0, [OYUNCU.SIYAH]: 0 };
      this.toplanan = { [OYUNCU.BEYAZ]: 0, [OYUNCU.SIYAH]: 0 };
      this.siraOyuncu = OYUNCU.BEYAZ;
      this.zarlar = [];
      this.kalanHamleler = [];
      this.oyunBitti = false;
      this.kazanan = null;

      // Standart tavla başlangıç dizilimi.
      // Beyaz noktalar büyükten küçüğe (23 -> 0), siyah küçükten büyüğe ilerler.
      this._pulYerlestir(23, OYUNCU.BEYAZ, 2);
      this._pulYerlestir(12, OYUNCU.BEYAZ, 5);
      this._pulYerlestir(7, OYUNCU.BEYAZ, 3);
      this._pulYerlestir(5, OYUNCU.BEYAZ, 5);

      this._pulYerlestir(0, OYUNCU.SIYAH, 2);
      this._pulYerlestir(11, OYUNCU.SIYAH, 5);
      this._pulYerlestir(16, OYUNCU.SIYAH, 3);
      this._pulYerlestir(18, OYUNCU.SIYAH, 5);
    }

    _pulYerlestir(nokta, oyuncu, adet) {
      this.tahta[nokta] = { oyuncu: oyuncu, adet: adet };
    }

    // Belirtilen oyuncunun rakibini döndürür.
    rakip(oyuncu) {
      return oyuncu === OYUNCU.BEYAZ ? OYUNCU.SIYAH : OYUNCU.BEYAZ;
    }

    // Oyuncunun ilerleme yönü. Beyaz indeksleri azaltır, siyah artırır.
    _yon(oyuncu) {
      return oyuncu === OYUNCU.BEYAZ ? -1 : 1;
    }

    // Oyuncunun ev (toplama) bölgesi noktalarını döndürür.
    _evNoktalari(oyuncu) {
      // Beyaz ev: 0-5, Siyah ev: 18-23
      return oyuncu === OYUNCU.BEYAZ ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];
    }

    // Bir oyuncunun pulunun "dışarı çıkış" hedef noktası (sanal indeks).
    // Beyaz için -1, Siyah için 24 dışarıdır.
    _disariNoktasi(oyuncu) {
      return oyuncu === OYUNCU.BEYAZ ? -1 : 24;
    }

    // İki zar atar ve kullanılabilir hamleleri hazırlar.
    zarAt(zar1, zar2) {
      // Test/AI amacıyla dışarıdan zar verilebilir, verilmezse rastgele atılır.
      const a = (typeof zar1 === "number") ? zar1 : this._zarUret();
      const b = (typeof zar2 === "number") ? zar2 : this._zarUret();
      this.zarlar = [a, b];

      if (a === b) {
        // Çift atışta dört hamle hakkı doğar.
        this.kalanHamleler = [a, a, a, a];
      } else {
        this.kalanHamleler = [a, b];
      }
      return this.zarlar.slice();
    }

    _zarUret() {
      return Math.floor(Math.random() * 6) + 1;
    }

    // Çubukta (bar) bekleyen pul olup olmadığını döndürür.
    barVarMi(oyuncu) {
      return this.bar[oyuncu] > 0;
    }

    // Bir kaynaktan belirli zar değeriyle hedef indeks hesaplar.
    // Çubuk girişi için kaynak "bar" özel değeridir.
    _hedefIndeks(oyuncu, kaynak, zar) {
      if (kaynak === "bar") {
        // Çubuktan giriş: beyaz 24-zar, siyah zar-1 noktasına girer.
        return oyuncu === OYUNCU.BEYAZ ? 24 - zar : zar - 1;
      }
      return kaynak + this._yon(oyuncu) * zar;
    }

    // Tüm pullar evde mi (toplamaya hazır mı) kontrolü.
    tumPullarEvde(oyuncu) {
      if (this.bar[oyuncu] > 0) return false;
      const ev = this._evNoktalari(oyuncu);
      for (let i = 0; i < 24; i++) {
        const n = this.tahta[i];
        if (n.oyuncu === oyuncu && n.adet > 0 && !ev.includes(i)) {
          return false;
        }
      }
      return true;
    }

    // Bir noktanın oyuncu için açık (oynanabilir) olup olmadığını kontrol eder.
    // Rakibin 2+ pulu varsa kapalıdır; 1 pulu varsa kırılabilir (açık sayılır).
    _noktaAcikMi(oyuncu, indeks) {
      if (indeks < 0 || indeks > 23) return false;
      const n = this.tahta[indeks];
      if (n.oyuncu === null || n.oyuncu === oyuncu) return true;
      return n.adet <= 1;
    }

    // Belirli bir zar değeriyle verilen kaynaktan hamle geçerli mi?
    hamleGecerliMi(oyuncu, kaynak, zar) {
      if (this.oyunBitti) return false;
      if (!this.kalanHamleler.includes(zar)) return false;

      // Çubukta pul varsa önce onu sokmak zorunludur.
      if (this.barVarMi(oyuncu) && kaynak !== "bar") return false;

      if (kaynak === "bar") {
        if (this.bar[oyuncu] <= 0) return false;
        const hedef = this._hedefIndeks(oyuncu, "bar", zar);
        return this._noktaAcikMi(oyuncu, hedef);
      }

      // Kaynak geçerli bir nokta ve oyuncunun pulu olmalı.
      if (kaynak < 0 || kaynak > 23) return false;
      const knokta = this.tahta[kaynak];
      if (knokta.oyuncu !== oyuncu || knokta.adet <= 0) return false;

      const hedef = this._hedefIndeks(oyuncu, kaynak, zar);

      // Hedef tahta içindeyse normal hamle kontrolü.
      if (hedef >= 0 && hedef <= 23) {
        return this._noktaAcikMi(oyuncu, hedef);
      }

      // Hedef tahta dışındaysa toplama (bear off) söz konusudur.
      return this._toplamaGecerliMi(oyuncu, kaynak, zar);
    }

    // Toplama (bear off) kuralları.
    _toplamaGecerliMi(oyuncu, kaynak, zar) {
      if (!this.tumPullarEvde(oyuncu)) return false;

      const disari = this._disariNoktasi(oyuncu);
      const hedef = this._hedefIndeks(oyuncu, kaynak, zar);

      if (oyuncu === OYUNCU.BEYAZ) {
        // Beyaz için tam çıkış: kaynak == zar - 1.
        if (hedef === disari) return true;
        // Zar fazlaysa: daha geride pul kalmamışsa en uzaktaki pul çıkabilir.
        if (hedef < disari) {
          return this._gerideDahaUzakYok(oyuncu, kaynak);
        }
        return false;
      } else {
        if (hedef === disari) return true;
        if (hedef > disari) {
          return this._gerideDahaUzakYok(oyuncu, kaynak);
        }
        return false;
      }
    }

    // Kaynaktan daha uzakta (çıkışa daha uzak) oyuncunun pulu var mı?
    _gerideDahaUzakYok(oyuncu, kaynak) {
      if (oyuncu === OYUNCU.BEYAZ) {
        // Beyaz çıkış 0 tarafına; daha uzak = daha büyük indeks (6'ya kadar ev içinde).
        for (let i = kaynak + 1; i <= 5; i++) {
          if (this.tahta[i].oyuncu === oyuncu && this.tahta[i].adet > 0) {
            return false;
          }
        }
        return true;
      } else {
        // Siyah çıkış 23 tarafına; daha uzak = daha küçük indeks (18'e kadar).
        for (let i = kaynak - 1; i >= 18; i--) {
          if (this.tahta[i].oyuncu === oyuncu && this.tahta[i].adet > 0) {
            return false;
          }
        }
        return true;
      }
    }

    // Mevcut zar değerleriyle oyuncunun yapabileceği tüm hamleleri listeler.
    // Dönüş: [{ kaynak, zar, hedef, tip }]
    gecerliHamleler(oyuncu) {
      const hamleler = [];
      const zarSeti = Array.from(new Set(this.kalanHamleler));

      for (const zar of zarSeti) {
        if (this.barVarMi(oyuncu)) {
          // Sadece çubuktan giriş hamleleri değerlendirilir.
          if (this.hamleGecerliMi(oyuncu, "bar", zar)) {
            hamleler.push({
              kaynak: "bar",
              zar: zar,
              hedef: this._hedefIndeks(oyuncu, "bar", zar),
              tip: "giris"
            });
          }
          continue;
        }

        for (let i = 0; i < 24; i++) {
          const n = this.tahta[i];
          if (n.oyuncu !== oyuncu || n.adet <= 0) continue;
          if (this.hamleGecerliMi(oyuncu, i, zar)) {
            const hedef = this._hedefIndeks(oyuncu, i, zar);
            const tip = (hedef < 0 || hedef > 23) ? "toplama" : "normal";
            hamleler.push({ kaynak: i, zar: zar, hedef: hedef, tip: tip });
          }
        }
      }
      return hamleler;
    }

    // Oyuncunun oynayabileceği hiç hamle var mı?
    hamleVarMi(oyuncu) {
      return this.gecerliHamleler(oyuncu).length > 0;
    }

    // Bir hamleyi uygular. Başarılıysa hamle detayını, değilse null döndürür.
    // Dönüş: { kaynak, zar, hedef, tip, kirilan }
    hamleYap(kaynak, zar) {
      const oyuncu = this.siraOyuncu;
      if (!this.hamleGecerliMi(oyuncu, kaynak, zar)) {
        return null;
      }

      const hedef = this._hedefIndeks(oyuncu, kaynak, zar);
      let kirilan = false;
      let tip = "normal";

      // Kaynaktan pulu çıkar.
      if (kaynak === "bar") {
        this.bar[oyuncu]--;
        tip = "giris";
      } else {
        this.tahta[kaynak].adet--;
        if (this.tahta[kaynak].adet === 0) {
          this.tahta[kaynak].oyuncu = null;
        }
      }

      if (hedef >= 0 && hedef <= 23) {
        const hnokta = this.tahta[hedef];
        // Rakibin tek pulu varsa kır ve çubuğa gönder.
        if (hnokta.oyuncu === this.rakip(oyuncu) && hnokta.adet === 1) {
          this.bar[this.rakip(oyuncu)]++;
          hnokta.oyuncu = oyuncu;
          hnokta.adet = 1;
          kirilan = true;
        } else {
          hnokta.oyuncu = oyuncu;
          hnokta.adet++;
        }
      } else {
        // Toplama hamlesi.
        this.toplanan[oyuncu]++;
        tip = "toplama";
      }

      // Kullanılan zarı listeden düş.
      const idx = this.kalanHamleler.indexOf(zar);
      if (idx !== -1) {
        this.kalanHamleler.splice(idx, 1);
      }

      // Kazanma kontrolü.
      if (this.toplanan[oyuncu] >= 15) {
        this.oyunBitti = true;
        this.kazanan = oyuncu;
      }

      return { kaynak, zar, hedef, tip, kirilan };
    }

    // Sıradaki oyuncuya geçer ve zar/hamle durumunu temizler.
    siraVer() {
      if (this.oyunBitti) return;
      this.siraOyuncu = this.rakip(this.siraOyuncu);
      this.zarlar = [];
      this.kalanHamleler = [];
    }

    // El bitti mi? (kullanılabilir hamle kalmadı veya zarlar tükendi)
    elBittiMi() {
      if (this.kalanHamleler.length === 0) return true;
      return !this.hamleVarMi(this.siraOyuncu);
    }

    // Oyunun mağlubiyet türünü belirler (mars/normal). Kazanma sonrası çağrılır.
    sonucTuru() {
      if (!this.oyunBitti || !this.kazanan) return null;
      const kaybeden = this.rakip(this.kazanan);

      // Kaybeden hiç pul toplayamadıysa mars (gammon) söz konusudur.
      if (this.toplanan[kaybeden] === 0) {
        // Çubukta pulu varsa veya kazananın evinde pulu varsa "çifte mars".
        const kazananEv = this._evNoktalari(this.kazanan);
        let evdeRakipPul = this.bar[kaybeden] > 0;
        if (!evdeRakipPul) {
          for (const i of kazananEv) {
            if (this.tahta[i].oyuncu === kaybeden && this.tahta[i].adet > 0) {
              evdeRakipPul = true;
              break;
            }
          }
        }
        return evdeRakipPul ? "ciftemars" : "mars";
      }
      return "normal";
    }

    // Tahtanın tam durumunu kopya olarak döndürür (AI ve arayüz için).
    durumKopyala() {
      return {
        tahta: this.tahta.map(n => ({ oyuncu: n.oyuncu, adet: n.adet })),
        bar: { [OYUNCU.BEYAZ]: this.bar[OYUNCU.BEYAZ], [OYUNCU.SIYAH]: this.bar[OYUNCU.SIYAH] },
        toplanan: { [OYUNCU.BEYAZ]: this.toplanan[OYUNCU.BEYAZ], [OYUNCU.SIYAH]: this.toplanan[OYUNCU.SIYAH] },
        zarlar: this.zarlar.slice(),
        kalanHamleler: this.kalanHamleler.slice(),
        siraOyuncu: this.siraOyuncu,
        oyunBitti: this.oyunBitti,
        kazanan: this.kazanan
      };
    }

    // Dışarıdan kaydedilmiş bir durumu geri yükler (geri alma / AI simülasyonu).
    durumYukle(durum) {
      this.tahta = durum.tahta.map(n => ({ oyuncu: n.oyuncu, adet: n.adet }));
      this.bar = { [OYUNCU.BEYAZ]: durum.bar[OYUNCU.BEYAZ], [OYUNCU.SIYAH]: durum.bar[OYUNCU.SIYAH] };
      this.toplanan = { [OYUNCU.BEYAZ]: durum.toplanan[OYUNCU.BEYAZ], [OYUNCU.SIYAH]: durum.toplanan[OYUNCU.SIYAH] };
      this.zarlar = durum.zarlar.slice();
      this.kalanHamleler = durum.kalanHamleler.slice();
      this.siraOyuncu = durum.siraOyuncu;
      this.oyunBitti = durum.oyunBitti;
      this.kazanan = durum.kazanan;
    }

    // Pip sayısı: oyuncunun tüm pullarını çıkarmak için gereken toplam adım.
    // AI değerlendirmesi ve arayüz göstergesi için kullanılır.
    pipSayisi(oyuncu) {
      let toplam = 0;

      // Çubuktaki pullar en uzak mesafede sayılır (25 adım).
      toplam += this.bar[oyuncu] * 25;

      for (let i =0; i < 24; i++) {
        const n = this.tahta[i];
        if (n.oyuncu !== oyuncu || n.adet <= 0) continue;
        // Beyaz 0 yönüne, siyah 23 yönüne ilerler.
        const mesafe = (oyuncu === OYUNCU.BEYAZ) ? (i + 1) : (24 - i);
        toplam += mesafe * n.adet;
      }
      return toplam;
    }

    // Belirli bir noktanın durumunu döndürür (arayüz için yardımcı).
    noktaDurumu(indeks) {
      if (indeks < 0 || indeks > 23) return null;
      const n = this.tahta[indeks];
      return { oyuncu: n.oyuncu, adet: n.adet };
    }

    // Rakip oyuncuyu döndürür.
    rakip(oyuncu) {
      return oyuncu === OYUNCU.BEYAZ ? OYUNCU.SIYAH : OYUNCU.BEYAZ;
    }

    // Oyuncunun ilerleme yönü: beyaz negatif (büyükten küçüğe), siyah pozitif.
    _yon(oyuncu) {
      return oyuncu === OYUNCU.BEYAZ ? -1 : 1;
    }

    // Oyuncunun ev (toplama) bölgesindeki nokta indeksleri.
    _evNoktalari(oyuncu) {
      if (oyuncu === OYUNCU.BEYAZ) {
        return [0, 1, 2, 3, 4, 5];
      }
      return [18, 19, 20, 21, 22, 23];
    }

    // Oyuncunun "dışarı" (bear off) hedef indeks değeri.
    _disariNoktasi(oyuncu) {
      // Beyaz için -1 (0'ın altı), siyah için 24 (23'ün üstü).
      return oyuncu === OYUNCU.BEYAZ ? -1 : 24;
    }

    // Oyuncunun toplanan pul sayısını döndürür.
    toplananSayisi(oyuncu) {
      return this.toplanan[oyuncu];
    }

    // Çubuktaki (bar) pul sayısını döndürür.
    barSayisi(oyuncu) {
      return this.bar[oyuncu];
    }
  }

  // Sabitleri ve sınıfı global alana açıyoruz (diğer dosyalar erişebilsin diye).
  window.OYUNCU = OYUNCU;
  window.TavlaOyunu = TavlaOyunu;
})();