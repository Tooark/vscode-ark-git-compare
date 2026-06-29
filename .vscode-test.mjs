import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	// Testes de host (Mocha no Extension Host). A pasta src/test/unit (Vitest) é
	// excluída do tsc, então não é emitida em out/ e não entra neste glob.
	// A lógica pura roda no Vitest — ver vitest.config.ts.
	files: 'out/test/**/*.test.js',
});
