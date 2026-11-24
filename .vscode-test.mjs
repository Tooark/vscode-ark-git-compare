import { readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const root = import.meta.dirname;

// Testes de host (Mocha no Extension Host), listados a partir do código-fonte e em
// caminho absoluto: o test-cli carrega cada um sem passar pelo glob, então um
// arquivo não compilado vira erro em vez de sumir da execução.
// src/test/unit roda no Vitest (ver vitest.config.ts) e é excluída do tsc.
const files = readdirSync(join(root, 'src', 'test'), { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('.test.ts') && !file.startsWith(`unit${sep}`))
	.map((file) => join(root, 'out', 'test', file.replace(/\.ts$/, '.js')));

export default defineConfig({
	files,
	mocha: {
		failZero: true,
		forbidOnly: Boolean(process.env.CI)
	}
});
