import * as assert from 'assert';
import { describe, test } from 'vitest';
import { GitService } from '../../gitService';

/** Cria um GitService com `runGit` substituído por um stub controlado. */
function stubbedService(runGit: (args: string[]) => Promise<string>): any {
	const service = new GitService('.') as any;
	service.runGit = (args: string[]) => runGit(args);
	return service;
}

describe('gitService.ts', () => {
	test('runGit deve executar comandos reais e propagar erros', async () => {
		const service = new GitService('.') as any;
		const version = await service.runGit(['--version']);
		assert.ok(version.toLowerCase().includes('git version'));
		await assert.rejects(async () => service.runGit(['definitely-invalid-command-xyz']));
	});

	test('parseDiffHunks deve processar um hunk com add/delete/context', () => {
		const service = new GitService('.') as unknown as { parseDiffHunks: (d: string) => unknown[] };
		const hunks = service.parseDiffHunks('@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 changed\n');
		assert.strictEqual(hunks.length, 1);
	});

	test('parseDiffHunks deve cobrir multiplos hunks', () => {
		const service = new GitService('.') as unknown as { parseDiffHunks: (d: string) => unknown[] };
		const hunks = service.parseDiffHunks('@@ -1,1 +1,1 @@\n-a\n+b\n@@ -3,1 +3,1 @@\n-c\n+d\n');
		assert.strictEqual(hunks.length, 2);
	});

	test('parseDiffHunks deve assumir 1 linha quando o cabecalho omite a contagem', () => {
		const service = new GitService('.') as unknown as { parseDiffHunks: (d: string) => any[] };
		const hunks = service.parseDiffHunks('@@ -1 +1 @@\n-a\n+b\n');
		assert.strictEqual(hunks.length, 1);
		assert.strictEqual(hunks[0].oldLines, 1);
		assert.strictEqual(hunks[0].newLines, 1);
	});

	test('runGit deve usar a mensagem do erro quando nao ha stderr', async () => {
		const service = new GitService('/diretorio/que/nao/existe/xyz') as any;
		await assert.rejects(async () => service.runGit(['--version']));
	});

	test('parseCommitList deve ignorar linhas invalidas', () => {
		const service = new GitService('.') as unknown as { parseCommitList: (r: string) => unknown[] };
		const commits = service.parseCommitList('a\x1fb\x1fc\x1fd\x1fe\ninvalid');
		assert.strictEqual(commits.length, 1);
	});

	test('metodos publicos devem cobrir caminhos de sucesso', async () => {
		const service = stubbedService(async (args) => {
			const command = args.join(' ');
			if (command === 'rev-parse --git-dir') return '.git';
			if (command === 'branch -a --format=%(refname:short)|%(HEAD)|%(refname)') return 'main|*|refs/heads/main\norigin/main||refs/remotes/origin/main';
			if (command === 'log --pretty=format:%h%x1f%H%x1f%s%x1f%an%x1f%ad --date=short -n 50') return 'a\x1faaaa\x1fmsg\x1fme\x1f2026-01-01';
			if (command === 'log main --pretty=format:%h%x1f%H%x1f%s%x1f%an%x1f%ad --date=short -n 20') return 'b\x1fbbbb\x1fmsg2\x1fyou\x1f2026-01-02';
			if (command === 'diff --name-status a..b') return 'A\tnew.ts\nD\told.ts\nR100\ta.ts\tb.ts\nM\tm.ts';
			if (command === 'show a:f.ts') return 'old';
			if (command === 'diff a..b') return 'raw-diff';
			if (command === 'diff --stat a..b') return ' 1 file changed, 2 insertions(+), 3 deletions(-)';
			if (command === 'branch --show-current') return 'main';
			if (command === 'for-each-ref --format=%(refname:short) refs/heads/ refs/remotes/') return 'main\norigin/main';
			if (command === 'tag') return 'v1.0.0';
			if (command === 'log --pretty=format:%h -n 20') return 'abc\ndef';
			return '';
		});

		assert.strictEqual(await service.isGitRepository(), true);
		assert.strictEqual((await service.getBranches()).length, 2);
		assert.strictEqual((await service.getCommits()).length, 1);
		assert.strictEqual((await service.getCommitsForRef('main')).length, 1);
		assert.strictEqual((await service.getChangedFiles('a', 'b')).length, 4);
		assert.strictEqual(await service.getFileContent('a', 'f.ts'), 'old');
		assert.strictEqual(await service.getDiff('a', 'b'), 'raw-diff');
		const stats = await service.getDiffStats('a', 'b');
		assert.deepStrictEqual(stats, { files: 1, additions: 2, deletions: 3 });
		assert.strictEqual(await service.getCurrentBranch(), 'main');
		assert.ok((await service.getAllRefs()).includes('main'));
	});

	test('getChangedFiles deve mapear A/D/R/M', async () => {
		const service = stubbedService(async () => 'A\tadd.ts\nD\tdel.ts\nR100\told.ts\tnew.ts\nM\tmod.ts\nX\tother.ts');
		const files = await service.getChangedFiles('a', 'b');
		assert.deepStrictEqual(files.map((f: any) => f.status), ['added', 'deleted', 'renamed', 'modified', 'modified']);
	});

	test('getDiff deve incluir o caminho do arquivo normalizado quando fornecido', async () => {
		const seen: string[][] = [];
		const service = stubbedService(async (args) => {
			seen.push(args);
			return 'diff';
		});
		await service.getDiff('a', 'b', 'src\\index.ts');
		assert.deepStrictEqual(seen[0], ['diff', 'a..b', '--', 'src/index.ts']);
	});

	test('getFileDiff deve resolver os status added/deleted/renamed/modified', async () => {
		const cases: Array<[string, string]> = [['A', 'added'], ['D', 'deleted'], ['R100', 'renamed'], ['M', 'modified'], ['', 'modified']];
		for (const [code, expected] of cases) {
			const service = stubbedService(async (args) => {
				const command = args.join(' ');
				if (command.startsWith('diff --name-status')) return code ? `${code}\tf.ts` : '';
				if (command.startsWith('show')) return 'conteudo';
				if (command.startsWith('diff')) return '@@ -1,1 +1,1 @@\n-old\n+new\n';
				return '';
			});
			const fileDiff = await service.getFileDiff('a', 'b', 'f.ts');
			assert.strictEqual(fileDiff.status, expected, `status para o codigo "${code}"`);
			assert.strictEqual(fileDiff.fileName, 'f.ts');
		}
	});

	test('getDiffStats deve aceitar formas singulares e plural', async () => {
		const singular = await stubbedService(async () => ' 1 file changed, 1 insertion(+), 1 deletion(-)').getDiffStats('a', 'b');
		assert.deepStrictEqual(singular, { files: 1, additions: 1, deletions: 1 });
		const plural = await stubbedService(async () => ' 3 files changed, 10 insertions(+), 5 deletions(-)').getDiffStats('a', 'b');
		assert.deepStrictEqual(plural, { files: 3, additions: 10, deletions: 5 });
		const empty = await stubbedService(async () => '').getDiffStats('a', 'b');
		assert.deepStrictEqual(empty, { files: 0, additions: 0, deletions: 0 });
	});

	test('deve cobrir caminhos de fallback e erro', async () => {
		const service = stubbedService(async (args) => {
			const command = args.join(' ');
			if (command === 'rev-parse --git-dir') throw new Error('not git');
			if (command === 'diff --stat a..b') return 'no summary';
			throw new Error('missing');
		});
		assert.strictEqual(await service.isGitRepository(), false);
		assert.strictEqual(await service.getFileContent('x', 'y'), '');
		assert.deepStrictEqual(await service.getDiffStats('a', 'b'), { files: 0, additions: 0, deletions: 0 });
		assert.deepStrictEqual(await service.getAllRefs(), []);
	});

	test('deve rejeitar refs, paths e limites invalidos', async () => {
		const service = stubbedService(async () => 'ok');
		await assert.rejects(async () => service.getCommitsForRef('main;whoami', 10), /Referencia Git invalida/);
		await assert.rejects(async () => service.getDiff('main', 'dev && calc'), /Referencia Git invalida/);
		await assert.rejects(async () => service.getDiff('main', 'dev', '../secret.txt'), /Caminho de arquivo invalido/);
		await assert.rejects(async () => service.getDiff('main', 'dev', '/etc/passwd'), /Caminho de arquivo invalido/);
		await assert.rejects(async () => service.getDiff('main', 'dev', '   '), /Caminho de arquivo invalido/);
		await assert.rejects(async () => service.getDiff('main', 'dev', 'a\nb'), /Caminho de arquivo invalido/);
		await assert.rejects(async () => service.getCommits(0), /Limite de commits invalido/);
		await assert.rejects(async () => service.getCommits(999), /Limite de commits invalido/);
	});

	test('validacoes devem rejeitar entradas que nao sao string', async () => {
		const service = stubbedService(async () => 'ok');
		await assert.rejects(async () => service.getDiff('main', 123 as unknown as string), /Referencia Git invalida/);
		await assert.rejects(async () => service.getDiff('main', 'dev', 123 as unknown as string), /Caminho de arquivo invalido/);
	});
});
