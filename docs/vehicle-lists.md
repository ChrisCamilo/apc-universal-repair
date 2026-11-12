# Vehicle lists · Listas de veículos

[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)

---

## 🇺🇸 English (US)

The vehicle brands and models every server's lists start with, 30 brands and 299 models, the same as `STARTING_VEHICLE_BRANDS` in `@apc/domain/vehicle-lists`. The migration `20261112000000_vehicle_lists` adds them to a new server and to one that updates, unless its lists hold a name already, after bringing a brand typed under another name together with its standard one (see [database.md](database.md)). The demo keeps its own sample lists.

- **Brands:** the 21 most sold in Brazil in 2025, by FENABRAVE's public report (cars and light commercial vehicles, RAM counted as Dodge), and Chrysler, Gurgel, Puma, DKW, Miura, Saab, Daewoo, Kia and Iveco.
- **Models:** each confirmed as sold in Brazil by Wikipedia in Portuguese; one it didn't confirm is left out, and a brand may have none yet. Where the names come from, and how, is in [licenses.md](licenses.md#vehicle-data).
- **Other names:** GM → Chevrolet, VW → Volkswagen, M.Benz → Mercedes-Benz, Mercedes → Mercedes-Benz, Mercedes Benz → Mercedes-Benz, Chery → Caoa Chery, Great Wall → GWM, Haval → GWM, RAM → Dodge. A brand held under one of them is renamed to its standard name, or merged into it, with no part lost.

| Brand | Models |
|---|---|
| Fiat | 147, Uno, Prêmio, Elba, Oggi, Panorama, Tempra, Tipo, Palio, Siena, Marea, Brava, Stilo, Idea, Punto, Linea, Bravo, Doblò, 500, Freemont, Strada, Argo, Mobi, Cronos, Pulse, Fastback, Toro, Titano, Fiorino, Ducato, 500e |
| Volkswagen | Fusca, Kombi, Karmann-Ghia, SP2, Variant, Variant II, Brasília, Passat, Gol, Parati, Saveiro, Voyage, Santana, Santana Quantum, Logus, Pointer, Apollo, Golf, Fox, SpaceFox, up!, Bora, Polo, Virtus, T-Cross, Nivus, Taos, Tera, Jetta, Amarok |
| Chevrolet | Opala, Chevette, Chevy 500, Marajó, Monza, Kadett, Ipanema, Veraneio, Corsa, Celta, Classic, Astra, Vectra, Omega, Blazer, Silverado, Meriva, Zafira, Agile, Cobalt, Sonic, Cruze, Captiva, Camaro, Malibu, Onix, Onix Plus, Tracker, Montana, Spin, S10, Trailblazer, Equinox, Captiva EV, Blazer EV, Bolt EUV |
| Hyundai | Terracan, i30, ix35, Veloster, Azera, Veracruz, Genesis, Equus, HB20, HB20S, Creta, Tucson, Santa Fe |
| Toyota | Bandeirante, Fielder, Etios, Corolla, Corolla Cross, Hilux, SW4, RAV4, Camry, Prius |
| Renault | Dauphine, Gordini, 19, 21, Twingo, Clio, Mégane, Scénic, Laguna, Kangoo, Symbol, Logan, Sandero, Fluence, Captur, Kwid, Kardian, Duster, Oroch, Boreal, Master |
| Jeep | Renegade, Compass, Commander |
| BYD | Tang, Dolphin, Song Plus, King |
| Honda | Legend, Fit, City, HR-V, WR-V, Civic, ZR-V, Accord |
| Nissan | Tiida, Livina, Grand Livina, Kicks, Kait, Sentra, Frontier, Leaf |
| Caoa Chery | QQ, Face, Celer, Cielo, Tiggo, Tiggo 2, Tiggo 3X, Arrizo 5, Tiggo 5X, Tiggo 7, Tiggo 8, iCar |
| Ford | Corcel, Belina, Galaxie, Rural, F-1000, Del Rey, Escort, Pampa, Verona, Versailles, Royale, Fiesta, Ka, EcoSport, Focus, Fusion, Courier, Mondeo, Ranger, Maverick, Territory, Mustang |
| GWM | — |
| Citroën | XM, Xsara, Xsara Picasso, C4 Lounge, C5, Berlingo, C3, Basalt, C4 Cactus, Jumpy |
| Dodge | Dart, Polara, Magnum, Le Baron, Dakota, Journey, Viper, RAM Rampage |
| Mitsubishi | Pajero, L200, Lancer, Lancer Evolution, Eclipse, ASX, Eclipse Cross, Outlander |
| Peugeot | 205, 206, 207, 307, 308, 405, 407, 408, Hoggar, RCZ, 208, 2008, Partner |
| BMW | Série 1, X4 |
| Mercedes-Benz | Classe A, Classe C, Classe G, Sprinter |
| Volvo | C30, XC90 |
| Omoda Jaecoo | — |
| Chrysler | Esplanada, Neon, Stratus, PT Cruiser, Le Baron |
| Gurgel | X-10, X-12, X-15, Tocantins, Carajás, Itaipu E-150, G-15, BR-800, Supermini, Motomachine |
| Puma | GT, GTE, GTS, GTB, GTC, GTI, P-018, AMV |
| DKW | Universal, Belcar, Vemaguet, Candango, Fissore, Caiçara, Pracinha |
| Miura | Sport, Targa, Kabrio, Saga, X8, X11, Top Sport, Spider |
| Saab | — |
| Daewoo | Espero, Lanos, Nubira, Matiz |
| Kia | Besta, Sephia, Clarus, Magentis, Cadenza, Quoris, Rio, Sportage, Stonic, Sorento, Bongo |
| Iveco | Daily |

---

