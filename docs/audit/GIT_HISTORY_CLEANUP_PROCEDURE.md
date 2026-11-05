# SAFE GIT-HISTORY CLEANUP PROCEDURE

**Target Repository**: `3dmuseum`  
**Active Working Branch**: `fix/production-hardening`  
**Purpose**: Safely remove tracked sensitive blobs (personal photographs in `public/photos/` and `data/letters.json`) from Git history without causing repository corruption or unwanted automated force-pushes.

---

## 1. Safety Principles & Policy

1. **Local Working Originals Preserved**:
   - All 61 personal photograph files in `public/photos/` and the local letter content in `data/letters.json` are preserved in your local workspace.
   - `.gitignore` prevents future commits of these files.
   - `data/letters.example.json` provides an empty/placeholder public schema for new checkouts.

2. **No Automated Force-Pushing**:
   - The Antigravity assistant will **never** automatically execute a force push (`git push --force` or `--force-with-lease`).
   - History rewriting changes commit hashes. Therefore, history purging should be intentionally triggered by the repository owner when all collaborators are aligned.

---

## 2. Recommended Procedure Using `git-filter-repo`

The modern, Git-recommended tool for removing sensitive files from repository history is [`git-filter-repo`](https://github.com/newren/git-filter-repo) (Python-based, fast, and safe).

### Step 2.1: Make a Full Mirror Backup
Before rewriting Git history, always create a mirror backup outside your working directory:

```bash
# In an external directory (e.g., ../backups):
git clone --mirror <repository-url> 3dmuseum-pre-rewrite-backup.git
```

### Step 2.2: Ensure Clean Working Tree
Ensure all current hardening fixes on `fix/production-hardening` are committed:

```bash
git status
# Working tree must be clean
```

### Step 2.3: Run `git-filter-repo`
Run `git-filter-repo` to excise `data/letters.json` and `public/photos/` from all past commits, while keeping `public/photos/README.md`:

```bash
# Install tool if not already installed:
pip install git-filter-repo

# Run filter-repo to remove the sensitive paths from all history:
git filter-repo --invert-paths \
  --path data/letters.json \
  --path-glob "public/photos/*/*"
```

*(Note: `git-filter-repo` removes remote origins as a safety measure. You re-add your remote after inspecting the results).*

### Step 2.4: Verify the Rewritten History

Confirm that the sensitive blobs no longer exist in any branch, tag, or commit:

```bash
# Check that no commit references letters.json
git log --all --full-history -- "data/letters.json"

# Check that no commit references photo images
git log --all --full-history -- "public/photos/**/*.png"

# Inspect repository size
git count-objects -vH
```

### Step 2.5: Re-add Remote and Push (Manual Owner Action)

Once you have verified that the history is completely clean:

```bash
# Re-add remote
git remote add origin <repository-url>

# Push the rewritten branches to GitHub:
git push origin fix/production-hardening --force-with-lease
```

---

## 3. Alternative: Using `BFG Repo-Cleaner`

If `git-filter-repo` is unavailable, BFG Repo-Cleaner is a fast Java-based alternative:

```bash
# Download BFG jar
# Run against a fresh bare clone:
git clone --mirror <repository-url> 3dmuseum.git

cd 3dmuseum.git
java -jar bfg.jar --delete-files letters.json
java -jar bfg.jar --delete-folders photos

# Clean up reflogs and prune
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push cleaned history
git push --force
```

---

## 4. Post-Rewrite Instructions for Collaborators

After force-pushing rewritten history:
1. All collaborators must fetch and reset their local branches to the new remote heads:
   ```bash
   git fetch origin
   git checkout fix/production-hardening
   git reset --hard origin/fix/production-hardening
   ```
2. Any collaborator with local private photos and letters should copy them from backup into `public/photos/` and `data/letters.json` (they will remain safely untracked because of `.gitignore`).

