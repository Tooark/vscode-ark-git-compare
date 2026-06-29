/**
 * Módulo de busca de arquivos com filtro dinâmico.
 * @typedef {Object} FileItem
 * @property {string} path - Caminho/nome do arquivo
 * @property {HTMLElement} element - Elemento DOM do arquivo
 */

/**
 * Módulo de sincronização de scroll para comparação lado a lado.
 * Sincroniza scroll vertical e horizontal entre colunas de diff.
 */
const ScrollSync = {
	/** Flag para evitar loops infinitos de sincronização */
	isSyncing: false,

	/** Timeout para debounce da sincronização (compatível com Node/Browser) */
	syncTimeout: /** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined),

	/**
	 * Inicializa a sincronização de scroll para todos os pares de elementos.
	 */
	init () {
		this.syncGlobalPairs();
		this.syncFileDiffPairs();
		this.syncHorizontalScroll();
		this.observeNewElements();
	},

	/**
	 * Sincroniza pares globais de elementos .sync-scroll
	 */
	syncGlobalPairs () {
		const pres = document.querySelectorAll('.sync-scroll');

		if (pres.length >= 2) {
			this.createSyncPair(/** @type {HTMLElement} */(pres[0]), /** @type {HTMLElement} */(pres[1]));
		}
	},

	/**
	 * Sincroniza cada par de colunas dentro de .file-diff
	 */
	syncFileDiffPairs () {
		const allPairs = document.querySelectorAll('.file-diff');

		allPairs.forEach(pair => {
			const scrollables = /** @type {NodeListOf<HTMLElement>} */ (pair.querySelectorAll('.sync-scroll'));

			if (scrollables.length >= 2) {
				this.createSyncPair(/** @type {HTMLElement} */(scrollables[0]), /** @type {HTMLElement} */(scrollables[1]));
			}

			// Suporte para classes específicas (hash1/hash2)
			const preA = pair.querySelector('.sync-scroll.hash1');
			const preB = pair.querySelector('.sync-scroll.hash2');

			if (preA && preB && preA !== scrollables[0]) {
				this.createSyncPair(/** @type {HTMLElement} */(preA), /** @type {HTMLElement} */(preB));
			}
		});
	},

	/**
	 * Cria um par sincronizado de elementos.
	 * @param {HTMLElement} elementA Primeiro elemento
	 * @param {HTMLElement} elementB Segundo elemento
	 */
	createSyncPair (elementA, elementB) {
		const self = this;

		// Marca elementos como sincronizados para evitar duplicação
		if (elementA.dataset.syncPaired || elementB.dataset.syncPaired) {
			return;
		}

		elementA.dataset.syncPaired = 'true';
		elementB.dataset.syncPaired = 'true';

		// Sincroniza A -> B
		elementA.addEventListener('scroll', function (e) {
			if (e.target) {
				self.syncScroll(/** @type {Element} */(e.target), elementB);
			}
		});

		// Sincroniza B -> A
		elementB.addEventListener('scroll', function (e) {
			if (e.target) {
				self.syncScroll(/** @type {Element} */(e.target), elementA);
			}
		});
	},

	/**
	 * Sincroniza o scroll de um elemento para outro.
	 * @param {Element} source Elemento fonte do scroll
	 * @param {Element} target Elemento alvo do scroll
	 */
	syncScroll (source, target) {
		if (this.isSyncing) {
			return;
		}

		this.isSyncing = true;

		// Usa requestAnimationFrame para melhor performance
		requestAnimationFrame(() => {
			target.scrollTop = source.scrollTop;
			target.scrollLeft = source.scrollLeft;

			// Reseta flag após breve delay
			globalThis.clearTimeout(this.syncTimeout);
			this.syncTimeout = globalThis.setTimeout(() => {
				this.isSyncing = false;
			}, 1);
		});
	},

	/**
	 * Sincroniza o scroll horizontal do container para os dois .sync-scroll internos
	 */
	syncHorizontalScroll () {
		const containers = document.querySelectorAll('.code-scroll-container');

		containers.forEach(container => {
			const scrollables = container.querySelectorAll('.sync-scroll');

			if (scrollables.length >= 2) {
				const preA = /** @type {HTMLElement} */ (scrollables[0]);
				const preB = /** @type {HTMLElement} */ (scrollables[1]);

				// Sincroniza scroll horizontal do container com os dois elementos
				container.addEventListener('scroll', (e) => {
					preA.scrollLeft = container.scrollLeft;
					preB.scrollLeft = container.scrollLeft;
				}, { passive: true });

				// Sincroniza os dois elementos entre si
				this.createSyncPair(preA, preB);
			}
		});
	},

	/**
	 * Observa o DOM para novos elementos .file-diff adicionados dinamicamente.
	 */
	observeNewElements () {
		const self = this;
		const resultContainer = document.getElementById('git-diff-result');

		if (!resultContainer) {
			return;
		}

		const observer = new MutationObserver((mutations) => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = /** @type {Element} */ (node);

						// Busca novos .file-diff no nó adicionado
						const newDiffs = element.querySelectorAll('.file-diff');

						newDiffs.forEach(diff => {
							const scrollables = diff.querySelectorAll('.sync-scroll');
							if (scrollables.length >= 2) {
								self.createSyncPair(/** @type {HTMLElement} */(scrollables[0]), /** @type {HTMLElement} */(scrollables[1]));
							}
						});

						// Verifica se o próprio nó é um .file-diff
						if (element.classList && element.classList.contains('file-diff')) {
							const scrollables = element.querySelectorAll('.sync-scroll');
							if (scrollables.length >= 2) {
								self.createSyncPair(/** @type {HTMLElement} */(scrollables[0]), /** @type {HTMLElement} */(scrollables[1]));
							}
						}
					}
				});
			});
		});

		observer.observe(resultContainer, { childList: true, subtree: true });
	}
};

