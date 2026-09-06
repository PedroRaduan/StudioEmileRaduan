# Tutorial interativo

O primeiro acesso apresenta o guia uma vez por membership, usando o registro de exibição já existente. Configurações → Personalizar com o tutorial permite reabrir manualmente.

Quatro etapas: identidade (nome e seis cores), intervalo da grade, simulação de atendimento e revisão/aplicação. As prévias não são gravadas automaticamente. Apenas o proprietário pode aplicar nome de exibição, cor e intervalo no StudioSettings do tenant autenticado. A ação valida origem, autorização e schema estrito; alterações são transacionais e auditadas. Não altera expediente, serviços, organização jurídica ou dados de clientes.

A simulação é estado React em memória: reservar, confirmar, reagendar, cancelar, concluir e reiniciar. Não chama ações reais de agendamento, pagamentos ou estoque; os dados são identificados como exemplos. Fechar sem aplicar descarta a prévia. Políticas de primeira exibição e erros de persistência continuam explícitas.

Dialog nativo com Escape, foco no título a cada etapa, inputs rotulados, feedback de erro/sucesso, layout de uma coluna no celular e duas no desktop. Transições de 180–220ms são habilitadas somente sem preferência por movimento reduzido. Nenhuma migration ou nova biblioteca.

Testes: schema/fields extras, permissão/origem, tenant confiável, erro seguro e transições válidas/inválidas da simulação. Antes de publicar, conferir em staging autenticado o salvamento/recarregamento, primeira visita/reabertura, teclado, larguras 320/390/768/1280 e movimento reduzido. O banco de produção não deve ser usado para essa validação.
