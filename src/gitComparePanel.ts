import * as vscode from 'vscode';
import { GitService } from './gitService';
import { getNonce, escapeHtml } from './utils';
import { renderShellsHtml, renderSingleFileDiff } from './diffRenderer';

/**
 * Classe responsável por criar e gerenciar o painel de comparação de branches no VSCode.
 * Ela lida com a criação do painel, atualização do conteúdo, comunicação entre o painel e a extensão, e a renderização dos resultados da comparação.	
 */
export class GitComparePanel {
	public static currentPanel: GitComparePanel | undefined;
	public static readonly viewType = 'vscode-ark-git-compare';
	private static readonly SAFE_REF_PATTERN = /^[A-Za-z0-9._\/@~^{}-]{1,200}$/;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _gitService: GitService | null = null;
	private _selectedRef1 = '';
	private _selectedRef2 = '';
	private _disposables: vscode.Disposable[] = [];

  /**
   * Função de tipo de guarda para verificar se um valor é uma referência Git segura (branch, tag ou commit hash).
   * @param value O valor a ser verificado.
   * @returns true se o valor for uma string que corresponde ao padrão de referência Git segura, caso contrário, false.
   * @remarks Esta função é usada para validar os inputs recebidos do painel de comparação, garantindo que apenas
   * referências Git válidas sejam processadas. Ela verifica se o valor é uma string e se corresponde ao padrão
   * definido pela expressão regular SAFE_REF_PATTERN, que permite letras, números, pontos, sublinhados, barras,
   * arrobas, til, acentos circunflexos, chaves e hífens, com um comprimento máximo de 200 caracteres.
   */
	private isSafeRef(value: unknown): value is string {
		return typeof value === 'string' && GitComparePanel.SAFE_REF_PATTERN.test(value.trim());
	}

  /**
   * Função para analisar mensagens recebidas do webview.
   * @param message A mensagem recebida do webview a ser analisada.
   * @returns Um objeto contendo o comando e os dados relevantes se a mensagem for válida, ou null se a mensagem for inválida.
   * @remarks Ela verifica se a mensagem é um objeto válido e se contém os campos esperados para os comandos 'alert' e 'compare'.
   * Para o comando 'alert', ela espera um campo 'text' do tipo string. Para o comando 'compare', ela espera os campos 'hash1'
   * e 'hash2', ambos do tipo string e que correspondam ao padrão de referência Git segura. Se a mensagem for válida, a função
   * retorna um objeto contendo o comando e os dados relevantes; caso contrário, retorna null.
   */
	private parseWebviewMessage(message: unknown): { command: string; text?: string; hash1?: string; hash2?: string; file?: string } | null {
    // Verifica se a mensagem é um objeto válido antes de tentar acessar suas propriedades.
		if (!message || typeof message !== 'object') {
			return null;
		}

    // Faz um cast seguro da mensagem para um tipo conhecido, permitindo a validação dos campos esperados.
		const payload = message as { command?: unknown; text?: unknown; hash1?: unknown; hash2?: unknown; file?: unknown };
		if (typeof payload.command !== 'string') {
			return null;
		}

    // Valida o comando 'alert'
		if (payload.command === 'alert') {
			return typeof payload.text === 'string' ? { command: 'alert', text: payload.text } : null;
		}

    // Valida o comando 'compare'
		if (payload.command === 'compare') {
      // Verifica se os campos hash1 e hash2 são strings válidas
			if (!this.isSafeRef(payload.hash1) || !this.isSafeRef(payload.hash2)) {
				return null;
			}

			return { command: 'compare', hash1: payload.hash1.trim(), hash2: payload.hash2.trim() };
		}

    // Valida o comando 'requestFileDiff' (carregamento sob demanda do diff de um arquivo).
    // O caminho é validado de forma estrita no GitService antes de qualquer comando Git.
		if (payload.command === 'requestFileDiff') {
			return typeof payload.file === 'string' && payload.file.length > 0
				? { command: 'requestFileDiff', file: payload.file }
				: null;
		}

		return null;
	}

	/**
	 * Função para criar ou mostrar o painel de comparação. Se o painel já estiver aberto, ele será revelado. Caso contrário, um novo painel será criado. 
	 * @param extensionUri O URI da extensão, utilizado para configurar o painel e seus recursos.
	 * @returns A instância do painel de comparação.
	 */
	public static createOrShow(extensionUri: vscode.Uri): GitComparePanel {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// Verifica se o painel já está aberto. Se estiver, revela o painel existente em vez de criar um novo.
		if (GitComparePanel.currentPanel) {
			GitComparePanel.currentPanel._panel.reveal(column);

			return GitComparePanel.currentPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			GitComparePanel.viewType,
			vscode.l10n.t('Git Compare'),
			column || vscode.ViewColumn.One,
			{
				...GitComparePanel.getWebviewOptions(extensionUri),
				// Mantém o DOM do webview vivo quando o painel fica oculto, preservando
				// o resultado da comparação (injetado via postMessage) ao trocar de aba.
				retainContextWhenHidden: true
			}
		);

		GitComparePanel.currentPanel = new GitComparePanel(panel, extensionUri);
		return GitComparePanel.currentPanel;
	}

