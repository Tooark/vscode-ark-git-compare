import { Change, Operation } from "./types";
export { Change, Operation } from "./types";

/**
 * Função que implementa o algoritmo de diff de Myers para calcular as diferenças
 * entre duas sequências de tokens.
 * @param oldToken Sequência de tokens do texto antigo.
 * @param newToken Sequência de tokens do texto novo.
 * @returns Lista de operações {@link Operation} representando as diferenças.
 */
function myersDiff (oldToken: string[], newToken: string[]): Operation[] {
  const oldLength = oldToken.length;
  const newLength = newToken.length;
  const max = oldLength + newLength;

  // Cria uma variável Int32Array para armazenar os valores de x para cada diagonal k,
  // com tamanho suficiente para cobrir todas as diagonais possíveis.
  const value = new Int32Array(2 * max + 1);

  // Array para armazenar o histórico de valores de x em cada nível de profundidade d.
  const trace: Int32Array[] = [];

  // Inicializa a variável found para indicar se uma solução foi encontrada.
  let found = -1;

  // Itera sobre os níveis de profundidade d, procurando a menor diferença possível.
  for (let d = 0; d <= max && found === -1; d++) {
    // Armazena o estado atual de value no histórico trace.
    trace.push(value.slice());

    // Itera sobre as diagonais k possíveis para o nível de profundidade d.
    for (let k = -d; k <= d; k += 2) {
      let x: number;

      // Verifica se a diagonal k é a primeira ou se o valor de x na diagonal k-1
      // é menor que o valor de x na diagonal k+1.
      if (k === -d || (k !== d && value[max + k - 1] < value[max + k + 1])) {
        x = value[max + k + 1];
      } else {
        x = value[max + k - 1] + 1;
      }

      let y = x - k;

      // Itera enquanto os tokens nas posições x e y forem iguais, avançando nas duas sequências.
      while (x < oldLength && y < newLength && oldToken[x] === newToken[y]) {
        x++;
        y++;
      }

      value[max + k] = x;

      // Verifica se a solução foi encontrada, ou seja, se ambos os índices x e y atingiram o final das sequências.
      if (x >= oldLength && y >= newLength) {
        found = d;
        break;
      }
    }
  }

  // Reconstrói as operações andando do fim para o início e depois invertendo.
  const ops: Operation[] = [];
  let x = oldLength;
  let y = newLength;

  // Itera sobre os níveis de profundidade encontrados, reconstruindo as operações de diff.
  for (let d = found; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;

    let prevK: number;

    // Verifica se a diagonal k é a primeira ou se o valor de x na diagonal k-1
    // é menor que o valor de x na diagonal k+1, determinando a diagonal anterior.
    if (k === -d || (k !== d && vPrev[max + k - 1] < vPrev[max + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = vPrev[max + prevK];
    const prevY = prevX - prevK;

    // Iteração diagonal: enquanto x e y forem maiores que os valores anteriores, adiciona operações de igualdade.
    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', token: oldToken[x - 1] });
      x--;
      y--;
    }

    // Verifica se houve uma adição ou remoção, adicionando a operação correspondente.
    if (x === prevX) {
      ops.push({ type: 'add', token: newToken[y - 1] });
      y--;
    } else {
      ops.push({ type: 'remove', token: oldToken[x - 1] });
      x--;
    }
  }

  // Itera sobre os tokens restantes, adicionando operações de igualdade até que ambos os índices x e y sejam zero.
  while (x > 0 && y > 0) {
    ops.push({ type: 'equal', token: oldToken[x - 1] });
    x--;
    y--;
  }

  ops.reverse();

  return ops;
}

/**
 * Função que constrói uma lista de mudanças a partir de uma lista de operações de diff.
 * @param ops Lista de operações {@link Operation} representando as diferenças.
 * @returns Lista de mudanças {@link Change} representando o resultado do diff.
 */
function buildChanges (ops: Operation[]): Change[] {
  const changes: Change[] = [];
  let i = 0;

  // Itera sobre as operações de diff, agrupando operações consecutivas do mesmo tipo em uma única mudança.
  while (i < ops.length) {
    // Verifica se a operação atual é de igualdade.
    if (ops[i].type === 'equal') {
      let value = '';
      let count = 0;

      // Itera enquanto as operações consecutivas forem de igualdade.
      while (i < ops.length && ops[i].type === 'equal') {
        value += ops[i].token;
        count++;
        i++;
      }

      changes.push({ value, count });

      continue;
    }

    // Região alterada: acumula remoções e adições consecutivas separadamente.
    let removedValue = '';
    let removedCount = 0;
    let addedValue = '';
    let addedCount = 0;

    // Itera enquanto as operações consecutivas não forem de igualdade.
    while (i < ops.length && ops[i].type !== 'equal') {
      // Verifica se a operação atual é de remoção.
      if (ops[i].type === 'remove') {
        removedValue += ops[i].token;
        removedCount++;
      } else {
        addedValue += ops[i].token;
        addedCount++;
      }

      i++;
    }

    // Verifica se houve remoções.
    if (removedCount > 0) {
      changes.push({ value: removedValue, removed: true, count: removedCount });
    }

    // Verifica se houve adições.
    if (addedCount > 0) {
      changes.push({ value: addedValue, added: true, count: addedCount });
    }
  }

  return changes;
}

/**
 * Função que quebra um texto em tokens de linha, preservando as quebras de linha.
 * Cada linha, incluindo a quebra de linha, é considerada um token.
 * @param text Texto a ser tokenizado.
 * @returns Lista de tokens de linha.
 */
function tokenizeLines (text: string): string[] {
  // Verifica se o texto está vazio, retornando um array vazio de tokens.
  if (text === '') {
    return [];
  }

  const parts = text.split('\n');
  const tokens: string[] = [];

  // Itera sobre as partes do texto, adicionando cada linha como um token, incluindo a quebra de linha.
  for (let i = 0; i < parts.length; i++) {
    // Verifica se não é a última linha ou se a última linha não está vazia.
    if (i < parts.length - 1) {
      tokens.push(parts[i] + '\n');
    } else {
      // Verifica se a última linha não está vazia, adicionando-a como um token sem quebra de linha.
      if (parts[i] !== '') {
        tokens.push(parts[i]);
      }
    }
  }

  return tokens;
}

/**
 * Função que quebra um texto em tokens de palavra, preservando os espaços em branco.
 * Cada run de espaços, de caracteres de palavra (letras/dígitos/_) ou de pontuação vira um token.
 * @param text Texto a ser tokenizado.
 * @returns Lista de tokens de palavra.
 */
function tokenizeWordsWithSpace (text: string): string[] {
  // Usa uma expressão regular para dividir o texto em tokens de palavra, preservando os espaços em branco.
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu) ?? [];
}

/**
 * Função que calcula o diff por linhas entre dois textos, retornando uma lista de mudanças.
 * @param oldStr Conteúdo antigo.
 * @param newStr Conteúdo novo.
 * @returns Lista de segmentos {@link Change} (contexto, removido e adicionado).
 */
export function diffLines (oldStr: string, newStr: string): Change[] {
  return buildChanges(myersDiff(tokenizeLines(oldStr), tokenizeLines(newStr)));
}

/**
 * Função que calcula o diff por palavras entre dois textos, preservando os espaços em branco,
 * e retornando uma lista de mudanças.
 * @param oldStr Texto antigo.
 * @param newStr Texto novo.
 * @returns Lista de segmentos {@link Change} (contexto, removido e adicionado).
 */
export function diffWordsWithSpace (oldStr: string, newStr: string): Change[] {
  return buildChanges(myersDiff(tokenizeWordsWithSpace(oldStr), tokenizeWordsWithSpace(newStr)));
}
