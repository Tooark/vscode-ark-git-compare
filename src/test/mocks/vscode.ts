/**
 * Mock mínimo do módulo `vscode` para os testes unitários executados no Vitest (Node),
 * onde o módulo real não existe. Implementa apenas a superfície da API consumida pela
 * lógica pura sob teste — hoje, `l10n.t` (usado pelo diffRenderer) e `env.language`.
 *
 * Os testes que exercitam a integração real com o host (extension, gitComparePanel,
 * sidebarProvider) NÃO usam este mock: rodam no @vscode/test-cli com a API real.
 */

/**
 * Reproduz o comportamento de substituição de `vscode.l10n.t`:
 * - placeholders nomeados `{chave}` quando `args` é um objeto;
 * - placeholders posicionais `{0}` quando `args` são valores soltos/array.
 * Para o locale padrão (sem bundle), retorna a própria mensagem com os args injetados.
 */
function t(message: string, ...args: Array<string | number | boolean> | [Record<string, string | number | boolean>]): string {
	const first = args[0];

	// Forma com Record: substitui {nome} pelos valores do objeto.
	if (args.length === 1 && first !== null && typeof first === 'object' && !Array.isArray(first)) {
		const record = first as Record<string, string | number | boolean>;
		return message.replace(/\{(\w+)\}/g, (_, key: string) => (key in record ? String(record[key]) : `{${key}}`));
	}

	// Forma posicional: aceita lista de args ou um único array.
	const positional = (args.length === 1 && Array.isArray(first) ? first : args) as Array<string | number | boolean>;
	return message.replace(/\{(\d+)\}/g, (_, index: string) => {
		const value = positional[Number(index)];
		return value !== undefined ? String(value) : `{${index}}`;
	});
}

export const l10n = { t };

export const env = { language: 'en' };
