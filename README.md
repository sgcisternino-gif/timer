# Timer

En lille dansk webapp til personlig tidsregistrering. Registrér sagsnummer, opgave, start/slut, pause og noter; aften-, nat-, weekend- og helligdagstillæg beregnes automatisk ud fra dato og klokkeslæt. Registrér stadig beredskab, udkald og rejsedøgn særskilt. Overtid beregnes automatisk for timer over 37 i arbejdsugen, først med 50 % for de første tre timer og derefter 100 %. Se ugens timer, dagens fremdrift og månedens overblik. Lønsiden viser vejledende brutto- og nettoestimater og lader dig sammenligne med beløbene på lønsedlen. Data gemmes lokalt i browseren og kan eksporteres som CSV.

## Kom i gang

Åbn `index.html` direkte i en moderne browser, eller servér mappen med en lokal webserver. Appen har ingen build-trin eller eksterne afhængigheder.

## Brug på telefon

Appen er klargjort som en installérbar webapp (PWA) og kan bruges offline efter første indlæsning. For at installere den på en telefon skal den først være udgivet på en HTTPS-adresse, f.eks. via GitHub Pages. Når adressen findes, kan den føjes til hjemmeskærmen fra Safari på iPhone eller installeres fra Chrome på Android. Registreringer gemmes fortsat lokalt på den enkelte enhed og synkroniseres ikke mellem telefon og computer.

## Data

Registreringer og lønsatser gemmes i browserens `localStorage` på den enhed og i den browser, hvor appen åbnes. Brug **Eksportér CSV** for at hente en kopi af registreringerne.

Lønsiden bruger de offentliggjorte standardsatser i Skadeserviceoverenskomsten mellem 3F og DI fra 15. marts 2026: præstationsløn 174,61 kr./time, servicetillæg 3,65 kr./time og skadeservicetillæg 27,40 kr./time. Aften, nat, søn-/helligdage, overtid, beredskab, udkald og fritvalg følger satserne i appen. Anciennitetstillæg, faglært tillæg og lokale Recover-aftaler afhænger af den enkelte ansættelse og skal tilpasses efter lønsedlen eller lokalaftalen. Skatteværdier starter på 0. Nettoestimatet er vejledende og medregner ikke bl.a. ATP eller feriepenge. Rejsedøgn starter på 0 kr., da diæter afhænger af gældende skatteregler og aftale.
