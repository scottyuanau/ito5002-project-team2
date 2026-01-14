# ito5002 Project Team 2

This project is designated for ITO5002 Project Team 2.

## Git Workflow (main + dev, rebase-based, clean history)

This repo uses **two long-lived branches**:

- **`main`**: always stable / production-ready
- **`dev`**: integration branch where all work lands first

All changes are made on **feature branches** off `dev`, then merged into `dev` via PRs.
When `dev` is verified, we **fast-forward** `main` to match `dev`.

We use **rebase** to keep history clean and linear.

---

## Branch Rules

1. Work on a **feature branch** created from `dev`.
2. Every change goes through a **Pull Request (PR)** into `dev`.
3. Keep feature branches rebased onto `dev` (linear history).
4. `main` is updated **only** when `dev` is stable and validated.

---

## One-time Setup (recommended)

```bash
git fetch origin
git checkout dev
git pull origin dev
```

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
