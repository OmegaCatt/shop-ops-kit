# UX-1 až UX-7 – 11. 11. 2026

Místně ověřené unit testy: **22 Node**.

Značka SO a navigační SVG ikony mají pevné rozměry a zarovnání. Mobilní ikonová navigace má výslovné přístupné názvy.

Všech sedm aplikací má první přístupný dialog a stálé ovládání nápovědy v hlavičce. Playwright ověřuje skutečný první vstup, obě části, GitHub odkaz, Tab/Shift+Tab, Escape, návrat fokusu, potvrzení po reloadu a mobil. CompanyAtlas čeká s přihlášením na zavření úvodu; hlavička se testuje po přihlášení. Legacy pracovní průchody pokračují po skutečném zavření úvodu. Aktuální commit, CI a přesný rozsah ověření této etapy jsou vedené v hlavním Portfolio_PROGRESS.md; starší zápisy níže jsou historické.

# Ukázka 11. 11. 2026 – DEMO-4/6

22 Node testů a tři browser sady: existující schvalování, JSON/návrhy a nový průchod tří změn. Nová sada ověřuje nulové předběžné schválení, skutečné rozhodnutí, blokovanou cenu, export jediné schválené položky, demo příznaky, potvrzení/zrušení při vlastních datech i textovém návrhu a mobil. Screenshoty demo-workflow.png a demo-mobile.png jsou z těchto skutečných akcí. Nejde o zápis do e-shopu. Přesná vzdálená evidence je v hlavním protokolu po publikaci.

# Opakované ověření 10. 11. 2026

**21 Node testů prošlo.** Znovu spuštěné prohlížečové QA ověřilo skutečný pracovní postup na dočasných fiktivních podkladech, desktop i mobil a JavaScript chyby. Nalezeno a opraveno: CSV hlavička _row mohla přepsat skutečný zdrojový řádek. Rezervované interní/prototypové názvy se odmítají. Nový regresní test nejprve selhal na původním kódu a po opravě prošel; browser potvrzuje odmítnutí a zachování předchozího platného katalogu. Původních 20 testů se rozšířilo na 21.

