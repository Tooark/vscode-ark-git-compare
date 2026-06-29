# Ark Git Compare

Extensão para o Visual Studio Code que permite comparar branches e commits do Git com visualização lado a lado, destacando diferenças inline no nível de caractere.

[![Open VSX Version](https://img.shields.io/open-vsx/v/tooark/git-compare?label=Open%20VSX)](https://open-vsx.org/extension/tooark/git-compare)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/tooark/git-compare)](https://open-vsx.org/extension/tooark/git-compare)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

🌍 **Idiomas:** [![USA Flag](https://flagcdn.com/w20/us.png) English](https://github.com/Tooark/vscode-ark-git-compare/blob/main/README.md) · ![Brazil Flag](https://flagcdn.com/w20/br.png) **Português (este arquivo)**

---

## 🎬 Demonstração

### Comparar commits

![Comparar commits](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/compare.gif)

### Expandir em tela cheia

![Modo tela cheia](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/full-screen.gif)

### Busca de arquivos

![Busca de arquivos](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/search.gif)

---

## ✨ Visão geral

- 🌿 **Compare dois refs quaisquer** — branches ou commits — com diff lado a lado
- 🔤 **Destaque inline** de mudanças no nível de caractere dentro das linhas modificadas
- 🧭 **Painel lateral dedicado** para escolher branches e commits sem sair do editor
- ⚡ **Lista de arquivos instantânea com diffs sob demanda** — os arquivos carregam de forma preguiçosa e em segundo plano, então comparações enormes abrem sem travar
- 🌐 **Internacionalização** em inglês e português do Brasil

---

## 🚀 Primeiros passos

### Instalação

- **Open VSX:** [open-vsx.org/extension/tooark/git-compare](https://open-vsx.org/extension/tooark/git-compare)
- **VS Code Marketplace:** [marketplace.visualstudio.com/items?itemName=tooark.git-compare](https://marketplace.visualstudio.com/items?itemName=tooark.git-compare)

Ou dentro do VS Code:

1. Abra **Extensões** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Pesquise por **Ark Git Compare**
3. Clique em **Instalar**

---

## 🧩 Funcionalidades

### Painel lateral (Sidebar)

A extensão adiciona uma visualização dedicada **Comparar Branches** na barra de atividade do VS Code:

- Selecione dois refs pelos campos **Branch 1** e **Branch 2**
- Veja os últimos 20 commits de cada branch listados no painel
- Selecione um commit específico por branch para comparação pontual
- Botão **Comparar** na barra do painel para executar a comparação

### Visualização de diff

- **Comparação lado a lado** dos arquivos alterados entre dois refs
- **Destaque inline** de mudanças no nível de caractere dentro das linhas modificadas
- **Sincronização de scroll** entre as colunas esquerda e direita
- **Modo fullscreen** por arquivo — clique no botão de expandir ou pressione `ESC` para sair
- Selects no topo do painel sincronizados com a seleção feita na sidebar
- **Renderização sob demanda** — os arquivos iniciam colapsados e cada diff carrega ao expandir, com pré-carregamento em segundo plano para que já estejam prontos quando você abrir

### Comando na paleta

- **Git Compare: Comparar Commits** — abre o painel de comparação direto pela paleta de comandos

---

## ✅ Requisitos

- Visual Studio Code `^1.95.0`
- Workspace aberto contendo um repositório Git

---

## 🚀 Como usar

1. Abra um workspace com um repositório Git
2. Clique no ícone **Git Compare** na barra de atividade lateral
3. No painel, clique em **Branch 1** ou **Branch 2** para selecionar os refs desejados
4. (Opcional) Expanda o grupo de commits de cada branch e clique em um commit para fixar um ponto específico
5. Clique no botão **Comparar** na barra do painel (ícone de comparação) para visualizar as diferenças

---

## ⚠️ Observações e limitações

- Requer um repositório Git válido na raiz do workspace.
- A listagem de commits pode demorar em repositórios com histórico muito extenso.

---

## ⚙️ Configurações

A extensão não expõe configurações de usuário no momento. Se futuras funcionalidades exigirem preferências (por exemplo, número de commits listados ou comportamento da sincronização de scroll), elas serão documentadas aqui.

---

## 💖 Apoie

Se esta extensão ajuda no seu dia a dia, considere apoiar o desenvolvimento:

- 💙 [GitHub Sponsors](https://github.com/sponsors/paulosfjunior)
- ☕ [Ko-fi](https://ko-fi.com/paulosfjunior)
- 💸 [PayPal](https://www.paypal.com/donate/?business=62KETU4PXBWZC&no_recurring=0&item_name=Ol%C3%A1%21+Sou+o+fundador+e+mantenedor+da+Tooark+%28tooark.com%29+%E2%80%94%0Aum+ecossistema+de+projetos+open+source.%0AObrigado+pelo+apoio%21+%F0%9F%92%9A&currency_code=BRL)

Cada contribuição ajuda a manter o projeto ativo e em evolução. Obrigado! 🙏

---

## 📝 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
