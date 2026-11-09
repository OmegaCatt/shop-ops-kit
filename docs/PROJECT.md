# Druhá etapa 9. 11. 2026 – SO-2a a SO-3a/b/c/d

16 Node testů prošlo. Nové případy: důvod rozhodnutí, důležitý nález a nejednoznačné identity, výjimka/expirace/nejvýše 30 dnů UTC, otisk obou vstupů i pravidel, CSV jen schválených změn s ochranou textových buněk, zamítnutí, oddělení starých a nových řádků a přísné číselné vstupy. Prázdný sklad už neprochází jako nula.

Browser QA skutečného serveru s CSP: dva vlastní CSV, očekávané trhy CZ, chybějící důvod, čisté schválení, blokovaná cena i po označení nálezu jako prověřeného, povinné datum výjimky, schválené CSV/JSON a podklady, standardní report se stejnými pravidly/otiskem, změna pravidel s vymazáním schválení, reset, desktop 1440 px a mobil 390 px bez přetečení/JS chyb. Obrázky workflow.png a workflow-mobile.png.

Místní jednorázové měření Node 24.22.1: 10 000 změn a 20 000 nálezů; příprava s SHA-256 191,53 ms, úplný rozhodovací report 11,05 ms. Při návrhu bylo vazby nálezů vhodné indexovat podle řádku místo opakovaného procházení všech nálezů pro každou změnu. Jde o místní vzorek bez prohlížečové latence, nikoli řízenou studii.

CI nově spouští testy a browser QA a nahrává screenshoty; vzdálený běh této etapy zatím není ověřený. Rozhodnutí jsou místní bez autentizace. Nový zdroj/pravidla zruší jejich platnost; samotný export není podepsaný auditní záznam a nelze jej obnovit jako schválení. Další vstupní formát, import objednávek a řízené návrhy textů zůstávají neimplementované.

Následují historické etapy.

# Etapa 9. 11. 2026

9 automatických testů prošlo. Nové případy kontrolují konfiguraci skladů/trhů, procentní hranici včetně zlevnění a vynechání nejednoznačných identit a různých měn. Browser QA ověřilo změnu skladového pravidla, zrušení prověření a mobilní 390 px bez přetečení a JS chyb. Kompletní schvalovací proces s důvody a platností výjimek je další etapou.
