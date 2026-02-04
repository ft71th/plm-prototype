# PLM Document View - Inline Editing Update

## Vad är nytt?

### ✨ Ny funktionalitet:
1. **Inline editing** - Klicka på titel, beskrivning eller rationale för att redigera direkt
2. **Dokumentöversikt (Outline)** - Vänster panel med navigering till alla sektioner
3. **Expand/Collapse** - Fäll ihop/expandera sektioner med barn
4. **Visuell feedback** - Blå ram vid redigering, hover-effekter
5. **Keyboard shortcuts** - Enter för spara, Escape för avbryt

### 🔄 Synkronisering:
- Ändringar i DocumentView synkroniseras automatiskt till PLM Canvas-vyn
- Samma `updateNodeData` funktion används överallt

---

## Installation

### Steg 1: Ersätt DocumentView-funktionen

I `App.js`, hitta funktionen `function DocumentView` (cirka rad 6964).

**Ersätt HELA funktionen** (från `function DocumentView` till dess avslutande `}`) med innehållet i filen `DocumentView-enhanced.jsx`.

Funktionen slutar ungefär vid rad 7350 där du ser:
```javascript
  );
}
```
följt av nästa funktion eller komponent.

### Steg 2: Uppdatera DocumentView-anropet

Hitta där `<DocumentView` anropas (cirka rad 11850). 

**Ändra från:**
```javascript
<DocumentView 
  nodes={nodes} 
  edges={edges} 
  onNodeClick={(node) => {
    setSelectedNode(node);
    setFloatingPanelPosition({ x: window.innerWidth - 350, y: 100 });
  }}
/>
```

**Till:**
```javascript
<DocumentView 
  nodes={nodes} 
  edges={edges} 
  onNodeClick={(node) => {
    setSelectedNode(node);
    setFloatingPanelPosition({ x: window.innerWidth - 350, y: 100 });
  }}
  onUpdateNode={updateNodeData}
/>
```

Det enda som läggs till är: `onUpdateNode={updateNodeData}`

---

## Användning

### Redigera text:
1. Klicka på titel, beskrivning eller rationale
2. Texten får en blå ram och blir redigerbar
3. Skriv din text
4. **Enter** = Spara
5. **Escape** = Avbryt
6. **Klicka utanför** = Spara

### Navigera i dokumentet:
- Använd **dokumentöversikten** (vänster panel) för snabb navigering
- Klicka på en sektion för att scrolla dit
- Stäng översikten med ✕ eller öppna med "📑 Visa översikt"

### Expandera/Fäll ihop:
- Klicka på ▼/▶ under sektionsnumret
- Visar antal barn-element

---

## Keyboard Shortcuts

| Tangent | Aktion |
|---------|--------|
| `Enter` | Spara ändringar |
| `Escape` | Avbryt redigering |
| `Shift+Enter` | Ny rad (i flerradsfält) |

---

## Tekniska detaljer

### Nya props för DocumentView:
- `onUpdateNode(nodeId, field, value)` - Callback för att uppdatera nod-data

### Interna state:
- `editingField` - Vilken nod/fält som redigeras just nu
- `expandedSections` - Vilka sektioner som är ihopfällda
- `showOutline` - Om dokumentöversikten visas

### Data som kan redigeras:
- `label` - Titel
- `description` - Beskrivning
- `rationale` - Motivering

---

## Framtida förbättringar

- [ ] Rich text formatting (bold, italic, listor)
- [ ] Drag & drop för omordning av sektioner
- [ ] Snabb-redigering av status/prioritet inline
- [ ] Auto-save med debounce
- [ ] "Unsaved changes" indikator
- [ ] Kommentarer per sektion
