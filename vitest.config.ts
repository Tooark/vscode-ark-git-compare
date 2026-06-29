import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^vscode$/,
        replacement: path.resolve(__dirname, 'src/test/mocks/vscode.ts')
      }
    ]
  },
  test: {
    // Apenas os testes de lógica pura (Vitest). Os testes de host em
    // src/test/*.test.ts usam a API do Mocha (suite/test) e rodam via
    // vscode-test — ver .vscode-test.mjs.
    include: ['src/test/unit/**/*.test.ts']
  }
});