	/**
	 * Função para comparar dois branches ou commits e exibir as diferenças no painel. Ele recebe os hashes dos branches/commits a serem comparados.
	 * @param extensionUri O URI da extensão, utilizado para configurar o painel e seus recursos.
	 * @param ref1 O hash do primeiro branch ou commit a ser comparado.
	 * @param ref2 O hash do segundo branch ou commit a ser comparado.
	 */
	public static async compareRefs(extensionUri: vscode.Uri, ref1: string, ref2: string): Promise<void> {
		const panel = GitComparePanel.createOrShow(extensionUri);
		await panel._setDiffContent(panel._panel.webview, ref1, ref2);
	}

	/**
	 * Função para restaurar o painel de comparação a partir de um estado salvo.	 * 
	 * @param panel O painel de webview a ser restaurado.
	 * @param extensionUri O URI da extensão, utilizado para configurar o painel e seus recursos.
	 */
	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		GitComparePanel.currentPanel = new GitComparePanel(panel, extensionUri);
	}

	/**
	 * Construtor privado para criar uma nova instância do painel de comparação.	 * 
	 * @param panel O painel de webview onde o conteúdo será exibido.
	 * @param extensionUri O URI da extensão, utilizado para configurar o painel e seus recursos.
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		const workspaceFolders = vscode.workspace.workspaceFolders;

		// Verifica se há pastas de trabalho abertas
		if (workspaceFolders) {
			this._gitService = new GitService(workspaceFolders[0].uri.fsPath);
		}

		this._update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.onDidChangeViewState(() => {
			// Ao reexibir o painel apenas re-localizamos o título. NÃO reconstruímos o HTML
			// aqui: isso descartaria o resultado da comparação já renderizado no DOM
			// (o conteúdo é preservado via retainContextWhenHidden).
			if (this._panel.visible) {
				this._panel.title = vscode.l10n.t('Git Compare');
			}
		}, null, this._disposables);

		this._panel.webview.onDidReceiveMessage(message => {
      // Verifica se a mensagem recebida do webview é válida e contém os campos esperados antes de processá-la.
			const parsed = this.parseWebviewMessage(message);
			if (!parsed) {
				vscode.window.showWarningMessage(vscode.l10n.t('Git Compare: invalid message received from webview.'));
				return;
			}

			switch (parsed.command) {
				case 'alert':
					vscode.window.showErrorMessage(parsed.text || vscode.l10n.t('Unknown error.'));
					return;
				case 'compare':
					void vscode.commands.executeCommand('vscode-ark-git-compare.compareCommits', parsed.hash1, parsed.hash2);
					return;
				case 'requestFileDiff':
					void this._sendFileDiff(this._panel.webview, parsed.file ?? '');
					return;
			}
		}, null, this._disposables);
	}

	/**
	 * Libera os recursos utilizados pelo painel, incluindo a limpeza de disposables e a definição da instância atual
	 * do painel como indefinida para permitir a criação de um novo painel no futuro.
	 */
	public dispose() {
		GitComparePanel.currentPanel = undefined;
		this._panel.dispose();

		// Limpa todos os disposables registrados para evitar vazamentos de memória
		while (this._disposables.length) {
			const x = this._disposables.pop();

			if (x) {
				x.dispose();
			}
		}
	}

	/**
	 * Função para atualizar o conteúdo do painel
	 */
	private _update() {
		const webview = this._panel.webview;
		this._panel.title = vscode.l10n.t('Git Compare');
		this._showBranchSelector(webview);
	}

	/**
	 * Função para configurar as opções do webview, incluindo a habilitação de scripts e a definição dos recursos
	 * locais que podem ser acessados pelo webview.
	 * @param extensionUri O URI da extensão, utilizado para configurar o painel e seus recursos.
	 * @returns As opções de configuração do webview.
	 */
	public static getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
		};
	}

	/**
	 * Função para exibir o seletor de branches no painel, permitindo que os usuários escolham quais branches
	 * ou commits comparar. 
	 * @param webview O webview onde o conteúdo será exibido.
	 * @returns Uma promessa que resolve quando o seletor de branches é exibido.
	 */
	private async _showBranchSelector(webview: vscode.Webview) {
		// Verifica se o serviço Git está disponível.
		if (!this._gitService) {
			webview.html = this._getHtmlForWebview(webview, `
				<div class="error-state">
					<h2>${vscode.l10n.t('No workspace opened')}</h2>
					<p>${vscode.l10n.t('Open a folder with a Git repository to continue.')}</p>
				</div>
			`);

			return;
		}

		try {
			const isGit = await this._gitService.isGitRepository();

			// Verifica se o diretório de trabalho é um repositório Git.
			if (!isGit) {
				webview.html = this._getHtmlForWebview(webview, `
					<div class="error-state">
						<h2>${vscode.l10n.t('Not a Git repository')}</h2>
						<p>${vscode.l10n.t('The current directory is not a valid Git repository.')}</p>
					</div>
				`);
				return;
			}

			const options = await this._gitService.getAllRefs();
			const currentBranch = await this._gitService.getCurrentBranch();
			const ref1 = this._selectedRef1 || currentBranch;
			const ref2 = this._selectedRef2 || options[1] || options[0] || currentBranch;
			const compareIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'git-compare.svg'));

			const mergedOptions = [...new Set([ref1, ref2, ...options].filter(Boolean))];

			const gitBox = `
				<div class="git-box">
					<form id="git-form" class="git-form">
						<div class="git-elements">
							<div class="git-input">
								<span class="git-label bold">${vscode.l10n.t('Base Branch/Commit:')}</span>
								<select id="git-hash-1" title="git-hash-1" class="git-select">
									${mergedOptions.map(o => `<option value="${o}" ${o === ref1 ? 'selected' : ''}>${o}</option>`).join('')}
								</select>
							</div>
							<div class="git-input">
								<span class="git-label bold">${vscode.l10n.t('Compare Branch/Commit:')}</span>
								<select id="git-hash-2" title="git-hash-2" class="git-select">
									${mergedOptions.map(o => `<option value="${o}" ${o === ref2 ? 'selected' : ''}>${o}</option>`).join('')}
								</select>
							</div>
							<div class="git-btn">
								<button class="bold" type="submit">${vscode.l10n.t('Compare')}</button>
							</div>
						</div>
					</form>
				</div>
				<div id="git-result">
						<pre id="git-diff-output"></pre>
						<div id="git-diff-result" class="git-diff-result">
							<div class="empty-state">
								<div class="empty-state-icon"><img src="${compareIconUri}" alt="${vscode.l10n.t('Git Compare')}" /></div>
								<h2 class="bold">${vscode.l10n.t('Comparison Result')}</h2>
								<p>${vscode.l10n.t('Select two branches or commits to compare.')}</p>
							</div>
						</div>
				</div>
			`;

			webview.html = this._getHtmlForWebview(webview, gitBox);
		} catch (error) {
			const err = error as Error;
			webview.html = this._getHtmlForWebview(webview, `
				<div class="error-state">
					<h2>${vscode.l10n.t('Error loading branches')}</h2>
					<p>${escapeHtml(err.message)}</p>
				</div>
			`);
		}
	}

	/**
	 * Função para configurar o conteúdo do painel para exibir as diferenças entre os branches ou commits selecionados.
	 * @param webview O webview onde o conteúdo será exibido.
	 * @param hash1 O hash do primeiro branch ou commit a ser comparado.
	 * @param hash2 O hash do segundo branch ou commit a ser comparado.
	 * @returns Uma promessa que resolve quando o conteúdo do painel é atualizado com as diferenças.
	 */
	private async _setDiffContent(webview: vscode.Webview, hash1: string = 'prd', hash2: string = 'hml') {
		// Verifica se o serviço Git está disponível antes de tentar obter as diferenças.
		if (!this._gitService) {
			webview.postMessage({ command: 'showResult', html: `<div class="error-state"><h2>${vscode.l10n.t('No workspace opened')}.</h2></div>` });

			return;
		}

		this._selectedRef1 = hash1;
		this._selectedRef2 = hash2;

		webview.postMessage({ command: 'syncSelection', hash1, hash2 });

		webview.postMessage({
			command: 'showResult', html: `
				<div class="loading-state">
					<div class="loading-spinner"></div>
					<p>${vscode.l10n.t('Loading differences...')}</p>
				</div>
			`
		});

		try {
			const stats = await this._gitService.getDiffStats(hash1, hash2);
			const changedFiles = await this._gitService.getChangedFiles(hash1, hash2);

			// Verifica se há arquivos modificados entre os dois hashes.
			if (changedFiles.length === 0) {
				webview.postMessage({
					command: 'showResult',
					html: `
						<div class="empty-state">
							<div class="empty-state-icon">✅</div>
							<h2>${vscode.l10n.t('No differences found')}</h2>
							<p>${vscode.l10n.t('The refs <strong>{hash1}</strong> and <strong>{hash2}</strong> are identical.', { hash1: escapeHtml(hash1), hash2: escapeHtml(hash2) })}</p>
						</div>
					`
				});
				return;
			}

			const statsHtml = `
				<div class="diff-stats">
					<div class="diff-stat-item files">
						<span class="count">${stats.files}</span> ${vscode.l10n.t('changed files')}
					</div>
					<div class="diff-stat-item additions">
						<span class="count">+${stats.additions}</span> ${vscode.l10n.t('additions')}
					</div>
					<div class="diff-stat-item deletions">
						<span class="count">-${stats.deletions}</span> ${vscode.l10n.t('deletions')}
					</div>
				</div>
			`;

			const searchBoxHtml = `
				<div class="file-search-container">
					<input type="text" id="file-search-input" class="file-search-input" placeholder="${vscode.l10n.t('🔍 Search file...')}" />
					<span class="file-search-count"><span id="file-search-count">0</span> / ${changedFiles.length}</span>
				</div>
			`;

			// Renderiza apenas os cabeçalhos colapsados (instantâneo). O conteúdo do diff de cada
			// arquivo é calculado e enviado sob demanda quando o usuário expande o arquivo
			// (ver `_sendFileDiff`), evitando montar/sanitizar todos os diffs de uma só vez.
			const shellsHtml = renderShellsHtml(changedFiles);
			webview.postMessage({ command: 'showResult', html: searchBoxHtml + statsHtml + shellsHtml });
		} catch (error) {
			const err = error as Error;
			webview.postMessage({
				command: 'showResult', html: `
					<div class="error-state">
						<h3>${vscode.l10n.t('Error getting differences:')}</h3>
						<p>${escapeHtml(err.message)}</p>
					</div>
				`
			});
		}
	}

	/**
	 * Função para calcular e enviar, sob demanda, o conteúdo do diff de um único arquivo para o webview.
	 * Acionado quando o usuário expande um arquivo, mantendo o custo limitado a um arquivo por vez.
	 * @param webview O webview que receberá o resultado.
	 * @param file O caminho do arquivo cujo diff deve ser renderizado.
	 * @returns Uma promessa que resolve quando o resultado (ou o erro) é enviado ao webview.
	 */
	private async _sendFileDiff(webview: vscode.Webview, file: string) {
		// Sem serviço Git ou referências selecionadas não há o que comparar.
		if (!this._gitService || !this._selectedRef1 || !this._selectedRef2) {
			webview.postMessage({
				command: 'fileDiffResult',
				file,
				html: `<div class="error-state"><p>${vscode.l10n.t('[Load error]')}</p></div>`
			});
			return;
		}

		try {
			const html = await renderSingleFileDiff(this._gitService, file, this._selectedRef1, this._selectedRef2);
			webview.postMessage({ command: 'fileDiffResult', file, html });
		} catch (error) {
			const err = error as Error;
			webview.postMessage({
				command: 'fileDiffResult',
				file,
				html: `<div class="error-state"><p>${escapeHtml(err.message)}</p></div>`
			});
		}
	}

	/**
	 * Função para gerar o HTML para o webview, incluindo a estrutura básica da página, links para estilos e scripts,
	 * e o conteúdo dinâmico que será exibido no painel de comparação. O método também inclui uma política
	 * de segurança de conteúdo (CSP) para garantir que apenas recursos autorizados sejam carregados no webview. 
	 * @param webview O webview onde o conteúdo será exibido.
	 * @param content O conteúdo dinâmico que será inserido no webview.
	 * @returns O HTML completo que será carregado no webview.
	 */
	private _getHtmlForWebview(webview: vscode.Webview, content: string) {
		const purifyPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'purify.min.js');
		const purifyUri = webview.asWebviewUri(purifyPath);
		const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
		const scriptUri = webview.asWebviewUri(scriptPath);

		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleDiffUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'diff.css'));

		const nonce = getNonce();

		const purifyScript = `<script nonce="${nonce}" src="${purifyUri}"></script>`;
		const syncScrollScript = `<script nonce="${nonce}" src="${scriptUri}"></script>`;
		const webviewI18n = {
			loadingDiff: vscode.l10n.t('Loading differences...'),
			fullscreenEnter: vscode.l10n.t('Expand to fullscreen'),
			fullscreenExit: vscode.l10n.t('Exit fullscreen (ESC)')
		};
		const i18nScript = `<script nonce="${nonce}">window.GIT_COMPARE_I18N = ${JSON.stringify(webviewI18n)};</script>`;
		const htmlLang = vscode.env.language.toLowerCase().startsWith('pt') ? 'pt-br' : 'en';

		return `
			<!DOCTYPE html>
			<html lang="${htmlLang}">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${styleDiffUri}" rel="stylesheet">
				<title>${vscode.l10n.t('Git Compare')}</title>
			</head>
			<body>
				<h1 class="bold">${vscode.l10n.t('Git Compare')}</h1>
				${content}
				${i18nScript}
				${purifyScript}
				${syncScrollScript}
			</body>
			</html>
		`;
	}
}
