# WW2 Szenen Studio

Eine Browser-Umgebung (HTML, CSS, JavaScript, Three.js), die alle Szenen des Skripts
„Von der Kriegswende zur Kapitulation“ als reduzierte 3D-Animationen im Stil von Simplicissimus
rendert. Jede Szene ist konfigurierbar und kann als Video (WebM) oder als bildgenaue PNG-Sequenz
exportiert werden. Den Schnitt machst du anschließend in deinem Schnittprogramm.

- `Skript.md` – der Sprechertext
- `SZENEN.md` – die Szenenliste mit Bildideen und Richtlängen
- `index.html`, `style.css`, `js/` – die Anwendung

## Starten

Die Seite lädt ES-Module, deshalb braucht sie einen lokalen Webserver (direkt per Doppelklick auf
`index.html` blockiert Chrome die Module).

```bash
cd ww2-scene-gen
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Alternativ `npx serve .` oder die „Live Server“-Erweiterung in VS Code. Three.js wird von einem CDN
geladen, es ist also eine Internetverbindung nötig. Empfohlener Browser: Chrome oder Edge
(für den PNG-Export zwingend, WebM geht auch in Firefox).

## Oberfläche

| Bereich | Inhalt |
|---|---|
| Links | Szenenliste (01–16), Klick wechselt die Szene. Tastatur: Bild auf / Bild ab |
| Mitte | Vorschau in Exportauflösung, darunter Skripttext, Transport (Leertaste = Play/Pause, ←/→ = ein Bild) |
| Rechts, „Szene“ | Dauer, Bauchbinde (zwei Zeilen), Untertiteltext, szenenspezifische Parameter, Kamera |
| Rechts, „Global“ | Auflösung, Shading, Schatten, Filmkorn, Vignette, Letterbox, Ein-/Ausblenden, Textstil, Export |

Alle Einstellungen werden automatisch im Browser gespeichert (localStorage) und lassen sich unter
„Einstellungen sichern“ als JSON exportieren und wieder importieren.

### Kamera einrichten

1. Im Ordner „Kamera“ den Haken „Freie Kamera (Maus)“ setzen.
2. Mit der Maus drehen (linke Taste), zoomen (Rad) und verschieben (rechte Taste).
3. „Kameraposition als Start übernehmen“ bzw. „… als Ende übernehmen“ klicken.
4. Haken wieder entfernen. Die Szene fährt jetzt von Start nach Ende, Blickpunkt inklusive.

Die Felder Start/Ende/Blickpunkt lassen sich auch direkt tippen. „Wackeln“ gibt Handkamera-Unruhe.

## Export

Alles, was im Video landen soll, wird in das Ausgabebild gezeichnet: 3D-Bild, Bauchbinde,
optionale Untertitel, Vignette, Filmkorn, Letterbox und die Blenden. Der Export nimmt genau das auf,
was in der Vorschau zu sehen ist.

**WebM (Echtzeit)** – spielt die Szene einmal ab und nimmt sie mit dem Browser-Encoder auf.
Schnell und ohne Zusatzwerkzeug, aber der Tab muss sichtbar bleiben; bei schwacher Grafikkarte
können Bilder ausfallen. Bitrate einstellbar.

**PNG-Sequenz (Chrome)** – rendert Bild für Bild deterministisch in einen Ordner deiner Wahl
(`01_pearl-harbor/frame_00000.png` …). Kein Frame-Drop, beliebig hohe Auflösung. Zu einem Video
zusammensetzen mit ffmpeg:

```bash
ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 01_pearl-harbor.mp4
```

Für DaVinci Resolve, Premiere oder Final Cut kann die PNG-Sequenz auch direkt als Bildsequenz
importiert werden.

„Alle Szenen nacheinander exportieren“ geht die Liste komplett durch. „Standbild speichern“ sichert
das aktuelle Bild als PNG (z. B. für Thumbnails).

Tipp für Szene 15 (Atombombe): einmal mit Bauchbinde „Hiroshima / 6. August 1945“ exportieren,
dann die Bauchbinde auf „Nagasaki / 9. August 1945“ ändern und erneut exportieren.

## Look (Referenz: Simplicissimus)

Der Standard-Look folgt dem Animationsstil des Kanals: kalte, blaugraue Minimalkulissen mit Lichtkegeln am
Boden, Figuren als einfarbig leuchtende Silhouetten (Rollenfarben unter „Global → Rollenfarben“: Achse rot,
Westalliierte blau, Sowjetunion gelb, Zivilisten weiß), Bloom, Filmkorn, Vignette und eine kleine
Serifen-Bauchbinde unten links (Datum über Ort). Karten sind dunkle Geländetexturen mit weißen Grenzbändern,
roten Flächen für gegnerisches Gebiet, gesperrten Ländernamen und leuchtenden Pfeilen. Alles ist unter
„Global → Bild / Look / Text“ einstellbar, der frühere helle Comic-Look ist über Shading „toon“,
Abdunkeln 0 und Bloom 0 wieder erreichbar.

## Figuren

Die Figuren sind realistisch proportionierte, geriggte Mixamo-Charaktere (`assets/models/mixamo/`: Remy, Megan,
Leonard, Brian, Joe, Kate, Louise, James, Suzie und der Soldat „Vanguard“), ohne Texturen, da sie nur als leuchtende
Silhouetten gerendert werden. Dazu kommt eine Mixamo-Animationsbibliothek (`assets/models/anim/`, rund 40 Clips:
Idle, Walking, Running, Gewehr-Idle/Walk/Run, Sitzen, Schreiben am Tisch, Jubeln, Reden, Heben, Tragen, Schaufeln,
Sterben, Knien, Beten, Weinen, Salutieren). Die Clips werden beim Laden auf das Skelett jedes Modells gemappt
(Knochenpräfix, Hüfthöhe und Drehung des Hüft-Elternteils werden umgerechnet). Lizenzhinweise in
`assets/models/LICENSE.md`. „Global → Bild → Figuren: Kapselfiguren“ schaltet auf die einfachen Platzhalter um.

In Szenen: `H.figure({ model: 'soldier' | 'civil' | 'suit' | 'worker', pose: 'Male_Writing_While_Seated', glow: H.ROLE.west })`;
`userData.walk(t, amp)` lässt gehen (amp > 1.1 rennen), `userData.pose(name, t)` spielt einen beliebigen Clip aus `H.CLIP_NAMES`.
Eigene Clips: Mixamo-Animation als GLB (nur Skelett) nach `assets/models/anim/` legen und in `CLIP_NAMES` eintragen.

## Texte abschalten

„Global → Text → ALLE Texte aus“ entfernt Bauchbinde, Untertitel und alle 3D-Beschriftungen (Karten, Globus)
aus dem Bild, damit du Text später im Schnitt selbst setzen kannst. Die Einstellung gilt auch für den Export.

## Eigene Szenen

Jede Szene ist eine Datei in `js/scenes/` und wird in `js/scenes/index.js` registriert.
Der Aufbau:

```js
import * as H from '../common.js';

