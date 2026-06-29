import * as assert from 'assert';
import { describe, test } from 'vitest';
import * as Diff from '../../diff';
import { GitService } from '../../gitService';
import { HashInfo, buildSideBySideDiff, renderDiffHtml, renderFileDiff } from '../../diffRenderer';

describe('diffRenderer.ts', () => {
	test('buildSideBySideDiff deve retornar conteudo escapado quando nao ha diffLines', () => {
		const compare = new HashInfo('a.ts', 'modified', 'a', 'b', '<old>', '<new>', []);
		const rendered = buildSideBySideDiff(compare);
		assert.ok(rendered.leftLines.includes('&lt;old&gt;'));
		assert.ok(rendered.rightLines.includes('&lt;new&gt;'));
	});

	test('buildSideBySideDiff deve cobrir context/add/remove com destaque inline', () => {
		const compare = new HashInfo(
			'f.ts', 'modified', 'a', 'b', '', '',
			Diff.diffLines('line1\nline2 old\nline3\n', 'line1\nline2 new\nline3\nline4\n')
		);
		const rendered = buildSideBySideDiff(compare);
		assert.ok(rendered.leftLines.includes('line-context'));
		assert.ok(rendered.leftLines.includes('line-deleted'));
		assert.ok(rendered.rightLines.includes('line-added'));
		// Par modificado deve produzir destaque inline em ambos os lados.
		assert.ok(rendered.leftLines.includes('inline-removed'));
		assert.ok(rendered.rightLines.includes('inline-added'));
	});

	test('buildSideBySideDiff deve gerar gaps quando os pares tem tamanhos diferentes', () => {
		const leftGap = buildSideBySideDiff(new HashInfo('f.ts', 'modified', 'a', 'b', '', '', Diff.diffLines('x\ny\n', 'x\n')));
		assert.ok(leftGap.leftLines.includes('line-empty') || leftGap.rightLines.includes('line-empty'));

		const rightGap = buildSideBySideDiff(new HashInfo('f.ts', 'modified', 'a', 'b', '', '', Diff.diffLines('x\n', 'x\ny\n')));
		assert.ok(rightGap.leftLines.includes('line-empty') || rightGap.rightLines.includes('line-empty'));
	});

	test('buildSideBySideDiff deve cobrir placeholders nos dois lados do par remove/add', () => {
		const leftPlaceholder = buildSideBySideDiff(new HashInfo('f.ts', 'modified', 'a', 'b', '', '', [
			{ removed: true, value: 'old1\n', count: 1 },
			{ added: true, value: 'new1\nnew2\n', count: 2 }
		] as Diff.Change[]));
		assert.ok(leftPlaceholder.leftLines.includes('line-empty'));

		const rightPlaceholder = buildSideBySideDiff(new HashInfo('f.ts', 'modified', 'a', 'b', '', '', [
			{ removed: true, value: 'old1\nold2\n', count: 2 },
			{ added: true, value: 'new1\n', count: 1 }
		] as Diff.Change[]));
		assert.ok(rightPlaceholder.rightLines.includes('line-empty'));
	});

	test('buildSideBySideDiff deve cobrir remocao pura sem adicao subsequente', () => {
		const rendered = buildSideBySideDiff(new HashInfo('f.ts', 'modified', 'a', 'b', '', '', [
			{ removed: true, value: 'apenas removida\n', count: 1 }
		] as Diff.Change[]));
		assert.ok(rendered.leftLines.includes('line-deleted'));
		assert.ok(rendered.rightLines.includes('line-empty'));
	});

	test('renderFileDiff deve mapear todos os status e o fallback', () => {
		for (const status of ['added', 'deleted', 'modified', 'renamed', 'error']) {
			assert.ok(renderFileDiff(new HashInfo('file.ts', status, 'a', 'b', 'x', 'y', [])).includes(`file-status ${status}`));
		}
		const unknown = renderFileDiff(new HashInfo('file.ts', 'whatever', 'a', 'b', 'x', 'y', []));
		assert.ok(unknown.includes('file-status whatever'));
	});

	test('renderDiffHtml deve retornar apenas as stats quando o gitService e nulo', async () => {
		const html = await renderDiffHtml(null as unknown as GitService, ['a.ts'], 'a', 'b', '<stats/>');
		assert.strictEqual(html, '<stats/>');
	});

	test('renderDiffHtml deve cobrir added/deleted/modified/error e o processamento em lotes', async () => {
		const fakeService = {
			getFileContent: async (ref: string, file: string) => {
				if (file === 'error.ts') throw new Error('boom');
				if (file.startsWith('added')) return ref === 'a' ? '' : 'new';
				if (file.startsWith('deleted')) return ref === 'a' ? 'old' : '';
				return ref === 'a' ? 'old' : 'new';
			}
		} as unknown as GitService;

		// Mais de 5 arquivos para exercitar o loop de lotes (batchSize = 5).
		const files = ['modified1.ts', 'added1.ts', 'deleted1.ts', 'error.ts', 'modified2.ts', 'added2.ts', 'modified3.ts'];
		const html = await renderDiffHtml(fakeService, files, 'a', 'b', '<stats/>');
		for (const file of files) {
			assert.ok(html.includes(file), `esperava encontrar ${file}`);
		}
	});

	test('renderDiffHtml deve reportar o progresso ao final de cada lote', async () => {
		const fakeService = { getFileContent: async () => 'x' } as unknown as GitService;
		const calls: Array<[number, number]> = [];

		// 7 arquivos -> dois lotes (5 e 7), com o processado limitado ao total.
		const files = Array.from({ length: 7 }, (_, i) => `f${i}.ts`);
		await renderDiffHtml(fakeService, files, 'a', 'b', '<stats/>', (processed, total) => calls.push([processed, total]));

		assert.deepStrictEqual(calls, [[5, 7], [7, 7]]);
	});
});
