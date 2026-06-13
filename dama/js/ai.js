// dama/js/ai.js
// Dama oyunu yapay zeka modülü
// Minimax + alfa-beta budama algoritması ile hamle seçimi yapar.
// game.js içindeki oyun mantığı ile uyumlu çalışır.

(function (global) {
    'use strict';

    // Zorluk seviyelerine göre arama derinliği ve rastgelelik ayarları
    const ZORLUK_AYARLARI = {
        kolay:    { derinlik: 1, rastgelelik: 0.45 },
        orta:     { derinlik: 3, rastgelelik: 0.20 },
        zor:      { derinlik: 5, rastgelelik: 0.05 },
        imkansiz: { derinlik: 7, rastgelelik: 0.00 }
    };

    // Taş ve kare değerleri (konum tabanlı puanlama için)
    const TAS_DEGERI = 100;      // Normal taş
    const DAMA_DEGERI = 175;     // Dama (kral) taşı
    const KENAR_BONUSU = 5;      // Kenarlarda durmak daha güvenli
    const ILERLEME_BONUSU = 4;   // Karşı tarafa ilerlemek değerlidir

    /**
     * Dama yapay zekası.
     * @param {Object} oyun - game.js tarafından sağlanan oyun nesnesi.
     *   Beklenen arayüz:
     *     oyun.tahtaKopyala()            -> 8x8 tahta dizisi kopyası
     *     oyun.gecerliHamleler(tahta, oyuncu) -> hamle listesi
     *     oyun.hamleUygula(tahta, hamle) -> yeni tahta (kopya)
     *     oyun.oyunBittiMi(tahta)        -> boolean
     *   Tahta hücre değerleri:
     *     0 = boş, 1 = siyah taş, 2 = siyah dama,
     *     -1 = beyaz taş, -2 = beyaz dama
     */
    function DamaAI(oyun, zorluk) {
        this.oyun = oyun;
        this.zorlukAyarla(zorluk || 'orta');
    }

    // Zorluk seviyesini ayarlar
    DamaAI.prototype.zorlukAyarla = function (zorluk) {
        const ayar = ZORLUK_AYARLARI[zorluk] || ZORLUK_AYARLARI.orta;
        this.zorluk = zorluk;
        this.derinlik = ayar.derinlik;
        this.rastgelelik = ayar.rastgelelik;
    };

    /**
     * Verilen oyuncu için en iyi hamleyi hesaplar.
     * @param {Array} tahta - mevcut tahta durumu
     * @param {number} oyuncu - AI'nın oynadığı taraf (1 = siyah, -1 = beyaz)
     * @returns {Object|null} seçilen hamle veya hamle yoksa null
     */
    DamaAI.prototype.enIyiHamle = function (tahta, oyuncu) {
        const hamleler = this.oyun.gecerliHamleler(tahta, oyuncu);
        if (!hamleler || hamleler.length === 0) {
            return null;
        }

        // Tek hamle varsa doğrudan onu oyna
        if (hamleler.length === 1) {
            return hamleler[0];
        }

        // Kolay seviyede ve rastgelelik tetiklenirse rastgele oyna
        if (this.rastgelelik > 0 && Math.random() < this.rastgelelik) {
            return hamleler[Math.floor(Math.random() * hamleler.length)];
        }

        let enIyiDeger = -Infinity;
        let enIyiHamleler = [];

        for (let i = 0; i < hamleler.length; i++) {
            const hamle = hamleler[i];
            const yeniTahta = this.oyun.hamleUygula(this._kopyala(tahta), hamle);

            const deger = this._minimax(
                yeniTahta,
                this.derinlik - 1,
                -Infinity,
                Infinity,
                false,
                oyuncu
            );

            if (deger > enIyiDeger) {
                enIyiDeger = deger;
                enIyiHamleler = [hamle];
            } else if (deger === enIyiDeger) {
                enIyiHamleler.push(hamle);
            }
        }

        // Eşit değerli hamleler arasından rastgele birini seç (çeşitlilik için)
        return enIyiHamleler[Math.floor(Math.random() * enIyiHamleler.length)];
    };

    /**
     * Minimax + alfa-beta budama.
     * @param {Array} tahta - değerlendirilecek tahta
     * @param {number} derinlik - kalan arama derinliği
     * @param {number} alfa - alfa sınırı
     * @param {number} beta - beta sınırı
     * @param {boolean} maksimizeEden - sıradaki düğüm AI lehine mi?
     * @param {number} aiOyuncu - AI'nın tarafı
     */
    DamaAI.prototype._minimax = function (tahta, derinlik, alfa, beta, maksimizeEden, aiOyuncu) {
        // Terminal düğüm veya derinlik sınırı
        if (derinlik <= 0 || this._oyunBitti(tahta)) {
            return this._degerlendir(tahta, aiOyuncu);
        }

        const siradakiOyuncu = maksimizeEden ? aiOyuncu : -aiOyuncu;
        const hamleler = this.oyun.gecerliHamleler(tahta, siradakiOyuncu);

        // Hamle kalmadıysa bu taraf kaybetmiştir
        if (!hamleler || hamleler.length === 0) {
            return maksimizeEden ? -100000 : 100000;
        }

        if (maksimizeEden) {
            let enIyi = -Infinity;
            for (let i = 0; i < hamleler.length; i++) {
                const yeniTahta = this.oyun.hamleUygula(this._kopyala(tahta), hamleler[i]);
                const deger = this._minimax(yeniTahta, derinlik - 1, alfa, beta, false, aiOyuncu);
                if (deger > enIyi) {
                    enIyi = deger;
                }
                if (enIyi > alfa) {
                    alfa = enIyi;
                }
                if (beta <= alfa) {
                    break; // beta budaması
                }
            }
            return enIyi;
        } else {
            let enIyi = Infinity;
            for (let i = 0; i < hamleler.length; i++) {
                const yeniTahta = this.oyun.hamleUygula(this._kopyala(tahta), hamleler[i]);
                const deger = this._minimax(yeniTahta, derinlik - 1, alfa, beta, true, aiOyuncu);
                if (deger < enIyi) {
                    enIyi = deger;
                }
                if (enIyi < beta) {
                    beta = enIyi;
                }
                if (beta <= alfa) {
                    break; // alfa budaması
                }
            }
            return enIyi;
        }
    };

    /**
     * Tahta durumunu AI açısından puanlar.
     * Pozitif değer AI lehine, negatif değer rakip lehine.
     * @param {Array} tahta - değerlendirilecek tahta
     * @param {number} aiOyuncu - AI'nın tarafı (1 veya -1)
     */
    DamaAI.prototype._degerlendir = function (tahta, aiOyuncu) {
        let puan = 0;

        for (let satir = 0; satir < 8; satir++) {
            for (let sutun = 0; sutun < 8; sutun++) {
                const tas = tahta[satir][sutun];
                if (tas === 0) {
                    continue;
                }

                const sahip = tas > 0 ? 1 : -1;   // taşın sahibi
                const dama = Math.abs(tas) === 2;  // dama mı?

                let tasPuani = dama ? DAMA_DEGERI : TAS_DEGERI;

                // Kenar bonusu: kenardaki taşlar yenilemez, daha güvenlidir
                if (sutun === 0 || sutun === 7) {
                    tasPuani += KENAR_BONUSU;
                }

                // İlerleme bonusu: normal taşlar karşı tarafa yaklaştıkça değer kazanır
                if (!dama) {
                    if (sahip === 1) {
                        // Siyah aşağı doğru ilerler (satir artar)
                        tasPuani += satir * ILERLEME_BONUSU;
                    } else {
                        // Beyaz yukarı doğru ilerler (satir azalır)
                        tasPuani += (7 - satir) * ILERLEME_BONUSU;
                    }
                }

                // Taş AI'ya aitse artı, rakibe aitse eksi puan
                if (sahip === aiOyuncu) {
                    puan += tasPuani;
                } else {
                    puan -= tasPuani;
                }
            }
        }

        return puan;
    };

    // game.js bir oyunBittiMi fonksiyonu sağlıyorsa onu kullan, yoksa güvenli varsayılan
    DamaAI.prototype._oyunBitti = function (tahta) {
        if (typeof this.oyun.oyunBittiMi === 'function') {
            return this.oyun.oyunBittiMi(tahta);
        }
        return false;
    };

    // Tahtanın derin kopyasını alır (game.js tahtaKopyala sağlıyorsa onu tercih eder)
    DamaAI.prototype._kopyala = function (tahta) {
        if (typeof this.oyun.tahtaKopyala === 'function') {
            return this.oyun.tahtaKopyala(tahta);
        }
        const kopya = new Array(8);
        for (let i = 0; i < 8; i++) {
            kopya[i] = tahta[i].slice();
        }
        return kopya;
    };

    // Modülü dışa aktar (tarayıcı global + olası modül ortamı)
    global.DamaAI = DamaAI;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DamaAI;
    }

})(typeof window !== 'undefined' ? window : this);