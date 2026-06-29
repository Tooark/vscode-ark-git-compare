import * as vscode from 'vscode';
import * as Diff from './diff';
import { GitService } from './gitService';
import { escapeHtml } from './utils';

/**
 * Classe que representa as informações de comparação entre dois hashes (branches ou commits) para um arquivo específico.
 * Contém o nome do arquivo, status da comparação, nomes dos hashes comparados, conteúdos dos arquivos e as linhas de diferença.
 */
export class HashInfo {
	file: string;
	status: string;
	hash1_name: string;
	hash2_name: string;
	hash1_content: string;
	hash2_content: string;
	diffLines: Diff.Change[];

	constructor(
		file: string,
		status: string,
		hash1_name: string,
		hash2_name: string,
		hash1_content: string,
		hash2_content: string,
		diffLines: Diff.Change[] = []
	) {
		this.file = file;
		this.status = status;
		this.hash1_name = hash1_name;
		this.hash2_name = hash2_name;
		this.hash1_content = hash1_content;
		this.hash2_content = hash2_content;
		this.diffLines = diffLines;
	}
}

/**
 * Função que constrói o HTML para uma linha de diferença, destacando as partes adicionadas e removidas.
 * @param oldLine A linha original (removida).
 * @param newLine A linha modificada (adicionada).
 * @returns Um objeto contendo o HTML para a linha antiga (com partes removidas destacadas) e a linha nova (com partes adicionadas destacadas).
 */
function buildInlineChangedPair(oldLine: string, newLine: string): { left: string; right: string } {
	const parts = Diff.diffWordsWithSpace(oldLine, newLine);
	let left = '';
	let right = '';

	// Itera sobre as partes da diferença
	for (const part of parts) {
		const escaped = escapeHtml(part.value);

		// Se a parte foi adicionada, destaca na linha direita; se foi removida, destaca na linha esquerda; caso contrário, mantém o texto normal em ambas as linhas
		if (part.added) {
			right += `<span class="inline-added">${escaped}</span>`;
		} else if (part.removed) {
			left += `<span class="inline-removed">${escaped}</span>`;
		} else {
			left += escaped;
			right += escaped;
		}
	}

	return { left, right };
}

/**
 * Função que constrói o HTML para a comparação lado a lado entre dois conteúdos de arquivo, utilizando as linhas de diferença para destacar as mudanças. 
 * @param compare O objeto HashInfo contendo os conteúdos dos arquivos e as linhas de diferença.
 * @returns Um objeto contendo o HTML para as linhas do arquivo antigo (hash1) e do arquivo novo (hash2), com as diferenças destacadas.
 */
