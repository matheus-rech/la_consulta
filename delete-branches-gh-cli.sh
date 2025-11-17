#!/bin/bash
# GitHub CLI Branch Deletion Script
# Run this from your local machine with gh CLI authenticated
# Install gh: https://cli.github.com/

set -e

echo "🧹 GitHub Branch Cleanup via GitHub CLI"
echo "========================================="
echo ""

REPO="matheus-rech/la_consulta"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if gh is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "${RED}❌ GitHub CLI is not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo "${GREEN}✓ GitHub CLI is ready${NC}"
echo ""

# All branches to delete (58 total)
BRANCHES_TO_DELETE=(
  # Copilot merged (9)
  "copilot/sub-pr-46-de362210-6373-40e3-9ca5-35b1209a6e73"
  "copilot/sub-pr-46-please-work"
  "copilot/sub-pr-46-e0dbf826-8274-4553-9241-789c8d40b38c"
  "copilot/sub-pr-46-yet-again"
  "copilot/sub-pr-46-1e4d356c-9a73-4d08-83c2-65a7408c1aa3"
  "copilot/sub-pr-46-one-more-time"
  "copilot/sub-pr-46-again"
  "copilot/sub-pr-46"
  "copilot/sub-pr-46-another-one"

  # Copilot other (24)
  "copilot/sub-pr-3"
  "copilot/sub-pr-6"
  "copilot/sub-pr-8"
  "copilot/sub-pr-8-again"
  "copilot/sub-pr-9"
  "copilot/sub-pr-12"
  "copilot/sub-pr-12-again"
  "copilot/sub-pr-16"
  "copilot/sub-pr-16-again"
  "copilot/sub-pr-16-another-one"
  "copilot/sub-pr-17"
  "copilot/sub-pr-17-again"
  "copilot/sub-pr-17-another-one"
  "copilot/sub-pr-17-one-more-time"
  "copilot/sub-pr-17-please-work"
  "copilot/sub-pr-17-yet-again"
  "copilot/sub-pr-17-8448b2f1-3dc8-479a-b4ce-ed91abf24e47"
  "copilot/sub-pr-30"
  "copilot/sub-pr-30-again"
  "copilot/sub-pr-30-another-one"
  "copilot/sub-pr-30-one-more-time"
  "copilot/sub-pr-30-please-work"
  "copilot/sub-pr-30-yet-again"
  "copilot/sub-pr-38"

  # Devin (16)
  "devin/1763305161-codebase-assessment"
  "devin/1763305474-fix-typescript-errors"
  "devin/1763307065-security-error-handling"
  "devin/1763313298-google-sheets-decision"
  "devin/1763314363-quick-wins-implementation"
  "devin/1763319133-comprehensive-improvements"
  "devin/1763329816-ai-features-testing"
  "devin/1763336271-backend-infrastructure"
  "devin/1763336390-backend-infrastructure"
  "devin/1763341830-complete-security-fix"
  "devin/1763346466-fix-documentid-parameters"
  "devin/1763362534-fix-gemini-model-429-error"
  "devin/1763366319-stable-models-anthropic-fallback"
  "devin/1763381211-dual-llm-fallback"
  "devin/1763384804-implement-missing-features"
  "devin/1763398704-complete-frontend-features"

  # Claude merged (1)
  "claude/cleanup-docs-readme-01SfgauNjA2UiSYFLcLTqRCn"

  # Misc (4)
  "Bach"
  "dk"
  "another-branch"
  "revert-31-devin/1763336390-backend-infrastructure"
)

echo "${YELLOW}📊 Branches to delete: ${#BRANCHES_TO_DELETE[@]}${NC}"
echo ""
echo "${YELLOW}⚠️  Branches to KEEP:${NC}"
echo "  - master (main branch)"
echo "  - claude/claude-md-mi2x4pjvicz3wb94-01DnAPSWSBAyTkcFKoYmTCxR (active)"
echo "  - claude/cleanup-git-branches-01XK9qFDmKMdAmW2qxTK989v (current)"
echo ""

read -p "${YELLOW}Continue with deletion? (yes/no): ${NC}" confirm

if [[ "$confirm" != "yes" ]]; then
  echo "${RED}❌ Cleanup cancelled${NC}"
  exit 0
fi

echo ""
echo "${GREEN}🗑️  Starting deletion...${NC}"
echo ""

# Counters
SUCCESS=0
FAILED=0
ALREADY_DELETED=0

# Function to delete branch via GitHub API
delete_branch() {
  local branch=$1
  echo -n "Deleting $branch... "

  if gh api "repos/$REPO/git/refs/heads/$branch" -X DELETE 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    ((SUCCESS++))
  else
    # Check if branch exists
    if gh api "repos/$REPO/git/refs/heads/$branch" 2>/dev/null > /dev/null; then
      echo -e "${RED}✗ Failed${NC}"
      ((FAILED++))
    else
      echo -e "${YELLOW}⊘ Already deleted${NC}"
      ((ALREADY_DELETED++))
    fi
  fi
}

# Delete all branches
for branch in "${BRANCHES_TO_DELETE[@]}"; do
  delete_branch "$branch"
done

echo ""
echo "=============================="
echo "${GREEN}✅ Deletion Summary:${NC}"
echo "  ${GREEN}Successfully deleted: $SUCCESS${NC}"
echo "  ${YELLOW}Already deleted: $ALREADY_DELETED${NC}"
echo "  ${RED}Failed: $FAILED${NC}"
echo "  ${YELLOW}Total processed: ${#BRANCHES_TO_DELETE[@]}${NC}"
echo "=============================="
echo ""

if [ $SUCCESS -gt 0 ]; then
  echo "${GREEN}🎉 Branch cleanup complete!${NC}"
  echo ""
  echo "Remaining remote branches:"
  gh api "repos/$REPO/branches" --jq '.[].name' | wc -l
else
  echo "${YELLOW}⚠️  No branches were deleted${NC}"
fi
