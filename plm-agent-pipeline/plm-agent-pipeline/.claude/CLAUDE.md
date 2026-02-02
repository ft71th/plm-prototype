# PLM Prototype — Projektregler & Kontext

## Översikt

Detta är en PLM-prototypapplikation (Product Lifecycle Management) byggd i React. Applikationen inkluderar systemdesignverktyg med canvas-baserad visualisering, komponentbibliotek, issue-hantering och Northlight-integration för marina krafthanteringssystem (MIAS 2.0 PMS).

## Arkitektur

- **Frontend:** React med funktionella komponenter och hooks
- **Canvas/Visualisering:** Nodbaserad grafeditor med drag-and-drop
- **State management:** React state + context där tillämpligt
- **Styling:** CSS modules / styled-components
- **Northlight-integration:** JSON-baserad import/export med specifik schema-compliance

## Nyckelmoduler

| Modul | Beskrivning |
|---|---|
| Canvas Editor | Nodbaserad systemdesign med kopplingar, resize, annotations |
| Component Library | Komponentbibliotek med versionskontroll |
| Issue Management | Ärendehantering med kategorier, prioriteter, statusflöde |
| Text Annotations | Textverktyg med formateringsalternativ |
| Northlight Export | JSON-export enligt MIAS 2.0 PMS femlagersarkitektur |

## Northlight JSON-schema

Northlight-filer MÅSTE följa det specifika schemat med:
- Exakta nodtypsklassificeringar
- Detaljerade portstrukturer med riktningsangivelser (in/out)
- Edge-definitioner med specifika handle-referenser och arrow-styling
- Femlagersarkitektur: Communication Layer, Application Layer, Power Management Functions, Hardware Abstraction Layer, Physical Layer

## Arbetsflöde med agenter

Projektet använder en 7-stegs agent-pipeline:

```
/plan → /architect → /test-spec → /develop → /review → /qa → /deploy
```

Varje steg producerar artefakter som nästa steg konsumerar:
- **plan** → `docs/specs/{feature}.md`
- **architect** → `docs/architecture/{feature}.md`
- **test-spec** → `tests/{feature}/` (testfiler)
- **develop** → Källkod
- **review** → `docs/reviews/{feature}.md`
- **qa** → Testresultat (stdout)
- **deploy** → Git commit + push

## Viktiga regler

1. **Tester först** — Ingen feature anses klar utan att testfallen passerar
2. **Specifikation som sanning** — Vid oklarheter, referera till spec-filen, INTE minne
3. **Inkrementella commits** — Varje feature i sin egen branch och PR
4. **Northlight-kompatibilitet** — Alla canvas-ändringar måste fortsatt producera valid Northlight JSON
5. **Ingen feature-regression** — Befintliga tester FÅR INTE brytas av nya features

## Konventioner

- **Branch-namngivning:** `feature/{feature-slug}`, `fix/{issue-slug}`, `refactor/{beskrivning}`
- **Commit-meddelanden:** Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`)
- **Filplacering:**
  - Komponenter: `src/components/{ModuleName}/`
  - Hooks: `src/hooks/`
  - Utils: `src/utils/`
  - Tester: `tests/` (speglar src-strukturen)
  - Specifikationer: `docs/specs/`
  - Arkitekturdokument: `docs/architecture/`

## Kända begränsningar & gotchas

- Feature-synk mellan sessioner kan tappas — referera ALLTID till testfiler och spec-docs
- Northlight JSON-schema skiljer sig från generiska grafformat — kontrollera portstrukturer noga
- Komponentbiblioteket har versionskontroll — uppdatera versionsnummer vid ändringar