/**
 * API do VS Code para comunicação com a extensão.
 */
const vscode = /** @type {any} */ (/** @type {any} */ (globalThis).acquireVsCodeApi());
const i18n = /** @type {{ loadingDiff?: string; fullscreenEnter?: string; fullscreenExit?: string }} */ (/** @type {any} */ (globalThis).GIT_COMPARE_I18N || {});

/**
 * Inicializa a aplicação quando o DOM estiver pronto.
 */
window.addEventListener('DOMContentLoaded', function () {
	ScrollSync.init();
});

/**
 * Cria o elemento de carregamento exibido enquanto o diff de um arquivo é calculado sob demanda.
 * @returns {HTMLElement}
 */
function buildInlineSpinner () {
	const wrap = document.createElement('div');
	wrap.className = 'loading-state file-diff-loading';

	const spinner = document.createElement('div');
	spinner.className = 'loading-spinner';

	const label = document.createElement('p');
	label.textContent = i18n.loadingDiff || 'Loading differences...';

	wrap.appendChild(spinner);
	wrap.appendChild(label);
	return wrap;
}

/**
 * Localiza o elemento .file-diff correspondente a um caminho de arquivo.
 * Evita seletores CSS para não precisar escapar caracteres especiais do caminho.
 * @param {string} file Caminho do arquivo
 * @returns {Element | null}
 */
function findFileDiffByPath (file) {
	const all = document.querySelectorAll('.file-diff');
	for (const el of all) {
		if (el.getAttribute('data-file') === file) {
			return el;
		}
	}
	return null;
}

/**
 * Exibe o spinner de carregamento dentro de um arquivo, caso ele ainda não tenha conteúdo.
 * Usado quando o usuário expande um arquivo que ainda está sendo carregado.
 * @param {Element} content Elemento .file-content do arquivo
 */
function showSpinnerIfEmpty (content) {
	if (!content.querySelector('.code-compare')) {
		content.replaceChildren(buildInlineSpinner());
	}
}

/**
 * Gerencia o carregamento dos diffs por arquivo: pré-carrega em background (com limite de
 * concorrência, cedendo tempo ao usuário via requestIdleCallback) e atende pedidos sob demanda
 * com prioridade quando o usuário expande um arquivo ainda não carregado.
 */
