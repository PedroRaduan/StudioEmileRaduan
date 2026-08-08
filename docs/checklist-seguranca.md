# Checklist de segurança

- [x] Senhas com Argon2id; não há senha padrão ou credencial no código.
- [x] Sessões no banco, cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- [x] Login limitado a cinco falhas por identificador em dez minutos.
- [x] Ações privadas verificam sessão e origem no servidor.
- [x] Validação de entrada com Zod e queries tipadas pelo Prisma.
- [x] Auditoria de criação de cliente, serviço, horário, status, pagamento e configurações.
- [x] Cabeçalhos de segurança, HTTPS obrigatório no Vercel e cache sem dados privados.
- [x] Exclusão de intervalos no PostgreSQL para impedir conflito de agenda.
- [x] Segredos somente por variáveis de ambiente.
- [ ] Ativar 2FA quando a dona fornecer o aplicativo autenticador escolhido.
- [ ] Monitoramento de erros, alertas e rotina de restauração antes da publicação.
- [ ] Revisar dependências periodicamente com `npm audit` e atualizar correções compatíveis.

Não use `.env` em repositórios, mensagens, capturas de tela ou suporte técnico.
