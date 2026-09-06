# Agenda, preferências e estoque — 06/09/2026

## Alterações

- Data da agenda acompanha navegação e histórico do navegador; datas inválidas são recusadas. Avançar um mês a partir do dia 31 não pula fevereiro.
- Grade completa de 00:00 até o fim do dia. A abertura rola somente a planilha até o primeiro atendimento não cancelado; sem atendimento, usa o horário atual no fuso do negócio. A marca de hora atual não disputa a rolagem.
- Salvamento semanal: verificação de ownership usa `findUnique` com filtro de organização, preservando chaves compostas. O formulário mantém valores após a resposta e valida almoço dentro do expediente.
- Busca de clientes por nome/apelido com debounce, resultados limitados a 20, seleção explícita e consulta no servidor autenticado/tenantizado. Cliente selecionada por link não depende de estar entre os primeiros 250 cadastros.
- Configurações → Visual da agenda: rosé original, azul, verde, violeta, terracota e grafite. Preferência por negócio, compartilhada entre dispositivos e membros; sem CSS arbitrário. Não é uma preferência individual por membro.
- Termos/consentimentos e modelos de mensagem removidos da navegação e suas páginas editoras redirecionam para configurações. Registros históricos continuam no banco. Políticas públicas e atendimento a solicitações de privacidade foram preservados.

## Estoque → Financeiro

O link **Estoque · compras e materiais** fica no Financeiro. Cadastre o produto e um mínimo para aviso. Quantidades são unidades inteiras: escolha uma unidade consistente no nome (por exemplo, “Luvas — caixa”).

- Compra: incrementa estoque e cria uma `Expense` paga na categoria Estoque, pelo valor **total** informado, na data atual.
- Uso: decrementa quantidade e não cria outra despesa. Não há baixa automática de material por serviço nesta versão.
- Compra de abertura também é despesa: não use esse lançamento para migrar saldos antigos sem uma estratégia contábil específica.
- `FINANCE_VIEW` controla consulta; `FINANCE_MANAGE` controla gravação no servidor. Tenant sempre vem do contexto autenticado.
- Transação única inclui saldo, despesa, movimentação e auditoria. Bloqueio da linha serializa concorrência; chave de idempotência impede duplicação; saldo insuficiente aborta tudo.
- Dinheiro em centavos inteiros; constraints de quantidade/custo; FKs compostas impedem relação de produto/despesa de outra empresa.
- Busca/listagem limitada a 100 produtos; refine pelo nome. Não excluímos produtos nem movimentações financeiras pelo novo fluxo.

## Migration e publicação

`20260906120000_inventory` adiciona `InventoryItem`, `InventoryMovement` e índice composto em `Expense`. Não apaga nem converte registros existentes. `StudioSettings.primaryColor` já existia; cores não precisam de backfill.

O índice de Expense exige planejar a janela de migration em bancos grandes. Faça backup e teste restore antes da migration produtiva. As constraints SQL complementam a modelagem Prisma; não substitua migrations por `db push`.

Execute o [gate de pré-deploy](PREDEPLOY-VALIDATION.md) duas vezes em banco descartável. O build da aplicação **não aprova** sozinho a migration nem os testes de concorrência. O job externo obrigatório de deploy ainda precisa ser configurado no GitHub/Vercel.

Nenhuma migration desta entrega foi aplicada em produção. A execução real de PostgreSQL local está bloqueada pela indisponibilidade do engine Docker. Antes de publicar, validar também em staging autenticado: salvar horários e recarregar, trocar dias/setas/histórico, rolar até 00:00 em dia vazio e ocupado, pesquisar cliente além da primeira página, salvar cores e relogar, compra/uso/erro de saldo, larguras 320/390/768/1280px. A verificação visual autenticada não foi declarada concluída.
