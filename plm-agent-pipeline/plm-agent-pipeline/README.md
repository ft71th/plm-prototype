# 🚀 PLM Agent Pipeline

Ett 7-stegs agent-system som automatiserar hela utvecklingsflödet från idé till deploy.

## Snabbstart

```bash
# I Claude Code, starta en ny feature:
claude /plan "Lägg till drag-and-drop för komponenter i canvas"

# Följ kedjan steg för steg:
claude /architect
claude /test-spec
claude /develop
claude /review
claude /qa
claude /deploy

# Eller kör hela pipeline via script:
./pipeline.sh "Lägg till drag-and-drop för komponenter"
```

## Agenter

| # | Kommando | Agent | Gör vad |
|---|---|---|---|
| 1 | `/plan` | 🎯 Product Agent | Idé → User stories + acceptanskriterier |
| 2 | `/architect` | 🏗️ Architect Agent | Stories → Teknisk design + komponentspec |
| 3 | `/test-spec` | 🧪 Test-Spec Agent | Design → Testfall (TDD, tester före kod) |
| 4 | `/develop` | 💻 Developer Agent | Spec + tester → Implementation |
| 5 | `/review` | 🔍 Review Agent | Kodgranskning med "fräscha ögon" |
| 6 | `/qa` | ✅ QA Agent | Full testsvit + regressionskontroll |
| 7 | `/deploy` | 🚀 Deploy Agent | Git branch, commit, push, PR-prep |

**Bonus-kommandon:**
- `/status` — Visa pipeline-status för alla features
- `/hotfix` — Snabb buggfix utan full pipeline (max 20 rader)

## Artefakter

Varje steg producerar filer som nästa steg konsumerar:

```
docs/
├── specs/
│   └── {feature}.md          ← Skapas av /plan
├── architecture/
│   └── {feature}.md          ← Skapas av /architect
└── reviews/
    └── {feature}.md          ← Skapas av /review

tests/
└── {feature}/
    ├── {feature}.unit.test.js        ← Skapas av /test-spec
    ├── {feature}.integration.test.js ← Skapas av /test-spec
    ├── {feature}.regression.test.js  ← Skapas av /test-spec
    └── TEST-PLAN.md                  ← Skapas av /test-spec

src/                           ← Ändras av /develop
```

## Pipeline-script

Det medföljande `pipeline.sh` kör hela kedjan med inbyggda approval-gates:

```bash
# Standard — med godkännande mellan varje steg
./pipeline.sh "Min feature-beskrivning"

# Auto-mode — kör utan stopp (review kräver alltid godkännande)
./pipeline.sh "Min feature" --auto

# Börja från ett specifikt steg (om du redan har spec t.ex.)
./pipeline.sh "Min feature" --from develop

# Dry-run — visa vad som skulle köras
./pipeline.sh "Min feature" --dry-run
```

### Approval-gates

Vid varje gate kan du:
- **[y]** Godkänn och fortsätt
- **[n]** Avbryt pipeline
- **[r]** Kör om steget
- **[s]** Hoppa över till nästa steg

Review-steget kräver ALLTID manuellt godkännande, även i auto-mode.

## Flödesdiagram

```
   Du: "Jag vill ha X"
         │
         ▼
    ┌─────────┐     docs/specs/{x}.md
    │  /plan   │────────────────────────┐
    └────┬─────┘                        │
         │                              ▼
    ┌────┴─────┐     docs/architecture/{x}.md
    │/architect│────────────────────────┐
    └────┬─────┘                        │
         │                              ▼
    ┌────┴──────┐    tests/{x}/*.test.js
    │/test-spec │────────────────────────┐
    └────┬──────┘                        │
         │                               ▼
    ┌────┴─────┐     src/ (ändrad kod)
    │ /develop │◄──────────────────┐
    └────┬─────┘                   │
         │                         │ (om review/QA failar)
    ┌────┴─────┐                   │
    │ /review  │───────────────────┤
    └────┬─────┘                   │
         │                         │
    ┌────┴─────┐                   │
    │   /qa    │───────────────────┘
    └────┬─────┘
         │
    ┌────┴─────┐     git push + PR
    │ /deploy  │──────────────────── 🎉
    └──────────┘
```

## Anpassa

### Ändra en agent

Redigera motsvarande fil i `.claude/commands/`. Varje fil är en systemrollsbeskrivning i markdown.

### Lägg till ett steg

1. Skapa `.claude/commands/{mitt-steg}.md`
2. Lägg till steget i `pipeline.sh`
3. Uppdatera `CLAUDE.md` med den nya steg-ordningen

### Integrera med CI/CD

Pipeline-scriptet kan integreras med GitHub Actions eller liknande:

```yaml
# .github/workflows/agent-pipeline.yml (konceptuellt)
on:
  issues:
    types: [labeled]

jobs:
  pipeline:
    if: contains(github.event.label.name, 'auto-implement')
    steps:
      - run: ./pipeline.sh "${{ github.event.issue.title }}" --auto
```

## Filosofi

1. **Tester först** — Testfallen är den exekverbara sanningen
2. **Separation of concerns** — Varje agent har ETT jobb
3. **Artefakter som kontrakt** — Steg kommunicerar via filer, inte minne
4. **Human in the loop** — Approval-gates där det behövs
5. **Fail fast** — Stoppa pipeline tidigt vid problem