export function buildSideBySideDiff(compare: HashInfo): { leftLines: string; rightLines: string } {
	// Se não houver diferenças, retorna os conteúdos originais escapados como HTML
	if (!compare.diffLines || compare.diffLines.length === 0) {
		return {
			leftLines: escapeHtml(compare.hash1_content),
			rightLines: escapeHtml(compare.hash2_content)
		};
	}

	const changes: Array<{ type: 'context' | 'added' | 'removed'; lines: string[] }> = [];
	let currentGroup: { type: 'context' | 'added' | 'removed'; lines: string[] } = { type: 'context', lines: [] };

	// Itera sobre as linhas de diferença e agrupa-as por tipo (contexto, adicionado ou removido)
	for (const part of compare.diffLines) {
		const lines = part.value.split('\n').filter((l, i, arr) => !(i === arr.length - 1 && l === ''));
		const partType: 'context' | 'added' | 'removed' = part.added ? 'added' : part.removed ? 'removed' : 'context';

		// Se o tipo da parte atual for o mesmo do grupo atual, adiciona as linhas ao grupo; caso contrário, inicia um novo grupo
		if (partType === currentGroup.type) {
			currentGroup.lines.push(...lines);
		} else {
			// Se o grupo atual tiver linhas, adiciona-o à lista de mudanças antes de iniciar um novo grupo
			if (currentGroup.lines.length > 0) {
				changes.push(currentGroup);
			}

			currentGroup = { type: partType, lines };
		}
	}

	// Adiciona o último grupo de linhas, se houver
	if (currentGroup.lines.length > 0) {
		changes.push(currentGroup);
	}

	let leftHtml = '';
	let rightHtml = '';
	let leftLineNum = 1;
	let rightLineNum = 1;
	let i = 0;

	// Itera sobre os grupos de mudanças e constrói o HTML para cada linha, destacando as diferenças conforme o tipo (contexto, adicionado ou removido)
	while (i < changes.length) {
		const change = changes[i];

		// Para linhas de contexto, exibe-as normalmente em ambos os lados
		if (change.type === 'context') {
			// Para cada linha de contexto, adiciona o número da linha e o conteúdo escapado como HTML em ambos os lados
			for (const line of change.lines) {
				const escapedLine = escapeHtml(line);
				leftHtml += `<div class="diff-line line-context"><span class="line-number">${leftLineNum}</span><span class="line-content">${escapedLine}</span></div>`;
				rightHtml += `<div class="diff-line line-context"><span class="line-number">${rightLineNum}</span><span class="line-content">${escapedLine}</span></div>`;
				leftLineNum++;
				rightLineNum++;
			}
			// Para mudanças do tipo 'removed'
		} else if (change.type === 'removed') {
			const nextChange = changes[i + 1];

			// Se a próxima mudança for do tipo 'added', trata como um par de linhas modificadas
			if (nextChange && nextChange.type === 'added') {
				const maxLines = Math.max(change.lines.length, nextChange.lines.length);

				// Itera sobre as linhas do par de mudanças (removida e adicionada) e constrói o HTML para cada linha
				for (let j = 0; j < maxLines; j++) {
					const hasLeftPair = j < change.lines.length;
					const hasRightPair = j < nextChange.lines.length;
					const inlinePair = (hasLeftPair && hasRightPair)
						? buildInlineChangedPair(change.lines[j], nextChange.lines[j])
						: undefined;

					// Para a linha removida, se houver um par correspondente, destaca as partes removidas; caso contrário, exibe a linha normalmente
					if (j < change.lines.length) {
						const oldLine = change.lines[j];
						const contentLeft = hasRightPair
							? inlinePair!.left
							: escapeHtml(oldLine);
						leftHtml += `<div class="diff-line line-deleted"><span class="line-number">${leftLineNum}</span><span class="line-content">${contentLeft}</span></div>`;
						leftLineNum++;
					} else {
						leftHtml += `<div class="diff-line line-empty"><span class="line-number"></span><span class="line-content"></span></div>`;
					}

					// Para a linha adicionada, se houver um par correspondente, destaca as partes adicionadas; caso contrário, exibe a linha normalmente
					if (j < nextChange.lines.length) {
						const newLine = nextChange.lines[j];
						const contentRight = hasLeftPair
							? inlinePair!.right
							: escapeHtml(newLine);
						rightHtml += `<div class="diff-line line-added"><span class="line-number">${rightLineNum}</span><span class="line-content">${contentRight}</span></div>`;
						rightLineNum++;
					} else {
						rightHtml += `<div class="diff-line line-empty"><span class="line-number"></span><span class="line-content"></span></div>`;
					}
				}

				i += 2;
				continue;
			} else {
				// Itera sobre as linhas removidas e constrói o HTML para cada linha, destacando-as como removidas
				for (const line of change.lines) {
					const escapedLine = escapeHtml(line);
					leftHtml += `<div class="diff-line line-deleted"><span class="line-number">${leftLineNum}</span><span class="line-content">${escapedLine}</span></div>`;
					rightHtml += `<div class="diff-line line-empty"><span class="line-number"></span><span class="line-content"></span></div>`;
					leftLineNum++;
				}
			}
			// Para mudanças do tipo 'added'
		} else if (change.type === 'added') {
			// Itera sobre as linhas adicionadas e constrói o HTML para cada linha, destacando-as como adicionadas
			for (const line of change.lines) {
				const escapedLine = escapeHtml(line);
				leftHtml += `<div class="diff-line line-empty"><span class="line-number"></span><span class="line-content"></span></div>`;
				rightHtml += `<div class="diff-line line-added"><span class="line-number">${rightLineNum}</span><span class="line-content">${escapedLine}</span></div>`;
				rightLineNum++;
			}
		}

		i++;
	}

	return { leftLines: leftHtml, rightLines: rightHtml };
}

/**
 * Função que retorna o rótulo localizado para um status de arquivo.
 * @param status O status da comparação ('added', 'deleted', 'modified', 'renamed' ou 'error').
 * @returns O rótulo traduzido correspondente ao status.
 */
