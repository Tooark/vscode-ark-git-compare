import * as vscode from 'vscode';

/**
 * Dicionário de mensagens para internacionalização (i18n).
 * As chaves são os identificadores das mensagens, e os valores são as traduções
 * correspondentes para cada localidade suportada.
 */
const MESSAGES: Record<string, Record<string, string>> = {
	'en-us': {
		'panel.title': 'Git Compare',
		'sidebar.initError': 'Git Compare: could not initialize the sidebar ({message}).',
		'sidebar.openGitRepo': 'Open a Git repository to select branches.',
		'sidebar.currentBranch': 'current branch',
		'sidebar.selectBranch1': 'Select branch 1',
		'sidebar.selectBranch2': 'Select branch 2',
		'sidebar.selectBeforeCompare': 'Select branch 1 and branch 2 before comparing.',
		'sidebar.branchLabel1': 'Branch 1: {branch}',
		'sidebar.branchLabel2': 'Branch 2: {branch}',
		'sidebar.selectPlaceholder': '(select)',
		'sidebar.commitDescription': 'commit {hash}',
		'sidebar.branchHeadDescription': 'branch HEAD',
		'sidebar.compareSelectedRefs': 'Compare',
		'sidebar.compareCommandTitle': 'Compare',
		'sidebar.commitGroup1': 'Commits branch 1 ({branch})',
		'sidebar.commitGroup2': 'Commits branch 2 ({branch})',
		'sidebar.selected': 'selected',
		'sidebar.branchTooltip': 'Branch: {branch}',
		'sidebar.noWorkspace': 'No workspace opened',
		'sidebar.openFolderWithGit': 'Open a folder with Git',
		'sidebar.repoNotFound': 'Git repository not found',
		'sidebar.initOrOpenRepo': 'Initialize or open a repository',
		'sidebar.noCommits': 'No commits to display',
		'sidebar.branchPrefix': 'branch: {branch}',
		'webview.noWorkspaceTitle': 'No workspace opened',
		'webview.noWorkspaceDescription': 'Open a folder with a Git repository to continue.',
		'webview.notGitRepoTitle': 'Not a Git repository',
		'webview.notGitRepoDescription': 'The current directory is not a valid Git repository.',
		'webview.baseRef': 'Base Branch/Commit:',
		'webview.compareRef': 'Compare Branch/Commit:',
		'webview.compare': 'Compare',
		'webview.emptyResultTitle': 'Comparison Result',
		'webview.emptyResultDescription': 'Select two branches or commits to compare.',
		'webview.loadBranchesErrorTitle': 'Error loading branches',
		'webview.loadingDiff': 'Loading differences...',
		'webview.noDiffTitle': 'No differences found',
		'webview.noDiffDescription': 'The refs <strong>{hash1}</strong> and <strong>{hash2}</strong> are identical.',
		'webview.statsFiles': 'changed files',
		'webview.statsAdditions': 'additions',
		'webview.statsDeletions': 'deletions',
		'webview.searchFile': '🔍 Search file...',
		'webview.getDiffErrorTitle': 'Error getting differences:',
		'webview.fileMissing': '[File does not exist]',
		'webview.loadError': '[Load error]',
		'webview.statusAdded': 'Added',
		'webview.statusDeleted': 'Removed',
		'webview.statusModified': 'Modified',
		'webview.statusRenamed': 'Renamed',
		'webview.statusError': 'Error',
		'webview.toggleTitle': 'Collapse/Expand',
		'webview.fullscreenEnter': 'Expand to fullscreen',
		'extension.invalidCompareArgs': 'Git Compare: invalid comparison arguments.',
		'extension.invalidBranchSlot': 'Git Compare: invalid branch slot.',
		'extension.invalidCommitArgs': 'Git Compare: invalid commit arguments.',
		'webview.invalidMessage': 'Git Compare: invalid message received from webview.',
		'webview.unknownError': 'Unknown error.',
		'webview.lang': 'en'
	},
	'pt-br': {
		'panel.title': 'Git Compare',
		'sidebar.initError': 'Git Compare: nao foi possível inicializar a sidebar ({message}).',
		'sidebar.openGitRepo': 'Abra um repositório Git para selecionar branches.',
		'sidebar.currentBranch': 'branch atual',
		'sidebar.selectBranch1': 'Selecione a branch 1',
		'sidebar.selectBranch2': 'Selecione a branch 2',
		'sidebar.selectBeforeCompare': 'Selecione branch 1 e branch 2 antes de comparar.',
		'sidebar.branchLabel1': 'Branch 1: {branch}',
		'sidebar.branchLabel2': 'Branch 2: {branch}',
		'sidebar.selectPlaceholder': '(selecionar)',
		'sidebar.commitDescription': 'commit {hash}',
		'sidebar.branchHeadDescription': 'HEAD da branch',
		'sidebar.compareSelectedRefs': 'Comparar',
		'sidebar.compareCommandTitle': 'Comparar',
		'sidebar.commitGroup1': 'Commits branch 1 ({branch})',
		'sidebar.commitGroup2': 'Commits branch 2 ({branch})',
		'sidebar.selected': 'selecionado',
		'sidebar.branchTooltip': 'Branch: {branch}',
		'sidebar.noWorkspace': 'Nenhum workspace aberto',
		'sidebar.openFolderWithGit': 'Abra uma pasta com Git',
		'sidebar.repoNotFound': 'Repositório Git nao encontrado',
		'sidebar.initOrOpenRepo': 'Inicialize ou abra um repo',
		'sidebar.noCommits': 'Sem commits para exibir',
		'sidebar.branchPrefix': 'branch: {branch}',
		'webview.noWorkspaceTitle': 'Nenhum workspace aberto',
		'webview.noWorkspaceDescription': 'Abra uma pasta com um repositório Git para continuar.',
		'webview.notGitRepoTitle': 'Nao e um repositório Git',
		'webview.notGitRepoDescription': 'O diretório atual nao e um repositório Git valido.',
		'webview.baseRef': 'Branch/Commit Base:',
		'webview.compareRef': 'Branch/Commit Comparar:',
		'webview.compare': 'Comparar',
		'webview.emptyResultTitle': 'Resultado da Comparação',
		'webview.emptyResultDescription': 'Selecione dois branches ou commits para comparar.',
		'webview.loadBranchesErrorTitle': 'Erro ao carregar branches',
		'webview.loadingDiff': 'Carregando diferenças...',
		'webview.noDiffTitle': 'Nenhuma diferença encontrada',
		'webview.noDiffDescription': 'Os refs <strong>{hash1}</strong> e <strong>{hash2}</strong> sao idênticos.',
		'webview.statsFiles': 'arquivos alterados',
		'webview.statsAdditions': 'adições',
		'webview.statsDeletions': 'deleções',
		'webview.searchFile': '🔍 Procurar arquivo...',
		'webview.getDiffErrorTitle': 'Erro ao obter diferenças:',
		'webview.fileMissing': '[Arquivo nao existe]',
		'webview.loadError': '[Erro ao carregar]',
		'webview.statusAdded': 'Adicionado',
		'webview.statusDeleted': 'Removido',
		'webview.statusModified': 'Modificado',
		'webview.statusRenamed': 'Renomeado',
		'webview.statusError': 'Erro',
		'webview.toggleTitle': 'Colapsar/Expandir',
		'webview.fullscreenEnter': 'Expandir em tela cheia',
		'extension.invalidCompareArgs': 'Git Compare: argumentos de comparação inválidos.',
		'extension.invalidBranchSlot': 'Git Compare: slot de branch inválido.',
		'extension.invalidCommitArgs': 'Git Compare: argumentos de commit inválidos.',
		'webview.invalidMessage': 'Git Compare: mensagem inválida recebida da webview.',
		'webview.unknownError': 'Erro desconhecido.',
		'webview.lang': 'pt-br'
	}
};

/**
 * Obtém o código de localidade do usuário (ex: 'en-us', 'pt-br').
 * 
 * @returns O código de localidade a ser usado para mensagens. Retorna 'pt-br' para português do Brasil, e 'en-us' para outros casos.
 */
export function getLocale(): string {
	const language = vscode.env.language.toLowerCase();

	return language.startsWith('pt-br') ? 'pt-br' : 'en-us';
}

/**
 * Obtém a mensagem localizada para a chave fornecida, substituindo os tokens pelos valores correspondentes.
 * 
 * @param key A chave da mensagem a ser localizada (ex: 'sidebar.openGitRepo').
 * @param vars Um objeto opcional contendo os valores para substituir os tokens na mensagem (ex: { branch: 'main' }).
 * @returns A mensagem localizada com os tokens substituídos pelos valores fornecidos.
 */
export function t(key: string, vars: Record<string, string> = {}): string {
	const locale = getLocale();
	const fallback = MESSAGES['en-us'][key] || key;
	const message = (MESSAGES[locale] && MESSAGES[locale][key]) || fallback;

	return message.replace(/\{(\w+)\}/g, (_, token: string) => vars[token] ?? `{${token}}`);
}
