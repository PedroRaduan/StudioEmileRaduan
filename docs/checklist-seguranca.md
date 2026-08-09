# Checklist de segurança

- [x] Senhas com Argon2id; não há senha padrão ou credencial no código.
- [x] Sessões no banco, cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- [x] Login limitado por identificador e também por endereço de rede, com índices próprios no banco.
- [x] Ações privadas verificam sessão e origem no servidor.
- [x] Validação de entrada com Zod e queries tipadas pelo Prisma.
- [x] Auditoria de criação de cliente, serviço, horário, status, pagamento e configurações.
- [x] CSP, HSTS, proteção contra enquadramento, `nosniff`, política de referência e cache privado `no-store` nas rotas administrativas.
- [x] Service worker com escopo `/admin/`, navegação `network-only` e cache somente de ícones, fallback e arquivos estáticos.
- [x] Exclusão de intervalos no PostgreSQL para impedir conflito de agenda.
- [x] Segredos somente por variáveis de ambiente.
- [ ] Ativar 2FA quando a dona fornecer o aplicativo autenticador escolhido.
- [ ] Monitoramento de erros, alertas e rotina de restauração antes da publicação.
- [ ] Revisar dependências periodicamente com `npm audit` e atualizar correções compatíveis.

Não use `.env` em repositórios, mensagens, capturas de tela ou suporte técnico.
