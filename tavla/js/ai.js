Tavla AI dosyasını yazabilmem için bir engel var: paylaşılan mevcut dosyalar gerçek içerik içermiyor. Her birinin yerinde tek karakterlik yer tutucular var:

- `tavla/index.html` → `a`
- `tavla/css/board.css` → `l`
- `tavla/css/main.css` → `a`
- `tavla/css/ui.css` → (boşluk)
- `tavla/js/game.js` → `(`

`ai.js`'in "diğer dosyalarla uyumlu" ve "mevcut HTML'deki id/class isimlerini kullan" kuralına uyması için en az `game.js`'in gerçek içeriğini bilmem gerekiyor. AI motoru tamamen `game.js`'in sunduğu arayüze (fonksiyon isimleri, tahta veri yapısı, hamle üretme/uygulama metotları) dayanır. Örneğin AI'nin şunları bilmesi şart:

- Tahta nasıl temsil ediliyor? (24 nokta dizisi mi, `{point: sayı, count: sayı, color: ...}` nesneleri mi?)
- Geçerli hamleler nasıl üretiliyor? (örn. `game.getValidMoves(zarlar)` gibi bir fonksiyon var mı?)
- Hamle nasıl uygulanıyor/geri alınıyor? (AI'nin minimax/expectimax için tahtayı simüle etmesi gerekir)
- Renk/sıra ve "bar"/"toplama" durumları nasıl tutuluyor?
- Zar değerleri nereden geliyor?

Bu bilgiler olmadan yazacağım `ai.js`, kendi uydurduğum bir veri yapısına dayanır ve senin `game.js`'inle büyük olasılıkla hiç çalışmaz — bu da "kendi başına yeni isim icat etme" kuralını ihlal eder.

**İhtiyacım olan:** En azından `tavla/js/game.js`'in gerçek içeriği. İdeal olarak şunları da görmek isterim:
- `game.js`'in dışaaçtığı arayüz (global `window.Tavla`, ES module `export`, ya da düz fonksiyonlar mı?)
- `ui.js`'in AI'yi nasıl çağırdığı (örn. `AI.bestMove(...)` gibi beklenen bir imza var mı?)
- Zarların nasıl atıldığı ve AI'ya nasıl iletildiği

Eğer `game.js` henüz gerçekten yazılmadıysa, iki seçeneğin var:

1. **Önce `game.js`'i yaz/paylaş**, sonra ben ona birebir uyumlu `ai.js`'i yazayım. En sağlam yol bu.

2. **Beraber bir sözleşme (contract) belirleyelim**, yani `game.js`'in dışa açacağı arayüzü önceden tanımlayalım. Örneğin şöyle bir asgari sözleşmeye anlaşırsak, ona göre hem `ai.js`'i şimdi yazarım hem de `game.js`'i buna uydurursun:

```
// game.js'in dışa açması beklenen asgari arayüz (öneri)
window.Tavla = {
  board,                       // 24 elemanlı dizi: +değer beyaz, -değer siyah taş sayısı
  bar: { beyaz: 0, siyah: 0 }, // bardaki taşlar
  toplanan: { beyaz: 0, siyah: 0 },
  siradaki,                    // 'beyaz' | 'siyah'
  getGecerliHamleler(zarlar, renk), // [{from, to, zar}] döner
  hamleYap(hamle),             // hamleyi uygular, geri-al bilgisi döner
  hamleGeriAl(geriAlBilgisi),  // simülasyon için
  oyunBitti(),                 // boolean
  kazanan(),                   // 'beyaz' | 'siyah' | null
};
```

Bu sözleşmeyi onaylar veya kendi `game.js` arayüzünü paylaşırsan, **expectimax tabanlı** (zarın olasılıksal doğası nedeniyle tavlada minimax yerine expectimax doğru seçimdir) bir AI'yi dört zorluk seviyesiyle (kolay/orta/zor/imkansız) eksiksiz yazarım:

- **Kolay:** geçerli hamleler arasından çoğunlukla rastgele seçim.
- **Orta:** tek hamle ileriye bakan açgözlü (greedy) değerlendirme — pip sayısı, taş güvenliği (blot riski), kapanan noktalar.
- **Zor:** sınırlı derinlikte expectimax + konum değerlendirme fonksiyonu.
- **İmkansız:** daha derin expectimax, gelişmiş heuristik (prime oluşturma, ev içi yapı, geri oyun farkındalığı) ve zar kombinasyonlarının ağırlıklandırılması.

Hangi yolu tercih edersin — `game.js`'i paylaşmak mı, yoksa yukarıdaki sözleşmeyi onaylamak mı?