export default {
  id: 'meine-szene', title: 'Titel in der Liste', seed: 42, duration: 8,
  script: 'Satz aus dem Skript (wird als Untertitel angeboten)',
  caption: { title: 'Bauchbinde', sub: 'Zweite Zeile' },
  params: {
    anzahl: { type: 'number', min: 1, max: 20, step: 1, value: 5, label: 'Anzahl' },
    farbe:  { type: 'color', value: '#c6473a', label: 'Farbe' },
    ...H.cameraParams([0, 5, 20], [0, 4, 15], [0, 1, 0], 40)   // Start, Ende, Blickpunkt, FOV
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#a7bfcf'); H.lights(scene, { shadows });
    const f = H.figure({ color: p.farbe }); scene.add(f);
    return {
      update(t, p) { f.position.x = t; f.userData.walk(t); },   // t in Sekunden, deterministisch
      camera(t, cam, p) { /* optional: eigene Kamerafahrt */ },
      dispose() { /* optional */ }
    };
  }
};
```

Parameter ohne `live: true` lösen beim Ändern einen Neuaufbau der Szene aus; `live: true`
(z. B. Kamera) wird jedes Bild frisch gelesen. Zufall nur über `r()` (seeded), damit der PNG-Export
bildgenau reproduzierbar bleibt.

`js/common.js` enthält die Bausteine: Figuren, Panzer, Flugzeuge, Schiffe, Landungsboote, Gebäude,
Ruinen, Städte, Bäume, Wolken, Pfeile, Europakarte (`europeMap`), Globus mit Bögen (`globe`),
Explosionen, Rauchsäulen, Partikel (Schnee, Staub, Sterne), Flaggen, Tisch und Dokument mit
Unterschrift, Wasser mit Wellen sowie Easing-Funktionen.
