# How to Disable Linting on Git Push

## What I've Done

✅ **Removed ESLint from pre-commit hook**

- Updated `package.json` to remove `eslint --fix` from `lint-staged`
- Now only runs `prettier --write` (formatting only, no errors)

✅ **Created `.eslintignore`**

- Excluded `bots/`, `contracts/`, and other directories from ESLint checks

## Methods to Bypass Lint Errors

### Method 1: Skip Pre-commit Hook (Recommended for Quick Commits)

```bash
git commit -m "your message" --no-verify
git push
```

The `--no-verify` flag skips all git hooks including husky.

### Method 2: Disable Husky Temporarily

```bash
# Disable husky for this terminal session
export HUSKY=0

# Make your commits
git add .
git commit -m "your message"
git push

# Re-enable (just close terminal or unset)
unset HUSKY
```

### Method 3: Remove Husky Completely (Permanent)

```bash
# Remove the pre-commit hook
rm .husky/pre-commit

# Or disable husky in package.json
# Change "prepare": "husky" to "prepare": "echo 'husky disabled'"
```

### Method 4: Update Husky Hook to Skip Errors

Edit `.husky/pre-commit`:

**Current:**

```bash
npx lint-staged
```

**Change to:**

```bash
npx lint-staged || true
```

This makes lint-staged always succeed even if there are errors.

### Method 5: Completely Disable Lint-Staged

Edit `package.json`:

**Change from:**

```json
"lint-staged": {
  "**/*": [
    "prettier --write --ignore-unknown"
  ]
}
```

**Change to:**

```json
"lint-staged": {
  "**/*": []
}
```

Or simply delete the entire `lint-staged` section.

## Current Configuration

Your `package.json` now has:

```json
"lint-staged": {
  "**/*": [
    "prettier --write --ignore-unknown"
  ]
}
```

This means:

- ✅ No ESLint checks on commit
- ✅ Only Prettier formatting (won't block commits)
- ✅ TypeScript errors won't block commits

## Quick Reference

| Command                           | Effect                             |
| --------------------------------- | ---------------------------------- |
| `git commit --no-verify -m "msg"` | Skip all hooks for this commit     |
| `export HUSKY=0`                  | Disable husky for terminal session |
| `rm .husky/pre-commit`            | Permanently remove pre-commit hook |
| Edit `package.json` lint-staged   | Change what runs on commit         |

## If You Still Get Errors

If you're still seeing errors during push, check:

1. **Server-side hooks** (GitHub Actions, GitLab CI):

   ```bash
   # Check .github/workflows/ for CI configs
   ls .github/workflows/
   ```

2. **Git push hooks** (rare):

   ```bash
   cat .git/hooks/pre-push
   ```

3. **npm scripts being called**:
   ```bash
   # Check what runs during install
   npm config list
   ```

## Recommended Approach for This Project

Since you're in development and want to push frequently:

1. Use `--no-verify` for quick commits:

   ```bash
   git add .
   git commit -m "WIP: feature development" --no-verify
   git push
   ```

2. Or disable the hook entirely:

   ```bash
   rm .husky/pre-commit
   ```

3. Run linting manually when you want:
   ```bash
   npm run lint
   ```

## Re-enable Linting Later

When you want to re-enable strict linting:

1. Restore `.husky/pre-commit`:

   ```bash
   echo "npx lint-staged" > .husky/pre-commit
   ```

2. Update `package.json` lint-staged:

   ```json
   "lint-staged": {
     "**/*": [
       "eslint --fix --no-warn-ignored",
       "prettier --write --ignore-unknown"
     ]
   }
   ```

3. Fix all errors:
   ```bash
   npm run lint -- --fix
   ```

---

**Status**: ✅ ESLint removed from git hooks. You can now commit and push without lint errors blocking you.
