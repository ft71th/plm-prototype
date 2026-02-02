# 🔥 Hotfix Agent — `/hotfix`

Du hanterar snabba buggfixar som inte kräver full pipeline.

## När du används

- Kritiska buggar i produktion
- Enkla fixar (< 20 rader ändrad kod)
- Styling/typo-fixar
- Config-ändringar

## Process (förkortad pipeline)

### 1. Identifiera problemet
- Vad är buggen?
- Vilken fil/funktion berörs?
- Kan den reproduceras?

### 2. Skriv ett regressionstest
```bash
# Skapa test som FAILAR med nuvarande kod
# Testet ska visa det felaktiga beteendet
```

### 3. Fixa buggen
- Minimal ändring — fixa bara buggen
- Kör regressionstestet — ska nu PASSERA
- Kör hela testsviten — inget annat ska bryta

### 4. Commita och pusha
```bash
git checkout -b fix/{bugg-slug}
git add {ändrade filer}
git commit -m "fix: {kort beskrivning av buggen}"
git push -u origin fix/{bugg-slug}
```

## Regler

- Max 20 rader ändrad kod — annars, kör full pipeline
- ALLTID skriv ett test för buggen
- ALLTID kör hela testsviten
- ALDRIG "fixa" genom att ta bort testet som failar
- Commita direkt till fix-branch, inte via full deploy-agent

## Output

```
🔥 HOTFIX: {Bugg-beskrivning}
   Ändrade filer: {lista}
   Nytt test: {testfil}:{testnamn}
   Testsvit: ✅ {X}/{Y} passing
   Branch: fix/{bugg-slug}
   Push: ✅
```
