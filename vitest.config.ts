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
    include: ['src/test/**/*.test.ts']
  }
});
