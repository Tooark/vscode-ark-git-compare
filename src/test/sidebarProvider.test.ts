import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitService } from '../gitService';
import { GitCompareSidebarProvider } from '../sidebarProvider';

const sampleCommit = { hash: 'abc', fullHash: 'abcdef', message: 'm', author: 'a', date: 'd' };

/** Substitui APIs do VS Code durante a execução de `fn`, restaurando ao final. */
async function withStubbedWindow(
	stubs: Partial<{ quickPick: () => Promise<unknown>; warn: (msg: string) => void; execute: (...args: unknown[]) => Promise<void> }>,
	fn: () => Promise<void>
): Promise<void> {
	const oldWarn = vscode.window.showWarningMessage;
	const oldQuickPick = vscode.window.showQuickPick;
	const oldExecute = vscode.commands.executeCommand;
	if (stubs.warn) { (vscode.window as any).showWarningMessage = stubs.warn; }
	if (stubs.quickPick) { (vscode.window as any).showQuickPick = stubs.quickPick; }
	if (stubs.execute) { (vscode.commands as any).executeCommand = stubs.execute; }
	try {
		await fn();
	} finally {
		(vscode.window as any).showWarningMessage = oldWarn;
		(vscode.window as any).showQuickPick = oldQuickPick;
		(vscode.commands as any).executeCommand = oldExecute;
	}
}

