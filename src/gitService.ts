import { execFile } from 'child_process';
import { promisify } from 'util';
import type { BranchInfo, CommitInfo, DiffHunk, DiffLine, FileDiff, FileStatus } from './types';

/**
 * Função auxiliar para executar comandos Git de forma assíncrona usando execFile.
 */
const execFileAsync = promisify(execFile);

/**
 * Classe de serviço para interagir com o Git, fornecendo métodos para obter informações sobre branches, commits,
 * arquivos alterados, diffs e estatísticas de alterações. Esta classe encapsula a execução de comandos Git
 * de forma segura, evitando riscos de injeção de comandos e garantindo que os resultados sejam processados corretamente.
 */
export class GitService {
  // Define um buffer máximo para a saída dos comandos Git para evitar problemas com repositórios grandes
  private static readonly MAX_BUFFER = 10 * 1024 * 1024;
  // Define um padrão regex para validar referências Git (branches, tags, commits)
  private static readonly SAFE_REF_PATTERN = /^[A-Za-z0-9._\/@~^{}-]{1,200}$/;

  /**
   * Construtor do serviço Git.
   * @param workspaceRoot Caminho para o diretório raiz do workspace (repositório Git)
   */
  constructor (private workspaceRoot: string) { }

  /**
   * Função para executar um comando Git com argumentos separados, sem invocar shell.
   * @param args Argumentos do comando git.
   * @returns Saída do comando.
   * @throws Erro com a mensagem de stderr se o comando falhar.
   * @remarks Este método é a base para todos os outros métodos do serviço Git, garantindo que os comandos
   * sejam executados de forma segura e eficiente. Ele captura erros e retorna mensagens de erro detalhadas
   * para facilitar o diagnóstico de problemas.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const branches = await gitService.runGit(['branch', '-a']);
   * console.log(branches);
   * // Saída do comando `git branch -a`
   * ```
   */
  private async runGit (args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: this.workspaceRoot,
        maxBuffer: GitService.MAX_BUFFER,
        windowsHide: true
      });

      return stdout.trim();
    } catch (error) {
      const err = error as Error & { stderr?: string | Buffer };
      const stderr = typeof err.stderr === 'string' ? err.stderr : err.stderr?.toString('utf8');

      throw new Error(stderr || err.message);
    }
  }

  /**
   * Função para validar uma referência Git (branch, tag ou commit) para garantir que seja segura para uso em comandos Git.
   * @param ref Referência a ser validada.
   * @param fieldName Nome do campo para mensagens de erro (opcional).
   * @returns A referência validada e normalizada.
   * @throws Erro se a referência for inválida ou potencialmente insegura.
   * @remarks Este método verifica se a referência é uma string, remove espaços em branco e valida contra um
   * padrão regex seguro. Ele é usado para garantir que as referências fornecidas pelos usuários sejam seguras
   * para uso em comandos Git, evitando riscos de injeção de comandos ou erros causados por referências malformadas.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const safeRef = gitService.validateRef('main');
   * console.log(safeRef); // 'main'
   * ```
   */
  private validateRef (ref: string, fieldName: string = 'ref'): string {
    // Verifica se a referência é uma string
    if (typeof ref !== 'string') {
      throw new Error(`Referencia Git invalida em ${fieldName}.`);
    }

    // Normaliza a referência removendo espaços em branco e validando contra o padrão seguro
    const normalizedRef = ref.trim();
    if (!GitService.SAFE_REF_PATTERN.test(normalizedRef)) {
      throw new Error(`Referencia Git invalida em ${fieldName}.`);
    }

    return normalizedRef;
  }

  /**
   * Função para validar o limite de commits para garantir que esteja dentro de um intervalo aceitável.
   * @param limit Limite a ser validado.
   * @returns O limite validado.
   * @throws Erro se o limite for inválido.
   * @remarks Este método verifica se o limite é um número inteiro e se está dentro do intervalo permitido (1 a 500).
   * Ele é usado para garantir que os limites fornecidos pelos usuários para consultas de commits sejam razoáveis e
   * não causem problemas de desempenho.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const safeLimit = gitService.validateLimit(100);
   * console.log(safeLimit); // 100
   * ```
   */
  private validateLimit (limit: number): number {
    // Verifica se o limite é um número inteiro dentro do intervalo permitido (1 a 500)
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error('Limite de commits invalido.');
    }

    return limit;
  }

  /**
   * Função para validar um caminho de arquivo para garantir que seja seguro para uso em comandos Git.
   * @param filePath Caminho do arquivo a ser validado.
   * @returns O caminho do arquivo validado e normalizado.
   * @throws Erro se o caminho do arquivo for inválido ou potencialmente inseguro.
   * @remarks Este método verifica se o caminho do arquivo é uma string, normaliza o caminho e valida contra
   * padrões inseguros. Ele é usado para garantir que os caminhos fornecidos pelos usuários sejam seguros para
   * uso em comandos Git, evitando riscos de injeção de comandos ou erros causados por caminhos malformados.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const safePath = gitService.validatePathSpec('src/index.ts');
   * console.log(safePath); // 'src/index.ts'
   * ```
   */
  private validatePathSpec (filePath: string): string {
    // Verifica se o caminho do arquivo é uma string
    if (typeof filePath !== 'string') {
      throw new Error('Caminho de arquivo invalido.');
    }

    // Normaliza o caminho do arquivo, convertendo barras invertidas para barras normais e removendo espaços em branco
    const normalizedPath = filePath.replace(/\\/g, '/').trim();
    if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.includes('..') || /[\0\r\n]/.test(normalizedPath)) {
      throw new Error('Caminho de arquivo invalido.');
    }

    return normalizedPath;
  }

  /**
   * Função para fazer parse do output do git diff em hunks estruturados.
   * @param diffOutput Output do comando git diff
   * @return Lista de hunks de diferença, cada um contendo as linhas alteradas e seus números de linha correspondentes.
   * @remarks Este método interpreta a saída formatada do comando `git diff` para identificar os blocos de diferença (hunks)
   * e as linhas dentro desses blocos, classificando cada linha como adição, deleção ou contexto.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const diffOutput = await gitService.getDiff('main', 'feature-x', 'src/index.ts');
   * const hunks = gitService.parseDiffHunks(diffOutput);
   * console.log(hunks);
   * // [
   * //   {
   * //     oldStart: 10,
   * //     oldLines: 5,
   * //     newStart: 10,
   * //     newLines: 6,
   * //     changes: [
   * //       { type: 'context', content: ' linha de código ', oldLineNumber: 10, newLineNumber: 10 },
   * //       { type: 'delete', content: '-linha removida', oldLineNumber: 11 },
   * //       { type: 'add', content: '+linha adicionada', newLineNumber: 11 },
   * //       ...
   * //     ]
   * //   },
   * //	 ...
   * // ]
   * ```
   * @private Este método é privado porque é uma implementação interna para processar a saída do git diff
   */
  private parseDiffHunks (diffOutput: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diffOutput.split('\n');

    let currentHunk: DiffHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;

    // Itera sobre cada linha do diff para identificar os hunks e as mudanças dentro deles
    for (const line of lines) {
      // Detecta início de um novo hunk: @@ -1,10 +1,15 @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

      // Verifica se a linha atual é o início de um novo hunk
      if (hunkMatch) {
        // Se já estivermos processando um hunk, adicionamos ele à lista antes de iniciar o próximo
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: parseInt(hunkMatch[2] || '1', 10),
          newStart: parseInt(hunkMatch[3], 10),
          newLines: parseInt(hunkMatch[4] || '1', 10),
          changes: []
        };

        oldLineNum = currentHunk.oldStart;
        newLineNum = currentHunk.newStart;
        continue;
      }

      // Se estivermos dentro de um hunk, processamos as linhas de mudança
      if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.substring(1)
        };

        // Classifica a linha como adição, deleção ou contexto e atribui os números de linha correspondentes
        if (line.startsWith('+')) {
          diffLine.type = 'add';
          diffLine.newLineNumber = newLineNum++;
        } else if (line.startsWith('-')) {
          diffLine.type = 'delete';
          diffLine.oldLineNumber = oldLineNum++;
        } else {
          diffLine.type = 'context';
          diffLine.oldLineNumber = oldLineNum++;
          diffLine.newLineNumber = newLineNum++;
        }

        currentHunk.changes.push(diffLine);
      }
    }

    // Adiciona o último hunk processado, se existir
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Função para converter saída formatada de `git log` em lista tipada de commits.
   * @param result Saída do comando `git log` formatada com delimitadores personalizados
   * @return Lista de objetos CommitInfo contendo hash, mensagem, autor e data de cada commit
   * @remarks Este método é responsável por interpretar a saída do comando `git log` que foi formatada com
   * delimitadores personalizados (usando %x1f) para separar os campos. Ele converte essa saída em uma lista
   * de objetos CommitInfo, que são mais fáceis de manipular no código.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const logOutput = await gitService.exec('git log --pretty=format:"%h%x1f%H%x1f%s%x1f%an%x1f%ad" --date=short -n 10');
   * const commits = gitService.parseCommitList(logOutput);
   * console.log(commits);
   * // [
   * //   { hash: 'abc123', fullHash: 'abc123def456...', message: 'Fix bug', author: 'Alice', date: '2024-06-01' },
   * //   { hash: 'def456', fullHash: 'def456abc123...', message: 'Add feature', author: 'Bob', date: '2024-05-30' },
   * //   ...
   * // ]
   * ```
   * @private Este método é privado porque é uma implementação interna para processar a saída do git log
   * formatada com delimitadores personalizados.
   */
  private parseCommitList (result: string): CommitInfo[] {
    const lines = result.split('\n').filter(Boolean);

    return lines
      .map(line => line.split('\x1f'))
      .filter(parts => parts.length >= 5)
      .map(([hash, fullHash, message, author, date]) => ({
        hash,
        fullHash,
        message,
        author,
        date
      }));
  }

  /**
   * Função para verificar se o diretório atual é um repositório Git.
   * @returns `true` se for um repositório Git, `false` caso contrário.
   * @throws Erro se o comando Git falhar por algum motivo (ex: Git não instalado).
   * @remarks Este método tenta executar um comando Git simples para verificar a presença
   * de um repositório. Se o comando falhar, assume-se que não é um repositório Git.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const isRepo = await gitService.isGitRepository();
   * console.log(isRepo); // true ou false
   * ```
   */
  async isGitRepository (): Promise<boolean> {
    try {
      await this.runGit(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Função para obter a lista de branches locais e remotos.
   * @returns Lista de branches com informações sobre cada branch
   * @remarks Este método executa um comando Git para listar todos os branches, tanto locais quanto remotos.
   * Ele formata a saída para extrair o nome do branch, se é o branch atual e se é um branch remoto.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const branches = await gitService.getBranches();
   * console.log(branches);
   * // [
   * //   { name: 'main', isCurrent: true, isRemote: false },
   * //   { name: 'feature-x', isCurrent: false, isRemote: false },
   * //   { name: 'origin/main', isCurrent: false, isRemote: true }
   * // ]
   * ```
   */
  async getBranches (): Promise<BranchInfo[]> {
    const result = await this.runGit(['branch', '-a', '--format=%(refname:short)|%(HEAD)|%(refname)']);
    const lines = result.split('\n').filter(Boolean);

    return lines.map(line => {
      const [name, isCurrent, refname] = line.split('|');
      return {
        name: name.trim(),
        isCurrent: isCurrent.trim() === '*',
        isRemote: refname.includes('refs/remotes/')
      };
    });
  }

  /**
   * Função para obter a lista de commits recentes.
   * @param limit Número máximo de commits a retornar (padrão: 50).
   * @return Lista de commits com informações sobre cada commit.
   * @remarks Este método executa um comando Git para listar os commits recentes, formatando a saída para extrair
   * o hash curto, hash completo, mensagem, autor e data de cada commit.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const commits = await gitService.getCommits(10);
   * console.log(commits);
   * // [
   * //   { hash: 'abc123', fullHash: 'abc123def456...', message: 'Fix bug', author: 'Alice', date: '2024-06-01' },
   * //   { hash: 'def456', fullHash: 'def456abc123...', message: 'Add feature', author: 'Bob', date: '2024-05-30' },
   * //   ...
   * // ]
   * ```
   */
  async getCommits (limit: number = 50): Promise<CommitInfo[]> {
    const safeLimit = this.validateLimit(limit);
    const format = '%h%x1f%H%x1f%s%x1f%an%x1f%ad';
    const result = await this.runGit(['log', `--pretty=format:${format}`, '--date=short', '-n', String(safeLimit)]);

    return this.parseCommitList(result);
  }

  /**
   * Função para obter a lista de commits de uma referência específica (branch/tag/commit).
   * @param ref Referência para filtrar o histórico.
   * @param limit Número máximo de commits a retornar.
   * @return Lista de commits relacionados à referência fornecida.
   * @remarks Este método é similar ao `getCommits`, mas permite filtrar os commits por uma referência específica,
   * como um branch ou tag. Ele formata a saída do comando Git para extrair as informações dos commits.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const commits = await gitService.getCommitsForRef('main', 10);
   * console.log(commits);
   * // [
   * //   { hash: 'abc123', fullHash: 'abc123def456...', message: 'Fix bug', author: 'Alice', date: '2024-06-01' },
   * //   { hash: 'def456', fullHash: 'def456abc123...', message: 'Add feature', author: 'Bob', date: '2024-05-30' },
   * //   ...
   * // ]
   * ```
   */
  async getCommitsForRef (ref: string, limit: number = 20): Promise<CommitInfo[]> {
    const safeRef = this.validateRef(ref, 'ref');
    const safeLimit = this.validateLimit(limit);
    const format = '%h%x1f%H%x1f%s%x1f%an%x1f%ad';
    const result = await this.runGit(['log', safeRef, `--pretty=format:${format}`, '--date=short', '-n', String(safeLimit)]);

    return this.parseCommitList(result);
  }

  /**
   * Função para obter a lista de arquivos alterados entre dois commits/branches.
   * @param ref1 Primeira referência (commit ou branch).
   * @param ref2 Segunda referência (commit ou branch).
   * @return Lista de arquivos com status de alteração (adicionado, modificado, deletado, renomeado).
   * @remarks Este método executa um comando Git para listar os arquivos que foram alterados entre duas referências,
   * como branches ou commits. Ele interpreta a saída para determinar o status de cada arquivo (adicionado,
   * modificado, deletado ou renomeado).
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const changedFiles = await gitService.getChangedFiles('main', 'feature-x');
   * console.log(changedFiles);
   * // [
   * //   { file: 'src/index.ts', status: 'modified' },
   * //   { file: 'src/new-file.ts', status: 'added' },
   * //   { file: 'src/old-file.ts', status: 'deleted' },
   * //   { file: 'src/renamed-file.ts', status: 'renamed' }
   * // ]
   * ```
   */
  async getChangedFiles (ref1: string, ref2: string): Promise<{ file: string; status: FileStatus }[]> {
    const safeRef1 = this.validateRef(ref1, 'ref1');
    const safeRef2 = this.validateRef(ref2, 'ref2');
    const result = await this.runGit(['diff', '--name-status', `${safeRef1}..${safeRef2}`]);
    const lines = result.split('\n').filter(Boolean);

    return lines.map(line => {
      const [statusCode, ...fileParts] = line.split('\t');
      const file = fileParts.join('\t'); // Para arquivos renomeados: R100\told\tnew

      let status: FileStatus;
      switch (statusCode[0]) {
        case 'A':
          status = 'added';
          break;
        case 'D':
          status = 'deleted';
          break;
        case 'R':
          status = 'renamed';
          break;
        default:
          status = 'modified';
      }

      return { file, status };
    });
  }

  /**
   * Função para obter o conteúdo de um arquivo em um commit/branch específico.
   * @param ref Referência (commit ou branch).
   * @param filePath Caminho do arquivo.
   * @return Conteúdo do arquivo na referência especificada. Retorna uma string vazia se o arquivo não existir nessa referência.
   * @throws Caso o comando Git falhe por algum motivo retorna uma string vazia.
   * @remarks Este método executa um comando Git para obter o conteúdo de um arquivo em uma referência específica,
   * como um commit ou branch. Se o arquivo não existir nessa referência (por exemplo, se foi adicionado depois
   * ou deletado antes), ele retorna uma string vazia.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const content = await gitService.getFileContent('main', 'src/index.ts');
   * console.log(content);
   * // Conteúdo do arquivo src/index.ts na branch main
   * ```
   */
  async getFileContent (ref: string, filePath: string): Promise<string> {
    try {
      const safeRef = this.validateRef(ref, 'ref');
      const safeFilePath = this.validatePathSpec(filePath);
      return await this.runGit(['show', `${safeRef}:${safeFilePath}`]);
    } catch {
      return ''; // Arquivo não existe nesta referência
    }
  }

  /**
   * Função para obter o diff formatado entre dois commits/branches.
   * @param ref1 Primeira referência.
   * @param ref2 Segunda referência.
   * @param file Arquivo específico (opcional).
   * @return Diferenças formatadas no estilo do comando `git diff`. Se um arquivo específico for fornecido,
   * retorna apenas as diferenças para esse arquivo.
   * @remarks Este método executa um comando Git para obter as diferenças formatadas entre duas referências,
   * como branches ou commits. Se um arquivo específico for fornecido, ele retorna apenas as diferenças para esse arquivo.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const diff = await gitService.getDiff('main', 'feature-x', 'src/index.ts');
   * console.log(diff);
   * // Diferenças formatadas para src/index.ts entre main e feature-x
   * ```
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const diff = await gitService.getDiff('main', 'feature-x');
   * console.log(diff);
   * // Diferenças formatadas para todos os arquivos entre main e feature-x
   * ```
   */
  async getDiff (ref1: string, ref2: string, file?: string): Promise<string> {
    const safeRef1 = this.validateRef(ref1, 'ref1');
    const safeRef2 = this.validateRef(ref2, 'ref2');
    const args = ['diff', `${safeRef1}..${safeRef2}`];

    // Se um arquivo específico for fornecido, adiciona o caminho do arquivo aos argumentos do comando Git
    if (file) {
      args.push('--', this.validatePathSpec(file));
    }

    return this.runGit(args);
  }

  /**
   * Função para obter as diferenças detalhadas de um arquivo entre dois commits.
   * @param ref1 Primeira referência.
   * @param ref2 Segunda referência.
   * @param filePath Caminho do arquivo.
   * @return Objeto FileDiff contendo o nome do arquivo, status de alteração, conteúdo antigo,
   * conteúdo novo e os hunks de diferença.
   * @remarks Este método combina a obtenção do conteúdo antigo e novo do arquivo com o diff
   * formatado para construir um objeto FileDiff detalhado, que inclui o status de alteração
   * (adicionado, modificado, deletado, renomeado) e os hunks de diferença estruturados.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const fileDiff = await gitService.getFileDiff('main', 'feature-x', 'src/index.ts');
   * console.log(fileDiff);
   * // {
   * //   fileName: 'src/index.ts',
   * //   status: 'modified',
   * //   oldContent: 'conteúdo antigo...',
   * //   newContent: 'conteúdo novo...',
   * //   hunks: [ ... ]
   * // }
   * ```
   */
  async getFileDiff (ref1: string, ref2: string, filePath: string): Promise<FileDiff> {
    const safeRef1 = this.validateRef(ref1, 'ref1');
    const safeRef2 = this.validateRef(ref2, 'ref2');
    const safeFilePath = this.validatePathSpec(filePath);

    const [oldContent, newContent, diffOutput, statusResult] = await Promise.all([
      this.getFileContent(safeRef1, safeFilePath),
      this.getFileContent(safeRef2, safeFilePath),
      this.getDiff(safeRef1, safeRef2, safeFilePath),
      this.runGit(['diff', '--name-status', `${safeRef1}..${safeRef2}`, '--', safeFilePath])
    ]);

    // Determinar status
    let status: FileStatus = 'modified';
    if (statusResult) {
      const statusCode = statusResult[0];
      switch (statusCode) {
        case 'A':
          status = 'added';
          break;
        case 'D':
          status = 'deleted';
          break;
        case 'R':
          status = 'renamed';
          break;
      }
    }

    // Parse dos hunks
    const hunks = this.parseDiffHunks(diffOutput);

    return {
      fileName: safeFilePath,
      status,
      oldContent,
      newContent,
      hunks
    };
  }

  /**
   * Função para obter estatísticas de um diff entre dois commits.
   * @param ref1 Primeira referência.
   * @param ref2 Segunda referência.
   * @return Objeto contendo o número total de arquivos alterados, adições e deleções entre as duas referências.
   * @remarks Este método executa o comando `git diff --stat` para obter um resumo das alterações entre duas
   * referências, como branches ou commits. Ele interpreta a última linha da saída para extrair o número total
   * de arquivos alterados, adições e deleções.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const stats = await gitService.getDiffStats('main', 'feature-x');
   * console.log(stats);
   * // {
   * //   files: 5,
   * //   additions: 100,
   * //   deletions: 50
   * // }
   * ```
   */
  async getDiffStats (ref1: string, ref2: string): Promise<{ additions: number; deletions: number; files: number }> {
    const safeRef1 = this.validateRef(ref1, 'ref1');
    const safeRef2 = this.validateRef(ref2, 'ref2');
    const result = await this.runGit(['diff', '--stat', `${safeRef1}..${safeRef2}`]);
    const lastLine = result.split('\n').pop() || '';

    // Parse: " 5 files changed, 100 insertions(+), 50 deletions(-)"
    const filesMatch = lastLine.match(/(\d+) files? changed/);
    const addMatch = lastLine.match(/(\d+) insertions?\(\+\)/);
    const delMatch = lastLine.match(/(\d+) deletions?\(-\)/);

    return {
      files: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      additions: addMatch ? parseInt(addMatch[1], 10) : 0,
      deletions: delMatch ? parseInt(delMatch[1], 10) : 0
    };
  }

  /**
   * Função para obter o nome do branch atual.
   * @return Nome do branch atual. Retorna uma string vazia se não estiver em um branch (ex: detached HEAD).
   * @remarks Este método executa o comando `git branch --show-current` para obter o nome do branch atual.
   * Se o repositório estiver em um estado de detached HEAD, ele retornará uma string vazia.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const currentBranch = await gitService.getCurrentBranch();
   * console.log(currentBranch); // 'main' ou '' se detached HEAD
   * ```
   */
  async getCurrentBranch (): Promise<string> {
    return this.runGit(['branch', '--show-current']);
  }

  /**
   * Função para obter todas as referências disponíveis (branches + tags + commits recentes).
   * @return Lista de referências, incluindo branches locais, remotos, tags e commits recentes.
   * As referências são retornadas em ordem de prioridade: branches locais, branches remotos, tags e commits.
   * @remarks Este método combina a obtenção de branches locais e remotos, tags e commits recentes para fornecer
   * uma lista abrangente de referências disponíveis no repositório. Ele remove duplicatas mantendo a ordem de prioridade.
   * @example
   * ```typescript
   * const gitService = new GitService('/path/to/workspace');
   * const refs = await gitService.getAllRefs();
   * console.log(refs);
   * // [
   * //   'main',
   * //   'feature-x',
   * //   'origin/main',
   * //   'v1.0.0',
   * //   'abc123',
   * //   ...
   * // ]
   * ```
   */
  async getAllRefs (): Promise<string[]> {
    const [branches, tags, commits] = await Promise.all([
      this.runGit(['for-each-ref', '--format=%(refname:short)', 'refs/heads/', 'refs/remotes/']).catch(() => ''),
      this.runGit(['tag']).catch(() => ''),
      this.runGit(['log', '--pretty=format:%h', '-n', '20']).catch(() => '')
    ]);

    const allRefs = [
      ...branches.split('\n').filter(Boolean),
      ...tags.split('\n').filter(Boolean),
      ...commits.split('\n').filter(Boolean)
    ];

    // Remove duplicatas mantendo a ordem
    return [...new Set(allRefs)];
  }
}