const LazyLoader = {
	/** Máximo de requisições simultâneas à extensão. */
	maxConcurrent: 3,

	/** Quantidade de requisições atualmente em andamento. */
	inFlight: 0,

	/** Fila de elementos .file-diff aguardando pré-carregamento. */
	queue: /** @type {Element[]} */ ([]),

	/**
	 * (Re)inicia o pré-carregamento em background de todos os arquivos ainda não carregados.
	 * Deve ser chamado a cada nova comparação.
	 */
	startPrefetch () {
		this.inFlight = 0;
		this.queue = Array.from(document.querySelectorAll('.file-diff[data-loaded="false"]'));
		this.pump();
	},

	/**
	 * Dispara novas requisições respeitando o limite de concorrência, agendadas em tempo ocioso
	 * para não competir com a interação do usuário.
	 */
	pump () {
		const schedule = /** @type {(cb: () => void) => void} */ (
			/** @type {any} */ (globalThis).requestIdleCallback || ((cb) => globalThis.setTimeout(cb, 50))
		);

		schedule(() => {
			while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
				const fileDiff = this.queue.shift();
				if (fileDiff) {
					this.dispatch(fileDiff);
				}
			}
		});
	},

	/**
	 * Solicita o diff de um arquivo à extensão (uma única vez por arquivo).
	 * @param {Element} fileDiff Elemento .file-diff do arquivo
	 * @returns {boolean} true se a requisição foi enviada; false se já estava carregado/carregando.
	 */
	dispatch (fileDiff) {
		if (fileDiff.getAttribute('data-loaded') !== 'false') {
			return false;
		}

		fileDiff.setAttribute('data-loaded', 'loading');
		this.inFlight++;
		vscode.postMessage({ command: 'requestFileDiff', file: fileDiff.getAttribute('data-file') });
		return true;
	},

	/**
	 * Marca a conclusão de uma requisição (sucesso ou erro) e retoma a fila de pré-carregamento.
	 */
	onSettled () {
		if (this.inFlight > 0) {
			this.inFlight--;
		}
		this.pump();
	}
};

// Toggle collapse/expand por arquivo
document.addEventListener('click', function (e) {
	const btn = e.target instanceof Element ? e.target.closest('.file-toggle') : null;
	if (!btn) return;

	const fileDiff = btn.closest('.file-diff');
	if (!fileDiff) return;

	const content = fileDiff.querySelector('.file-content');
	if (!content) return;

	const isExpanded = btn.getAttribute('aria-expanded') === 'true';
	if (isExpanded) {
		// colapsar
		content.classList.remove('expanded');
		content.classList.add('collapsed');
		btn.setAttribute('aria-expanded', 'false');
		btn.textContent = '▸';
	} else {
		// expandir
		content.classList.remove('collapsed');
		content.classList.add('expanded');
		btn.setAttribute('aria-expanded', 'true');
		btn.textContent = '▾';

		// Carrega o conteúdo conforme o estado: ainda não pedido -> dispara com prioridade;
		// já em carregamento (via prefetch) -> mostra spinner; já carregado -> apenas re-sincroniza.
		const state = fileDiff.getAttribute('data-loaded');
		if (state === 'false') {
			showSpinnerIfEmpty(content);
			LazyLoader.dispatch(fileDiff);
		} else if (state === 'loading') {
			showSpinnerIfEmpty(content);
		} else {
			setTimeout(() => ScrollSync.syncFileDiffPairs(), 50);
		}
	}
});

/**
 * Adiciona o evento de submit para o formulário de comparação
 */
(function () {
	const form = /** @type {HTMLFormElement} */ (document.getElementById('git-form'));
	const hash1 = /** @type {HTMLInputElement} */ (document.getElementById('git-hash-1'));
	const hash2 = /** @type {HTMLInputElement} */ (document.getElementById('git-hash-2'));

	if (form && hash1 && hash2) {
		form.addEventListener('submit', function (e) {
			e.preventDefault();

			const resultDiv = document.getElementById('git-diff-result');

			if (resultDiv) {
				resultDiv.innerHTML = `
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>${i18n.loadingDiff || 'Loading differences...'}</p>
					</div>
				`;
			}

			vscode.postMessage({
				command: 'compare',
				hash1: hash1.value,
				hash2: hash2.value
			});
		});
	}
})();

/**
 * Recebe a mensagem do VS Code e exibe o resultado da comparação
 */
