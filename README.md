# Timer

En lille dansk webapp til personlig tidsregistrering. Registrér sagsnummer, opgave, start/slut, pause og noter; aften-, nat-, weekend- og helligdagstillæg beregnes automatisk ud fra dato og klokkeslæt. Registrér stadig beredskab, udkald og rejsedøgn særskilt. Overtid beregnes automatisk for timer over 37 i arbejdsugen, først med 50 % for de første tre timer og derefter 100 %. Se ugens timer, dagens fremdrift og månedens overblik. Lønsiden viser vejledende brutto- og nettoestimater og lader dig sammenligne med beløbene på lønsedlen. Data gemmes lokalt i browseren og kan eksporteres som CSV.

## Kom i gang

Åbn `index.html` direkte i en moderne browser, eller servér mappen med en lokal webserver. Appen har ingen build-trin eller eksterne afhængigheder.

## Brug på telefon

Appen er klargjort som en installérbar webapp (PWA) og kan bruges offline efter første indlæsning. For at installere den på en telefon skal den først være udgivet på en HTTPS-adresse, f.eks. via GitHub Pages. Når adressen findes, kan den føjes til hjemmeskærmen fra Safari på iPhone eller installeres fra Chrome på Android. Registreringer gemmes fortsat lokalt på den enkelte enhed og synkroniseres ikke mellem telefon og computer.

## Data

Registreringer og lønsatser gemmes i browserens `localStorage` på den enhed og i den browser, hvor appen åbnes. Brug **Eksportér CSV** for at hente en kopi af registreringerne.

Lønsiden starter med et vejledende satsgrundlag på 205,66 kr./time fra 15. marts 2026 i Skadeserviceoverenskomsten mellem 3F og DI samt dine tidligere oplyste tillægs- og udkaldssatser. Skatteværdierne til nettoestimatet starter på 0 og kan udfyldes efter eget valg. Fritvalg vises særskilt med en redigerbar startværdi på 10 %. Kontrollér og tilpas tallene til den aktuelle lønseddel, ansættelsesdato, anciennitet og eventuel Recover-lokalaftale. Aften-, nat-, weekend- og helligdagstillæg beregnes automatisk ud fra vagtens dato og klokkeslæt; overarbejde regnes ud fra 37 timer pr. arbejdsuge. Nettoestimatet er vejledende og medregner ikke bl.a. ATP eller feriepenge. Rejsedøgn regnes som skattefri i estimatet som standard; kontrollér at betingelserne for skattefri godtgørelse er opfyldt.
