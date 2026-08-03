# Ark Git Compare

Visual Studio Code extension to compare Git branches and commits with a side-by-side view, highlighting inline differences at the character level.

[![CI](https://github.com/Tooark/vscode-ark-git-compare/actions/workflows/ci.yml/badge.svg)](https://github.com/Tooark/vscode-ark-git-compare/actions/workflows/ci.yml)
[![Open VSX Version](https://img.shields.io/open-vsx/v/tooark/git-compare?label=Open%20VSX)](https://open-vsx.org/extension/tooark/git-compare)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/tooark/git-compare)](https://open-vsx.org/extension/tooark/git-compare)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-sponsor-EA4AAA?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/paulosfjunior)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/paulosfjunior)

🌍 **Languages:** ![USA Flag](https://flagcdn.com/w20/us.png) **English (this file)** · [![Brazil Flag](https://flagcdn.com/w20/br.png) Português](https://github.com/Tooark/vscode-ark-git-compare/blob/main/README.pt-BR.md)

---

## 🎬 Preview

### Compare commits

![Compare commits](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/compare.gif)

### Expand to fullscreen

![Fullscreen mode](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/full-screen.gif)

### File search

![File search](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/search.gif)

---

## ✨ Overview

- 🌿 **Compare any two refs** — branches or commits — with a side-by-side diff
- 🔤 **Inline highlighting** of character-level changes inside modified lines
- 🧭 **Dedicated sidebar** to pick branches and commits without leaving the editor
- ⚡ **Instant file list with on-demand diffs** — files load lazily and prefetch in the background, so even huge comparisons open without freezing
- 🌐 **Internationalization** with English and Brazilian Portuguese

---

## 🚀 Getting Started

### Install

- **Open VSX:** [open-vsx.org/extension/tooark/git-compare](https://open-vsx.org/extension/tooark/git-compare)
- **VS Code Marketplace:** [marketplace.visualstudio.com/items?itemName=tooark.git-compare](https://marketplace.visualstudio.com/items?itemName=tooark.git-compare)

Or inside VS Code:

1. Open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Ark Git Compare**
3. Click **Install**

---

## 🧩 Features

### Sidebar

The extension adds a dedicated **Compare Branches** view to the VS Code activity bar:

- Select two refs through the **Branch 1** and **Branch 2** fields
- Browse the latest 20 commits of each branch listed in the panel
- Pick a specific commit per branch for a point-in-time comparison
- **Compare** button in the panel toolbar to run the comparison

### Diff view

- **Side-by-side comparison** of the files changed between two refs
- **Inline highlighting** of character-level changes within modified lines
- **Scroll synchronization** between the left and right columns
- **Per-file fullscreen mode** — click the expand button or press `ESC` to exit
- Selects at the top of the panel stay in sync with the sidebar selection
- **On-demand rendering** — files start collapsed and each diff loads when expanded, with background prefetching so they are usually ready by the time you open them

### Command palette

- **Git Compare: Compare Commits** — opens the comparison panel directly from the command palette

---

## ✅ Requirements

- Visual Studio Code `^1.95.0`
- An open workspace containing a Git repository

---

## 🚀 Usage

1. Open a workspace with a Git repository
2. Click the **Git Compare** icon in the activity bar
3. In the panel, click **Branch 1** or **Branch 2** to select the desired refs
4. (Optional) Expand each branch's commit group and click a commit to pin a specific point
5. Click the **Compare** button in the panel toolbar (compare icon) to view the differences

---

## ⚠️ Notes and limitations

- Requires a valid Git repository at the workspace root.
- Listing commits may be slow in repositories with very large histories.

---

## ⚙️ Settings

The extension does not expose user settings at the moment. If future features require preferences (for example, the number of listed commits or scroll-sync behavior), they will be documented here.

---

## 💖 Support

If this extension helps your workflow, consider supporting its development:

- 💙 [GitHub Sponsors](https://github.com/sponsors/paulosfjunior)
- ☕ [Ko-fi](https://ko-fi.com/paulosfjunior)

Every contribution helps keep the project maintained and improving. Thank you! 🙏

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