function statusLabelFor(status: string): string {
	return {
		'added': vscode.l10n.t('Added'),
		'deleted': vscode.l10n.t('Removed'),
		'modified': vscode.l10n.t('Modified'),
		'renamed': vscode.l10n.t('Renamed'),
		'error': vscode.l10n.t('Error')
	}[status] || vscode.l10n.t('Modified');
}

/**
 * Função que constrói o corpo (comparação lado a lado) do diff de um arquivo, sem o cabeçalho.
 * É usado tanto na renderização completa quanto na renderização sob demanda de um único arquivo.
 * @param compare O objeto HashInfo contendo os conteúdos e as linhas de diferença.
 * @returns O HTML do bloco `.code-compare` com as duas colunas sincronizáveis.
 */
export function renderDiffBody(compare: HashInfo): string {
	const { leftLines, rightLines } = buildSideBySideDiff(compare);

	return `
		<div class="code-compare">
			<div class="code-space">
				<div class="code-space-header">${escapeHtml(compare.hash1_name)}</div>
				<pre class="sync-scroll hash1">${leftLines}</pre>
			</div>
			<div class="code-space">
				<div class="code-space-header">${escapeHtml(compare.hash2_name)}</div>
				<pre class="sync-scroll hash2">${rightLines}</pre>
			</div>
		</div>
	`;
}

/**
 * Função que renderiza o HTML para a comparação de um arquivo específico, utilizando as informações de comparação contidas no objeto HashInfo.
 * @param compare O objeto HashInfo contendo as informações de comparação para o arquivo, incluindo o nome do arquivo, status da comparação,
 * nomes dos hashes comparados, conteúdos dos arquivos e as linhas de diferença.
 * @returns O HTML gerado para a comparação do arquivo.
 */
export function renderFileDiff(compare: HashInfo) {
	const statusClass = compare.status;
	const statusLabel = statusLabelFor(compare.status);

	return `
		<div class="file-diff" data-file="${escapeHtml(compare.file)}" data-loaded="true">
			<div class="file-diff-header">
				<h3 class="file-name">📄 ${escapeHtml(compare.file)}</h3>
				<div class="file-actions">
				<button class="file-toggle" aria-expanded="true" title="${vscode.l10n.t('Collapse/Expand')}">▾</button>
				<span class="file-status ${statusClass}">${statusLabel}</span>
				<button class="file-fullscreen" aria-expanded="false" title="${vscode.l10n.t('Expand to fullscreen')}">⛶</button>
				</div>
			</div>
			<div class="file-content expanded">
				${renderDiffBody(compare)}
			</div>
		</div>
	`;
}

/**
 * Função que renderiza o "shell" (casca) colapsado de um arquivo: apenas o cabeçalho com nome e status,
 * sem o conteúdo do diff. O conteúdo é carregado sob demanda quando o usuário expande o arquivo
 * (ver `renderSingleFileDiff`), evitando montar e sanitizar todo o diff de uma vez.
 * @param file O caminho do arquivo.
 * @param status O status da comparação ('added', 'deleted', 'modified', 'renamed').
 * @returns O HTML do arquivo colapsado, pronto para carregar o conteúdo sob demanda.
 */
export function renderFileShell(file: string, status: string): string {
	const statusLabel = statusLabelFor(status);

	return `
		<div class="file-diff" data-file="${escapeHtml(file)}" data-loaded="false">
			<div class="file-diff-header">
				<h3 class="file-name">📄 ${escapeHtml(file)}</h3>
				<div class="file-actions">
				<button class="file-toggle" aria-expanded="false" title="${vscode.l10n.t('Collapse/Expand')}">▸</button>
				<span class="file-status ${status}">${statusLabel}</span>
				<button class="file-fullscreen" aria-expanded="false" title="${vscode.l10n.t('Expand to fullscreen')}">⛶</button>
				</div>
			</div>
			<div class="file-content collapsed"></div>
		</div>
	`;
}

/**
 * Função que renderiza a lista de "shells" colapsados para todos os arquivos alterados.
 * A renderização inicial é praticamente instantânea, pois nenhum conteúdo de diff é calculado aqui.
 * @param files A lista de arquivos com seus respectivos status.
 * @returns O HTML concatenado dos cabeçalhos colapsados de todos os arquivos.
 */
export function renderShellsHtml(files: { file: string; status: string }[]): string {
	return [...files]
		.sort((a, b) => a.file.localeCompare(b.file))
		.map(f => renderFileShell(f.file, f.status))
		.join('');
}

