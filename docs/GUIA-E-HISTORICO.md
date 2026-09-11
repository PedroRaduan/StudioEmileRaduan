# Guia simples e consulta de histórico — 10/09/2026

O guia de primeira abertura agora tem três orientações: criar atendimento, consultar Histórico e configurar a agenda. Não possui campos, personalização ou simulação. Pode ser fechado a qualquer momento e reaberto em Configurações → Guia rápido. Preserva o registro de primeira exibição por membership. Usa CSS Module próprio, sem depender das classes globais do tutorial anterior.

## Correções de histórico

- A tela inicial mostrava somente hoje e próximos dias. Foi acrescentado um atalho explícito para consultar agendamentos anteriores.
- A nova aba Histórico consulta 30 dias até a data escolhida, incluindo todos os status. As setas avançam/retrocedem 30 dias contíguos. Lista continua voltada à frente, agora ancorada exatamente na data selecionada, sem realinhar a segunda-feira e deixar lacunas entre páginas.
- A grade só listava recursos ativos: registros vinculados a um profissional desativado eram buscados, mas não ganhavam coluna. Agora recursos desativados com atendimentos/bloqueios no dia também aparecem, identificados como históricos e sem permitir criação de novos horários nessa coluna.
- A consulta diária usa sobreposição de intervalo para incluir atendimentos iniciados na véspera que atravessam a meia-noite.
- Cancelados ficam em uma seção recolhível antes da grade; não é preciso rolar 24 horas para encontrá-los.

Não há migração, exclusão, reativação de profissionais nem alteração de agendamentos. Autorização e Prisma tenantizado foram preservados; filtros relacionais históricos também incluem a organização autenticada. Essas causas foram identificadas no código; não foi feita inspeção de dados produtivos para afirmar qual delas atingiu a conta do usuário.

## Validação

141 testes automatizados passaram, incluindo filtros históricos, datas passadas, períodos contíguos, recursos desativados e exigência de autorização. A prévia visual isolada do componente real foi conferida em desktop e 320px, com navegação e fechamento; a ação de registrar exibição foi substituída somente nessa prévia temporária, fora das rotas da aplicação. Não acessa banco.

Antes de publicar, confirmar os registros reais em staging autorizado. Os testes de integração PostgreSQL e as condições de pré-deploy documentadas anteriormente continuam necessários. Não interpretar testes unitários como validação do banco de produção.
