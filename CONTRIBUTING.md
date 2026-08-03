# Contributing to Ark Git Compare

First off, thank you for considering contributing to **Ark Git Compare**! 🎉

This repository hosts the VS Code extension that compares Git branches and
commits with a side-by-side view. This document explains how to propose
changes, report bugs, and submit code.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Repository layout](#repository-layout)
- [Development workflow](#development-workflow)
- [Commit convention](#commit-convention)
- [Developer Certificate of Origin (DCO)](#developer-certificate-of-origin-dco)
- [Coding standards](#coding-standards)
- [Releasing](#releasing)
- [Pull Request checklist](#pull-request-checklist)
- [Community](#community)

---

## Ways to contribute

- 🐛 **Report bugs** — open an issue with the `bug` template.
- ✨ **Suggest features** — open an issue with the `feature` template.
- 📖 **Improve documentation** — the READMEs and `notes/` are first-class.
- 🌍 **Translate** — help localize the extension (`l10n/`, starting with `en`
  and `pt-BR`).
- 💻 **Write code** — pick an issue labeled `good first issue` or `help wanted`.

---

## Repository layout

| Path                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `src/`              | Extension source (TypeScript)                        |
| `src/test/`         | Extension host tests (Mocha via `@vscode/test-cli`)  |
| `l10n/`             | Localization bundles (`en`, `pt-BR`)                 |
| `media/`            | Icons, GIFs, and webview assets                      |
| `notes/`            | Release notes per version (`notes/v<version>.md`)    |
| `esbuild.mjs`       | Bundler configuration                                |
| `vitest.config.ts`  | Unit test configuration (Vitest)                     |

---

## Development workflow

**Prerequisites:** Node 22+ and pnpm (the repo pins `packageManager` in
`package.json`; run `corepack enable` to match it).

1. **Fork** the repository and clone your fork.
2. Install dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Create a feature branch: `git checkout -b feat/short-description`.
4. Make your changes with clear, small commits.
5. Run the checks:

   ```bash
   pnpm lint
   pnpm compile
   pnpm test
   ```

   `pnpm test` runs the Vitest unit suites and the VS Code extension host
   suite. Use `pnpm test:unit` / `pnpm test:e2e` to run them separately, and
   `pnpm coverage` for a coverage report.

6. **Sign off** every commit (see DCO section below).
7. Push and open a Pull Request against `main`.

> Tip: `pnpm watch` runs the esbuild bundle in watch mode, and
> `pnpm test:watch` re-runs unit tests as you edit. Press `F5` in VS Code to
> launch the Extension Development Host.

---

## Commit convention

We use [**Conventional Commits**](https://www.conventionalcommits.org/). The PR
title is validated by CI.

Format:

```text
<type>(<scope>): <short summary>
```

Allowed types:

| Type       | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting (no code change)                             |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or fixing tests                                  |
| `build`    | Build system or dependencies                            |
| `ci`       | CI configuration                                        |
| `chore`    | Other changes not affecting src or tests                |
| `revert`   | Reverts a previous commit                               |

Examples:

```text
feat(sidebar): remember the last compared refs
fix(diff): keep scroll sync after fullscreen exit
docs(readme): update the usage section
```

---

## Developer Certificate of Origin (DCO)

Ark Git Compare uses the [Developer Certificate of Origin](https://developercertificate.org/)
to certify that contributors have the right to submit their contributions under
the project's license (MIT).

Every commit **must** be signed off:

```bash
git commit -s -m "feat(sidebar): remember the last compared refs"
```

This appends a `Signed-off-by: Your Name <you@example.com>` line to the commit
message, using your `git config user.name` and `user.email`. A DCO CI check
blocks PRs with any commit missing the sign-off. To fix the most recent commit:

```bash
git commit --amend -s --no-edit
```

---

## Coding standards

- **TypeScript strict mode** (`tsconfig.json`).
- **ESLint** via the flat config (`eslint.config.mjs`). Run `pnpm lint` before
  pushing.
- **esbuild** bundles the extension (`esbuild.mjs`).
- **Vitest** for unit tests and **@vscode/test-cli** for extension host tests.
  New or changed behavior needs tests.
- **Localization:** user-facing strings go through `l10n/` (`%key%` in
  `package.json` + `package.nls*.json`, bundles in `l10n/`). Keep `en` and
  `pt-BR` in sync.
- **Webview security:** any HTML rendered in the webview must be sanitized
  (DOMPurify) and Git refs/paths validated before hitting the CLI.

---

## Releasing

Releases are automated by
[`.github/workflows/publish.yml`](.github/workflows/publish.yml):

1. Bump the `version` in `package.json`.
2. Update `CHANGELOG.md`.
3. Add release notes at `notes/v<version>.md` (e.g. `notes/v1.1.0.md`).
4. Merge to `main`. The workflow tags `v<version>`, builds, scans, publishes
   the `.vsix` to the VS Code Marketplace and Open VSX, and creates the GitHub
   Release.

Do **not** hand-edit tags — the workflow derives them from `package.json`.

---

## Pull Request checklist

Before opening a PR, confirm:

- [ ] Commits follow Conventional Commits
- [ ] Every commit is signed off (`git commit -s`)
- [ ] `pnpm lint`, `pnpm compile`, and `pnpm test` pass locally
- [ ] Tests cover the change
- [ ] Documentation is updated (README, `CHANGELOG.md`, `notes/`)
- [ ] PR title follows Conventional Commits
- [ ] Linked to at least one issue (`Closes #123`)

---

## Community

- 💬 [GitHub Discussions](https://github.com/Tooark/vscode-ark-git-compare/discussions)
- 🐛 [Issues](https://github.com/Tooark/vscode-ark-git-compare/issues)
- 🌐 [Tooark](https://tooark.com)

Thank you for making Ark Git Compare better! 💙
