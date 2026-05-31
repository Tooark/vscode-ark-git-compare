import * as vscode from 'vscode';
import { GitService } from './gitService';
import type { BranchSlot } from './types';
import { GitCompareSidebarProvider } from './sidebarProvider';
import { GitComparePanel } from './gitComparePanel';
import { t } from './i18n';

// Expressão regular para validar referências Git (branches, tags, commits).
// Permite letras, números, pontos, sublinhados, barras, arrobas, til, acentos circunflexos, chaves e hífens, com um comprimento máximo de 200 caracteres.
const SAFE_REF_PATTERN = /^[A-Za-z0-9._\/@~^{}-]{1,200}$/;

/**
 * Função de tipo de guarda para verificar se um valor é um BranchSlot válido (branch1 ou branch2).
 * @param value O valor a ser verificado.
 * @returns true se o valor for 'branch1' ou 'branch2', caso contrário, false.
 */
function isBranchSlot(value: unknown): value is BranchSlot {
	return value === 'branch1' || value === 'branch2';
}

/**
 * Função de tipo de guarda para verificar se um valor é uma referência Git segura (branch, tag ou commit hash).
 * @param value O valor a ser verificado.
 * @returns true se o valor for uma string que corresponde ao padrão de referência Git segura, caso contrário, false.
 */
function isSafeRef(value: unknown): value is string {
	return typeof value === 'string' && SAFE_REF_PATTERN.test(value.trim());
}

/**
 * Esta extensão do Visual Studio Code permite comparar commits do Git
 * e exibir as diferenças entre dois commits/branches.
 *
 * O comando `vscode-ark-git-compare.compareCommits` abre um painel de webview
 * que mostra as diferenças entre os arquivos alterados entre dois commits/branches.
 * 
 * @param context O contexto da extensão, fornecido pelo VS Code, usado para registrar comandos e gerenciar recursos.
 */
export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const gitService = workspaceRoot ? new GitService(workspaceRoot) : null;
	const sidebarProvider = new GitCompareSidebarProvider(gitService);

	// Registra o provedor de dados da árvore para a visualização da sidebar e os comandos relacionados.
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('gitCompareView', sidebarProvider),
		vscode.commands.registerCommand('vscode-ark-git-compare.compareCommits', async (ref1?: unknown, ref2?: unknown) => {
			if (ref1 !== undefined || ref2 !== undefined) {
				if (!isSafeRef(ref1) || !isSafeRef(ref2)) {
					vscode.window.showWarningMessage(t('extension.invalidCompareArgs'));
					return;
				}

				await sidebarProvider.syncSelectedRefs(ref1, ref2);
				await GitComparePanel.compareRefs(context.extensionUri, ref1, ref2);
				return;
			}

			GitComparePanel.createOrShow(context.extensionUri);
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.selectBranch', async (slot: unknown) => {
			if (!isBranchSlot(slot)) {
				vscode.window.showWarningMessage(t('extension.invalidBranchSlot'));
				return;
			}

			await sidebarProvider.selectBranch(slot);
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.selectCommitForBranch', async (slot: unknown, branch: unknown, commitHash: unknown) => {
			if (!isBranchSlot(slot) || !isSafeRef(branch) || !isSafeRef(commitHash)) {
				vscode.window.showWarningMessage(t('extension.invalidCommitArgs'));
				return;
			}

			await sidebarProvider.selectCommitForBranch(slot, branch, commitHash);
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.compareFromSidebar', async () => {
			await sidebarProvider.compareFromSidebar();
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.refreshSidebar', () => {
			sidebarProvider.refresh();
		})
	);

	void sidebarProvider.initialize();

	// Verifica se o VS Code suporta a serialização de painéis de webview e registra o serializador para reviver o painel quando necessário.
	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(GitComparePanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
				// Redefine as opções do webview para usar o uri mais recente em `localResourceRoots`.
				webviewPanel.webview.options = GitComparePanel.getWebviewOptions(context.extensionUri);
				GitComparePanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}