window.addEventListener('message', function (e) {
	e.preventDefault();
	const message = e.data;

	/**
	 * Sanitiza HTML dinâmico antes de inserir no DOM do webview.
	 * Usa DOMPurify para preservar estrutura visual e bloquear XSS.
	 * @param {unknown} unsafeHtml Conteúdo HTML potencialmente inseguro
	 * @returns {DocumentFragment}
	 */
	function sanitizeHtml(unsafeHtml) {
		const fragment = document.createDocumentFragment();

		if (typeof unsafeHtml !== 'string') {
			return fragment;
		}

		const purify = /** @type {{ sanitize?: (input: string, config?: object) => any } | undefined} */ (/** @type {any} */ (window).DOMPurify);
		if (!purify || typeof purify.sanitize !== 'function') {
			const safeText = document.createTextNode(unsafeHtml);
			fragment.appendChild(safeText);
			return fragment;
		}

		const sanitized = purify.sanitize(unsafeHtml, {
			RETURN_DOM_FRAGMENT: true,
			USE_PROFILES: { html: true },
			FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form']
		});

		if (sanitized instanceof DocumentFragment) {
			fragment.appendChild(sanitized);
			return fragment;
		}

		if (sanitized instanceof Node) {
			fragment.appendChild(sanitized);
			return fragment;
		}

		const safeText = document.createTextNode(String(sanitized ?? ''));
		fragment.appendChild(safeText);

		return fragment;
	}

	if (message.command === 'syncSelection') {
		const hash1 = /** @type {HTMLInputElement} */ (document.getElementById('git-hash-1'));
		const hash2 = /** @type {HTMLInputElement} */ (document.getElementById('git-hash-2'));

		if (hash1 && typeof message.hash1 === 'string') {
			hash1.value = message.hash1;
		}
		if (hash2 && typeof message.hash2 === 'string') {
			hash2.value = message.hash2;
		}
	}

	if (message.command === 'fileDiffResult') {
		const fileDiff = findFileDiffByPath(message.file);

		// Ignora resultados obsoletos (ex.: de uma comparação anterior já substituída no DOM):
		// só aplica quando o arquivo está de fato aguardando este carregamento.
		if (!fileDiff || fileDiff.getAttribute('data-loaded') !== 'loading') {
			return;
		}

		const content = fileDiff.querySelector('.file-content');
		if (content) {
			content.replaceChildren(sanitizeHtml(message.html));
			fileDiff.setAttribute('data-loaded', 'true');

			// Sincroniza o scroll apenas para o par recém-inserido deste arquivo.
			setTimeout(() => {
				const scrollables = /** @type {NodeListOf<HTMLElement>} */ (content.querySelectorAll('.sync-scroll'));
				if (scrollables.length >= 2) {
					ScrollSync.createSyncPair(scrollables[0], scrollables[1]);
				}
			}, 50);
		}

		// Libera uma vaga de concorrência e retoma o pré-carregamento da fila.
		LazyLoader.onSettled();
		return;
	}

	if (message.command === 'showResult') {
		const resultDiv = document.getElementById('git-diff-result');

		if (resultDiv) {
			const sanitizedContent = sanitizeHtml(message.html);
			resultDiv.replaceChildren(sanitizedContent);

			// Re-inicializa a sincronização de scroll para novos elementos
			setTimeout(() => {
				ScrollSync.syncFileDiffPairs();
				ScrollSync.syncHorizontalScroll();
				FileSearch.init();
				// Inicia o pré-carregamento dos diffs em background, para que ao expandir um
				// arquivo o conteúdo já esteja pronto (ou seja carregado sob demanda, se ainda não).
				LazyLoader.startPrefetch();
			}, 100);
		}
	}
});

/**
 * Módulo de busca de arquivos com filtro dinâmico.
 * @type {{
 * 	allFiles: FileItem[];
 * 	inputHandler: ((e: Event) => void) | null;
 * 	init: (files?: FileItem[]) => void;
 * 	filterFiles: (query: string) => void;
 * 	updateCount: (count?: number) => void;
 * }}
 */
