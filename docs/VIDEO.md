# Shop Ops Kit: video ukázka

**[Stáhnout MP4 — 0:39, bez zvuku](https://raw.githubusercontent.com/OmegaCatt/shop-ops-kit/main/docs/videos/shop-ops-kit.mp4)** · [Soubor na GitHubu](https://github.com/OmegaCatt/shop-ops-kit/blob/main/docs/videos/shop-ops-kit.mp4)

Tři změny katalogu, blokovaná cena a export schválené změny.

## Co ve videu uvidíte

- Načtení tří změn produktového katalogu.
- Blokace chybné ceny a schválení změny monitoru s důvodem.
- CSV export obsahující pouze jednu platně schválenou změnu.

Video zachycuje skutečnou aplikaci nad izolovanými fiktivními daty. Má rozlišení **1920 × 1080**, **25 snímků/s**, přibližně **2.9 MB** a české titulky přímo v obrazu. Pohyb myši i kliknutí jsou viditelné. **Neobsahuje zvukovou stopu.**

Odkaz stáhne video MP4. Po stažení jej otevřete v běžném přehrávači videa. Ukázka nepotřebuje instalaci aplikace. Pro vlastní vyzkoušení pokračujte [návodem ke spuštění](../README.md#spuštění-krok-za-krokem-windows).

## Jak byl záznam ověřen

Při pořizování proběhl skutečný HTTP/browser scénář s kontrolami výsledků. AI API nebylo volané. Ověřeno celé dekódování výsledného MP4, H.264/yuv420p, rozlišení, absence audio stopy, samostatné přehrání/posun a obrazové snímky titulkových úseků a kliknutí. Jde o ověření konkrétní ukázky; záznam neměří obecnou přesnost AI ani produkční připravenost aplikace.

[Metadata záznamu](videos/shop-ops-kit-recording.json) obsahují kontrolované výsledky, zdrojový commit `917afe86fd7dd73086076c7629514ec251f62d96` a otisky nahrávacích skriptů. SHA-256 MP4: `db88a51b6d9aa0ac67833c22eb79bf0563dc6d614323ce1f072b33bfbeef4ee2`. Časy kroků v metadatech jsou orientační; titulky jsou přímo v obrazu.

Scénář: [scripts/record-demo.mjs](../scripts/record-demo.mjs). Nahrávací vrstva: [scripts/recording.mjs](../scripts/recording.mjs). Při vývojovém zopakování je potřeba Playwright a plný FFmpeg s libx264 (`PORTFOLIO_FFMPEG`); běžné přehrání videa je nevyžaduje.

## English

**[Download the silent Full HD demo (0:39)](https://raw.githubusercontent.com/OmegaCatt/shop-ops-kit/main/docs/videos/shop-ops-kit.mp4).** Open the downloaded MP4 in a standard video player. Czech captions are burned into the image; the pointer and actual clicks are visible. Recorded from the real application using isolated fictional data, with result assertions and no AI API calls. Full decoding, playback, seeking and absence of audio were verified. [Run the application locally](../README.md#spuštění-krok-za-krokem-windows).
