#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  PLM Agent Pipeline — Orkestrering
#  Kör hela kedjan från idé till deploy med approval-gates
# ═══════════════════════════════════════════════════════════

set -e

# Färger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Banner
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║       PLM Agent Pipeline v1.0             ║"
echo "  ║  plan → architect → test → dev → deploy   ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Feature-beskrivning
if [ -z "$1" ]; then
    echo -e "${YELLOW}Användning:${NC}"
    echo "  ./pipeline.sh \"Beskriv din feature här\""
    echo ""
    echo -e "${YELLOW}Alternativ:${NC}"
    echo "  --auto        Kör utan approval-gates (utom review)"
    echo "  --from STEG   Börja från ett specifikt steg"
    echo "  --dry-run     Visa vad som skulle köras utan att köra"
    echo ""
    echo -e "${YELLOW}Steg:${NC} plan, architect, test-spec, develop, review, qa, deploy"
    echo ""
    echo -e "${YELLOW}Exempel:${NC}"
    echo "  ./pipeline.sh \"Lägg till drag-and-drop för komponenter\""
    echo "  ./pipeline.sh \"Fix bugg i exportfunktionen\" --from develop"
    echo "  ./pipeline.sh \"Ny sökfunktion\" --auto"
    exit 1
fi

FEATURE="$1"
AUTO_MODE=false
START_FROM="plan"
DRY_RUN=false

# Parse arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)     AUTO_MODE=true; shift ;;
        --from)     START_FROM="$2"; shift 2 ;;
        --dry-run)  DRY_RUN=true; shift ;;
        *)          echo "Okänt argument: $1"; exit 1 ;;
    esac
done

# Hjälpfunktioner
step_header() {
    local emoji="$1"
    local step="$2"
    local desc="$3"
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BOLD}  $emoji  Steg: $step${NC}"
    echo -e "  $desc"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
}

approval_gate() {
    local step_name="$1"
    if [ "$AUTO_MODE" = true ]; then
        echo -e "${GREEN}  [AUTO] Godkänt automatiskt${NC}"
        return 0
    fi

    echo ""
    echo -e "${YELLOW}  ┌─────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  Granska output ovan.           │${NC}"
    echo -e "${YELLOW}  │  Godkänn för att fortsätta.     │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────┘${NC}"
    echo ""
    echo -e "  ${BOLD}[y]${NC} Godkänn och fortsätt"
    echo -e "  ${BOLD}[n]${NC} Avbryt pipeline"
    echo -e "  ${BOLD}[r]${NC} Kör om steget"
    echo -e "  ${BOLD}[s]${NC} Hoppa över till nästa steg"
    echo ""
    read -p "  Val: " choice

    case $choice in
        y|Y|yes)    return 0 ;;
        n|N|no)     echo -e "${RED}  Pipeline avbruten av användare.${NC}"; exit 0 ;;
        r|R|redo)   return 1 ;;
        s|S|skip)   return 2 ;;
        *)          echo -e "${RED}  Ogiltigt val.${NC}"; approval_gate "$step_name" ;;
    esac
}

run_step() {
    local command="$1"
    local args="$2"

    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${CYAN}[DRY RUN] Skulle köra: claude /$command $args${NC}"
        return 0
    fi

    # Kör Claude Code med command
    if [ -n "$args" ]; then
        claude "//$command" "$args"
    else
        claude "//$command"
    fi
}

# Bestäm start-steg (numeriskt)
step_to_num() {
    case $1 in
        plan)       echo 1 ;;
        architect)  echo 2 ;;
        test-spec)  echo 3 ;;
        develop)    echo 4 ;;
        review)     echo 5 ;;
        qa)         echo 6 ;;
        deploy)     echo 7 ;;
        *)          echo 0 ;;
    esac
}

START_NUM=$(step_to_num "$START_FROM")
if [ "$START_NUM" -eq 0 ]; then
    echo -e "${RED}Okänt steg: $START_FROM${NC}"
    echo "Tillgängliga steg: plan, architect, test-spec, develop, review, qa, deploy"
    exit 1
fi

CURRENT_STEP=0
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo -e "${BOLD}Feature:${NC} $FEATURE"
echo -e "${BOLD}Startar från:${NC} $START_FROM"
echo -e "${BOLD}Auto-mode:${NC} $AUTO_MODE"
echo -e "${BOLD}Tid:${NC} $TIMESTAMP"

