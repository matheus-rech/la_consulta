# Manual Branch Cleanup Instructions

**Issue:** Automated deletion failed due to HTTP 403 permission error.

**Error:**
```
error: RPC failed; HTTP 403 curl 22 The requested URL returned error: 403
fatal: the remote end hung up unexpectedly
```

**Root Cause:** The current git authentication doesn't have permission to delete remote branches.

---

## ✅ Solution Options

### Option 1: GitHub Web UI (Easiest - Recommended)

1. **Go to branches page:**
   ```
   https://github.com/matheus-rech/la_consulta/branches
   ```

2. **Filter and delete in batches:**
   - Search for `copilot/sub-pr-` → Delete all (33 branches)
   - Search for `devin/` → Delete all (16 branches)
   - Search for `claude/cleanup-docs` → Delete (1 branch)
   - Search for `Bach`, `dk`, `another-branch`, `revert-31` → Delete (4 branches)

3. **Keep only:**
   - `master`
   - `claude/claude-md-mi2x4pjvicz3wb94-01DnAPSWSBAyTkcFKoYmTCxR`
   - `claude/cleanup-git-branches-01XK9qFDmKMdAmW2qxTK989v` (current)

**Estimated time:** 5-10 minutes (GitHub has bulk delete on this page)

---

### Option 2: Update Git Permissions

If you want to use the automated script:

1. **Generate a Personal Access Token (PAT) with delete permissions:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Check: `repo` (full control) and `delete_repo` permissions
   - Copy the token

2. **Update git remote URL with token:**
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/matheus-rech/la_consulta.git
   ```

3. **Re-run the cleanup script:**
   ```bash
   ./cleanup-branches.sh
   ```

4. **After cleanup, remove token from URL for security:**
   ```bash
   git remote set-url origin https://github.com/matheus-rech/la_consulta.git
   ```

---

### Option 3: GitHub CLI (if available)

If you have GitHub CLI installed and authenticated:

```bash
# Login
gh auth login

# Delete branches (example for Copilot branches)
gh api repos/matheus-rech/la_consulta/git/refs/heads/copilot/sub-pr-46 -X DELETE
gh api repos/matheus-rech/la_consulta/git/refs/heads/copilot/sub-pr-46-again -X DELETE
# ... repeat for all branches
```

Or use the automated script (requires `jq`):
```bash
# Get all branches and delete via API
gh api repos/matheus-rech/la_consulta/branches --paginate | \
  jq -r '.[] | select(.name | startswith("copilot/") or startswith("devin/")) | .name' | \
  while read branch; do
    echo "Deleting $branch..."
    gh api "repos/matheus-rech/la_consulta/git/refs/heads/$branch" -X DELETE
  done
```

---

## 📋 Branches to Delete (54 total)

### Copilot Merged (9 branches)
```
copilot/sub-pr-46
copilot/sub-pr-46-again
copilot/sub-pr-46-another-one
copilot/sub-pr-46-one-more-time
copilot/sub-pr-46-please-work
copilot/sub-pr-46-yet-again
copilot/sub-pr-46-1e4d356c-9a73-4d08-83c2-65a7408c1aa3
copilot/sub-pr-46-de362210-6373-40e3-9ca5-35b1209a6e73
copilot/sub-pr-46-e0dbf826-8274-4553-9241-789c8d40b38c
```

### Copilot Stale (24 branches)
```
copilot/sub-pr-3
copilot/sub-pr-6
copilot/sub-pr-8
copilot/sub-pr-8-again
copilot/sub-pr-9
copilot/sub-pr-12
copilot/sub-pr-12-again
copilot/sub-pr-16
copilot/sub-pr-16-again
copilot/sub-pr-16-another-one
copilot/sub-pr-17
copilot/sub-pr-17-again
copilot/sub-pr-17-another-one
copilot/sub-pr-17-one-more-time
copilot/sub-pr-17-please-work
copilot/sub-pr-17-yet-again
copilot/sub-pr-17-8448b2f1-3dc8-479a-b4ce-ed91abf24e47
copilot/sub-pr-30
copilot/sub-pr-30-again
copilot/sub-pr-30-another-one
copilot/sub-pr-30-one-more-time
copilot/sub-pr-30-please-work
copilot/sub-pr-30-yet-again
copilot/sub-pr-38
```

### Devin (16 branches)
```
devin/1763305161-codebase-assessment
devin/1763305474-fix-typescript-errors
devin/1763307065-security-error-handling
devin/1763313298-google-sheets-decision
devin/1763314363-quick-wins-implementation
devin/1763319133-comprehensive-improvements
devin/1763329816-ai-features-testing
devin/1763336271-backend-infrastructure
devin/1763336390-backend-infrastructure
devin/1763341830-complete-security-fix
devin/1763346466-fix-documentid-parameters
devin/1763362534-fix-gemini-model-429-error
devin/1763366319-stable-models-anthropic-fallback
devin/1763381211-dual-llm-fallback
devin/1763384804-implement-missing-features
devin/1763398704-complete-frontend-features
```

### Claude Merged (1 branch)
```
claude/cleanup-docs-readme-01SfgauNjA2UiSYFLcLTqRCn
```

### Miscellaneous (4 branches)
```
Bach
dk
another-branch
revert-31-devin/1763336390-backend-infrastructure
```

---

## 🎯 My Recommendation

**Use Option 1 (GitHub Web UI)** - It's the easiest and safest:

1. Open: https://github.com/matheus-rech/la_consulta/branches
2. Use the search box to filter branches
3. Click delete buttons (GitHub might have bulk actions)
4. Takes 5-10 minutes total

This avoids dealing with authentication tokens and permissions.

---

## ✅ After Cleanup

Once you've deleted the branches via GitHub UI, run locally:

```bash
# Clean up local tracking references
git fetch --prune

# Verify cleanup
git branch -r | wc -l
# Should show ~3 branches (master + 2 claude branches)
```

---

## 📝 Best Practices Going Forward

1. **Delete branch after PR merge** - Use GitHub's "Delete branch" button immediately after merging
2. **Enable auto-delete** - GitHub Settings → Branches → "Automatically delete head branches"
3. **Monthly review** - Check branches page monthly for stale branches
4. **Branch naming** - Use descriptive names with issue numbers

---

**Need help?** Let me know if you encounter any issues!
