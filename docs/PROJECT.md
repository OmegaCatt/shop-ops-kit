# Etapa ukázky 11. 11. 2026

Jedním tlačítkem načtený pár fiktivních exportů: tři změny, nulové předběžné schválení, zachování vlastní práce při zrušení potvrzení. 22 testů a tři browser sady prošly, včetně zpožděného čtení souboru, které po přepnutí nesmí přepsat ukázku. Viz README a QA.

# Aktuální rozsah a kontrola 10. 11. 2026

Aktuální funkce, technologie, API, způsob použití, firemní zavedení a omezení jsou v [README](../README.md). Znovu prošlo 21 Node testů a odpovídající skutečný browser průchod desktop/mobil. Jde o fiktivní portfolio projekt. Výsledky a případné opravy jsou v [QA](QA.md).

Předchozí ověřený kód 52c3d93: [úspěšné GitHub Actions](https://github.com/OmegaCatt/shop-ops-kit/actions/runs/42730742859). Nový commit této revize má vlastní CI; aktuální stav je v hlavním protokolu portfolia. Níže uvedené historické plány nejsou seznam nehotových funkcí.

<details>
<summary>Historická projektová rozhodnutí a průběžné etapy</summary>

# Etapa 10. 11. 2026 – SO-4/5

**CSV i verzovaný JSON katalog; kontrolované návrhy textů.** Oba vstupy procházejí stejnými obchodními pravidly a schvalovací bránou. JSON má format shop-ops-catalog, version 1 a products s právě sedmi textovými poli: sku, market, title, price, currency, stock, url. Cenu a sklad uchovává jako text pro audit; neplatná hodnota se nepřevede na platnou. Do 2 MB / 10 000 položek. JSON zdroj se ukazuje cestou products[index]. Tlačítko „Aktuální katalog JSON“ stáhne aktuální normalizovaný katalog jako vzor; schválení nepřenáší.

V panelu návrhů vyberte jednoznačné SKU/trh a krátkou nebo úplnou šablonu. Text pouze přebírá název, SKU, cenu/měnu a sklad; neprovádí překlad, nevymýšlí účinky ani specifikace a nevolá AI. Důležitý nález blokuje přípravu. Návrh ukáže zdrojová fakta a lokaci; k exportu vyžaduje potvrzení a důvod kontroly. SHA-256 propojuje text s fakty a variantou; změna katalogu, pravidel nebo reset návrhy zruší. Export JSON obsahuje pouze platné prověřené návrhy, nikoli publikaci do e-shopu. Název produktu může již ve vstupu obsahovat tvrzení; samotná šablona jeho pravdivost nezávisle neověřuje.

20 Node testů prošlo. Dvě browser sady ověřily CSV schvalování i skutečný JSON import, lokaci, návrh, povinnou kontrolu, export, zneplatnění a zachování posledního platného katalogu po vadném importu. Desktop 1440 px a mobil 390 px bez přetečení/JS chyb; viz drafts.png a drafts-mobile.png. pnpm qa spustí obě sady; bez externích API. CI této nové etapy se ověřuje po publikaci.

English: versioned JSON catalogs join CSV through the same audit/approval rules. JSON uses seven original string fields, bounded input and products[index] provenance. Source-only product copy templates (no AI, translation or invented claims) require human review and a reason, remain fingerprint-bound to the original facts, and export only reviewed current drafts. No live shop writes, authenticated approvals or imported orders. This is a local fictional-data portfolio workflow.

## Historické etapy (aktuální stav výše)

# Druhá etapa 9. 11. 2026 – SO-2a a SO-3a/b/c/d

16 Node testů prošlo. Nové případy: důvod rozhodnutí, důležitý nález a nejednoznačné identity, výjimka/expirace/nejvýše 30 dnů UTC, otisk obou vstupů i pravidel, CSV jen schválených změn s ochranou textových buněk, zamítnutí, oddělení starých a nových řádků a přísné číselné vstupy. Prázdný sklad už neprochází jako nula.

Browser QA skutečného serveru s CSP: dva vlastní CSV, očekávané trhy CZ, chybějící důvod, čisté schválení, blokovaná cena i po označení nálezu jako prověřeného, povinné datum výjimky, schválené CSV/JSON a podklady, standardní report se stejnými pravidly/otiskem, změna pravidel s vymazáním schválení, reset, desktop 1440 px a mobil 390 px bez přetečení/JS chyb. Obrázky workflow.png a workflow-mobile.png.

Místní jednorázové měření Node 24.22.1: 10 000 změn a 20 000 nálezů; příprava s SHA-256 191,53 ms, úplný rozhodovací report 11,05 ms. Při návrhu bylo vazby nálezů vhodné indexovat podle řádku místo opakovaného procházení všech nálezů pro každou změnu. Jde o místní vzorek bez prohlížečové latence, nikoli řízenou studii.

CI nově spouští testy a browser QA a nahrává screenshoty; vzdálený běh této etapy zatím není ověřený. Rozhodnutí jsou místní bez autentizace. Nový zdroj/pravidla zruší jejich platnost; samotný export není podepsaný auditní záznam a nelze jej obnovit jako schválení. Další vstupní formát, import objednávek a řízené návrhy textů zůstávají neimplementované.

Následují historické etapy.

# Etapa 9. 11. 2026

9 automatických testů prošlo. Nové případy kontrolují konfiguraci skladů/trhů, procentní hranici včetně zlevnění a vynechání nejednoznačných identit a různých měn. Browser QA ověřilo změnu skladového pravidla, zrušení prověření a mobilní 390 px bez přetečení a JS chyb. Kompletní schvalovací proces s důvody a platností výjimek je další etapou.


</details>
