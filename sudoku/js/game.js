// sudoku/js/game.js
// Sudoku oyun mantığı: tahta oluşturma, çözme, doğrulama ve durum yönetimi.
// Yalnızca oyun kurallarını içerir; arayüz güncellemeleri ui.js, AI/çözücü yardımcıları burada saf mantık olarak tutulur.

(function (global) {
  'use strict';

  // Zorluk seviyelerine göre kaldırılacak (boş bırakılacak) hücre sayısı.
  const ZORLUK_AYARLARI = {
    kolay: 40,
    orta: 48,
    zor: 54,
    imkansiz: 60
  };

  const BOYUT = 9;       // Tahta kenar uzunluğu
  const KUTU = 3;        // Alt kutu (3x3) kenar uzunluğu
  const TOPLAM = BOYUT * BOYUT;

  // Sudoku oyun durumunu tutan ana sınıf.
  class SudokuOyunu {
    constructor() {
      this.cozum = [];        // Tam çözüm tahtası (9x9)
      this.tahta = [];        // Oyuncuya gösterilen mevcut tahta (0 = boş)
      this.baslangic = [];    // Başlangıçta verilen (sabit) hücreler maskesi
      this.notlar = [];       // Her hücre için aday not seti
      this.zorluk = 'kolay';
      this.gecmis = [];       // Geri al için hamle geçmişi
      this.baslangicZamani = 0;
      this.bitti = false;
    }

    // Yeni oyun başlatır. Belirtilen zorlukta bir bulmaca üretir.
    yeniOyun(zorluk) {
      this.zorluk = ZORLUK_AYARLARI.hasOwnProperty(zorluk) ? zorluk : 'kolay';
      this.cozum = this._cozumUret();
      const bosSayisi = ZORLUK_AYARLARI[this.zorluk];
      this.tahta = this._bulmacaOlustur(this.cozum, bosSayisi);
      this.baslangic = this.tahta.map((satir) => satir.map((deger) => deger !== 0));
      this.notlar = this._bosNotlarOlustur();
      this.gecmis = [];
      this.baslangicZamani = Date.now();
      this.bitti = false;
      return this.tahta;
    }

    // Boş not yapısı: her hücre için boş bir Set.
    _bosNotlarOlustur() {
      const notlar = [];
      for (let r = 0; r < BOYUT; r++) {
        notlar.push([]);
        for (let c = 0; c < BOYUT; c++) {
          notlar[r].push(new Set());
        }
      }
      return notlar;
    }

    // Boş 9x9 tahta üretir.
    _bosTahta() {
      const tahta = [];
      for (let r = 0; r < BOYUT; r++) {
        tahta.push(new Array(BOYUT).fill(0));
      }
      return tahta;
    }

    // Tam ve geçerli bir çözüm tahtası üretir (backtracking ile).
    _cozumUret() {
      const tahta = this._bosTahta();
      this._tahtaDoldur(tahta);
      return tahta;
    }

    // Tahtayı geri izleme (backtracking) ile rastgele doldurur.
    _tahtaDoldur(tahta) {
      const bos = this._ilkBosHucre(tahta);
      if (!bos) {
        return true; // Boş hücre kalmadı, tahta tamamlandı.
      }
      const [satir, sutun] = bos;
      const sayilar = this._karistir([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const sayi of sayilar) {
        if (this._gecerliMi(tahta, satir, sutun, sayi)) {
          tahta[satir][sutun] = sayi;
          if (this._tahtaDoldur(tahta)) {
            return true;
          }
          tahta[satir][sutun] = 0; // Geri izleme
        }
      }
      return false;
    }

    // Tahtadaki ilk boş hücreyi döndürür ([satir, sutun]) veya null.
    _ilkBosHucre(tahta) {
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (tahta[r][c] === 0) {
            return [r, c];
          }
        }
      }
      return null;
    }

    // Bir sayının belirtilen konuma yerleştirilebilir olup olmadığını kontrol eder.
    _gecerliMi(tahta, satir, sutun, sayi) {
      // Satır kontrolü
      for (let c = 0; c < BOYUT; c++) {
        if (tahta[satir][c] === sayi) {
          return false;
        }
      }
      // Sütun kontrolü
      for (let r = 0; r < BOYUT; r++) {
        if (tahta[r][sutun] === sayi) {
          return false;
        }
      }
      // 3x3 kutu kontrolü
      const kutuSatir = Math.floor(satir / KUTU) * KUTU;
      const kutuSutun = Math.floor(sutun / KUTU) * KUTU;
      for (let r = kutuSatir; r < kutuSatir + KUTU; r++) {
        for (let c = kutuSutun; c < kutuSutun + KUTU; c++) {
          if (tahta[r][c] === sayi) {
            return false;
          }
        }
      }
      return true;
    }

    // Bir diziyi yerinde karıştırır (Fisher-Yates) ve döndürür.
    _karistir(dizi) {
      for (let i = dizi.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
      }
      return dizi;
    }

    // Çözüm tahtasından, tek çözümlü kalmasına dikkat ederek hücre boşaltarak bulmaca üretir.
    _bulmacaOlustur(cozum, bosSayisi) {
      const tahta = cozum.map((satir) => satir.slice());
      // Tüm hücre konumlarını rastgele sıraya sok.
      const konumlar = [];
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          konumlar.push([r, c]);
        }
      }
      this._karistir(konumlar);

      let kaldirilan = 0;
      for (const [r, c] of konumlar) {
        if (kaldirilan >= bosSayisi) {
          break;
        }
        const yedek = tahta[r][c];
        if (yedek === 0) {
          continue;
        }
        tahta[r][c] = 0;
        // Tek çözümlülük korunuyorsa boşaltmayı kabul et, aksi halde geri al.
        if (this._cozumSayisi(tahta) === 1) {
          kaldirilan++;
        } else {
          tahta[r][c] = yedek;
        }
      }
      return tahta;
    }

    // Tahtanın çözüm sayısını sayar (en fazla 2'ye kadar sayar, performans için durur).
    _cozumSayisi(tahta) {
      const kopya = tahta.map((satir) => satir.slice());
      let sayac = 0;

      const coz = (t) => {
        if (sayac >= 2) {
          return; // İki çözüm bulunduysa benzersizlik bozulmuştur, dur.
        }
        const bos = this._ilkBosHucre(t);
        if (!bos) {
          sayac++;
          return;
        }
        const [satir, sutun] = bos;
        for (let sayi = 1; sayi <= BOYUT; sayi++) {
          if (this._gecerliMi(t, satir, sutun, sayi)) {
            t[satir][sutun] = sayi;
            coz(t);
            t[satir][sutun] = 0;
            if (sayac >= 2) {
              return;
            }
          }
        }
      };

      coz(kopya);
      return sayac;
    }

    // Bir hücreye değer yazar. Başlangıç hücreleri değiştirilemez.
    // Dönüş: { basarili, hata } nesnesi.
    hucreYaz(satir, sutun, deger) {
      if (this.bitti) {
        return { basarili: false, hata: 'oyun_bitti' };
      }
      if (!this._konumGecerli(satir, sutun)) {
        return { basarili: false, hata: 'gecersiz_konum' };
      }
      if (this.baslangic[satir][sutun]) {
        return { basarili: false, hata: 'sabit_hucre' };
      }
      if (deger < 0 || deger > 9) {
        return { basarili: false, hata: 'gecersiz_deger' };
      }

      // Geri al için önceki durumu kaydet.
      this.gecmis.push({
        satir,
        sutun,
        oncekiDeger: this.tahta[satir][sutun],
        oncekiNotlar: new Set(this.notlar[satir][sutun])
      });

      this.tahta[satir][sutun] = deger;
      // Bir değer girildiğinde o hücredeki notlar temizlenir.
      if (deger !== 0) {
        this.notlar[satir][sutun].clear();
      }

      const tamamlandi = this.tamamlandiMi();
      if (tamamlandi) {
        this.bitti = true;
      }

      return { basarili: true, tamamlandi };
    }

    // Bir hücreyi temizler (0 yapar).
    hucreTemizle(satir, sutun) {
      return this.hucreYaz(satir, sutun, 0);
    }

    // Bir hücreye not (aday) ekler veya çıkarır (toggle).
    // Sadece boş (değeri 0 olan) hücrelere not eklenebilir.
    notDegistir(satir, sutun, deger) {
      if (this.bitti) {
        return { basarili: false, hata: 'oyun_bitti' };
      }
      if (!this._konumGecerli(satir, sutun)) {
        return { basarili: false, hata: 'gecersiz_konum' };
      }
      if (this.baslangic[satir][sutun]) {
        return { basarili: false, hata: 'sabit_hucre' };
      }
      if (this.tahta[satir][sutun] !== 0) {
        return { basarili: false, hata: 'dolu_hucre' };
      }
      if (deger < 1 || deger > 9) {
        return { basarili: false, hata: 'gecersiz_deger' };
      }

      const notSeti = this.notlar[satir][sutun];
      if (notSeti.has(deger)) {
        notSeti.delete(deger);
      } else {
        notSeti.add(deger);
      }
      return { basarili: true, ekli: notSeti.has(deger) };
    }

    // Son hamleyi geri alır.
    geriAl() {
      if (this.gecmis.length === 0) {
        return { basarili: false, hata: 'gecmis_bos' };
      }
      const son = this.gecmis.pop();
      this.tahta[son.satir][son.sutun] = son.oncekiDeger;
      this.notlar[son.satir][son.sutun] = son.oncekiNotlar;
      // Geri alındığında oyun yeniden oynanabilir hale gelir.
      this.bitti = false;
      return { basarili: true, satir: son.satir, sutun: son.sutun };
    }

    // Bir hücrede ipucu açar: doğru değeri yerleştirir.
    ipucu(satir, sutun) {
      if (this.bitti) {
        return { basarili: false, hata: 'oyun_bitti' };
      }
      if (!this._konumGecerli(satir, sutun)) {
        return { basarili: false, hata: 'gecersiz_konum' };
      }
      if (this.baslangic[satir][sutun]) {
        return { basarili: false, hata: 'sabit_hucre' };
      }
      const dogruDeger = this.cozum[satir][sutun];
      const sonuc = this.hucreYaz(satir, sutun, dogruDeger);
      if (sonuc.basarili) {
        // İpucu ile yerleştirilen hücreyi de sabit kabul etmiyoruz; sadece değer veriyoruz.
        return { basarili: true, deger: dogruDeger, tamamlandi: sonuc.tamamlandi };
      }
      return sonuc;
    }

    // Rastgele bir boş hücreye ipucu verir.
    rastgeleIpucu() {
      const boslar = [];
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] === 0 && !this.baslangic[r][c]) {
            boslar.push([r, c]);
          }
        }
      }
      if (boslar.length === 0) {
        return { basarili: false, hata: 'bos_hucre_yok' };
      }
      const [r, c] = boslar[Math.floor(Math.random() * boslar.length)];
      return this.ipucu(r, c);
    }

    // Belirtilen hücredeki değerin çözüme göre doğru olup olmadığını döndürür.
    // Boş hücreler için null döner.
    hucreDogruMu(satir, sutun) {
      if (!this._konumGecerli(satir, sutun)) {
        return null;
      }
      if (this.tahta[satir][sutun] === 0) {
        return null;
      }
      return this.tahta[satir][sutun] === this.cozum[satir][sutun];
    }

    // Tahtadaki tüm hatalı hücreleri döndürür ([satir, sutun] dizisi).
    // Hata, çözümle uyuşmayan dolu hücredir.
    hataliHucreler() {
      const hatalar = [];
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] !== 0 && this.tahta[r][c] !== this.cozum[r][c]) {
            hatalar.push([r, c]);
          }
        }
      }
      return hatalar;
    }

    // Bir hücredeki değerin, mevcut tahtada Sudoku kurallarını ihlal edip etmediğini kontrol eder.
    // Çözümden bağımsız, anlık çakışma kontrolü için kullanılır.
    cakismaVarMi(satir, sutun) {
      if (!this._konumGecerli(satir, sutun)) {
        return false;
      }
      const deger = this.tahta[satir][sutun];
      if (deger === 0) {
        return false;
      }

      // Satır çakışması
      for (let c = 0; c < BOYUT; c++) {
        if (c !== sutun && this.tahta[satir][c] === deger) {
          return true;
        }
      }
      // Sütun çakışması
      for (let r = 0; r < BOYUT; r++) {
        if (r !== satir && this.tahta[r][sutun] === deger) {
          return true;
        }
      }
      // 3x3 kutu çakışması
      const kutuSatir = Math.floor(satir / KUTU) * KUTU;
      const kutuSutun = Math.floor(sutun / KUTU) * KUTU;
      for (let r = kutuSatir; r < kutuSatir + KUTU; r++) {
        for (let c = kutuSutun; c < kutuSutun + KUTU; c++) {
          if ((r !== satir || c !== sutun) && this.tahta[r][c] === deger) {
            return true;
          }
        }
      }
      return false;
    }

    // Tahtadaki tüm anlık çakışmaları döndürür ([satir, sutun] dizisi).
    tumCakismalar() {
      const liste = [];
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] !== 0 && this.cakismaVarMi(r, c)) {
            liste.push([r, c]);
          }
        }
      }
      return liste;
    }

    // Tahtanın tamamen ve doğru şekilde doldurulup doldurulmadığını kontrol eder.
    tamamlandiMi() {
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] === 0) {
            return false;
          }
          if (this.tahta[r][c] !== this.cozum[r][c]) {
            return false;
          }
        }
      }
      return true;
    }

    // Bir hücrenin sabit (başlangıçta verilmiş) olup olmadığını döndürür.
    sabitMi(satir, sutun) {
      if (!this._konumGecerli(satir, sutun)) {
        return false;
      }
      return this.baslangic[satir][sutun];
    }

    // Bir hücredeki değeri döndürür.
    hucreDegeri(satir, sutun) {
      if (!this._konumGecerli(satir, sutun)) {
        return 0;
      }
      return this.tahta[satir][sutun];
    }

    // Bir hücredeki notları dizi olarak döndürür (artan sıralı).
    hucreNotlari(satir, sutun) {
      if (!this._konumGecerli(satir, sutun)) {
        return [];
      }
      return Array.from(this.notlar[satir][sutun]).sort((a, b) => a - b);
    }

    // Belirli bir rakamın tahtada kaç kez kullanıldığını döndürür.
    // Sayı tuşlarını devre dışı bırakmak için kullanılır (9 kez kullanıldıysa).
    rakamSayisi(rakam) {
      let sayac = 0;
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] === rakam) {
            sayac++;
          }
        }
      }
      return sayac;
    }

    // Tahtadaki boş hücre sayısını döndürür.
    bosHucreSayisi() {
      let sayac = 0;
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (this.tahta[r][c] === 0) {
            sayac++;
          }
        }
      }
      return sayac;
    }

    // Oyunun başlangıcından bu yana geçen süreyi saniye olarak döndürür.
    gecenSure() {
      if (this.baslangicZamani === 0) {
        return 0;
      }
      return Math.floor((Date.now() - this.baslangicZamani) / 1000);
    }

    // Geçen süreyi "dd:ss" biçiminde döndürür.
    sureMetni() {
      const toplam = this.gecenSure();
      const dakika = Math.floor(toplam / 60);
      const saniye = toplam % 60;
      const ped = (n) => (n < 10 ? '0' + n : String(n));
      return ped(dakika) + ':' + ped(saniye);
    }

    // Tüm tahtayı çözer (oyuncu "çözümü göster" derse).
    cozumuGoster() {
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          this.tahta[r][c] = this.cozum[r][c];
          this.notlar[r][c].clear();
        }
      }
      this.bitti = true;
      return this.tahta;
    }

    // Oyuncunun girdiği (sabit olmayan) tüm hücreleri temizler.
    tahtayiSifirla() {
      for (let r = 0; r < BOYUT; r++) {
        for (let c = 0; c < BOYUT; c++) {
          if (!this.baslangic[r][c]) {
            this.tahta[r][c] = 0;
            this.notlar[r][c].clear();
          }
        }
      }
      this.gecmis = [];
      this.bitti = false;
      return this.tahta;
    }

    // Konumun tahta sınırları içinde olup olmadığını kontrol eder.
    _konumGecerli(satir, sutun) {
      return (
        Number.isInteger(satir) &&
        Number.isInteger(sutun) &&
        satir >= 0 &&
        satir < BOYUT &&
        sutun >= 0 &&
        sutun < BOYUT
      );
    }

    // Mevcut oyun durumunu kaydetmek için serileştirilebilir bir nesne döndürür.
    durumKaydet() {
      return {
        cozum: this.cozum.map((s) => s.slice()),
        tahta: this.tahta.map((s) => s.slice()),
        baslangic: this.baslangic.map((s) => s.slice()),
        notlar: this.notlar.map((s) => s.map((n) => Array.from(n))),
        zorluk: this.zorluk,
        baslangicZamani: this.baslangicZamani,
        bitti: this.bitti
      };
    }

    // Kaydedilmiş bir durumdan oyunu yükler.
    durumYukle(durum) {
      if (!durum) {
        return false;
      }
      this.cozum = durum.cozum.map((s) => s.slice());
      this.tahta = durum.tahta.map((s) => s.slice());
      this.baslangic = durum.baslangic.map((s) => s.slice());
      this.notlar = durum.notlar.map((s) => s.map((n) => new Set(n)));
      this.zorluk = durum.zorluk || 'kolay';
      this.baslangicZamani = durum.baslangicZamani || Date.now();
      this.bitti = !!durum.bitti;
      this.gecmis = [];
      return true;
    }
  }

  // Sabitleri ve sınıfı global alana aktar (ui.js erişebilsin).
  global.SudokuOyunu = SudokuOyunu;
  global.SUDOKU_SABITLERI = {
    BOYUT,
    KUTU,
    TOPLAM,
    ZORLUK_AYARLARI
  };

})(window);