# ═══════════════════════════════════════
# STEG 1: PLAN
# ═══════════════════════════════════════
CURRENT_STEP=1
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "🎯" "PLAN" "Omvandlar idé till strukturerad specifikation"

    while true; do
        run_step "plan" "$FEATURE"
        approval_gate "plan"
        result=$?
        [ $result -eq 0 ] && break    # Godkänd
        [ $result -eq 2 ] && break    # Skip
        # result=1 → Kör om (loop continues)
    done
fi

# ═══════════════════════════════════════
# STEG 2: ARCHITECT
# ═══════════════════════════════════════
CURRENT_STEP=2
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "🏗️" "ARCHITECT" "Designar teknisk lösning"

    while true; do
        run_step "architect"
        approval_gate "architect"
        result=$?
        [ $result -eq 0 ] && break
        [ $result -eq 2 ] && break
    done
fi

# ═══════════════════════════════════════
# STEG 3: TEST-SPEC
# ═══════════════════════════════════════
CURRENT_STEP=3
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "🧪" "TEST-SPEC" "Skapar testfall (TDD — tester före kod)"

    # Test-spec har ingen approval gate normalt — tester är alltid bra
    run_step "test-spec"

    if [ "$AUTO_MODE" = false ]; then
        echo -e "${GREEN}  Testfall skapade. Fortsätter automatiskt...${NC}"
        sleep 1
    fi
fi

# ═══════════════════════════════════════
# STEG 4: DEVELOP
# ═══════════════════════════════════════
CURRENT_STEP=4
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "💻" "DEVELOP" "Implementerar kod tills alla tester passerar"

    run_step "develop"

    # Inget approval gate — vi litar på tester
    echo -e "${GREEN}  Implementation klar.${NC}"
fi

# ═══════════════════════════════════════
# STEG 5: REVIEW
# ═══════════════════════════════════════
CURRENT_STEP=5
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "🔍" "REVIEW" "Kodgranskning med fräscha ögon"

    while true; do
        run_step "review"
        # Review har ALLTID approval gate, även i auto-mode
        if [ "$AUTO_MODE" = true ]; then
            AUTO_MODE=false
            approval_gate "review"
            result=$?
            AUTO_MODE=true
        else
            approval_gate "review"
            result=$?
        fi
        [ $result -eq 0 ] && break
        [ $result -eq 2 ] && break

        # Om review kräver omarbetning, kör develop igen
        echo -e "${YELLOW}  Kör om /develop för att åtgärda review-kommentarer...${NC}"
        run_step "develop"
    done
fi

# ═══════════════════════════════════════
# STEG 6: QA
# ═══════════════════════════════════════
CURRENT_STEP=6
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "✅" "QA" "Kör hela testsviten och verifierar"

    while true; do
        run_step "qa"
        approval_gate "qa"
        result=$?
        [ $result -eq 0 ] && break
        [ $result -eq 2 ] && break

        echo -e "${YELLOW}  Kör om /develop för att fixa QA-problem...${NC}"
        run_step "develop"
    done
fi

# ═══════════════════════════════════════
# STEG 7: DEPLOY
# ═══════════════════════════════════════
CURRENT_STEP=7
if [ "$CURRENT_STEP" -ge "$START_NUM" ]; then
    step_header "🚀" "DEPLOY" "Git commit, push och PR-förberedelse"

    # Deploy har alltid approval gate
    if [ "$AUTO_MODE" = true ]; then
        AUTO_MODE=false
        approval_gate "deploy (bekräfta push)"
        result=$?
        AUTO_MODE=true
    else
        echo -e "${YELLOW}  Bekräfta att du vill pusha till remote:${NC}"
        approval_gate "deploy"
        result=$?
    fi

    if [ $result -eq 0 ]; then
        run_step "deploy"
    else
        echo -e "${YELLOW}  Deploy hoppades över.${NC}"
    fi
fi

# ═══════════════════════════════════════
# KLAR!
# ═══════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║        🎉  PIPELINE KLAR!                 ║"
echo "  ║                                           ║"
echo "  ║  Feature: $FEATURE"
echo "  ║  Tid: $(date '+%Y-%m-%d %H:%M')          ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"
