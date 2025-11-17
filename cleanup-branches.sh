#!/bin/bash
# Git Branch Cleanup Script
# Generated: 2025-11-17
# Purpose: Clean up merged and stale branches

echo "🧹 Git Branch Cleanup Script"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Categories of branches to delete

echo "${YELLOW}📊 ANALYSIS OF BRANCHES TO DELETE:${NC}"
echo ""

# 1. Merged Copilot branches (clearly from failed attempts)
echo "${GREEN}1. Copilot branches (merged PRs - retry attempts):${NC}"
COPILOT_MERGED=(
  "copilot/sub-pr-46-de362210-6373-40e3-9ca5-35b1209a6e73"  # PR #54 merged
  "copilot/sub-pr-46-please-work"                            # PR #52 merged
  "copilot/sub-pr-46-e0dbf826-8274-4553-9241-789c8d40b38c"  # PR #55 merged
  "copilot/sub-pr-46-yet-again"                              # PR #50 merged
  "copilot/sub-pr-46-1e4d356c-9a73-4d08-83c2-65a7408c1aa3"  # PR #53 merged
  "copilot/sub-pr-46-one-more-time"                          # PR #51 merged
  "copilot/sub-pr-46-again"                                  # Merged
  "copilot/sub-pr-46"                                        # Original merged
  "copilot/sub-pr-46-another-one"                            # Merged
)

for branch in "${COPILOT_MERGED[@]}"; do
  echo "  - origin/$branch"
done
echo "  Total: ${#COPILOT_MERGED[@]} branches"
echo ""

# 2. Other Copilot branches (likely stale)
echo "${GREEN}2. Other Copilot branches (likely stale):${NC}"
COPILOT_OTHER=(
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
)

for branch in "${COPILOT_OTHER[@]}"; do
  echo "  - origin/$branch"
done
echo "  Total: ${#COPILOT_OTHER[@]} branches"
echo ""

# 3. Devin branches (check which are merged/stale)
echo "${GREEN}3. Devin branches (potentially stale):${NC}"
DEVIN_BRANCHES=(
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
)

for branch in "${DEVIN_BRANCHES[@]}"; do
  echo "  - origin/$branch"
done
echo "  Total: ${#DEVIN_BRANCHES[@]} branches"
echo ""

# 4. Claude merged branch
echo "${GREEN}4. Claude merged branches:${NC}"
CLAUDE_MERGED=(
  "claude/cleanup-docs-readme-01SfgauNjA2UiSYFLcLTqRCn"  # PR #56 merged
)

for branch in "${CLAUDE_MERGED[@]}"; do
  echo "  - origin/$branch"
done
echo "  Total: ${#CLAUDE_MERGED[@]} branches"
echo ""

# 5. Misc branches
echo "${GREEN}5. Miscellaneous branches:${NC}"
MISC_BRANCHES=(
  "Bach"
  "dk"
  "another-branch"
  "revert-31-devin/1763336390-backend-infrastructure"
)

for branch in "${MISC_BRANCHES[@]}"; do
  echo "  - origin/$branch"
done
echo "  Total: ${#MISC_BRANCHES[@]} branches"
echo ""

# Calculate totals
TOTAL_TO_DELETE=$((${#COPILOT_MERGED[@]} + ${#COPILOT_OTHER[@]} + ${#DEVIN_BRANCHES[@]} + ${#CLAUDE_MERGED[@]} + ${#MISC_BRANCHES[@]}))

echo "=============================="
echo "${YELLOW}📈 SUMMARY:${NC}"
echo "  Copilot merged: ${#COPILOT_MERGED[@]}"
echo "  Copilot stale: ${#COPILOT_OTHER[@]}"
echo "  Devin: ${#DEVIN_BRANCHES[@]}"
echo "  Claude merged: ${#CLAUDE_MERGED[@]}"
echo "  Miscellaneous: ${#MISC_BRANCHES[@]}"
echo "${RED}  TOTAL TO DELETE: $TOTAL_TO_DELETE branches${NC}"
echo ""
echo "${YELLOW}⚠️  BRANCHES TO KEEP:${NC}"
echo "  - origin/master (main branch)"
echo "  - origin/claude/claude-md-mi2x4pjvicz3wb94-01DnAPSWSBAyTkcFKoYmTCxR (active)"
echo "  - claude/cleanup-git-branches-01XK9qFDmKMdAmW2qxTK989v (current branch)"
echo ""
echo "=============================="
echo ""

# Prompt for confirmation
read -p "${YELLOW}Do you want to delete these branches? (yes/no): ${NC}" confirm

if [[ "$confirm" != "yes" ]]; then
  echo "${RED}❌ Cleanup cancelled${NC}"
  exit 0
fi

echo ""
echo "${GREEN}🗑️  Starting deletion...${NC}"
echo ""

# Function to delete a branch
delete_branch() {
  local branch=$1
  echo -n "Deleting origin/$branch... "
  if git push origin --delete "$branch" 2>/dev/null; then
    echo "${GREEN}✓${NC}"
  else
    echo "${RED}✗ (may already be deleted or protected)${NC}"
  fi
}

# Delete Copilot merged branches
echo "${YELLOW}Deleting Copilot merged branches...${NC}"
for branch in "${COPILOT_MERGED[@]}"; do
  delete_branch "$branch"
done

# Delete other Copilot branches
echo ""
echo "${YELLOW}Deleting other Copilot branches...${NC}"
for branch in "${COPILOT_OTHER[@]}"; do
  delete_branch "$branch"
done

# Delete Devin branches
echo ""
echo "${YELLOW}Deleting Devin branches...${NC}"
for branch in "${DEVIN_BRANCHES[@]}"; do
  delete_branch "$branch"
done

# Delete Claude merged branches
echo ""
echo "${YELLOW}Deleting Claude merged branches...${NC}"
for branch in "${CLAUDE_MERGED[@]}"; do
  delete_branch "$branch"
done

# Delete misc branches
echo ""
echo "${YELLOW}Deleting miscellaneous branches...${NC}"
for branch in "${MISC_BRANCHES[@]}"; do
  delete_branch "$branch"
done

echo ""
echo "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "Running: git fetch --prune to clean up local references..."
git fetch --prune

echo ""
echo "${GREEN}🎉 All done!${NC}"
echo ""
echo "Remaining branches:"
git branch -r | grep -v HEAD | wc -l
echo ""
