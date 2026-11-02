# Figurenmodelle und Animationen

## `mixamo/` – Charaktere
Realistisch proportionierte, geriggte Charaktere von **Adobe Mixamo** (Remy, Megan, Leonard, Brian, Joe, Kate, Louise,
James, Suzie sowie der Soldat „Vanguard“ aus den three.js-Beispielen). Texturen wurden entfernt, da die Figuren nur als
leuchtende Silhouetten gerendert werden (je ca. 1–2 MB statt 35–60 MB).

Lizenz: Mixamo-Nutzungsbedingungen von Adobe. Charaktere und Animationen dürfen frei in eigenen Produktionen
(auch kommerziell, etwa YouTube-Videos) verwendet werden; sie dürfen nicht als eigenständige 3D-Assets weiterverkauft
oder weiterverbreitet werden. Für eine Veröffentlichung des Repos solltest du diesen Ordner also nicht mit ausliefern,
für das fertige Video ist die Nutzung unproblematisch.

## `anim/` – Animationsclips
Mixamo-Animationen als reine Skelett-GLBs (Idle, Walking, Running, Rifle-Varianten, Sitzen, Schreiben, Jubeln, Heben,
Tragen, Schaufeln, Sterben, Knien, Beten, Weinen, Salutieren …). Gleiche Lizenz wie oben. Beim Laden werden die Spuren
auf das „mixamorig:“-Skelett der Charaktere gemappt und die Hüftbewegung je Modell skaliert (`js/common.js`,
`preloadModels`). Weitere Clips: einfach als GLB nach `assets/models/anim/` legen und in `CLIP_NAMES` eintragen.
