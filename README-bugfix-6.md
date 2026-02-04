# PLM Bugfix 6 - Grupp-duplicering & TopHeader

## ✅ Fixar i denna version

### Fix 1: Grupp-duplicering i Draw-läge (Whiteboard)
**Problem:** När man duplicerade (Ctrl+D) ett grupperat objekt i Draw-läge duplicerades bara grupp-ramen, inte de faktiska figurerna/objekten. Den nya gruppen var också "ihoplänkad" med originalet.

**Lösning:** Omskriven `duplicateElements()` funktion i whiteboardStore.js:
1. Samlar alla element som ska dupliceras (grupp + alla barn)
2. Skapar en ID-mappning (gamla ID → nya ID)
3. Duplicerar alla element med uppdaterade referenser
4. Grupper får nya `childIds` som pekar på de nya barnen
5. Barn får `groupId` som pekar på den nya gruppen

### Fix 2: TopHeader skymmer toolbar
**Problem:** TopHeader skymde delvis Whiteboard-toolbaren pga att border inte räknades in i höjden.

**Lösning:** Lagt till `boxSizing: 'border-box'` på TopHeader så att 50px inkluderar border.

---

## Installation

```powershell
cd C:\Users\fredrik.thompson\plm-prototype

# Backup
copy src\App.js src\App.js.backup
copy src\stores\whiteboardStore.js src\stores\whiteboardStore.js.backup

# Installera fixarna
Expand-Archive -Path "$HOME\Downloads\plm-bugfix-6.zip" -DestinationPath "." -Force

npm start
```

---

## Testa

### Test 1: Grupp-duplicering
1. Gå till Draw-läge
2. Skapa några former (rektanglar, ellipser)
3. Markera formerna
4. Tryck Ctrl+G för att gruppera
5. Tryck Ctrl+D för att duplicera
6. **Förväntat:** Ny grupp med alla former duplicerade
7. Dra den nya gruppen - den ska flytta separat från originalet

### Test 2: TopHeader
1. Gå till Draw-läge
2. **Förväntat:** Toolbar ska vara helt synlig utan överlapp

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/App.js` | TopHeader: boxSizing: border-box |
| `src/stores/whiteboardStore.js` | duplicateElements() omskriven |
| `src/components/Whiteboard/Whiteboard.jsx` | SaveNotification position justerad |

---

*Bugfix 6 - 2026-02-04*
