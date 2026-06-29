// =============================================================================
// Types 
// =============================================================================

/**
 * Tipos de status de um arquivo que foi alterado entre dois commits.
 */
export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

/**
 * Tipos de linhas de diferença.
 */
export type DiffLineType = 'add' | 'delete' | 'context';

/**
 * Tipos usados pela UI (sidebar / webview)
 */
export type BranchSlot = 'branch1' | 'branch2';

/**
 * Nó da sidebar, representando um item que pode ser um campo de branch,
 * uma ação de comparação, um grupo de commits ou um commit individual.
 */
export type SidebarNode =
  | { kind: 'branchField'; slot: BranchSlot }
  | { kind: 'compareAction' }
  | { kind: 'commitGroup'; slot: BranchSlot; branch: string }
  | { kind: 'commit'; slot: BranchSlot; branch: string; commit: CommitInfo }
  | { kind: 'info'; label: string; description?: string };

/**
 * Tipos de operações de diff, representando adições, remoções ou igualdade de tokens.
 */
export type Operation = { type: 'equal' | 'add' | 'remove'; token: string };

// =============================================================================
// Interfaces 
// =============================================================================

/**
 * Interface que representa uma linha individual de uma diferença.
 * - `type`: indica se a linha foi adicionada, removida ou é contexto.
 * - `content`: o conteúdo da linha.
 * - `oldLineNumber`: número da linha no arquivo antigo (undefined se for adição).
 * - `newLineNumber`: número da linha no arquivo novo (undefined se for deleção).
 */
export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Interface que representa um bloco de diferenças (hunk) de um diff.
 * - `oldStart`: linha inicial no arquivo antigo.
 * - `oldLines`: quantidade de linhas no arquivo antigo.
 * - `newStart`: linha inicial no arquivo novo.
 * - `newLines`: quantidade de linhas no arquivo novo.
 * - `changes`: array de linhas de diferença neste bloco.
 */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffLine[];
}

/**
 * Interface que representa as diferenças de um arquivo entre dois commits.
 * - `fileName`: nome ou caminho do arquivo.
 * - `status`: status do arquivo (adicionado, modificado, deletado, renomeado).
 * - `oldContent`: conteúdo do arquivo no commit antigo.
 * - `newContent`: conteúdo do arquivo no commit novo.
 * - `hunks`: array de blocos de diferença (hunks) para este arquivo.
 */
export interface FileDiff {
  fileName: string;
  status: FileStatus;
  oldContent: string;
  newContent: string;
  hunks: DiffHunk[];
}

/**
 * Interface que representa informações de um commit do Git.
 * - `hash`: hash curto do commit.
 * - `fullHash`: hash completo do commit.
 * - `message`: mensagem do commit.
 * - `author`: autor do commit.
 * - `date`: data do commit.
 */
export interface CommitInfo {
  hash: string;
  fullHash: string;
  message: string;
  author: string;
  date: string;
}

/**
 * Interface que representa informações sobre um branch do Git.
 * - `name`: nome do branch.
 * - `isCurrent`: se é o branch atual.
 * - `isRemote`: se é um branch remoto.
 */
export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

/**
 * Interface que representa o resultado de uma comparação entre dois commits.
 * - `baseRef`: referência do commit base (antigo).
 * - `compareRef`: referência do commit comparado (novo).
 * - `files`: lista de arquivos com diferenças.
 * - `totalFiles`: total de arquivos alterados.
 * - `totalAdditions`: total de adições.
 * - `totalDeletions`: total de deleções.
 */
export interface CompareResult {
  baseRef: string;
  compareRef: string;
  files: FileDiff[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Interface que representa uma mensagem enviada do webview para a extensão.
 * - `command`: comando da mensagem.
 * - Outros campos podem ser adicionados conforme necessário.
 */
export interface WebviewMessage {
  command: string;
  [key: string]: unknown;
}

/**
 * Interface que representa uma mensagem de comparação enviada do webview.
 * - `command`: comando da mensagem.
 * - `hash1`: hash do primeiro commit.
 * - `hash2`: hash do segundo commit.
 */
export interface CompareMessage extends WebviewMessage {
  command: 'compare';
  hash1: string;
  hash2: string;
}

/**
 * Interface que representa uma mensagem de resultado enviada para o webview.
 * - `command`: comando da mensagem.
 * - `html`: conteúdo HTML do resultado da comparação.
 */
export interface ResultMessage {
  command: 'showResult';
  html: string;
}

/**
 * Interface que representa um segmento contíguo do resultado do diff.
 * - `value`: conteúdo do segmento (concatenação dos tokens).
 * - `added`: verdadeiro se o segmento foi adicionado no texto novo.
 * - `removed`: verdadeiro se o segmento foi removido em relação ao texto antigo.
 * - `count`: quantidade de tokens (linhas ou palavras) que compõem o segmento.
 */
export interface Change {
  value: string;
  added?: boolean;
  removed?: boolean;
  count?: number;
}
