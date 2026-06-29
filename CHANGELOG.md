# Changelog

Resumo das principais mudanças por versão do projeto.

## v1.1.0 - 2026-06-29

- Renderização sob demanda: a lista de arquivos aparece instantaneamente (colapsada) e o diff de cada arquivo é carregado ao expandir, com pré-carregamento em segundo plano (concorrência limitada), eliminando o congelamento em comparações grandes.
- Correção do bug em que o resultado da comparação era descartado ao trocar de aba e voltar ao painel, agora preservado com `retainContextWhenHidden` e sem reconstrução do HTML ao reexibir.
- Migração da internacionalização para a API oficial `vscode.l10n`, com bundles em `l10n/` (en e pt-br) e campo `l10n` no manifesto, no lugar da solução de i18n própria.
- Remoção da dependência de runtime `diff`, substituída por implementação pura baseada no algoritmo de Myers; a extensão segue sem dependências de runtime.
- Bundler migrado de `webpack` para `esbuild`; gerenciador de pacotes migrado de `npm` para `pnpm`, com ajuste do workflow de publicação.
- Testes reorganizados em modelo híbrido: `Vitest` para a lógica pura e `@vscode/test-cli` para os testes que dependem do host do VS Code.
- README em inglês como principal com versão em português (`README.pt-BR.md`), e adição de opções de apoio (campo `sponsor` no manifesto e `.github/FUNDING.yml`).

## v1.0.6 - 2026-06-28

- Atualização do `dompurify` para `3.4.11`, corrigindo três alertas de segurança do Dependabot (bypass de `SAFE_FOR_TEMPLATES`, persistência de Trusted Types após `clearConfig()` e poluição de `ALLOWED_ATTR` via `setConfig()`).
- Atualização do `js-yaml` para corrigir DoS por complexidade quadrática em merge keys.
- Workflow de publicação refatorado para empacotar uma única vez e publicar o mesmo `.vsix` no Marketplace e Open VSX, com uso de `npx` e `--no-dependencies`.

## v1.0.5 - 2026-05-31

- Reforço de segurança na validação de refs Git, argumentos de comandos e mensagens recebidas do Webview.
- Execução de comandos Git via `execFile`, sem shell, com validação adicional de caminhos e limites.
- Sanitização do conteúdo do Webview com DOMPurify.

## v1.0.4 - 2026-05-31

- Adição de internacionalização em inglês e português brasileiro.
- Inclusão da sidebar para seleção de branches e commits.
- Estrutura inicial do painel de diff, assets de interface e base técnica da extensão.

## v1.0.3 - 2026-05-23

- Correção de vulnerabilidade XSS no Webview e endurecimento do fluxo de renderização.
- Atualização de dependências para eliminar alertas de auditoria.
- Ampliação da suíte de testes e cobertura validada em 100%.

## v1.0.2 - 2026-05-04

- Ajuste de usabilidade na paleta de comandos com mudança de categoria para Ark Compare.

## v1.0.1 - 2026-05-03

- Correções no pipeline de CI/publicação e prevenção de releases duplicadas.
- Ajustes no empacotamento do VSIX e correção da exibição de imagens no Marketplace.
- Refinos no tratamento de erros do serviço Git e atualização de documentação.

## v1.0.0 - 2026-05-02

- Lançamento inicial da extensão com sidebar de comparação, painel de diff lado a lado e comandos principais.
- Suporte a seleção de branches e commits, sincronização de scroll e visualização fullscreen por arquivo.
- Implementação inicial do serviço Git, utilitários e estrutura do projeto.
