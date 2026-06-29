/**
 * Constante que mapeia caracteres especiais para suas entidades HTML correspondentes.
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Função que escapa caracteres especiais em uma string para evitar problemas de segurança,
 * como XSS, ao exibir o conteúdo em HTML.
 * @param text A string a ser convertida
 * @returns A string convertida, segura para exibição em HTML
 */
export function escapeHtml (text: string) {
  // Verifica se o texto é nulo ou indefinido e retorna uma string vazia nesse caso.
  if (!text) {
    return '';
  }

  // Substitui os caracteres especiais na string pelos seus equivalentes HTML usando a constante HTML_ESCAPES.
  return text.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

/**
 * Função que gera um nonce aleatório de 32 caracteres, composto por letras maiúsculas, minúsculas e números.
 * @returns Um nonce aleatório de 32 caracteres.
 */
export function getNonce () {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // Itera 32 vezes para gerar um nonce de 32 caracteres.
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
