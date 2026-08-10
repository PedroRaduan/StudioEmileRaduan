# Arquitetura SaaS

`User` é a identidade global. `Organization` é o tenant. `OrganizationMembership` associa usuário, organização e papel (`OWNER`, `ADMIN`, `STAFF`, `RECEPTIONIST`). A sessão armazena a organização ativa; o middleware de acesso nas Server Actions estabelece esse contexto antes de consultar dados operacionais.

As entidades de agenda, clientes, serviços, pagamentos, disponibilidade, lista de espera e financeiro possuem `organizationId`. O cliente de dados do domínio injeta esse filtro em leitura, alteração e criação; acesso sem contexto falha. O banco recebe índice e chave estrangeira para a organização, e a migration transforma os registros existentes na organização `emile-raduan`.

## Cobrança futura

`Plan`, `Subscription` e `OrganizationFeatureFlag` isolam cobrança e entitlement do restante do produto. Gateways como Stripe, Mercado Pago, Asaas ou Pagar.me devem traduzir webhooks assinados para atualizações idempotentes de `Subscription`, sem adicionar condicionais de pagamento às telas de agenda.

## Variáveis necessárias

- `DATABASE_URL`: conexão PostgreSQL privada.
- `SESSION_SECRET`: segredo exclusivo e longo para HMAC de sessão.
- `APP_URL`: URL HTTPS canônica para links e metadados.
- Provedor SMTP/API de e-mail: necessário para entregar verificação e recuperação em produção.

## Checklist pré-produção

- [ ] Backup e restauração do banco testados antes da migration.
- [ ] `prisma migrate deploy` executado em staging e produção.
- [ ] `APP_URL`, HTTPS, segredo de sessão e e-mail configurados.
- [ ] Testes de dois tenants, recuperação, rate limit e concorrência executados contra banco de staging.
- [ ] CSP, CORS, PWA e cookies conferidos no domínio definitivo.
- [ ] Termos e política revisados juridicamente.
- [ ] Monitoramento, alertas e rotina de backup habilitados.