const FileSearch = {
	allFiles: /** @type {FileItem[]} */ ([]),
	inputHandler: /** @type {((e: Event) => void) | null} */ (null),

	/**
	 * Inicializa a busca de arquivos
	 * @param {FileItem[]} [files] Array com objetos de arquivo
	 */
	init (files) {
		const domFiles = Array.from(document.querySelectorAll('.file-diff')).map(element => ({
			path: element.getAttribute('data-file') || '',
			element: /** @type {HTMLElement} */ (element)
		})).filter(file => file.path.length > 0);

		this.allFiles = (files && files.length > 0) ? files : domFiles;
		const input = document.getElementById('file-search-input');
		if (input) {
			if (this.inputHandler) {
				input.removeEventListener('input', this.inputHandler);
			}

			this.inputHandler = (/** @type {Event} */ e) => {
				const target = /** @type {HTMLInputElement} */ (e.target);
				this.filterFiles(target.value);
			};

			input.addEventListener('input', this.inputHandler);

			// Garante estado inicial consistente de visibilidade e contador
			this.filterFiles(/** @type {HTMLInputElement} */ (input).value || '');
		} else {
			this.updateCount(this.allFiles.length);
		}
	},

	/**
	 * Filtra arquivos baseado na query
	 * @param {string} query Texto de busca
	 */
	filterFiles (query) {
		const normalizedQuery = query.trim().toLowerCase();
		let visibleCount = 0;

		this.allFiles.forEach(file => {
			const matches = normalizedQuery.length === 0 || file.path.toLowerCase().includes(normalizedQuery);
			file.element.classList.toggle('hidden', !matches);
			if (matches) {
				visibleCount++;
			}
		});

		this.updateCount(visibleCount);
	},

	/**
	 * Atualiza o contador de arquivos visíveis
	 * @param {number} [count] Número de arquivos visíveis (padrão: todos)
	 */
	updateCount (count) {
		const counter = document.getElementById('file-search-count');
		if (counter) {
			counter.textContent = String(count !== undefined ? count : this.allFiles.length);
		}
	}
};

/**
 * Gerencia o modo fullscreen por arquivo
 */
(function () {
	document.addEventListener('click', function (e) {
		const btn = e.target instanceof Element ? /** @type {HTMLElement} */ (e.target.closest('.file-fullscreen')) : null;
		if (!btn) return;

		const fileDiff = btn.closest('.file-diff');
		if (!fileDiff) return;

		const isFullscreen = fileDiff.classList.contains('fullscreen');

		if (isFullscreen) {
			// Sair do fullscreen
			fileDiff.classList.remove('fullscreen');
			document.body.classList.remove('has-fullscreen-file');
			btn.setAttribute('aria-expanded', 'false');
			btn.title = i18n.fullscreenEnter || 'Expand to fullscreen';
		} else {
			// Entrar em fullscreen
			// Primeiro, sai de qualquer outro fullscreen
			document.querySelectorAll('.file-diff.fullscreen').forEach(other => {
				if (other !== fileDiff) {
					other.classList.remove('fullscreen');
					const otherBtn = /** @type {HTMLElement} */ (other.querySelector('.file-fullscreen'));
					if (otherBtn) {
						otherBtn.setAttribute('aria-expanded', 'false');
						otherBtn.title = i18n.fullscreenEnter || 'Expand to fullscreen';
					}
				}
			});

			fileDiff.classList.add('fullscreen');
			document.body.classList.add('has-fullscreen-file');
			btn.setAttribute('aria-expanded', 'true');
			btn.title = i18n.fullscreenExit || 'Exit fullscreen (ESC)';

			// Garante que o conteúdo esteja expandido e carregado sob demanda ao entrar em tela cheia.
			const content = fileDiff.querySelector('.file-content');
			const toggle = /** @type {HTMLElement} */ (fileDiff.querySelector('.file-toggle'));
			if (content) {
				content.classList.remove('collapsed');
				content.classList.add('expanded');
			}
			if (toggle) {
				toggle.setAttribute('aria-expanded', 'true');
				toggle.textContent = '▾';
			}
			const fsState = fileDiff.getAttribute('data-loaded');
			if (content && fsState === 'false') {
				showSpinnerIfEmpty(content);
				LazyLoader.dispatch(fileDiff);
			} else if (content && fsState === 'loading') {
				showSpinnerIfEmpty(content);
			}

			// Re-sincroniza scroll em tela cheia
			setTimeout(() => {
				const scrollables = /** @type {NodeListOf<HTMLElement>} */ (fileDiff.querySelectorAll('.sync-scroll'));
				if (scrollables.length >= 2) {
					ScrollSync.createSyncPair(scrollables[0], scrollables[1]);
				}
			}, 50);
		}
	});

	// Fechar fullscreen ao pressionar ESC
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' || e.key === 'Esc') {
			const fullscreenFile = document.querySelector('.file-diff.fullscreen');
			if (fullscreenFile) {
				const btn = /** @type {HTMLElement} */ (fullscreenFile.querySelector('.file-fullscreen'));
				if (btn) {
					btn.click();
				}
			}
		}
	});
})();
