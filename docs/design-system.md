# Design system — Emile Raduan Beauty Face

## Princípios

- Calma, clareza e proximidade. A interface prioriza o próximo passo, não efeitos decorativos.
- Informações operacionais usam densidade moderada; a página pública privilegia leitura e respiro.
- Toda ação importante recebe rótulo claro, foco visível e retorno de sucesso ou erro.

## Tokens

| Uso | Token | Valor |
|---|---|---|
| Fundo principal | `--canvas` | `#FAF7F3` |
| Superfície | `--surface` | `#FFFFFF` |
| Texto principal | `--ink` | `#302623` |
| Texto secundário | `--ink-muted` | `#746863` |
| Destaque | `--rose` | `#9A5B67` |
| Destaque escuro | `--rose-dark` | `#77434D` |
| Sucesso | `--success` | `#28755D` |
| Erro | `--danger` | `#AC3F46` |

Tipografia: serif editorial para títulos e interface sem serifa do sistema para conteúdo. Espaços principais: 8, 12, 16, 20, 24, 32, 48, 64 e 128 px. Botões têm altura mínima de 48 px e campos 47 px.

## Componentes

- Botão primário: ação de confirmação. Botão claro: contexto escuro. Link textual: ações secundárias.
- Campo: label sempre visível, foco em rosa e erro textual acima da ação.
- Card: apenas para agrupar blocos administrativos independentes; borda discreta, sem sombras pesadas.
- Estado vazio: explica a ausência e sugere uma ação possível.
- Agenda: status descritos por texto e cor; cor nunca é a única forma de informação.
- Navegação: barra lateral em desktop e menu com toque confortável em telas menores.
