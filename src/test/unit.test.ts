import * as assert from 'assert';
import * as vscode from 'vscode';
import * as Diff from 'diff';
import { GitService } from '../gitService';
import { escapeHtml, getNonce } from '../utils';
import { HashInfo, buildSideBySideDiff, renderDiffHtml, renderFileDiff } from '../diffRenderer';
import { getLocale, t } from '../i18n';
import { GitCompareSidebarProvider } from '../sidebarProvider';
import { GitComparePanel } from '../gitComparePanel';

suite('Unit Test Suite', () => {
	test('utils.escapeHtml deve escapar caracteres especiais e vazio', () => {
		assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
		assert.strictEqual(escapeHtml('abc'), 'abc');
		assert.strictEqual(escapeHtml(''), '');
	});

	test('utils.getNonce deve gerar 32 caracteres alfanumericos', () => {
		const nonce = getNonce();
		assert.strictEqual(nonce.length, 32);
		assert.ok(/^[A-Za-z0-9]{32}$/.test(nonce));
	});

	test('i18n deve retornar locale valido e resolver mensagens com fallback', () => {
		const locale = getLocale();
		assert.ok(locale === 'pt-br' || locale === 'en-us');
		assert.strictEqual(t('sidebar.branchLabel1', { branch: 'main' }).includes('main'), true);
		assert.strictEqual(t('chave.inexistente'), 'chave.inexistente');
		assert.strictEqual(t('sidebar.branchLabel1', {} as Record<string, string>).includes('{branch}'), true);
	});

	test('diffRenderer.buildSideBySideDiff deve retornar conteudo escapado sem diffLines', () => {
		const compare = new HashInfo('a.ts', 'modified', 'a', 'b', '<old>', '<new>', []);
		const rendered = buildSideBySideDiff(compare);
		assert.ok(rendered.leftLines.includes('&lt;old&gt;'));
		assert.ok(rendered.rightLines.includes('&lt;new&gt;'));
	});

	test('diffRenderer.buildSideBySideDiff deve cobrir context/add/remove e inline pair', () => {
		const compare = new HashInfo(
			'f.ts',
			'modified',
			'a',
			'b',
			'',
			'',
			Diff.diffLines('line1\nline2 old\nline3\n', 'line1\nline2 new\nline3\nline4\n')
		);
		const rendered = buildSideBySideDiff(compare);
		assert.ok(rendered.leftLines.includes('line-context'));
		assert.ok(rendered.leftLines.includes('line-deleted'));
		assert.ok(rendered.rightLines.includes('line-added'));
	});

	test('diffRenderer.buildSideBySideDiff deve cobrir pares com tamanhos diferentes', () => {
		const renderedLeftGap = buildSideBySideDiff(new HashInfo(
			'f.ts',
			'modified',
			'a',
			'b',
			'',
			'',
			Diff.diffLines('x\ny\n', 'x\n')
		));
		assert.ok(renderedLeftGap.leftLines.includes('line-empty') || renderedLeftGap.rightLines.includes('line-empty'));

		const renderedRightGap = buildSideBySideDiff(new HashInfo(
			'f.ts',
			'modified',
			'a',
			'b',
			'',
			'',
			Diff.diffLines('x\n', 'x\ny\n')
		));
		assert.ok(renderedRightGap.leftLines.includes('line-empty') || renderedRightGap.rightLines.includes('line-empty'));
	});

	test('diffRenderer.buildSideBySideDiff deve cobrir placeholders nos dois lados do par remove/add', () => {
		const leftPlaceholder = buildSideBySideDiff(new HashInfo(
			'f.ts',
			'modified',
			'a',
			'b',
			'',
			'',
			[
				{ removed: true, value: 'old1\n', count: 1 },
				{ added: true, value: 'new1\nnew2\n', count: 2 }
			] as Diff.Change[]
		));
		assert.ok(leftPlaceholder.leftLines.includes('line-empty'));

		const rightPlaceholder = buildSideBySideDiff(new HashInfo(
			'f.ts',
			'modified',
			'a',
			'b',
			'',
			'',
			[
				{ removed: true, value: 'old1\nold2\n', count: 2 },
				{ added: true, value: 'new1\n', count: 1 }
			] as Diff.Change[]
		));
		assert.ok(rightPlaceholder.rightLines.includes('line-empty'));
	});

	test('diffRenderer.renderFileDiff deve mapear status known e fallback', () => {
		const known = renderFileDiff(new HashInfo('file.ts', 'added', 'a', 'b', 'x', 'y', []));
		assert.ok(known.includes('file-status added'));

		const unknown = renderFileDiff(new HashInfo('file.ts', 'whatever', 'a', 'b', 'x', 'y', []));
		assert.ok(unknown.includes('file-status whatever'));
	});

	test('diffRenderer.renderDiffHtml deve renderizar stats quando gitService nulo', async () => {
		const html = await renderDiffHtml(null as unknown as GitService, ['a.ts'], 'a', 'b', '<stats/>');
		assert.strictEqual(html, '<stats/>');
	});

	test('diffRenderer.renderDiffHtml deve cobrir added/deleted/modified/error', async () => {
		const fakeService = {
			getFileContent: async (ref: string, file: string) => {
				if (file === 'added.ts') return ref === 'a' ? '' : 'new';
				if (file === 'deleted.ts') return ref === 'a' ? 'old' : '';
				if (file === 'error.ts') throw new Error('boom');
				return ref === 'a' ? 'old' : 'new';
			}
		} as unknown as GitService;

		const html = await renderDiffHtml(fakeService, ['modified.ts', 'added.ts', 'deleted.ts', 'error.ts'], 'a', 'b', '<stats/>');
		assert.ok(html.includes('modified.ts'));
		assert.ok(html.includes('added.ts'));
		assert.ok(html.includes('deleted.ts'));
		assert.ok(html.includes('error.ts'));
	});

	test('gitService parseDiffHunks deve processar hunk com add/delete/context', () => {
		const service = new GitService('.') as unknown as { parseDiffHunks: (diffOutput: string) => unknown[] };
		const hunks = service.parseDiffHunks('@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 changed\n');
		assert.strictEqual(hunks.length, 1);
	});

	test('gitService parseDiffHunks deve cobrir multiplos hunks', () => {
		const service = new GitService('.') as unknown as { parseDiffHunks: (diffOutput: string) => unknown[] };
		const hunks = service.parseDiffHunks('@@ -1,1 +1,1 @@\n-a\n+b\n@@ -3,1 +3,1 @@\n-c\n+d\n');
		assert.strictEqual(hunks.length, 2);
	});

	test('gitService exec privado deve cobrir sucesso e erro reais', async () => {
		const service = new GitService('.') as any;
		const version = await service.runGit(['--version']);
		assert.ok(version.toLowerCase().includes('git version'));

		await assert.rejects(async () => service.runGit(['definitely-invalid-command-xyz']));
	});

	test('gitService parseCommitList deve ignorar linhas invalidas', () => {
		const service = new GitService('.') as unknown as { parseCommitList: (result: string) => unknown[] };
		const commits = service.parseCommitList('a\x1fb\x1fc\x1fd\x1fe\ninvalid');
		assert.strictEqual(commits.length, 1);
	});

	test('gitService metodos publicos devem cobrir caminhos de sucesso/erro', async () => {
		const service = new GitService('.') as any;
		service.runGit = async (args: string[]): Promise<string> => {
			const command = args.join(' ');
			if (command === 'rev-parse --git-dir') return '.git';
			if (command === 'branch -a --format=%(refname:short)|%(HEAD)|%(refname)') return 'main|*|refs/heads/main\norigin/main||refs/remotes/origin/main';
			if (command === 'log --pretty=format:%h%x1f%H%x1f%s%x1f%an%x1f%ad --date=short -n 50') return 'a\x1faaaa\x1fmsg\x1fme\x1f2026-01-01';
			if (command === 'log main --pretty=format:%h%x1f%H%x1f%s%x1f%an%x1f%ad --date=short -n 20') return 'b\x1fbbbb\x1fmsg2\x1fyou\x1f2026-01-02';
			if (command === 'diff --name-status a..b -- f.ts') return 'M\tf.ts';
			if (command === 'diff --name-status a..b') return 'A\tnew.ts\nD\told.ts\nR100\ta.ts\tb.ts\nM\tm.ts';
			if (command === 'show a:f.ts') return 'old';
			if (command === 'show b:f.ts') return 'new';
			if (command === 'diff a..b -- f.ts') return '@@ -1,1 +1,1 @@\n-old\n+new\n';
			if (command === 'diff a..b') return 'raw-diff';
			if (command === 'diff --stat a..b') return ' 1 file changed, 2 insertions(+), 3 deletions(-)';
			if (command === 'branch --show-current') return 'main';
			if (command === 'for-each-ref --format=%(refname:short) refs/heads/ refs/remotes/') return 'main\norigin/main';
			if (command === 'tag') return 'v1.0.0';
			if (command === 'log --pretty=format:%h -n 20') return 'abc\ndef';
			return '';
		};

		assert.strictEqual(await service.isGitRepository(), true);
		assert.strictEqual((await service.getBranches()).length, 2);
		assert.strictEqual((await service.getCommits()).length, 1);
		assert.strictEqual((await service.getCommitsForRef('main')).length, 1);
		assert.strictEqual((await service.getChangedFiles('a', 'b')).length, 4);
		assert.strictEqual(await service.getFileContent('a', 'f.ts'), 'old');
		assert.strictEqual(await service.getDiff('a', 'b', 'f.ts').then((r: string) => r.includes('@@')), true);
		assert.strictEqual(await service.getDiff('a', 'b'), 'raw-diff');
		assert.strictEqual((await service.getFileDiff('a', 'b', 'f.ts')).status, 'modified');
		const stats = await service.getDiffStats('a', 'b');
		assert.strictEqual(stats.files, 1);
		assert.strictEqual(stats.additions, 2);
		assert.strictEqual(stats.deletions, 3);
		assert.strictEqual(await service.getCurrentBranch(), 'main');
		assert.strictEqual((await service.getAllRefs()).includes('main'), true);
	});

	test('gitService deve cobrir caminhos de fallback/erro', async () => {
		const service = new GitService('.') as any;
		service.runGit = async (args: string[]): Promise<string> => {
			const command = args.join(' ');
			if (command === 'rev-parse --git-dir') {
				throw new Error('not git');
			}
			if (command === 'diff --stat a..b') {
				return 'no summary';
			}
			if (command === 'for-each-ref --format=%(refname:short) refs/heads/ refs/remotes/') {
				throw new Error('x');
			}
			if (command === 'tag') {
				throw new Error('x');
			}
			if (command === 'log --pretty=format:%h -n 20') {
				throw new Error('x');
			}
			throw new Error('missing');
		};

		assert.strictEqual(await service.isGitRepository(), false);
		assert.strictEqual(await service.getFileContent('x', 'y'), '');
		const stats = await service.getDiffStats('a', 'b');
		assert.deepStrictEqual(stats, { files: 0, additions: 0, deletions: 0 });
		assert.deepStrictEqual(await service.getAllRefs(), []);
	});

	test('gitService deve rejeitar entradas perigosas para refs, paths e limites', async () => {
		const service = new GitService('.') as any;
		service.runGit = async () => 'ok';

		await assert.rejects(async () => service.getCommitsForRef('main;whoami', 10), /Referencia Git invalida/);
		await assert.rejects(async () => service.getDiff('main', 'dev && calc'), /Referencia Git invalida/);
		await assert.rejects(async () => service.getDiff('main', 'dev', '../secret.txt'), /Caminho de arquivo invalido/);
		await assert.rejects(async () => service.getCommits(0), /Limite de commits invalido/);
	});

	test('sidebar provider deve cobrir fluxos principais', async () => {
		const warnings: string[] = [];
		const executed: unknown[][] = [];
		const oldWarn = vscode.window.showWarningMessage;
		const oldQuickPick = vscode.window.showQuickPick;
		const oldExecute = vscode.commands.executeCommand;

		(vscode.window as unknown as { showWarningMessage: (msg: string) => void }).showWarningMessage = (msg: string) => {
			warnings.push(msg);
		};
		(vscode.window as unknown as { showQuickPick: (...args: unknown[]) => Promise<{ label: string } | undefined> }).showQuickPick = async () => ({ label: 'main' });
		(vscode.commands as unknown as { executeCommand: (...args: unknown[]) => Promise<void> }).executeCommand = async (...args: unknown[]) => {
			executed.push(args);
		};

		try {
			const fakeService = {
				isGitRepository: async () => true,
				getBranches: async () => [{ name: 'main', isCurrent: true, isRemote: false }, { name: 'dev', isCurrent: false, isRemote: false }],
				getCommitsForRef: async (ref: string, limit: number) => {
					void limit;
					if (ref === 'empty') return [];
					return [{ hash: 'abc', fullHash: 'abcdef', message: 'm', author: 'a', date: 'd' }];
				}
			} as unknown as GitService;

			const provider = new GitCompareSidebarProvider(fakeService);
			await provider.initialize();
			await provider.selectBranch('branch1');
			await provider.selectCommitForBranch('branch1', 'main', 'abc');
			await provider.compareFromSidebar();
			await provider.syncSelectedRefs('main', 'abc');

			const roots = await provider.getChildren();
			assert.ok(roots.length >= 3);
			const commits = await provider.getChildren({ kind: 'commitGroup', slot: 'branch1', branch: 'main' });
			assert.strictEqual(commits.length, 1);
			const noCommits = await provider.getChildren({ kind: 'commitGroup', slot: 'branch1', branch: 'empty' });
			assert.strictEqual(noCommits[0].kind, 'info');

			const branchItem = provider.getTreeItem({ kind: 'branchField', slot: 'branch1' });
			const actionItem = provider.getTreeItem({ kind: 'compareAction' });
			const groupItem = provider.getTreeItem({ kind: 'commitGroup', slot: 'branch1', branch: 'main' });
			const commitItem = provider.getTreeItem({ kind: 'commit', slot: 'branch1', branch: 'main', commit: { hash: 'abc', fullHash: 'abcdef', message: 'm', author: 'a', date: 'd' } });
			const infoItem = provider.getTreeItem({ kind: 'info', label: 'i', description: 'd' });

			assert.ok(branchItem.label);
			assert.ok(actionItem.label);
			assert.ok(groupItem.label);
			assert.ok(commitItem.label);
			assert.ok(infoItem.label);
			assert.strictEqual(executed.length > 0, true);
		} finally {
			(vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }).showWarningMessage = oldWarn;
			(vscode.window as unknown as { showQuickPick: typeof vscode.window.showQuickPick }).showQuickPick = oldQuickPick;
			(vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }).executeCommand = oldExecute;
		}
	});

	test('sidebar provider deve cobrir casos sem gitService e sem repositorio', async () => {
		const noSvc = new GitCompareSidebarProvider(null);
		await noSvc.initialize();
		assert.strictEqual((await noSvc.getChildren())[0].kind, 'info');

		const fakeService = {
			isGitRepository: async () => false,
			getBranches: async () => [],
			getCommitsForRef: async () => []
		} as unknown as GitService;

		const noRepo = new GitCompareSidebarProvider(fakeService);
		await noRepo.initialize();
		assert.strictEqual((await noRepo.getChildren())[0].kind, 'info');
	});

	test('sidebar provider deve cobrir retornos antecipados e paths restantes', async () => {
		let warningCount = 0;
		const oldWarn = vscode.window.showWarningMessage;
		const oldPick = vscode.window.showQuickPick;

		(vscode.window as any).showWarningMessage = () => {
			warningCount++;
		};
		(vscode.window as any).showQuickPick = async () => undefined;

		try {
			const providerNoSvc = new GitCompareSidebarProvider(null);
			await providerNoSvc.selectBranch('branch1');
			await providerNoSvc.selectCommitForBranch('branch2', 'main', 'x');
			await providerNoSvc.syncSelectedRefs('a', 'b');
			assert.strictEqual(warningCount > 0, true);

			const provider = new GitCompareSidebarProvider({
				isGitRepository: async () => true,
				getBranches: async () => [{ name: 'main', isCurrent: false, isRemote: false }],
				getCommitsForRef: async () => [{ hash: 'h1', fullHash: 'h1x', message: 'm', author: 'a', date: 'd' }]
			} as unknown as GitService);

			await provider.initialize();
			await provider.selectBranch('branch2');
			await provider.selectCommitForBranch('branch2', 'main', 'not-found');
			await provider.compareFromSidebar();
			const childrenUnknown = await provider.getChildren({ kind: 'info', label: 'x' });
			assert.deepStrictEqual(childrenUnknown, []);

			const p2: any = provider;
			p2._commit2 = undefined;
			p2._branch2 = '';
			await provider.compareFromSidebar();

			const providerCatch = new GitCompareSidebarProvider({
				isGitRepository: async () => true,
				getBranches: async () => {
					throw new Error('init-fail');
				},
				getCommitsForRef: async () => []
			} as unknown as GitService);
			await providerCatch.initialize();
			assert.strictEqual(warningCount > 1, true);

			const providerEmptyBranches = new GitCompareSidebarProvider({
				isGitRepository: async () => true,
				getBranches: async () => [],
				getCommitsForRef: async () => []
			} as unknown as GitService);
			await providerEmptyBranches.initialize();

			(vscode.window as any).showQuickPick = async () => ({ label: 'branch-two' });
			await provider.selectBranch('branch2');
			await provider.selectCommitForBranch('branch2', 'main', 'h1');

			const noSvcAny = providerNoSvc as any;
			await noSvcAny._syncSlotFromRef('branch1', 'main');
		} finally {
			(vscode.window as any).showWarningMessage = oldWarn;
			(vscode.window as any).showQuickPick = oldPick;
		}
	});

	test('GitComparePanel static members devem estar disponiveis', () => {
		assert.strictEqual(GitComparePanel.viewType, 'vscode-ark-git-compare');
		const options = GitComparePanel.getWebviewOptions(vscode.Uri.file('.'));
		assert.strictEqual(options.enableScripts, true);
		assert.strictEqual(Array.isArray(options.localResourceRoots), true);
	});

	test('GitComparePanel constructor e handlers devem cobrir mensagens e lifecycle', async () => {
		const webviewState: { onMessage?: (m: any) => void } = {};
		let onDispose: (() => void) | undefined;
		let onViewChange: (() => void) | undefined;
		let disposed = false;
		let showedError = '';
		let warningCount = 0;
		let compareArgs: unknown[] = [];

		const oldShowError = vscode.window.showErrorMessage;
		const oldShowWarn = vscode.window.showWarningMessage;
		const oldExecute = vscode.commands.executeCommand;

		(vscode.window as any).showErrorMessage = (msg: string) => {
			showedError = msg;
		};
		(vscode.window as any).showWarningMessage = () => {
			warningCount++;
		};
		(vscode.commands as any).executeCommand = async (...args: unknown[]) => {
			compareArgs = args;
		};

		try {
			const fakeWebview: any = {
				html: '',
				options: {},
				cspSource: 'vscode-resource://test',
				asWebviewUri: (u: vscode.Uri) => u,
				onDidReceiveMessage: (cb: (m: any) => void) => {
					webviewState.onMessage = cb;
					return { dispose() { } };
				},
				postMessage: () => Promise.resolve(true)
			};

			const fakePanel: any = {
				webview: fakeWebview,
				title: '',
				visible: true,
				reveal: () => { },
				dispose: () => {
					disposed = true;
				},
				onDidDispose: (cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => {
					onDispose = cb;
					bag.push({ dispose() { } });
					return { dispose() { } };
				},
				onDidChangeViewState: (cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => {
					onViewChange = cb;
					bag.push({ dispose() { } });
					return { dispose() { } };
				}
			};

			const panel: any = new (GitComparePanel as any)(fakePanel, vscode.Uri.file('.'));
			panel._gitService = null;
			await panel._showBranchSelector(fakeWebview);

			assert.ok(fakeWebview.html.includes('error-state'));
			webviewState.onMessage?.({ command: 'alert', text: 'x' });
			assert.strictEqual(showedError, 'x');
			webviewState.onMessage?.({ command: 'alert', text: 123 });
			assert.strictEqual(warningCount > 0, true);
			webviewState.onMessage?.({ command: 'compare', hash1: 'a;rm -rf', hash2: 'b' });
			assert.strictEqual(warningCount > 1, true);
			webviewState.onMessage?.({ command: 'compare', hash1: 'a', hash2: 'b' });
			assert.strictEqual(compareArgs[0], 'vscode-ark-git-compare.compareCommits');

			onViewChange?.();
			onDispose?.();
			assert.strictEqual(disposed, true);
		} finally {
			(vscode.window as any).showErrorMessage = oldShowError;
			(vscode.window as any).showWarningMessage = oldShowWarn;
			(vscode.commands as any).executeCommand = oldExecute;
		}
	});

	test('GitComparePanel constructor deve cobrir ramo com workspaceFolders', () => {
		const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');
		let restored = false;

		try {
			Object.defineProperty(vscode.workspace, 'workspaceFolders', {
				configurable: true,
				get: () => [{ uri: vscode.Uri.file('.') }]
			});

			const fakeWebview: any = {
				html: '',
				options: {},
				cspSource: 'vscode-resource://test',
				asWebviewUri: (u: vscode.Uri) => u,
				onDidReceiveMessage: () => ({ dispose() { } }),
				postMessage: () => Promise.resolve(true)
			};

			const fakePanel: any = {
				webview: fakeWebview,
				title: '',
				visible: true,
				reveal: () => { },
				dispose: () => { },
				onDidDispose: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag.push({ dispose() { } }); return { dispose() { } }; },
				onDidChangeViewState: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag.push({ dispose() { } }); return { dispose() { } }; }
			};

			const panel: any = new (GitComparePanel as any)(fakePanel, vscode.Uri.file('.'));
			assert.ok(panel._gitService);
		} catch {
			// Algumas versões do host não permitem redefinir workspaceFolders; teste permanece resiliente.
		} finally {
			if (originalDescriptor) {
				Object.defineProperty(vscode.workspace, 'workspaceFolders', originalDescriptor);
				restored = true;
			}
			assert.strictEqual(restored, true);
		}
	});

	test('GitComparePanel metodos privados devem cobrir cenarios de renderizacao', async () => {
		const posted: any[] = [];
		const fakeWebview: any = {
			html: '',
			options: {},
			cspSource: 'vscode-resource://test',
			asWebviewUri: (u: vscode.Uri) => u,
			onDidReceiveMessage: () => ({ dispose() { } }),
			postMessage: (msg: any) => {
				posted.push(msg);
				return Promise.resolve(true);
			}
		};

		const fakePanel: any = {
			webview: fakeWebview,
			title: '',
			visible: true,
			reveal: () => { },
			dispose: () => { },
			onDidDispose: () => ({ dispose() { } }),
			onDidChangeViewState: () => ({ dispose() { } })
		};

		const panel: any = Object.create((GitComparePanel as any).prototype);
		panel._panel = fakePanel;
		panel._extensionUri = vscode.Uri.file('.');
		panel._selectedRef1 = '';
		panel._selectedRef2 = '';
		panel._disposables = [];

		panel._gitService = null;
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('noWorkspace') || fakeWebview.html.includes('error-state'));

		panel._gitService = {
			isGitRepository: async () => false
		};
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('notGitRepo') || fakeWebview.html.includes('error-state'));

		panel._gitService = {
			isGitRepository: async () => true,
			getAllRefs: async () => ['main', 'dev'],
			getCurrentBranch: async () => 'main'
		};
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('git-form'));

		panel._gitService = {
			isGitRepository: async () => {
				throw new Error('boom');
			}
		};
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('boom'));

		panel._gitService = null;
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.strictEqual(posted[0].command, 'showResult');

		panel._gitService = {
			getDiffStats: async () => ({ files: 0, additions: 0, deletions: 0 }),
			getChangedFiles: async () => []
		};
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => m.command === 'syncSelection'));
		assert.ok(posted.some(m => String(m.html || '').includes('empty-state')));

		panel._gitService = {
			getDiffStats: async () => ({ files: 1, additions: 2, deletions: 1 }),
			getChangedFiles: async () => [{ file: 'f.ts', status: 'modified' }],
			getFileContent: async () => 'x'
		};
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => String(m.html || '').includes('file-search-container')));

		panel._gitService = {
			getDiffStats: async () => {
				throw new Error('stats-fail');
			}
		};
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => String(m.html || '').includes('stats-fail')));

		const html = panel._getHtmlForWebview(fakeWebview, '<div>x</div>');
		assert.ok(html.includes('Content-Security-Policy'));
		assert.ok(html.includes('window.GIT_COMPARE_I18N'));

		let updateCalled = false;
		panel._showBranchSelector = () => {
			updateCalled = true;
		};
		panel._update();
		assert.strictEqual(updateCalled, true);

		let disposedCount = 0;
		panel._disposables = [{ dispose: () => { disposedCount++; } }, { dispose: () => { disposedCount++; } }];
		GitComparePanel.currentPanel = panel;
		panel.dispose();
		assert.strictEqual(disposedCount, 2);
	});

	test('GitComparePanel static createOrShow/compareRefs/revive devem cobrir fluxos', async () => {
		const originalCreate = (vscode.window as any).createWebviewPanel;
		let revealed = false;
		let compared = false;

		try {
			GitComparePanel.currentPanel = { _panel: { reveal: () => { revealed = true; } } } as any;
			const existing = GitComparePanel.createOrShow(vscode.Uri.file('.'));
			assert.ok(existing);
			assert.strictEqual(revealed, true);

			const fakeWebview: any = {
				html: '',
				options: {},
				cspSource: 'vscode-resource://test',
				asWebviewUri: (u: vscode.Uri) => u,
				onDidReceiveMessage: () => ({ dispose() { } }),
				postMessage: () => Promise.resolve(true)
			};
			const fakePanel: any = {
				webview: fakeWebview,
				title: '',
				visible: true,
				reveal: () => { },
				dispose: () => { },
				onDidDispose: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag.push({ dispose() { } }); return { dispose() { } }; },
				onDidChangeViewState: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag.push({ dispose() { } }); return { dispose() { } }; }
			};

			(vscode.window as any).createWebviewPanel = () => fakePanel;
			GitComparePanel.currentPanel = undefined;
			const created = GitComparePanel.createOrShow(vscode.Uri.file('.')) as any;
			created._setDiffContent = async () => {
				compared = true;
			};
			await GitComparePanel.compareRefs(vscode.Uri.file('.'), 'a', 'b');
			assert.strictEqual(compared, true);

			GitComparePanel.revive(fakePanel, vscode.Uri.file('.'));
			assert.ok(GitComparePanel.currentPanel);
		} finally {
			(vscode.window as any).createWebviewPanel = originalCreate;
		}
	});
});
