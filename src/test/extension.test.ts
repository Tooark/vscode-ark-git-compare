import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { activate } from '../extension';
import { GitComparePanel } from '../gitComparePanel';

function getPackageJson(): any {
	const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

async function activateCurrentExtension(): Promise<void> {
	const packageJson = getPackageJson();
	const extension = vscode.extensions.all.find(ext => ext.packageJSON?.name === packageJson.name);
	assert.ok(extension, `Extensão ${packageJson.name} não encontrada no host de testes.`);
	await extension!.activate();
}

suite('extension.ts - manifesto', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('deve declarar os comandos principais', () => {
		const commandIds = (getPackageJson().contributes?.commands || []).map((c: { command: string }) => c.command);
		assert.ok(commandIds.includes('vscode-ark-git-compare.compareCommits'));
		assert.ok(commandIds.includes('vscode-ark-git-compare.compareFromSidebar'));
		assert.ok(commandIds.includes('vscode-ark-git-compare.refreshSidebar'));
	});

	test('pode omitir activationEvents explicitos', () => {
		const packageJson = getPackageJson();
		assert.ok(!('activationEvents' in packageJson) || Array.isArray(packageJson.activationEvents));
	});

	test('deve declarar a view lateral gitCompareView', () => {
		const views = getPackageJson().contributes?.views?.gitCompareSidebar || [];
		assert.ok(views.map((v: { id: string }) => v.id).includes('gitCompareView'));
	});

	test('comando de comparacao deve estar visivel na Command Palette', async () => {
		await activateCurrentExtension();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('vscode-ark-git-compare.compareCommits'));
	});
});

suite('extension.ts - activate', () => {
	test('deve registrar e cobrir todos os ramos dos handlers de comando', async () => {
		const handlers: Record<string, (...args: any[]) => any> = {};
		let serializer: any;
		let warnings = 0;
		let createdOrShown = 0;
		let comparedRefs = 0;
		let revived = 0;

		const old = {
			registerCommand: vscode.commands.registerCommand,
			registerTreeDataProvider: vscode.window.registerTreeDataProvider,
			registerWebviewPanelSerializer: vscode.window.registerWebviewPanelSerializer,
			showWarningMessage: vscode.window.showWarningMessage,
			showQuickPick: vscode.window.showQuickPick,
			createOrShow: GitComparePanel.createOrShow,
			compareRefs: GitComparePanel.compareRefs,
			revive: GitComparePanel.revive,
			getWebviewOptions: GitComparePanel.getWebviewOptions
		};

		(vscode.commands as any).registerCommand = (id: string, handler: any) => { handlers[id] = handler; return { dispose() { } }; };
		(vscode.window as any).registerTreeDataProvider = () => ({ dispose() { } });
		(vscode.window as any).registerWebviewPanelSerializer = (_type: string, s: any) => { serializer = s; return { dispose() { } }; };
		(vscode.window as any).showWarningMessage = () => { warnings++; };
		(vscode.window as any).showQuickPick = async () => undefined;
		(GitComparePanel as any).createOrShow = () => { createdOrShown++; return {}; };
		(GitComparePanel as any).compareRefs = async () => { comparedRefs++; };
		(GitComparePanel as any).revive = () => { revived++; };
		(GitComparePanel as any).getWebviewOptions = () => ({});
		const foldersDescriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');
		Object.defineProperty(vscode.workspace, 'workspaceFolders', { configurable: true, get: () => [{ uri: vscode.Uri.file('.'), name: 'ws', index: 0 }] });

		try {
			const context: any = { subscriptions: [], extensionUri: vscode.Uri.file('.') };
			activate(context);
			assert.ok(context.subscriptions.length > 0);

			const id = (name: string) => `vscode-ark-git-compare.${name}`;

			// compareCommits: sem args -> createOrShow.
			await handlers[id('compareCommits')]();
			assert.strictEqual(createdOrShown, 1);

			// compareCommits: refs invalidas -> aviso.
			await handlers[id('compareCommits')]('inv alid!', 'b');
			assert.ok(warnings > 0);

			// compareCommits: refs validas -> sync + compareRefs.
			await handlers[id('compareCommits')]('main', 'dev');
			assert.strictEqual(comparedRefs, 1);

			// selectBranch: slot invalido -> aviso; valido -> fluxo do provider.
			const warnBefore = warnings;
			await handlers[id('selectBranch')]('slot-invalido');
			assert.ok(warnings > warnBefore);
			await handlers[id('selectBranch')]('branch1');

			// selectCommitForBranch: args invalidos -> aviso; validos -> fluxo do provider.
			const warnBefore2 = warnings;
			await handlers[id('selectCommitForBranch')]('x', 'main', 'abc');
			assert.ok(warnings > warnBefore2);
			await handlers[id('selectCommitForBranch')]('branch1', 'main', 'abc');

			// compareFromSidebar e refreshSidebar.
			await handlers[id('compareFromSidebar')]();
			handlers[id('refreshSidebar')]();

			// Serializer de webview.
			assert.ok(serializer);
			await serializer.deserializeWebviewPanel({ webview: { options: {} } });
			assert.strictEqual(revived, 1);
		} finally {
			(vscode.commands as any).registerCommand = old.registerCommand;
			(vscode.window as any).registerTreeDataProvider = old.registerTreeDataProvider;
			(vscode.window as any).registerWebviewPanelSerializer = old.registerWebviewPanelSerializer;
			(vscode.window as any).showWarningMessage = old.showWarningMessage;
			(vscode.window as any).showQuickPick = old.showQuickPick;
			(GitComparePanel as any).createOrShow = old.createOrShow;
			(GitComparePanel as any).compareRefs = old.compareRefs;
			(GitComparePanel as any).revive = old.revive;
			(GitComparePanel as any).getWebviewOptions = old.getWebviewOptions;
			if (foldersDescriptor) { Object.defineProperty(vscode.workspace, 'workspaceFolders', foldersDescriptor); }
		}
	});

	test('deve criar o provider sem gitService quando nao ha workspace', () => {
		const oldRegisterCommand = vscode.commands.registerCommand;
		const oldRegisterTree = vscode.window.registerTreeDataProvider;
		const oldRegisterSerializer = vscode.window.registerWebviewPanelSerializer;
		const descriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');

		(vscode.commands as any).registerCommand = () => ({ dispose() { } });
		(vscode.window as any).registerTreeDataProvider = () => ({ dispose() { } });
		(vscode.window as any).registerWebviewPanelSerializer = () => ({ dispose() { } });

		try {
			// Tanto `undefined` quanto `[]` resultam em gitService nulo (sem pasta de workspace).
			for (const folders of [undefined, [] as vscode.WorkspaceFolder[]]) {
				Object.defineProperty(vscode.workspace, 'workspaceFolders', { configurable: true, get: () => folders });
				const context: any = { subscriptions: [], extensionUri: vscode.Uri.file('.') };
				activate(context);
				assert.ok(context.subscriptions.length > 0);
			}
		} finally {
			(vscode.commands as any).registerCommand = oldRegisterCommand;
			(vscode.window as any).registerTreeDataProvider = oldRegisterTree;
			(vscode.window as any).registerWebviewPanelSerializer = oldRegisterSerializer;
			if (descriptor) {
				Object.defineProperty(vscode.workspace, 'workspaceFolders', descriptor);
			}
		}
	});
});
