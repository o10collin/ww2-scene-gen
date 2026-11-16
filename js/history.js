// Historische Gebiete, zusammengesetzt aus heutigen Ländern (ISO-3166-Nummern) und Schnittpolygonen [lon, lat].
// Vereinfacht für die Darstellung; genutzt von Globus (Szene 2) und Europakarte (Szene 3).

// Großdeutsches Reich 1941/42: Deutschland, Österreich, Böhmen und Mähren (Sudetenland + Protektorat), Luxemburg,
// annektierte Teile Polens (Danzig-Westpreußen, Wartheland, Ost-Oberschlesien, Zichenau, Suwałki),
// Ostpreußen mit Memelland, Elsass-Lothringen (de facto annektiert), Untersteiermark/Oberkrain (Nord-Slowenien)
export const ANNEX_PL = [[14, 55.3], [23.6, 55.3], [23.6, 54.0], [22.9, 53.9], [22.0, 53.55], [21.3, 53.1], [20.7, 52.75], [20.35, 52.5], [19.9, 52.2], [19.75, 51.85], [19.75, 51.55], [19.45, 51.1], [19.6, 50.6], [19.7, 50.2], [19.45, 49.6], [14, 49.6]];
export const ALSACE_LORRAINE = [[5.85, 49.6], [8.4, 49.6], [8.4, 47.3], [6.8, 47.4], [6.95, 47.95], [7.15, 48.5], [6.9, 48.75], [6.3, 48.85], [5.9, 49.05]];
export const KOENIGSBERG = [[19.2, 55.5], [23.0, 55.5], [23.0, 54.25], [19.2, 54.25]];
export const MEMEL = [[20.8, 56.1], [21.9, 56.1], [21.9, 55.25], [20.8, 55.25]];
export const NORD_SLOWENIEN = [[13.3, 47.0], [16.8, 47.0], [16.8, 45.85], [15.2, 45.85], [14.7, 46.1], [14.4, 46.15], [13.6, 46.35]];
export const REICH_1942 = [
  { c: '276' }, { c: '040' }, { c: '203' }, { c: '442' },
  { c: '616', clip: ANNEX_PL }, { c: '250', clip: ALSACE_LORRAINE }, { c: '643', clip: KOENIGSBERG }, { c: '440', clip: MEMEL }, { c: '705', clip: NORD_SLOWENIEN }
];
// Italien mit Albanien (1939 angeschlossen)
export const ITALY_1941 = [{ c: '380' }, { c: '008' }];
// Japanisches Kaiserreich (Kernland, Korea, Taiwan); Mandschukuo und besetzte Teile Chinas nicht enthalten
export const JAPAN_1941 = [{ c: '392' }, { c: '408' }, { c: '410' }, { c: '158' }];
