# Git Branch Deletion Instructions

**Status:** Ready for execution
**Date:** 2025-11-17
**Total branches to delete:** 54 stale branches (out of 57 remote branches)

---

## ⚠️ Important: Why Direct Deletion Failed

The automated deletion attempt failed because the current git configuration uses a **local proxy** without branch deletion permissions:

```
Remote: http://local_proxy@127.0.0.1:60972/git/matheus-rech/la_consulta
Error: HTTP 403 Forbidden
```

**Solution:** Run the deletion scripts from **your local machine** with proper GitHub authentication.

---

## 🎯 Branches to Delete (54 total)

### Breakdown by Category:
- **Copilot branches:** 33 (merged PRs + stale attempts)
- **Devin branches:** 16 (completed work from ~10 months ago)
- **Claude merged:** 1 (PR #56 already in master)
- **Miscellaneous:** 4 (unknown/test branches)

### Branches to KEEP (3):
- ✅ `master` - Main branch
- ✅ `claude/claude-md-mi2x4pjvicz3wb94-01DnAPSWSBAyTkcFKoYmTCxR` - Active work
- ✅ `claude/cleanup-git-branches-01XK9qFDmKMdAmW2qxTK989v` - Current branch

---

## 🚀 Deletion Options (Choose One)

### Option 1: GitHub CLI (Recommended) ⭐

**Best for:** Users with GitHub CLI installed and authenticated

**Prerequisites:**
```bash
# Install gh CLI
# macOS:
brew install gh

# Windows:
winget install GitHub.cli

# Linux:
# See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Authenticate
gh auth login
```

**Execute:**
```bash
# Make script executable
chmod +x delete-branches-gh-cli.sh

# Run the script
./delete-branches-gh-cli.sh

# Follow the prompts
# Enter "yes" when asked to confirm
```

**Advantages:**
- ✅ Uses GitHub REST API (most reliable)
- ✅ Better error handling
- ✅ Shows which branches are already deleted
- ✅ Works even if git push fails

---

### Option 2: Git Push Delete

**Best for:** Users with git write access configured

**Prerequisites:**
- Git configured with push access to `matheus-rech/la_consulta`
- SSH key or HTTPS credentials set up

**Execute:**
```bash
# Make script executable
chmod +x delete-branches-git.sh

# Run the script
./delete-branches-git.sh

# Follow the prompts
# Enter "yes" when asked to confirm
```

**Note:** This uses `git push origin --delete` which may fail with HTTP 403 if your credentials lack delete permissions.

---

### Option 3: GitHub Web Interface (Manual)

**Best for:** Users who prefer GUI or have permission issues with scripts

**Steps:**
1. Go to: https://github.com/matheus-rech/la_consulta/branches
2. Find each stale branch (see list below)
3. Click the red trash can icon next to each branch
4. Confirm deletion

**Branches to delete manually:**

#### Copilot Merged (9):
- `copilot/sub-pr-46`
- `copilot/sub-pr-46-again`
- `copilot/sub-pr-46-another-one`
- `copilot/sub-pr-46-one-more-time`
- `copilot/sub-pr-46-please-work`
- `copilot/sub-pr-46-yet-again`
- `copilot/sub-pr-46-1e4d356c-9a73-4d08-83c2-65a7408c1aa3`
- `copilot/sub-pr-46-de362210-6373-40e3-9ca5-35b1209a6e73`
- `copilot/sub-pr-46-e0dbf826-8274-4553-9241-789c8d40b38c`

#### Copilot Stale (24):
- `copilot/sub-pr-3`
- `copilot/sub-pr-6`
- `copilot/sub-pr-8`
- `copilot/sub-pr-8-again`
- `copilot/sub-pr-9`
- `copilot/sub-pr-12`
- `copilot/sub-pr-12-again`
- `copilot/sub-pr-16`
- `copilot/sub-pr-16-again`
- `copilot/sub-pr-16-another-one`
- `copilot/sub-pr-17`
- `copilot/sub-pr-17-again`
- `copilot/sub-pr-17-another-one`
- `copilot/sub-pr-17-one-more-time`
- `copilot/sub-pr-17-please-work`
- `copilot/sub-pr-17-yet-again`
- `copilot/sub-pr-17-8448b2f1-3dc8-479a-b4ce-ed91abf24e47`
- `copilot/sub-pr-30`
- `copilot/sub-pr-30-again`
- `copilot/sub-pr-30-another-one`
- `copilot/sub-pr-30-one-more-time`
- `copilot/sub-pr-30-please-work`
- `copilot/sub-pr-30-yet-again`
- `copilot/sub-pr-38`

#### Devin (16):
- `devin/1763305161-codebase-assessment`
- `devin/1763305474-fix-typescript-errors`
- `devin/1763307065-security-error-handling`
- `devin/1763313298-google-sheets-decision`
- `devin/1763314363-quick-wins-implementation`
- `devin/1763319133-comprehensive-improvements`
- `devin/1763329816-ai-features-testing`
- `devin/1763336271-backend-infrastructure`
- `devin/1763336390-backend-infrastructure`
- `devin/1763341830-complete-security-fix`
- `devin/1763346466-fix-documentid-parameters`
- `devin/1763362534-fix-gemini-model-429-error`
- `devin/1763366319-stable-models-anthropic-fallback`
- `devin/1763381211-dual-llm-fallback`
- `devin/1763384804-implement-missing-features`
- `devin/1763398704-complete-frontend-features`

#### Claude Merged (1):
- `claude/cleanup-docs-readme-01SfgauNjA2UiSYFLcLTqRCn`

#### Miscellaneous (4):
- `Bach`
- `dk`
- `another-branch`
- `revert-31-devin/1763336390-backend-infrastructure`

---

## 📊 After Deletion

### Verify Success:
```bash
# Fetch latest remote state
git fetch --prune

# Check remaining branches (should show ~3)
git branch -r

# Count branches
git branch -r | grep -v HEAD | wc -l
```

### Expected Result:
```
Before: 57 remote branches
After:  3 remote branches
  - master
  - claude/claude-md-mi2x4pjvicz3wb94-01DnAPSWSBAyTkcFKoYmTCxR
  - claude/cleanup-git-branches-01XK9qFDmKMdAmW2qxTK989v
```

---

## 🛡️ Safety Information

### What Won't Be Lost:
- ✅ **Commit history** - All commits remain in git history
- ✅ **Merged code** - Already integrated into master
- ✅ **PR history** - PRs remain visible on GitHub
- ✅ **Recovery window** - ~90 days via GitHub's orphaned commits

### Recovery (if needed):
```bash
# Find commit SHA from PR or reflog
git log --all --grep="search term"

# Recreate branch
git checkout -b branch-name <commit-sha>
git push origin branch-name
```

---

## 🐛 Troubleshooting

### "HTTP 403" Error
**Cause:** Insufficient permissions
**Solutions:**
1. Use GitHub CLI instead: `./delete-branches-gh-cli.sh`
2. Delete via GitHub web interface
3. Ask repository admin for delete permissions

### "Branch not found" Error
**Cause:** Branch already deleted
**Solution:** Skip it, continue with remaining branches

### GitHub CLI Authentication Failed
```bash
# Re-authenticate
gh auth logout
gh auth login

# Verify
gh auth status
```

### Git Push Fails
**Cause:** Using HTTPS without credentials or SSH not configured
**Solutions:**
1. Configure SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
2. Use GitHub CLI instead (doesn't require git push access)
3. Use personal access token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

## 📝 Reporting Results

After running a deletion script, please report:

1. **How many branches were deleted:** ___/54
2. **Which method worked:**
   - [ ] GitHub CLI
   - [ ] Git push
   - [ ] Manual via web
3. **Any errors encountered:**
4. **Final branch count:** `git branch -r | grep -v HEAD | wc -l` = ___

---

## 🎯 Quick Start

**If you have GitHub CLI:**
```bash
chmod +x delete-branches-gh-cli.sh && ./delete-branches-gh-cli.sh
```

**If you have git push access:**
```bash
chmod +x delete-branches-git.sh && ./delete-branches-git.sh
```

**If neither works:**
- Use GitHub web interface (Option 3 above)
- Or ask repository admin for assistance

---

**Questions?** See the troubleshooting section or open an issue.
