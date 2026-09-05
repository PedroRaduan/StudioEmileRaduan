# Interface simplificada — setembro de 2026

- Início: três indicadores de atendimento, agenda de hoje e próximos dias. Removidos ocupação, primeiros passos, ações recomendadas e consultas de oportunidades.
- Oportunidades e lista de espera saíram da navegação; URLs administrativas antigas redirecionam para Agenda. Nenhum registro foi excluído. Regras internas e ofertas já emitidas foram preservadas.
- Tutorial interativo de primeira abertura: demonstração sem criar agendamentos. A exibição é registrada em AuditLog, por usuário e membership, usando autenticação e escopo de tenant existentes. Não depende de localStorage. O fechamento também conta como primeira exibição; falha na persistência oferece nova tentativa.
- Configurações: removido o editor de identidade/contato e conteúdo público. Instalar aplicativo continua acessível.
- Clientes: nome e WhatsApp em destaque; demais dados opcionais recolhidos. Instagram e observações internas removidos do cadastro e observações retiradas do perfil.
- Serviços: nome, duração, valor e cor em destaque; ajustes adicionais recolhidos. Política de cancelamento não é mais editável e não é enviada nas atualizações, preservando texto anteriormente salvo.
- Financeiro: resumo de entradas, despesas e saldo diário, lista de despesas e formulários sob demanda. Trocar de ação não descarta os campos preenchidos. Permissões continuam verificadas no servidor. Totais de despesas e comissões usam agregação completa, independente da lista limitada; dia e campos de data seguem o fuso da empresa.
- Relatórios: removida a seção visual de atividades recentes; auditoria interna continua ativa.
- Landing comercial: demonstração clicável, troca de dia, seleção de horário, microinterações e FAQ expansível. Animações respeitam preferência por movimento reduzido.

Não foram necessárias migrations nem exclusões de dados. Não houve mudança no modelo de pagamentos.

## Verificação

TypeScript, ESLint, build de produção e suíte Vitest. Incluídos testes comportamentais para primeira exibição/autenticação do tutorial, totais financeiros não limitados à listagem, ausência de contexto de empresa e virada de data UTC.
