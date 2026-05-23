# Git Compare

Extensão para o Visual Studio Code que permite comparar branches e commits do Git com visualização lado a lado, destacando diferenças inline no nível de caractere.

## Demonstração

### Comparar commits

![Comparar commits](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/compare.gif)

### Expandir em tela cheia

![Modo tela cheia](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/full-screen.gif)

### Busca de arquivos

![Busca de arquivos](https://raw.githubusercontent.com/Tooark/vscode-ark-git-compare/main/media/search.gif)

## Funcionalidades

### Painel lateral (Sidebar)

A extensão adiciona um painel dedicado na barra de atividade do VS Code com a visualização **Comparar Branches**:

- Selecione dois branches para comparação via campos **Branch 1** e **Branch 2**
- Veja os últimos 20 commits de cada branch listados no painel
- Selecione um commit específico por branch para comparação pontual
- Botão **Comparar** na barra do painel para executar a comparação

### Visualização de diff

- **Comparação lado a lado** dos arquivos alterados entre dois refs (branches ou commits)
- **Destaque inline** de mudanças no nível de caractere dentro das linhas modificadas
- **Sincronização de scroll** entre as colunas esquerda e direita
- **Modo fullscreen** por arquivo — clique no botão de expandir ou pressione `ESC` para sair
- Selects no topo do painel sincronizados com a seleção feita na sidebar

### Comando na paleta

- **Git Compare: Comparar Commits** — abre o painel de comparação direto pela paleta de comandos

## Requisitos

- Visual Studio Code `^1.95.0`
- Repositório Git no workspace aberto

## Como usar

1. Abra um workspace com um repositório Git
2. Clique no ícone **Git Compare** na barra de atividade lateral
3. No painel, clique em **Branch 1** ou **Branch 2** para selecionar os branches desejados
4. (Opcional) Expanda o grupo de commits de cada branch e clique em um commit para selecionar um ponto específico
5. Clique no botão **Comparar** na barra do painel (ícone de comparação) para visualizar as diferenças

## Observações e limitações

- Requer um workspace com repositório Git válido na raiz.
- Listagens de commits podem demorar em repositórios com histórico muito extenso.

## Configurações

A extensão não expõe configurações de usuário atualmente; se futuras features precisarem de preferências (por exemplo, número de commits listados ou comportamento de sincronização), elas serão adicionadas aqui.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