suite('sidebarProvider.ts', () => {
	test('deve cobrir os fluxos principais (initialize/select/compare/sync/tree)', async () => {
		const executed: unknown[][] = [];
		await withStubbedWindow(
			{
				warn: () => { },
				quickPick: async () => ({ label: 'main' }),
				execute: async (...args) => { executed.push(args); }
			},
			async () => {
				const fakeService = {
					isGitRepository: async () => true,
					getBranches: async () => [
						{ name: 'main', isCurrent: true, isRemote: false },
						{ name: 'dev', isCurrent: false, isRemote: false }
					],
					getCommitsForRef: async (ref: string) => (ref === 'empty' ? [] : [sampleCommit])
				} as unknown as GitService;

				const provider = new GitCompareSidebarProvider(fakeService);
				await provider.initialize();
				await provider.selectBranch('branch1');
				await provider.selectBranch('branch2');
				await provider.selectCommitForBranch('branch1', 'main', 'abc');
				await provider.selectCommitForBranch('branch2', 'main', 'abc');
				await provider.compareFromSidebar();

				const roots = await provider.getChildren();
				assert.ok(roots.length >= 3);
				const commits = await provider.getChildren({ kind: 'commitGroup', slot: 'branch1', branch: 'main' });
				assert.strictEqual(commits.length, 1);
				const noCommits = await provider.getChildren({ kind: 'commitGroup', slot: 'branch1', branch: 'empty' });
				assert.strictEqual(noCommits[0].kind, 'info');
				assert.deepStrictEqual(await provider.getChildren({ kind: 'info', label: 'x' }), []);

				// getTreeItem para cada tipo de nó.
				assert.ok(provider.getTreeItem({ kind: 'branchField', slot: 'branch1' }).label);
				assert.ok(provider.getTreeItem({ kind: 'branchField', slot: 'branch2' }).label);
				assert.ok(provider.getTreeItem({ kind: 'compareAction' }).label);
				assert.ok(provider.getTreeItem({ kind: 'commitGroup', slot: 'branch1', branch: 'main' }).label);
				assert.ok(provider.getTreeItem({ kind: 'commitGroup', slot: 'branch2', branch: 'dev' }).label);
				assert.ok(provider.getTreeItem({ kind: 'info', label: 'i', description: 'd' }).label);

				// Commit selecionado (isSelected = true) e não selecionado (isSelected = false).
				const selected = provider.getTreeItem({ kind: 'commit', slot: 'branch1', branch: 'main', commit: sampleCommit });
				assert.ok(String(selected.description).includes('•'));
				const otherCommit = { ...sampleCommit, hash: 'zzz' };
				const notSelected = provider.getTreeItem({ kind: 'commit', slot: 'branch2', branch: 'dev', commit: otherCommit });
				assert.ok(notSelected.label);

				assert.ok(executed.length > 0);
			}
		);
	});

	test('branchField/compareAction devem usar placeholders quando nada esta selecionado', () => {
		const provider = new GitCompareSidebarProvider({
			isGitRepository: async () => true,
			getBranches: async () => [],
			getCommitsForRef: async () => []
		} as unknown as GitService);

		// Sem branch selecionada -> rotulo usa o placeholder "(selecionar)" em ambos os slots.
		const item1 = provider.getTreeItem({ kind: 'branchField', slot: 'branch1' });
		assert.ok(String(item1.label).length > 0);
		const item2 = provider.getTreeItem({ kind: 'branchField', slot: 'branch2' });
		assert.ok(String(item2.label).length > 0);

		// Sem refs -> descricao da acao de comparar usa "?..?".
		const action = provider.getTreeItem({ kind: 'compareAction' });
		assert.ok(String(action.description).includes('?'));
	});

	test('initialize deve recair na mesma branch quando ha apenas uma disponivel', async () => {
		const provider: any = new GitCompareSidebarProvider({
			isGitRepository: async () => true,
			getBranches: async () => [{ name: 'main', isCurrent: true, isRemote: false }],
			getCommitsForRef: async () => []
		} as unknown as GitService);

		await provider.initialize();
		// `find(b => b !== branch1)` nao encontra nada -> branch2 recai em branch1.
		assert.strictEqual(provider._branch1, 'main');
		assert.strictEqual(provider._branch2, 'main');
	});

	test('deve cobrir casos sem gitService e sem repositorio Git', async () => {
		const noSvc = new GitCompareSidebarProvider(null);
		await noSvc.initialize();
		assert.strictEqual((await noSvc.getChildren())[0].kind, 'info');

		const noRepo = new GitCompareSidebarProvider({
			isGitRepository: async () => false,
			getBranches: async () => [],
			getCommitsForRef: async () => []
		} as unknown as GitService);
		await noRepo.initialize();
		assert.strictEqual((await noRepo.getChildren())[0].kind, 'info');
	});

	test('deve cobrir retornos antecipados, erros de init e sync em ambos os slots', async () => {
		let warnings = 0;
		await withStubbedWindow(
			{ warn: () => { warnings++; }, quickPick: async () => undefined },
			async () => {
				// Sem serviço: cada acao dispara aviso ou retorna cedo.
				const providerNoSvc = new GitCompareSidebarProvider(null);
				await providerNoSvc.selectBranch('branch1');
				await providerNoSvc.selectCommitForBranch('branch2', 'main', 'x');
				await providerNoSvc.syncSelectedRefs('a', 'b');
				await (providerNoSvc as any)._syncSlotFromRef('branch1', 'main');
				assert.ok(warnings > 0);

				// Init que lanca erro -> aviso de initError.
				const providerCatch = new GitCompareSidebarProvider({
					isGitRepository: async () => true,
					getBranches: async () => { throw new Error('init-fail'); },
					getCommitsForRef: async () => []
				} as unknown as GitService);
				await providerCatch.initialize();
				assert.ok(warnings > 1);

				// Init com zero branches -> retorno antecipado.
				const providerEmpty = new GitCompareSidebarProvider({
					isGitRepository: async () => true,
					getBranches: async () => [],
					getCommitsForRef: async () => []
				} as unknown as GitService);
				await providerEmpty.initialize();

				// selectCommitForBranch com hash inexistente -> retorno antecipado.
				const provider = new GitCompareSidebarProvider({
					isGitRepository: async () => true,
					getBranches: async () => [{ name: 'main', isCurrent: false, isRemote: false }, { name: 'dev', isCurrent: false, isRemote: false }],
					getCommitsForRef: async (ref: string) => (ref === 'main' || ref === 'dev' ? [sampleCommit] : [{ ...sampleCommit, hash: 'c-' + ref }])
				} as unknown as GitService);
				await provider.initialize();
				// QuickPick cancelado (undefined) -> retorno antecipado em selectBranch.
				await provider.selectBranch('branch1');
				await provider.selectCommitForBranch('branch2', 'main', 'not-found');

				// compareFromSidebar sem refs completos -> aviso.
				const p2: any = provider;
				p2._commit2 = undefined;
				p2._branch2 = '';
				await provider.compareFromSidebar();
			}
		);
	});

	test('_syncSlotFromRef deve resolver branch existente e commit avulso em ambos os slots', async () => {
		const provider: any = new GitCompareSidebarProvider({
			isGitRepository: async () => true,
			getBranches: async () => [{ name: 'main', isCurrent: false, isRemote: false }, { name: 'dev', isCurrent: false, isRemote: false }],
			getCommitsForRef: async (ref: string) => [{ ...sampleCommit, hash: 'h-' + ref }]
		} as unknown as GitService);
		await provider.initialize();

		// branch1 = branch existente (matchingBranch); branch2 = ref avulsa (usa commit).
		await provider.syncSelectedRefs('main', 'feature-x');
		assert.strictEqual(provider._branch1, 'main');
		assert.strictEqual(provider._commit1, undefined);
		assert.strictEqual(provider._branch2, 'feature-x');
		assert.ok(provider._commit2);

		// Inverte: branch1 = ref avulsa (usa commit); branch2 = branch existente.
		await provider.syncSelectedRefs('outra-ref', 'dev');
		assert.strictEqual(provider._branch1, 'outra-ref');
		assert.ok(provider._commit1);
		assert.strictEqual(provider._branch2, 'dev');
		assert.strictEqual(provider._commit2, undefined);
	});
});
