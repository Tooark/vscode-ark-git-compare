import * as vscode from 'vscode';
import type { CommitInfo, BranchSlot, SidebarNode } from './types';
import { GitService } from './gitService';

/**
 * Classe que implementa o provedor de árvore para a barra lateral do VS Code,
 * permitindo a seleção de branches e commits para comparação.
 */
export class GitCompareSidebarProvider implements vscode.TreeDataProvider<SidebarNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SidebarNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SidebarNode | undefined> = this._onDidChangeTreeData.event;

  private readonly _commitsPerBranch = 20;
  private _isGitRepository = false;
  private _branch1 = '';
  private _branch2 = '';
  private _commit1?: CommitInfo;
  private _commit2?: CommitInfo;

  constructor (private readonly _gitService: GitService | null) { }

  /**
   * Função de inicialização do provedor, que verifica se o workspace é um repositório Git e
   * configura os branches iniciais para comparação.
   * @returns Promise que resolve quando a inicialização estiver completa
   */
  async initialize (): Promise<void> {
    // Verifica se o serviço Git está disponível
    if (!this._gitService) {
      return;
    }

    try {
      this._isGitRepository = await this._gitService.isGitRepository();

      // Verifica se o workspace é um repositório Git
      if (!this._isGitRepository) {
        return;
      }

      const branches = await this._gitService.getBranches();
      const availableBranches = branches.map(b => b.name);

      // Verifica se há branches disponíveis para comparação
      if (availableBranches.length === 0) {
        return;
      }

      const currentBranch = branches.find(b => b.isCurrent)?.name;
      this._branch1 = currentBranch || availableBranches[0];
      this._branch2 = availableBranches.find(b => b !== this._branch1) || this._branch1;
      this.refresh();
    } catch (error) {
      const err = error as Error;
      vscode.window.showWarningMessage(vscode.l10n.t('Git Compare: could not initialize the sidebar ({message}).', { message: err.message }));
    }
  }

  /**
   * Função que dispara o evento de atualização da árvore, forçando a barra lateral a ser redesenhada
   * com os dados mais recentes.
   */
  refresh (): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Função que permite ao usuário selecionar um branch específico para comparação,
   * atualizando o estado interno e a interface conforme necessário.
   * @param slot O slot do branch a ser selecionado ('branch1' ou 'branch2').
   * @returns Promise que resolve quando a seleção estiver completa.
   */
  async selectBranch (slot: BranchSlot): Promise<void> {
    // Verifica se o serviço Git está disponível e se o workspace é um repositório Git
    if (!this._gitService || !this._isGitRepository) {
      vscode.window.showWarningMessage(vscode.l10n.t('Open a Git repository to select branches.'));
      return;
    }

    const branches = await this._gitService.getBranches();
    const selected = await vscode.window.showQuickPick(
      branches.map(branch => ({
        label: branch.name,
        description: branch.isCurrent ? vscode.l10n.t('current branch') : undefined
      })),
      {
        placeHolder: slot === 'branch1' ? vscode.l10n.t('Select branch 1') : vscode.l10n.t('Select branch 2')
      }
    );

    // Verifica se o usuário fez uma seleção válida
    if (!selected) {
      return;
    }

    // Verifica se o branch selecionado é a branch1
    if (slot === 'branch1') {
      this._branch1 = selected.label;
      this._commit1 = undefined;
    } else {
      this._branch2 = selected.label;
      this._commit2 = undefined;
    }

    this.refresh();
  }

  /**
   * Função que permite ao usuário selecionar um commit específico para um branch,
   * atualizando o estado interno e a interface conforme necessário.
   * @param slot O slot do commit a ser selecionado ('branch1' ou 'branch2').
   * @param branch O branch ao qual o commit pertence.
   * @param commitHash O hash do commit a ser selecionado.
   * @returns Promise que resolve quando a seleção estiver completa.
   */
  async selectCommitForBranch (slot: BranchSlot, branch: string, commitHash: string): Promise<void> {
    // Verifica se o serviço Git está disponível e se o workspace é um repositório Git
    if (!this._gitService || !this._isGitRepository) {
      return;
    }

    const commits = await this._gitService.getCommitsForRef(branch, this._commitsPerBranch);
    const selectedCommit = commits.find(commit => commit.hash === commitHash || commit.fullHash === commitHash);

    // Verifica se o commit selecionado é válido
    if (!selectedCommit) {
      return;
    }

    // Verifica se o commit selecionado é para a branch1
    if (slot === 'branch1') {
      this._commit1 = selectedCommit;
    } else {
      this._commit2 = selectedCommit;
    }

    this.refresh();
  }

  /**
   * Função que dispara o comando de comparação de commits usando as referências selecionadas na barra lateral.
   * @returns Promise que resolve quando o comando de comparação for executado.
   */
  async compareFromSidebar (): Promise<void> {
    const ref1 = this._getRef('branch1');
    const ref2 = this._getRef('branch2');

    // Verifica se ambas as referências estão selecionadas antes de disparar a comparação
    if (!ref1 || !ref2) {
      vscode.window.showWarningMessage(vscode.l10n.t('Select branch 1 and branch 2 before comparing.'));
      return;
    }

    await vscode.commands.executeCommand('vscode-ark-git-compare.compareCommits', ref1, ref2);
  }

  /**
   * Função que sincroniza as seleções de branches e commits na barra lateral com as referências fornecidas.
   * @param ref1 A referência do primeiro branch ou commit.
   * @param ref2 A referência do segundo branch ou commit.
   * @returns Promise que resolve quando a sincronização estiver completa.
   */
  async syncSelectedRefs (ref1: string, ref2: string): Promise<void> {
    // Verifica se o serviço Git está disponível e se o workspace é um repositório Git
    if (!this._gitService || !this._isGitRepository) {
      return;
    }

    await Promise.all([
      this._syncSlotFromRef('branch1', ref1),
      this._syncSlotFromRef('branch2', ref2)
    ]);

    this.refresh();
  }

  /**
   * Função que retorna um item de árvore para um nó específico na barra lateral,
   * configurando o rótulo, descrição, ícone e comando conforme o tipo do nó.
   * @param element O nó para o qual o item de árvore deve ser criado.
   * @returns O item de árvore configurado para o nó fornecido.
   */
  getTreeItem (element: SidebarNode): vscode.TreeItem {
    // Configura o item de árvore com base no tipo do nó
    switch (element.kind) {
      // Caso para o campo de seleção de branch
      case 'branchField': {
        const isBranch1 = element.slot === 'branch1';
        const branch = isBranch1 ? this._branch1 : this._branch2;
        const selectedCommit = isBranch1 ? this._commit1 : this._commit2;
        const item = new vscode.TreeItem(
          isBranch1
            ? vscode.l10n.t('Branch 1: {branch}', { branch: branch || vscode.l10n.t('(select)') })
            : vscode.l10n.t('Branch 2: {branch}', { branch: branch || vscode.l10n.t('(select)') }),
          vscode.TreeItemCollapsibleState.None
        );

        item.description = selectedCommit ? vscode.l10n.t('commit {hash}', { hash: selectedCommit.hash }) : vscode.l10n.t('branch HEAD');
        item.iconPath = new vscode.ThemeIcon('git-branch');
        item.command = {
          command: 'vscode-ark-git-compare.selectBranch',
          title: 'Selecionar Branch',
          arguments: [element.slot]
        };

        return item;
      }

      // Caso para o botão de ação de comparação
      case 'compareAction': {
        const item = new vscode.TreeItem(vscode.l10n.t('Compare'), vscode.TreeItemCollapsibleState.None);
        item.description = `${this._getRef('branch1') || '?'}..${this._getRef('branch2') || '?'}`;
        item.iconPath = new vscode.ThemeIcon('git-compare');
        item.command = {
          command: 'vscode-ark-git-compare.compareFromSidebar',
          title: vscode.l10n.t('Compare'),
          arguments: []
        };

        return item;
      }

      // Caso para o grupo de commits de um branch específico
      case 'commitGroup': {
        const item = new vscode.TreeItem(
          element.slot === 'branch1'
            ? vscode.l10n.t('Commits branch 1 ({branch})', { branch: element.branch })
            : vscode.l10n.t('Commits branch 2 ({branch})', { branch: element.branch }),
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.iconPath = new vscode.ThemeIcon('history');

        return item;
      }

      // Caso para um commit específico
      case 'commit': {
        const isSelected = element.slot === 'branch1' ? this._commit1?.hash === element.commit.hash : this._commit2?.hash === element.commit.hash;
        const item = new vscode.TreeItem(`${element.commit.hash} ${element.commit.message}`, vscode.TreeItemCollapsibleState.None);

        item.description = `${vscode.l10n.t('branch: {branch}', { branch: element.branch })} • ${element.commit.date}${isSelected ? ` • ${vscode.l10n.t('selected')}` : ''}`;
        item.tooltip = `${element.commit.message}\n${element.commit.author} • ${element.commit.date}\n${vscode.l10n.t('Branch: {branch}', { branch: element.branch })}`;
        item.iconPath = new vscode.ThemeIcon(isSelected ? 'check' : 'git-commit');
        item.command = {
          command: 'vscode-ark-git-compare.selectCommitForBranch',
          title: 'Selecionar Commit para Comparação',
          arguments: [element.slot, element.branch, element.commit.hash]
        };

        return item;
      }

      // Caso para mensagens informativas (ex.: sem commits, sem repositório Git)
      case 'info': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.description = element.description;
        item.iconPath = new vscode.ThemeIcon('info');

        return item;
      }
    }
  }

  /**
   * Função que retorna os filhos de um nó específico na barra lateral.
   * @param element O nó para o qual os filhos devem ser retornados.
   * @returns Uma promessa que resolve para uma lista de nós filhos.
   */
  async getChildren (element?: SidebarNode): Promise<SidebarNode[]> {
    // Verifica se o serviço Git está disponível
    if (!this._gitService) {
      return [{ kind: 'info', label: vscode.l10n.t('No workspace opened'), description: vscode.l10n.t('Open a folder with Git') }];
    }

    // Verifica se o workspace é um repositório Git
    if (!this._isGitRepository) {
      return [{ kind: 'info', label: vscode.l10n.t('Git repository not found'), description: vscode.l10n.t('Initialize or open a repository') }];
    }

    // Verifica se o elemento é indefinido
    if (!element) {
      const rootItems: SidebarNode[] = [
        { kind: 'branchField', slot: 'branch1' },
        { kind: 'branchField', slot: 'branch2' },
        { kind: 'compareAction' }
      ];

      // Verifica se a branch1 está selecionada e adiciona o grupo de commits correspondente
      if (this._branch1) {
        rootItems.push({ kind: 'commitGroup', slot: 'branch1', branch: this._branch1 });
      }

      // Verifica se a branch2 está selecionada e adiciona o grupo de commits correspondente
      if (this._branch2) {
        rootItems.push({ kind: 'commitGroup', slot: 'branch2', branch: this._branch2 });
      }

      return rootItems;
    }

    // Verifica se o elemento é um grupo de commits e retorna os commits correspondentes
    if (element.kind === 'commitGroup') {
      const commits = await this._gitService.getCommitsForRef(element.branch, this._commitsPerBranch);

      // Verifica se há commits para a branch selecionada e retorna uma mensagem informativa se não houver
      if (commits.length === 0) {
        return [{ kind: 'info', label: vscode.l10n.t('No commits to display'), description: vscode.l10n.t('branch: {branch}', { branch: element.branch }) }];
      }

      return commits.map(commit => ({ kind: 'commit', slot: element.slot, branch: element.branch, commit }));
    }

    return [];
  }

  /**
   * Função que retorna a referência (hash ou nome do branch) correspondente ao slot especificado.
   * @param slot O slot para o qual a referência deve ser retornada ('branch1' ou 'branch2').
   * @returns A referência correspondente ao slot especificado, ou uma string vazia se nenhuma
   * referência estiver selecionada.
   */
  private _getRef (slot: BranchSlot): string {
    // Verifica se o slot é 'branch1'
    if (slot === 'branch1') {
      return this._commit1?.hash || this._branch1;
    }

    return this._commit2?.hash || this._branch2;
  }

  /**
   * Função que sincroniza o estado interno do provedor com a referência fornecida, atualizando as
   * seleções de branches e commits conforme necessário.
   * @param slot O slot para o qual a sincronização deve ser feita ('branch1' ou 'branch2').
   * @param ref A referência (hash ou nome do branch) a ser sincronizada com o slot especificado.
   * @returns Promise que resolve quando a sincronização estiver completa.
   */
  private async _syncSlotFromRef (slot: BranchSlot, ref: string): Promise<void> {
    // Verifica se o serviço Git está disponível
    if (!this._gitService) {
      return;
    }

    const branches = await this._gitService.getBranches();
    const matchingBranch = branches.find(branch => branch.name === ref)?.name;
    const selectedCommit = await this._gitService.getCommitsForRef(ref, 1).then(commits => commits[0]).catch(() => undefined);

    // Verifica se o slot é 'branch1' e atualiza as seleções de branch e commit correspondentes
    if (slot === 'branch1') {
      this._branch1 = matchingBranch || ref;
      this._commit1 = matchingBranch ? undefined : selectedCommit;
      return;
    }

    this._branch2 = matchingBranch || ref;
    this._commit2 = matchingBranch ? undefined : selectedCommit;
  }
}