Ověřený předchozí commit 52c3d93: [GitHub Actions](https://github.com/OmegaCatt/shop-ops-kit/actions/runs/42730742859); dostupnost jeho artefaktů byla ověřena. Aktuální revize dokumentace/oprav je kontrolována novým CI. Jeho přesný commit a výsledek jsou v hlavním Portfolio_PROGRESS.md. Staré věty o čekající publikaci v rozbaleném archivu platily jen pro dobu daného zápisu.

<details>
<summary>Historické výsledky, původní metriky a omezení</summary>

# Etapa 10. 11. 2026 – SO-4/5

**CSV i verzovaný JSON katalog; kontrolované návrhy textů.** Oba vstupy procházejí stejnými obchodními pravidly a schvalovací bránou. JSON má format shop-ops-catalog, version 1 a products s právě sedmi textovými poli: sku, market, title, price, currency, stock, url. Cenu a sklad uchovává jako text pro audit; neplatná hodnota se nepřevede na platnou. Do 2 MB / 10 000 položek. JSON zdroj se ukazuje cestou products[index]. Tlačítko „Aktuální katalog JSON“ stáhne aktuální normalizovaný katalog jako vzor; schválení nepřenáší.

V panelu návrhů vyberte jednoznačné SKU/trh a krátkou nebo úplnou šablonu. Text pouze přebírá název, SKU, cenu/měnu a sklad; neprovádí překlad, nevymýšlí účinky ani specifikace a nevolá AI. Důležitý nález blokuje přípravu. Návrh ukáže zdrojová fakta a lokaci; k exportu vyžaduje potvrzení a důvod kontroly. SHA-256 propojuje text s fakty a variantou; změna katalogu, pravidel nebo reset návrhy zruší. Export JSON obsahuje pouze platné prověřené návrhy, nikoli publikaci do e-shopu. Název produktu může již ve vstupu obsahovat tvrzení; samotná šablona jeho pravdivost nezávisle neověřuje.

20 Node testů prošlo. Dvě browser sady ověřily CSV schvalování i skutečný JSON import, lokaci, návrh, povinnou kontrolu, export, zneplatnění a zachování posledního platného katalogu po vadném importu. Desktop 1440 px a mobil 390 px bez přetečení/JS chyb; viz drafts.png a drafts-mobile.png. pnpm qa spustí obě sady; bez externích API. CI této nové etapy se ověřuje po publikaci.

English: versioned JSON catalogs join CSV through the same audit/approval rules. JSON uses seven original string fields, bounded input and products[index] provenance. Source-only product copy templates (no AI, translation or invented claims) require human review and a reason, remain fingerprint-bound to the original facts, and export only reviewed current drafts. No live shop writes, authenticated approvals or imported orders. This is a local fictional-data portfolio workflow.

## Historické etapy (aktuální stav výše)

## Ověřený vzdálený běh

GitHub Actions úspěšně ověřily kód `fa77e1c`: [výsledek kontroly](https://github.com/OmegaCatt/shop-ops-kit/actions/runs/42686828209). Artefakt `shop-ops-workflow-preview` byl skutečně nahrán.

# Druhá etapa 9. 11. 2026 – SO-2a a SO-3a/b/c/d

16 Node testů prošlo. Nové případy: důvod rozhodnutí, důležitý nález a nejednoznačné identity, výjimka/expirace/nejvýše 30 dnů UTC, otisk obou vstupů i pravidel, CSV jen schválených změn s ochranou textových buněk, zamítnutí, oddělení starých a nových řádků a přísné číselné vstupy. Prázdný sklad už neprochází jako nula.

Browser QA skutečného serveru s CSP: dva vlastní CSV, očekávané trhy CZ, chybějící důvod, čisté schválení, blokovaná cena i po označení nálezu jako prověřeného, povinné datum výjimky, schválené CSV/JSON a podklady, standardní report se stejnými pravidly/otiskem, změna pravidel s vymazáním schválení, reset, desktop 1440 px a mobil 390 px bez přetečení/JS chyb. Obrázky workflow.png a workflow-mobile.png.

Místní jednorázové měření Node 24.22.1: 10 000 změn a 20 000 nálezů; příprava s SHA-256 191,53 ms, úplný rozhodovací report 11,05 ms. Při návrhu bylo vazby nálezů vhodné indexovat podle řádku místo opakovaného procházení všech nálezů pro každou změnu. Jde o místní vzorek bez prohlížečové latence, nikoli řízenou studii.

CI nově spouští testy a browser QA a nahrává screenshoty; vzdálený běh této etapy prošel, viz odkaz v úvodu. Rozhodnutí jsou místní bez autentizace. Nový zdroj/pravidla zruší jejich platnost; samotný export není podepsaný auditní záznam a nelze jej obnovit jako schválení. Další vstupní formát, import objednávek a řízené návrhy textů zůstávají neimplementované.

Následují historické etapy.

# Ověření 9. 11. 2026

9 automatických testů prošlo. Nové případy kontrolují konfiguraci skladů/trhů, procentní hranici včetně zlevnění a vynechání nejednoznačných identit a různých měn. Browser QA ověřilo změnu skladového pravidla, zrušení prověření a mobilní 390 px bez přetečení a JS chyb. Kompletní schvalovací proces s důvody a platností výjimek je další etapou.

## Veřejná dostupnost 10. 11. 2026

https://omegacatt.github.io/shop-ops-kit/ skutečně ověřeno bez přihlášení: HTTP 200, katalog, stažení JSON a mobil bez JS chyb/přetečení. Celá nová sada JSON/draft průchodu prošla i proti této veřejné URL, včetně lidské kontroly, exportu a zneplatnění. SHOP_OPS_QA_BASE_URL je volitelné, CI standardně používá místní server.


</details>
