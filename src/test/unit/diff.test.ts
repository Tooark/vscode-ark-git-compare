import * as assert from 'assert';
import { describe, test } from 'vitest';
import { diffLines, diffWordsWithSpace, Change } from '../../diff';

describe('diff.ts', () => {
	test('diffLines deve retornar lista vazia para dois textos vazios', () => {
		assert.deepStrictEqual(diffLines('', ''), []);
	});

	test('diffLines deve tratar textos identicos como um unico contexto', () => {
		const changes = diffLines('a\nb\n', 'a\nb\n');
		assert.strictEqual(changes.length, 1);
		assert.strictEqual(changes[0].added, undefined);
		assert.strictEqual(changes[0].removed, undefined);
		assert.strictEqual(changes[0].value, 'a\nb\n');
		assert.strictEqual(changes[0].count, 2);
	});

	test('diffLines deve marcar adicao pura quando o texto antigo e vazio', () => {
		const changes = diffLines('', 'nova\n');
		assert.strictEqual(changes.length, 1);
		assert.strictEqual(changes[0].added, true);
		assert.strictEqual(changes[0].value, 'nova\n');
	});

	test('diffLines deve marcar remocao pura quando o texto novo e vazio', () => {
		const changes = diffLines('antiga\n', '');
		assert.strictEqual(changes.length, 1);
		assert.strictEqual(changes[0].removed, true);
		assert.strictEqual(changes[0].value, 'antiga\n');
	});

	test('diffLines deve emitir removido antes de adicionado numa modificacao', () => {
		const changes = diffLines('a\nold\nc\n', 'a\nnew\nc\n');
		const types = changes.map(c => (c.added ? 'add' : c.removed ? 'remove' : 'context'));
		assert.deepStrictEqual(types, ['context', 'remove', 'add', 'context']);
		const removedIdx = types.indexOf('remove');
		assert.strictEqual(types[removedIdx + 1], 'add');
	});

	test('diffLines deve lidar com ultima linha sem quebra de linha', () => {
		const changes = diffLines('a\nb', 'a\nb');
		assert.strictEqual(changes.length, 1);
		assert.strictEqual(changes[0].value, 'a\nb');
		assert.strictEqual(changes[0].count, 2);
	});

	test('diffWordsWithSpace deve retornar lista vazia para palavras vazias', () => {
		// Cobre o fallback `?? []` quando a tokenizacao nao encontra correspondencias.
		assert.deepStrictEqual(diffWordsWithSpace('', ''), []);
	});

	test('diffWordsWithSpace deve destacar apenas a palavra alterada preservando espacos', () => {
		const changes = diffWordsWithSpace('foo bar baz', 'foo qux baz');
		const removed = changes.filter(c => c.removed).map(c => c.value).join('');
		const added = changes.filter(c => c.added).map(c => c.value).join('');
		const context = changes.filter(c => !c.added && !c.removed).map(c => c.value).join('');
		assert.strictEqual(removed, 'bar');
		assert.strictEqual(added, 'qux');
		assert.ok(context.includes('foo'));
		assert.ok(context.includes('baz'));
		assert.ok(context.includes(' '));
	});

	test('diffWordsWithSpace deve tokenizar palavras acentuadas como unidade', () => {
		const changes = diffWordsWithSpace('café quente', 'chá quente');
		const removed = changes.filter(c => c.removed).map(c => c.value).join('');
		const added = changes.filter(c => c.added).map(c => c.value).join('');
		assert.strictEqual(removed, 'café');
		assert.strictEqual(added, 'chá');
	});

	test('Change deve aceitar segmentos parciais como tipo', () => {
		const sample: Change[] = [{ value: 'x', added: true }];
		assert.strictEqual(sample[0].value, 'x');
	});
});
