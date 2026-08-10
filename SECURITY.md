# Segurança

## Princípios

- Toda operação privada começa com sessão, membership ativo e permissão no servidor.
- Registros operacionais são associados a `organizationId`; o cliente Prisma de domínio injeta esse escopo e falha sem tenant ativo.
- Senhas usam Argon2. Tokens de sessão, recuperação e ofertas são aleatórios, armazenados como hash e expiram.

## Controles implementados

- Cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Verificação de origem em Server Actions, validação Zod e proteção contra redirecionamento aberto.
- Rate limiting persistido para autenticação; comparação de senha de usuário inexistente usa hash fictício.
- CSP, anti-framing, HSTS em produção, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- Auditoria de alterações relevantes sem registrar senha, token bruto ou segredo.
- Transações serializáveis nos fluxos de vaga, agendamento, lista de espera e conclusão com baixa de pacote.

## Produção

Antes de abrir o serviço, configure `DATABASE_URL`, `SESSION_SECRET` longo e exclusivo, `APP_URL` HTTPS e um provedor de e-mail. Crie backup testado antes de `prisma migrate deploy`. Use uma conta PostgreSQL com privilégios mínimos e avalie RLS com contexto transacional por tenant antes de conceder acesso direto ao banco.

## Reporte responsável

Não publique vulnerabilidades ou dados de clientes. Envie um relato privado ao responsável pelo produto com passos de reprodução mínimos e sem dados reais.
