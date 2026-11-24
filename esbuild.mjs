import { copyFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Plugin que emite marcadores de início/fim de build e formata os erros para o
 * problemMatcher do VS Code (usado pela task em background no F5 e no watch).
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup (build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      console.log('[watch] build finished');
    });
  }
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'dist/extension.js',
  sourcemap: !production,
  sourcesContent: false,
  minify: production,
  external: ['vscode'],
  logLevel: 'warning',
  plugins: [esbuildProblemMatcherPlugin]
};

/**
 * Copia para media/ o DOMPurify que o webview carrega, para que o arquivo
 * distribuído seja sempre a versão instalada. Falha o build se ele não existir.
 */
function copyDomPurify () {
  copyFileSync('node_modules/dompurify/dist/purify.min.js', 'media/purify.min.js');
}

async function main () {
  copyDomPurify();

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    return;
  }

  await esbuild.build(buildOptions);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
