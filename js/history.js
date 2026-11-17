// Historische Gebiete, zusammengesetzt aus heutigen Ländern (ISO-3166-Nummern) und Schnittpolygonen [lon, lat].
// Vereinfacht für die Darstellung; genutzt von Globus (Szene 2) und Europakarte (Szene 3).

// Großdeutsches Reich 1941/42: Deutschland, Österreich, Böhmen und Mähren (Sudetenland + Protektorat), Luxemburg,
// annektierte Teile Polens (Danzig-Westpreußen, Wartheland, Ost-Oberschlesien, Zichenau, Suwałki),
// Ostpreußen mit Memelland, Elsass-Lothringen (de facto annektiert), Untersteiermark/Oberkrain (Nord-Slowenien)
export const ANNEX_PL = [[14, 55.3], [23.6, 55.3], [23.6, 54.0], [22.9, 53.9], [22.0, 53.55], [21.3, 53.1], [20.7, 52.75], [20.35, 52.5], [19.9, 52.2], [19.75, 51.85], [19.75, 51.55], [19.45, 51.1], [19.6, 50.6], [19.7, 50.2], [19.45, 49.6], [14, 49.6]];
export const ALSACE_LORRAINE = [[5.85, 49.6], [8.4, 49.6], [8.4, 47.3], [6.8, 47.4], [6.95, 47.95], [7.15, 48.5], [6.9, 48.75], [6.3, 48.85], [5.9, 49.05]];
export const KOENIGSBERG = [[19.2, 55.5], [23.0, 55.5], [23.0, 54.25], [19.2, 54.25]];
// Memelland: Küstenstreifen nördlich der Memel, bis kurz vor Palanga
export const MEMEL = [[20.9, 55.98], [21.3, 55.98], [21.6, 55.86], [21.95, 55.62], [22.15, 55.35], [22.2, 55.05], [20.9, 55.05]];
export const NORD_SLOWENIEN = [[13.3, 47.0], [16.8, 47.0], [16.8, 45.85], [15.2, 45.85], [14.7, 46.1], [14.4, 46.15], [13.6, 46.35]];
export const REICH_1942 = [
  { c: '276' }, { c: '040' }, { c: '203' }, { c: '442' },
  { c: '616', clip: ANNEX_PL }, { c: '250', clip: ALSACE_LORRAINE }, { c: '643', clip: KOENIGSBERG }, { c: '440', clip: MEMEL }, { c: '705', clip: NORD_SLOWENIEN }
];
// Italien mit Albanien (1939 angeschlossen)
export const ITALY_1941 = [{ c: '380' }, { c: '008' }];
// Japanisches Kaiserreich (Kernland, Korea, Taiwan); Mandschukuo und besetzte Teile Chinas nicht enthalten
export const JAPAN_1941 = [{ c: '392' }, { c: '408' }, { c: '410' }, { c: '158' }];

// ---------- Europa Anfang 1943: Gebiete für historische Grenzlinien (hiMap groups) ----------
// Ukraine wird in Ostgalizien (Generalgouvernement), Karpatenukraine (Ungarn), Nordbukowina (Rumänien) und den
// Rest (Sowjetunion) geteilt; Polen in die annektierten Teile (Reich) und das Generalgouvernement; Rumänien
// in Nordsiebenbürgen (Ungarn) und den Rest. Linien vereinfacht.
const GALICIA = [[20, 52], [24.1, 52], [24.1, 50.9], [25.0, 50.5], [25.6, 50.2], [26.2, 49.6], [26.3, 48.6], [25.3, 48.3], [24.65, 47.95], [24.2, 48.35], [23.4, 48.75], [22.6, 49.1], [20, 49.1]];
const ZAKARPATTIA = [[20, 49.1], [22.6, 49.1], [23.4, 48.75], [24.2, 48.35], [24.65, 47.95], [24.9, 47.0], [20, 47.0]];
const N_BUKOVINA = [[24.65, 47.95], [25.3, 48.3], [26.3, 48.6], [27.8, 48.6], [27.8, 47.0], [24.9, 47.0]];
const UKR_SOVIET = [[24.1, 52], [24.1, 50.9], [25.0, 50.5], [25.6, 50.2], [26.2, 49.6], [26.3, 48.6], [27.8, 48.6], [27.8, 47.0], [24.9, 47.0], [24.9, 40], [45, 40], [45, 53]];
const GG_POLAND = [[23.6, 55.3], [23.6, 54.0], [22.9, 53.9], [22.0, 53.55], [21.3, 53.1], [20.7, 52.75], [20.35, 52.5], [19.9, 52.2], [19.75, 51.85], [19.75, 51.55], [19.45, 51.1], [19.6, 50.6], [19.7, 50.2], [19.45, 49.6], [14, 49.6], [14, 48], [30, 48], [30, 55.3]];
const N_TRANSYLVANIA = [[21.7, 48.3], [21.75, 46.7], [22.6, 46.75], [23.6, 46.65], [24.4, 46.3], [25.0, 46.0], [25.6, 45.75], [26.2, 45.9], [26.45, 46.4], [26.1, 47.1], [25.6, 47.6], [25.0, 47.8], [24.0, 48.2]];
const S_ROMANIA = [[21.75, 46.7], [22.6, 46.75], [23.6, 46.65], [24.4, 46.3], [25.0, 46.0], [25.6, 45.75], [26.2, 45.9], [26.45, 46.4], [26.1, 47.1], [25.6, 47.6], [25.0, 47.8], [25.4, 48.6], [35, 48.6], [35, 40], [20, 40], [20, 46.7]];
const RUSSIA_NO_KOENIGSBERG = [[23.05, 30], [23.05, 85], [190, 85], [190, 30]];
const LITHUANIA_NO_MEMEL = [[20.5, 56.6], [30, 56.6], [30, 53], [22.2, 53], [22.2, 55.05], [22.15, 55.35], [21.95, 55.62], [21.6, 55.86], [21.3, 55.98], [20.5, 55.98]];
export const USSR_1943 = [
  { c: '643', clip: RUSSIA_NO_KOENIGSBERG }, { c: '804', clip: UKR_SOVIET }, { c: '112' }, { c: '440', clip: LITHUANIA_NO_MEMEL },
  { c: '428' }, { c: '233' }, { c: '268' }, { c: '051' }, { c: '031' }, { c: '398' }
];
export const GROUPS_1943 = [
  REICH_1942,
  [{ c: '616', clip: GG_POLAND }, { c: '804', clip: GALICIA }],                              // Generalgouvernement
  USSR_1943,
  [{ c: '642', clip: S_ROMANIA }, { c: '498' }, { c: '804', clip: N_BUKOVINA }],             // Rumänien mit Bessarabien, Nordbukowina
  [{ c: '348' }, { c: '804', clip: ZAKARPATTIA }, { c: '642', clip: N_TRANSYLVANIA }]        // Ungarn mit Karpatenukraine, Nordsiebenbürgen
];
