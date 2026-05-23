import * as vscode from 'vscode';
import { GitService } from './gitService';
import type { BranchSlot } from './types';
import { GitCompareSidebarProvider } from './sidebarProvider';
import { GitComparePanel } from './gitComparePanel';

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
		vscode.commands.registerCommand('vscode-ark-git-compare.compareCommits', async (ref1?: string, ref2?: string) => {
			if (ref1 && ref2) {
				await sidebarProvider.syncSelectedRefs(ref1, ref2);
				await GitComparePanel.compareRefs(context.extensionUri, ref1, ref2);
				return;
			}

			GitComparePanel.createOrShow(context.extensionUri);
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.selectBranch', async (slot: BranchSlot) => {
			await sidebarProvider.selectBranch(slot);
		}),
		vscode.commands.registerCommand('vscode-ark-git-compare.selectCommitForBranch', async (slot: BranchSlot, branch: string, commitHash: string) => {
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
