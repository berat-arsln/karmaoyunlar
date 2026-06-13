/* ===================================================================
   Karma Oyunlar - js/main.js
   Ana sayfa ayar yönetimi, tema/animasyon/ses uygulama ve modal davranışı.
   localStorage anahtarı: "karmaOyunlarAyarlar"
   =================================================================== */
(function () {
  'use strict';

  /* ---------- Sabitler ---------- */
  var STORAGE_KEY = 'karmaOyunlarAyarlar';

  var VARSAYILAN_AYARLAR = {
    tema: 'dark',
    sesEfektleri: true
  };


  var GECERLI_TEMA = ['dark', 'light'];

  /* ---------- DOM referansları (DOMContentLoaded sonrası doldurulur) ---------- */
  var el = {
    acBtn: null,        // #ayarlar-ac
    kapatBtn: null,     // #ayarlar-kapat
    modal: null,        // #ayarlar-modal (.modal)
    overlay: null,      // .modal-overlay[data-kapat]
    temaInput: null,    // #ayar-tema  (checked = light)
    sesInput: null      // #ayar-ses
  };

  /* ---------- Çalışan ayarlar nesnesi ---------- */
  var ayarlar = clonla(VARSAYILAN_AYARLAR);

  /* ===================================================================
     Yardımcı fonksiyonlar
     =================================================================== */

  function clonla(nesne) {
    return {
      tema: nesne.tema,
      sesEfektleri: nesne.sesEfektleri
    };
  }

  // Gelen ham veriyi doğrulayıp güvenli bir ayar nesnesine dönüştürür.
  function dogrula(ham) {
    var sonuc = clonla(VARSAYILAN_AYARLAR);
    if (ham && typeof ham === 'object') {
      if (GECERLI_TEMA.indexOf(ham.tema) !== -1) {
        sonuc.tema = ham.tema;
      }
      if (typeof ham.sesEfektleri === 'boolean') {
        sonuc.sesEfektleri = ham.sesEfektleri;
      }
    }
    return sonuc;
  }

  /* ===================================================================
     localStorage okuma / yazma
     =================================================================== */

  function oku() {
    try {
      var ham = localStorage.getItem(STORAGE_KEY);
      if (!ham) {
        // İlk ziyaret: varsayılanı yaz
        ayarlar = clonla(VARSAYILAN_AYARLAR);
        yaz();
        return ayarlar;
      }
      ayarlar = dogrula(JSON.parse(ham));
    } catch (hata) {
      // Bozuk JSON veya erişilemeyen storage -> varsayılana dön
      ayarlar = clonla(VARSAYILAN_AYARLAR);
    }
    return ayarlar;
  }

  function yaz() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ayarlar));
    } catch (hata) {
      // Storage yazılamıyorsa sessizce geç (gizli mod vb.)
    }
  }

  // Dış kullanım için: kaydet (yaz'ın takma adı)
  function kaydet() {
    yaz();
  }

  /* ===================================================================
     Ayar uygulama fonksiyonları
     =================================================================== */

  function temaUygula() {
    var deger = GECERLI_TEMA.indexOf(ayarlar.tema) !== -1 ? ayarlar.tema : 'dark';
    document.documentElement.setAttribute('data-tema', deger);
  }


  function sesUygula() {
    // Ses efektleri tercihi alt oyun sayfalarınca okunur.
    // Burada global durumu erişilebilir kılmak yeterli; ek bir DOM etkisi yok.
    document.documentElement.setAttribute(
      'data-ses',
      ayarlar.sesEfektleri ? 'acik' : 'kapali'
    );
  }

  // Tüm ayarları topluca uygula
  function tumunuUygula() {
    temaUygula();
    sesUygula();
  }

  /* ===================================================================
     Form senkronizasyonu (ayarlar -> form alanları)
     =================================================================== */

  function formaYansit() {
    if (el.temaInput) {
      el.temaInput.checked = (ayarlar.tema === 'light');
    }
    if (el.sesInput) {
      el.sesInput.checked = ayarlar.sesEfektleri;
    }
  }

  /* ===================================================================
     Form olay dinleyicileri (form -> ayarlar)
     =================================================================== */

  function temaDegisti() {
    ayarlar.tema = el.temaInput.checked ? 'light' : 'dark';
    temaUygula();
    yaz();
  }

  function animDegisti() {
    var v = el.animSelect.value;
    ayarlar.animasyonHizi = (GECERLI_ANIM.indexOf(v) !== -1) ? v : 'normal';
    animUygula();
    yaz();
  }

  function sesDegisti() {
    ayarlar.sesEfektleri = !!el.sesInput.checked;
    sesUygula();
    yaz();
  }

  function formDinleyicileriBagla() {
    if (el.temaInput) {
      el.temaInput.addEventListener('change', temaDegisti);
    }
 
    if (el.sesInput) {
      el.sesInput.addEventListener('change', sesDegisti);
    }
  }

  /* ===================================================================
     Modal davranışı
     =================================================================== */

  function modalAcikMi() {
    return el.modal && !el.modal.hasAttribute('hidden');
  }

  function modalAc() {
    if (!el.modal) {
      return;
    }
    el.modal.removeAttribute('hidden');
    el.modal.classList.add('modal--acik');
    // Erişilebilirlik: açılınca kapat butonuna odaklan
    if (el.kapatBtn && typeof el.kapatBtn.focus === 'function') {
      el.kapatBtn.focus();
    }
  }

  function modalKapat() {
    if (!el.modal) {
      return;
    }
    el.modal.setAttribute('hidden', '');
    el.modal.classList.remove('modal--acik');
    // Odağı açma butonuna geri ver
    if (el.acBtn && typeof el.acBtn.focus === 'function') {
      el.acBtn.focus();
    }
  }

  function modalDinleyicileriBagla() {
    if (el.acBtn) {
      el.acBtn.addEventListener('click', function (e) {
        e.preventDefault();
        modalAc();
      });
    }

    if (el.kapatBtn) {
      el.kapatBtn.addEventListener('click', function (e) {
        e.preventDefault();
        modalKapat();
      });
    }

    // Overlay tıklaması ile kapatma (data-kapat="true")
    if (el.overlay) {
      el.overlay.addEventListener('click', function () {
        modalKapat();
      });
    }

    // Daha güvenli kapatma: modal içinde data-kapat taşıyan herhangi bir öğeye
    // tıklanırsa kapat (overlay yapısı değişse bile çalışır).
    if (el.modal) {
      el.modal.addEventListener('click', function (e) {
        var hedef = e.target;
        if (hedef && hedef.getAttribute && hedef.getAttribute('data-kapat') === 'true') {
          modalKapat();
        }
      });
    }

    // ESC tuşu -> sadece modal açıkken kapat
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && modalAcikMi()) {
        modalKapat();
      }
    });
  }

  /* ===================================================================
     Global nesne (alt oyun sayfaları için ayar paylaşımı)
     =================================================================== */

  function getAyar(anahtar) {
    if (typeof anahtar === 'undefined') {
      return clonla(ayarlar);
    }
    return ayarlar[anahtar];
  }

  // Dışarıdan toplu ayar güncellemesi (alt sayfalar kullanabilir)
  function setAyar(anahtar, deger) {
    if (anahtar === 'tema' && GECERLI_TEMA.indexOf(deger) !== -1) {
      ayarlar.tema = deger;
      temaUygula();
    
    } else if (anahtar === 'sesEfektleri' && typeof deger === 'boolean') {
      ayarlar.sesEfektleri = deger;
      sesUygula();
    } else {
      return false;
    }
    yaz();
    formaYansit();
    return true;
  }

  function globalNesneyiKur() {
    window.KarmaOyunlar = {
      // Canlı ayar nesnesine referans
      ayarlar: ayarlar,
      // Sabitler (alt sayfalar referans alabilir)
      STORAGE_KEY: STORAGE_KEY,
      VARSAYILAN: clonla(VARSAYILAN_AYARLAR),
      
      // Okuma / yazma
      oku: oku,
      kaydet: kaydet,
      getAyar: getAyar,
      setAyar: setAyar,
      // Uygulama fonksiyonları
      temaUygula: temaUygula,
      sesUygula: sesUygula,
      tumunuUygula: tumunuUygula
    };
  }

  /* ===================================================================
     Başlatma
     =================================================================== */

  function dogumElementleri() {
    el.acBtn = document.getElementById('ayarlar-ac');
    el.kapatBtn = document.getElementById('ayarlar-kapat');
    el.modal = document.getElementById('ayarlar-modal');
    el.temaInput = document.getElementById('ayar-tema');
    
    el.sesInput = document.getElementById('ayar-ses');
    el.overlay = el.modal
      ? el.modal.querySelector('.modal-overlay[data-kapat]') ||
        el.modal.querySelector('.modal-overlay')
      : null;
  }

  function baslat() {
    dogumElementleri();

    // 1) Ayarları oku (yoksa varsayılanı yazar)
    oku();

    // 2) Global nesneyi kur (ayarlar referansını yansıtması için oku sonrası)
    globalNesneyiKur();

    // 3) Ayarları uygula (tema attribute + anim-speed + ses)
    tumunuUygula();

    // 4) Formu mevcut ayarlara senkronla
    formaYansit();

    // 5) Olay dinleyicilerini bağla
    formDinleyicileriBagla();
    modalDinleyicileriBagla();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }

})();