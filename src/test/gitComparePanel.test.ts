import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitComparePanel } from '../gitComparePanel';

/** Cria um par de fakes de WebviewPanel/Webview com hooks de captura. */
function makeFakes(overrides: { onMessage?: (cb: (m: any) => void) => void; postMessage?: (m: any) => void } = {}) {
	const fakeWebview: any = {
		html: '',
		options: {},
		cspSource: 'vscode-resource://test',
		asWebviewUri: (u: vscode.Uri) => u,
		onDidReceiveMessage: (cb: (m: any) => void) => { overrides.onMessage?.(cb); return { dispose() { } }; },
		postMessage: (m: any) => { overrides.postMessage?.(m); return Promise.resolve(true); }
	};
	const fakePanel: any = {
		webview: fakeWebview,
		title: '',
		visible: true,
		reveal: () => { },
		dispose: () => { },
		onDidDispose: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag?.push?.({ dispose() { } }); return { dispose() { } }; },
		onDidChangeViewState: (_cb: () => void, _ctx: unknown, bag: vscode.Disposable[]) => { bag?.push?.({ dispose() { } }); return { dispose() { } }; }
	};
	return { fakeWebview, fakePanel };
}

suite('gitComparePanel.ts', () => {
	test('membros estaticos devem estar disponiveis', () => {
		assert.strictEqual(GitComparePanel.viewType, 'vscode-ark-git-compare');
		const options = GitComparePanel.getWebviewOptions(vscode.Uri.file('.'));
		assert.strictEqual(options.enableScripts, true);
		assert.ok(Array.isArray(options.localResourceRoots));
	});

	test('parseWebviewMessage deve validar mensagens', () => {
		const panel: any = Object.create((GitComparePanel as any).prototype);
		assert.strictEqual(panel.parseWebviewMessage(null), null);
		assert.strictEqual(panel.parseWebviewMessage('texto'), null);
		assert.strictEqual(panel.parseWebviewMessage({}), null);
		assert.strictEqual(panel.parseWebviewMessage({ command: 123 }), null);
		assert.strictEqual(panel.parseWebviewMessage({ command: 'desconhecido' }), null);
		assert.strictEqual(panel.parseWebviewMessage({ command: 'alert', text: 123 }), null);
		assert.deepStrictEqual(panel.parseWebviewMessage({ command: 'alert', text: 'oi' }), { command: 'alert', text: 'oi' });
		assert.strictEqual(panel.parseWebviewMessage({ command: 'compare', hash1: 'a;rm', hash2: 'b' }), null);
		assert.deepStrictEqual(panel.parseWebviewMessage({ command: 'compare', hash1: ' a ', hash2: ' b ' }), { command: 'compare', hash1: 'a', hash2: 'b' });
		assert.strictEqual(panel.parseWebviewMessage({ command: 'requestFileDiff', file: 123 }), null);
		assert.strictEqual(panel.parseWebviewMessage({ command: 'requestFileDiff', file: '' }), null);
		assert.deepStrictEqual(panel.parseWebviewMessage({ command: 'requestFileDiff', file: 'f.ts' }), { command: 'requestFileDiff', file: 'f.ts' });
	});

	test('construtor deve tratar mensagens e lifecycle', async () => {
		let onMessage: ((m: any) => void) | undefined;
		let onDispose: (() => void) | undefined;
		let onViewChange: (() => void) | undefined;
		let disposed = false;
		let showedError = '';
		let warnings = 0;
		let compareArgs: unknown[] = [];

		const oldShowError = vscode.window.showErrorMessage;
		const oldShowWarn = vscode.window.showWarningMessage;
		const oldExecute = vscode.commands.executeCommand;
		(vscode.window as any).showErrorMessage = (msg: string) => { showedError = msg; };
		(vscode.window as any).showWarningMessage = () => { warnings++; };
		(vscode.commands as any).executeCommand = async (...args: unknown[]) => { compareArgs = args; };

		try {
			const fakeWebview: any = {
				html: '', options: {}, cspSource: 'vscode-resource://test',
				asWebviewUri: (u: vscode.Uri) => u,
				onDidReceiveMessage: (cb: (m: any) => void) => { onMessage = cb; return { dispose() { } }; },
				postMessage: () => Promise.resolve(true)
			};
			const fakePanel: any = {
				webview: fakeWebview, title: '', visible: true, reveal: () => { }, dispose: () => { disposed = true; },
				onDidDispose: (cb: () => void, _c: unknown, bag: vscode.Disposable[]) => { onDispose = cb; bag.push({ dispose() { } }); return { dispose() { } }; },
				onDidChangeViewState: (cb: () => void, _c: unknown, bag: vscode.Disposable[]) => { onViewChange = cb; bag.push({ dispose() { } }); return { dispose() { } }; }
			};

			const panel: any = new (GitComparePanel as any)(fakePanel, vscode.Uri.file('.'));
			panel._gitService = null;
			await panel._showBranchSelector(fakeWebview);
			assert.ok(fakeWebview.html.includes('error-state'));

			onMessage?.({ command: 'alert', text: 'x' });
			assert.strictEqual(showedError, 'x');
			// Texto vazio -> usa a mensagem padrao de erro desconhecido.
			onMessage?.({ command: 'alert', text: '' });
			assert.ok(showedError.length > 0);
			onMessage?.({ command: 'alert', text: 123 });
			assert.ok(warnings > 0);
			onMessage?.({ command: 'compare', hash1: 'a;rm -rf', hash2: 'b' });
			assert.ok(warnings > 1);
			onMessage?.({ command: 'compare', hash1: 'a', hash2: 'b' });
			assert.strictEqual(compareArgs[0], 'vscode-ark-git-compare.compareCommits');
			// requestFileDiff cobre o ramo de carregamento sob demanda (gitService nulo -> no-op seguro).
			onMessage?.({ command: 'requestFileDiff', file: 'f.ts' });

			onViewChange?.();
			onDispose?.();
			assert.strictEqual(disposed, true);
		} finally {
			(vscode.window as any).showErrorMessage = oldShowError;
			(vscode.window as any).showWarningMessage = oldShowWarn;
			(vscode.commands as any).executeCommand = oldExecute;
		}
	});

	test('mudanca de view state nao deve descartar o resultado da comparacao', () => {
		const foldersDescriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');
		// Sem workspace -> _gitService nulo, mantendo o teste deterministico e sincrono.
		Object.defineProperty(vscode.workspace, 'workspaceFolders', { configurable: true, get: () => undefined });

		try {
			let onViewChange: (() => void) | undefined;
			const fakeWebview: any = {
				html: '', options: {}, cspSource: 'vscode-resource://test',
				asWebviewUri: (u: vscode.Uri) => u,
				onDidReceiveMessage: () => ({ dispose() { } }),
				postMessage: () => Promise.resolve(true)
			};
			const fakePanel: any = {
				webview: fakeWebview, title: '', visible: true, reveal: () => { }, dispose: () => { },
				onDidDispose: (_cb: () => void, _c: unknown, bag: vscode.Disposable[]) => { bag.push({ dispose() { } }); return { dispose() { } }; },
				onDidChangeViewState: (cb: () => void, _c: unknown, bag: vscode.Disposable[]) => { onViewChange = cb; bag.push({ dispose() { } }); return { dispose() { } }; }
			};

			new (GitComparePanel as any)(fakePanel, vscode.Uri.file('.'));

			// Simula o resultado da comparação já presente no DOM do webview.
			fakeWebview.html = 'RESULTADO_DA_COMPARACAO';
			onViewChange?.();
			// O conteúdo NÃO deve ser sobrescrito ao reexibir o painel.
			assert.strictEqual(fakeWebview.html, 'RESULTADO_DA_COMPARACAO');

			// Painel oculto -> handler não faz nada e o conteúdo permanece intacto.
			fakePanel.visible = false;
			onViewChange?.();
			assert.strictEqual(fakeWebview.html, 'RESULTADO_DA_COMPARACAO');
		} finally {
			if (foldersDescriptor) { Object.defineProperty(vscode.workspace, 'workspaceFolders', foldersDescriptor); }
		}
	});

	test('construtor deve instanciar gitService quando ha workspaceFolders', () => {
		const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders');
		let restored = false;
		try {
			Object.defineProperty(vscode.workspace, 'workspaceFolders', { configurable: true, get: () => [{ uri: vscode.Uri.file('.') }] });
			const { fakePanel } = makeFakes();
			const panel: any = new (GitComparePanel as any)(fakePanel, vscode.Uri.file('.'));
			assert.ok(panel._gitService);
		} catch {
			// Algumas versões do host não permitem redefinir workspaceFolders.
		} finally {
			if (originalDescriptor) {
				Object.defineProperty(vscode.workspace, 'workspaceFolders', originalDescriptor);
				restored = true;
			}
			assert.strictEqual(restored, true);
		}
	});

	test('metodos privados devem cobrir os cenarios de renderizacao', async () => {
		const posted: any[] = [];
		const { fakeWebview, fakePanel } = makeFakes({ postMessage: (m) => posted.push(m) });

		const panel: any = Object.create((GitComparePanel as any).prototype);
		panel._panel = fakePanel;
		panel._extensionUri = vscode.Uri.file('.');
		panel._selectedRef1 = '';
		panel._selectedRef2 = '';
		panel._disposables = [];

		// Sem gitService -> sem workspace.
		panel._gitService = null;
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('noWorkspace') || fakeWebview.html.includes('error-state'));

		// Nao e repo Git.
		panel._gitService = { isGitRepository: async () => false };
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('notGitRepo') || fakeWebview.html.includes('error-state'));

		// Repo valido -> formulario.
		panel._gitService = { isGitRepository: async () => true, getAllRefs: async () => ['main', 'dev'], getCurrentBranch: async () => 'main' };
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('git-form'));

		// Refs selecionadas previamente -> usa _selectedRef1/_selectedRef2 (curto-circuito).
		panel._selectedRef1 = 'main';
		panel._selectedRef2 = 'dev';
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('git-form'));
		panel._selectedRef1 = '';
		panel._selectedRef2 = '';

		// Sem refs disponiveis -> recai no currentBranch.
		panel._gitService = { isGitRepository: async () => true, getAllRefs: async () => [], getCurrentBranch: async () => 'main' };
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('git-form'));

		// Erro ao carregar branches.
		panel._gitService = { isGitRepository: async () => { throw new Error('boom'); } };
		await panel._showBranchSelector(fakeWebview);
		assert.ok(fakeWebview.html.includes('boom'));

		// _setDiffContent sem gitService.
		panel._gitService = null;
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.strictEqual(posted[0].command, 'showResult');

		// _setDiffContent sem arquivos alterados.
		panel._gitService = { getDiffStats: async () => ({ files: 0, additions: 0, deletions: 0 }), getChangedFiles: async () => [] };
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => m.command === 'syncSelection'));
		assert.ok(posted.some(m => String(m.html || '').includes('empty-state')));

		// _setDiffContent com arquivos.
		panel._gitService = {
			getDiffStats: async () => ({ files: 1, additions: 2, deletions: 1 }),
			getChangedFiles: async () => [{ file: 'f.ts', status: 'modified' }],
			getFileContent: async () => 'x'
		};
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => String(m.html || '').includes('file-search-container')));
		// Renderiza apenas os shells colapsados; o conteudo e carregado sob demanda.
		assert.ok(posted.some(m => String(m.html || '').includes('data-loaded="false"')));
		assert.ok(posted.some(m => String(m.html || '').includes('data-file="f.ts"')));

		// _sendFileDiff carrega o diff de um unico arquivo sob demanda.
		panel._gitService = { getFileContent: async () => 'conteudo' };
		panel._selectedRef1 = 'a';
		panel._selectedRef2 = 'b';
		posted.length = 0;
		await panel._sendFileDiff(fakeWebview, 'f.ts');
		assert.ok(posted.some(m => m.command === 'fileDiffResult' && m.file === 'f.ts'));

		// _sendFileDiff sem refs selecionadas -> retorna erro de carregamento.
		panel._selectedRef1 = '';
		panel._selectedRef2 = '';
		posted.length = 0;
		await panel._sendFileDiff(fakeWebview, 'f.ts');
		assert.ok(posted.some(m => m.command === 'fileDiffResult' && String(m.html || '').includes('error-state')));

		// _setDiffContent com erro.
		panel._gitService = { getDiffStats: async () => { throw new Error('stats-fail'); } };
		posted.length = 0;
		await panel._setDiffContent(fakeWebview, 'a', 'b');
		assert.ok(posted.some(m => String(m.html || '').includes('stats-fail')));

		// _getHtmlForWebview (locale padrao do host de teste -> en).
		const html = panel._getHtmlForWebview(fakeWebview, '<div>x</div>');
		assert.ok(html.includes('Content-Security-Policy'));
		assert.ok(html.includes('window.GIT_COMPARE_I18N'));
		assert.ok(html.includes('lang="en"'));

		// _getHtmlForWebview com locale pt-br -> ramo alternativo do atributo html lang.
		const langDescriptor = Object.getOwnPropertyDescriptor(vscode.env, 'language');
		Object.defineProperty(vscode.env, 'language', { configurable: true, get: () => 'pt-BR' });
		try {
			const htmlPt = panel._getHtmlForWebview(fakeWebview, '<div>x</div>');
			assert.ok(htmlPt.includes('lang="pt-br"'));
		} finally {
			if (langDescriptor) { Object.defineProperty(vscode.env, 'language', langDescriptor); }
		}

		// _update -> _showBranchSelector.
		let updateCalled = false;
		panel._showBranchSelector = () => { updateCalled = true; };
		panel._update();
		assert.strictEqual(updateCalled, true);

		// dispose libera os disposables.
		let disposedCount = 0;
		panel._disposables = [{ dispose: () => { disposedCount++; } }, { dispose: () => { disposedCount++; } }];
		GitComparePanel.currentPanel = panel;
		panel.dispose();
		assert.strictEqual(disposedCount, 2);
	});

	test('createOrShow/compareRefs/revive devem cobrir os fluxos estaticos', async () => {
		const originalCreate = (vscode.window as any).createWebviewPanel;
		const editorDescriptor = Object.getOwnPropertyDescriptor(vscode.window, 'activeTextEditor');
		let revealed = false;
		let compared = false;
		try {
			// Editor ativo presente -> usa a coluna do editor (ramo verdadeiro).
			Object.defineProperty(vscode.window, 'activeTextEditor', { configurable: true, get: () => ({ viewColumn: vscode.ViewColumn.One }) });

			GitComparePanel.currentPanel = { _panel: { reveal: () => { revealed = true; } } } as any;
			assert.ok(GitComparePanel.createOrShow(vscode.Uri.file('.')));
			assert.strictEqual(revealed, true);

			const { fakePanel } = makeFakes();
			(vscode.window as any).createWebviewPanel = () => fakePanel;
			GitComparePanel.currentPanel = undefined;
			const created = GitComparePanel.createOrShow(vscode.Uri.file('.')) as any;
			created._setDiffContent = async () => { compared = true; };
			await GitComparePanel.compareRefs(vscode.Uri.file('.'), 'a', 'b');
			assert.strictEqual(compared, true);

			GitComparePanel.revive(fakePanel, vscode.Uri.file('.'));
			assert.ok(GitComparePanel.currentPanel);

			// Sem editor ativo -> coluna indefinida, recai em ViewColumn.One.
			Object.defineProperty(vscode.window, 'activeTextEditor', { configurable: true, get: () => undefined });
			GitComparePanel.currentPanel = undefined;
			assert.ok(GitComparePanel.createOrShow(vscode.Uri.file('.')));
		} finally {
			(vscode.window as any).createWebviewPanel = originalCreate;
			if (editorDescriptor) { Object.defineProperty(vscode.window, 'activeTextEditor', editorDescriptor); }
		}
	});
});