/**
 * Função que calcula e renderiza, sob demanda, o corpo do diff de um único arquivo.
 * Usado quando o usuário expande um arquivo no webview, mantendo o custo de cálculo
 * e sanitização limitado a um arquivo por vez.
 * @param gitService O serviço Git utilizado para obter o conteúdo do arquivo.
 * @param file O caminho do arquivo a ser comparado.
 * @param hash1 O hash do primeiro branch ou commit.
 * @param hash2 O hash do segundo branch ou commit.
 * @returns O HTML do bloco `.code-compare` para o arquivo.
 */
export async function renderSingleFileDiff(
	gitService: GitService,
	file: string,
	hash1: string,
	hash2: string
): Promise<string> {
	try {
		const [content1, content2] = await Promise.all([
			gitService.getFileContent(hash1, file),
			gitService.getFileContent(hash2, file)
		]);

		const diffLines = Diff.diffLines(content1 || '', content2 || '');

		let status = 'modified';

		// Verifica o status do arquivo com base na presença ou ausência de conteúdo em cada hash
		if (!content1 && content2) {
			status = 'added';
		} else if (content1 && !content2) {
			status = 'deleted';
		}

		const info = new HashInfo(
			file,
			status,
			hash1,
			hash2,
			content1 || vscode.l10n.t('[File does not exist]'),
			content2 || vscode.l10n.t('[File does not exist]'),
			diffLines
		);

		return renderDiffBody(info);
	} catch (error) {
		return `<div class="error-state"><p>${vscode.l10n.t('[Load error]')}</p></div>`;
	}
}

/**
 * Função que renderiza o HTML para a comparação de um conjunto de arquivos, utilizando as informações de comparação contidas nos objetos HashInfo. 
 * @param gitService O serviço Git utilizado para obter o conteúdo dos arquivos comparados.
 * @param files A lista de arquivos a serem comparados.
 * @param hash1 O hash do primeiro branch ou commit a ser comparado.
 * @param hash2 O hash do segundo branch ou commit a ser comparado.
 * @param statsHtml O HTML contendo as estatísticas da comparação (número de arquivos alterados, adições, deleções, etc.) a ser incluído no início do resultado.
 * @param onProgress Callback opcional invocado ao final de cada lote com a quantidade de arquivos já processados e o total, permitindo exibir uma barra de progresso determinada.
 * @returns O HTML gerado para a comparação dos arquivos, incluindo as estatísticas e as comparações lado a lado para cada arquivo.
 */
export async function renderDiffHtml(
	gitService: GitService,
	files: string[],
	hash1: string,
	hash2: string,
	statsHtml: string,
	onProgress?: (processed: number, total: number) => void
): Promise<string> {
	// Se o serviço Git não estiver disponível, retorna apenas o HTML das estatísticas sem as comparações dos arquivos
	if (!gitService) {
		return statsHtml + '';
	}

	const results: HashInfo[] = [];
	const batchSize = 5;

	// Itera sobre os arquivos em lotes para evitar sobrecarregar o sistema ao obter o conteúdo dos arquivos e calcular as diferenças
	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);

		await Promise.all(batch.map(async (file) => {
			try {
				const [content1, content2] = await Promise.all([
					gitService.getFileContent(hash1, file),
					gitService.getFileContent(hash2, file)
				]);

				const diffLines = Diff.diffLines(content1 || '', content2 || '');

				let status = 'modified';

				// Verifica o status do arquivo com base na presença ou ausência de conteúdo em cada hash
				if (!content1 && content2) {
					status = 'added';
				} else if (content1 && !content2) {
					status = 'deleted';
				}

				results.push(new HashInfo(
					file,
					status,
					hash1,
					hash2,
					content1 || vscode.l10n.t('[File does not exist]'),
					content2 || vscode.l10n.t('[File does not exist]'),
					diffLines
				));
			} catch (error) {
				results.push(new HashInfo(
					file,
					'error',
					hash1,
					hash2,
					vscode.l10n.t('[Load error]'),
					vscode.l10n.t('[Load error]'),
					[]
				));
			}
		}));

		// Reporta o progresso ao final de cada lote (limitado ao total de arquivos).
		onProgress?.(Math.min(i + batchSize, files.length), files.length);
	}

	results.sort((a, b) => a.file.localeCompare(b.file));

	const htmlContent = statsHtml + results.map(r => renderFileDiff(r)).join('');
	return htmlContent;
}
