import * as assert from 'assert';
import { describe, test } from 'vitest';
import { escapeHtml, getNonce } from '../../utils';

describe('utils.ts', () => {
	test('escapeHtml deve escapar caracteres especiais', () => {
		assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
	});

	test('escapeHtml deve manter texto sem caracteres especiais', () => {
		assert.strictEqual(escapeHtml('abc 123'), 'abc 123');
	});

	test('escapeHtml deve retornar string vazia para entrada vazia', () => {
		assert.strictEqual(escapeHtml(''), '');
		assert.strictEqual(escapeHtml(undefined as unknown as string), '');
	});

	test('getNonce deve gerar 32 caracteres alfanumericos', () => {
		const nonce = getNonce();
		assert.strictEqual(nonce.length, 32);
		assert.ok(/^[A-Za-z0-9]{32}$/.test(nonce));
	});

	test('getNonce deve gerar valores diferentes a cada chamada', () => {
		assert.notStrictEqual(getNonce(), getNonce());
	});
});