## 🇧🇷 Português (Brasil)

As marcas e modelos de veículo com que as listas de todo servidor começam, 30 marcas e 299 modelos, os mesmos do `STARTING_VEHICLE_BRANDS` do `@apc/domain/vehicle-lists`. A migração `20261112000000_vehicle_lists` os adiciona a um servidor novo e a um que se atualiza, a não ser que as listas dele já tenham o nome, depois de unir uma marca digitada com outro nome à padrão dela (veja [database.md](database.md)). A demo mantém as listas de exemplo dela.

- **Marcas:** as 21 mais vendidas no Brasil em 2025, pelo informativo público da FENABRAVE (automóveis e comerciais leves, com a RAM contada como Dodge), e Chrysler, Gurgel, Puma, DKW, Miura, Saab, Daewoo, Kia e Iveco.
- **Modelos:** cada um confirmado como vendido no Brasil pela Wikipédia em português; um que ela não confirmou fica de fora, e uma marca pode ainda não ter nenhum. De onde vêm os nomes, e como, está no [licenses.md](licenses.md#dados-de-veículos).
- **Outros nomes:** GM → Chevrolet, VW → Volkswagen, M.Benz → Mercedes-Benz, Mercedes → Mercedes-Benz, Mercedes Benz → Mercedes-Benz, Chery → Caoa Chery, Great Wall → GWM, Haval → GWM, RAM → Dodge. Uma marca com um deles ganha o nome padrão, ou é unida a ele, sem perder nenhuma peça.

| Marca | Modelos |
|---|---|
| Fiat | 147, Uno, Prêmio, Elba, Oggi, Panorama, Tempra, Tipo, Palio, Siena, Marea, Brava, Stilo, Idea, Punto, Linea, Bravo, Doblò, 500, Freemont, Strada, Argo, Mobi, Cronos, Pulse, Fastback, Toro, Titano, Fiorino, Ducato, 500e |
| Volkswagen | Fusca, Kombi, Karmann-Ghia, SP2, Variant, Variant II, Brasília, Passat, Gol, Parati, Saveiro, Voyage, Santana, Santana Quantum, Logus, Pointer, Apollo, Golf, Fox, SpaceFox, up!, Bora, Polo, Virtus, T-Cross, Nivus, Taos, Tera, Jetta, Amarok |
| Chevrolet | Opala, Chevette, Chevy 500, Marajó, Monza, Kadett, Ipanema, Veraneio, Corsa, Celta, Classic, Astra, Vectra, Omega, Blazer, Silverado, Meriva, Zafira, Agile, Cobalt, Sonic, Cruze, Captiva, Camaro, Malibu, Onix, Onix Plus, Tracker, Montana, Spin, S10, Trailblazer, Equinox, Captiva EV, Blazer EV, Bolt EUV |
| Hyundai | Terracan, i30, ix35, Veloster, Azera, Veracruz, Genesis, Equus, HB20, HB20S, Creta, Tucson, Santa Fe |
| Toyota | Bandeirante, Fielder, Etios, Corolla, Corolla Cross, Hilux, SW4, RAV4, Camry, Prius |
| Renault | Dauphine, Gordini, 19, 21, Twingo, Clio, Mégane, Scénic, Laguna, Kangoo, Symbol, Logan, Sandero, Fluence, Captur, Kwid, Kardian, Duster, Oroch, Boreal, Master |
| Jeep | Renegade, Compass, Commander |
| BYD | Tang, Dolphin, Song Plus, King |
| Honda | Legend, Fit, City, HR-V, WR-V, Civic, ZR-V, Accord |
| Nissan | Tiida, Livina, Grand Livina, Kicks, Kait, Sentra, Frontier, Leaf |
| Caoa Chery | QQ, Face, Celer, Cielo, Tiggo, Tiggo 2, Tiggo 3X, Arrizo 5, Tiggo 5X, Tiggo 7, Tiggo 8, iCar |
| Ford | Corcel, Belina, Galaxie, Rural, F-1000, Del Rey, Escort, Pampa, Verona, Versailles, Royale, Fiesta, Ka, EcoSport, Focus, Fusion, Courier, Mondeo, Ranger, Maverick, Territory, Mustang |
| GWM | — |
| Citroën | XM, Xsara, Xsara Picasso, C4 Lounge, C5, Berlingo, C3, Basalt, C4 Cactus, Jumpy |
| Dodge | Dart, Polara, Magnum, Le Baron, Dakota, Journey, Viper, RAM Rampage |
| Mitsubishi | Pajero, L200, Lancer, Lancer Evolution, Eclipse, ASX, Eclipse Cross, Outlander |
| Peugeot | 205, 206, 207, 307, 308, 405, 407, 408, Hoggar, RCZ, 208, 2008, Partner |
| BMW | Série 1, X4 |
| Mercedes-Benz | Classe A, Classe C, Classe G, Sprinter |
| Volvo | C30, XC90 |
| Omoda Jaecoo | — |
| Chrysler | Esplanada, Neon, Stratus, PT Cruiser, Le Baron |
| Gurgel | X-10, X-12, X-15, Tocantins, Carajás, Itaipu E-150, G-15, BR-800, Supermini, Motomachine |
| Puma | GT, GTE, GTS, GTB, GTC, GTI, P-018, AMV |
| DKW | Universal, Belcar, Vemaguet, Candango, Fissore, Caiçara, Pracinha |
| Miura | Sport, Targa, Kabrio, Saga, X8, X11, Top Sport, Spider |
| Saab | — |
| Daewoo | Espero, Lanos, Nubira, Matiz |
| Kia | Besta, Sephia, Clarus, Magentis, Cadenza, Quoris, Rio, Sportage, Stonic, Sorento, Bongo |
| Iveco | Daily |
