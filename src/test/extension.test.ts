import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	function getPackageJson(): any {
		const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
		const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
		return JSON.parse(packageJsonRaw);
	}

	async function activateCurrentExtension(): Promise<void> {
		const packageJson = getPackageJson();
		const extensionName = packageJson.name;
		const extension = vscode.extensions.all.find(ext => ext.packageJSON?.name === extensionName);

		assert.ok(extension, `Extensão ${extensionName} não encontrada no host de testes.`);
		await extension!.activate();
	}

	test('Manifesto deve declarar comandos principais', () => {
		const packageJson = getPackageJson();
		const commandIds = (packageJson.contributes?.commands || []).map((c: { command: string }) => c.command);

		assert.ok(commandIds.includes('vscode-ark-git-compare.compareCommits'));
		assert.ok(commandIds.includes('vscode-ark-git-compare.compareFromSidebar'));
		assert.ok(commandIds.includes('vscode-ark-git-compare.refreshSidebar'));
	});

	test('Manifesto pode omitir activationEvents explicitos', () => {
		const packageJson = getPackageJson();
		assert.ok(!('activationEvents' in packageJson) || Array.isArray(packageJson.activationEvents));
	});

	test('Manifesto deve declarar a view lateral gitCompareView', () => {
		const packageJson = getPackageJson();
		const views = packageJson.contributes?.views?.gitCompareSidebar || [];
		const viewIds = views.map((v: { id: string }) => v.id);

		assert.ok(viewIds.includes('gitCompareView'));
	});

	test('Comando de comparação deve estar visível na Command Palette', async () => {
		await activateCurrentExtension();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('vscode-ark-git-compare.compareCommits'));
	});
});
