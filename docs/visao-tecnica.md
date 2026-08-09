# Visão técnica

## Arquitetura atual

O sistema continua sendo uma única aplicação Next.js para um único studio. Não existem planos, cobrança recorrente, marketplace, painel de superadmin ou cadastro público de empresas.

Fluxo principal do código:

```text
Páginas e componentes React
        ↓
Server Actions e funções de domínio
        ↓
Serviços de agenda, autenticação e permissões
        ↓
Prisma
        ↓
PostgreSQL
```

- `app/admin`: login, configuração inicial e área administrativa.
- `components/admin`: navegação e componentes administrativos reutilizáveis.
- `lib/admin`: consultas mínimas para dashboard, agenda, clientes, serviços, relatórios e configurações.
- `lib/agenda`: regras atômicas de criação, reagendamento, cancelamento e conflito.
- `lib/auth`: senha, sessão, autorização, configuração inicial e limite de tentativas.
- `lib/security`: criptografia, hash e validação de origem.
- `lib/studio-config.ts`: identificador atual, marca e fuso padrão centralizados.
- `prisma`: modelo relacional e migrations versionadas.

A interface não é a fronteira de segurança. As operações administrativas validam sessão, permissão, origem e payload no servidor. O PostgreSQL mantém a restrição final contra intervalos de agenda sobrepostos.

## PWA administrativo

- Manifesto: `/admin/manifest.webmanifest`.
- `start_url`: `/admin`.
- Escopo: `/admin/`.
- Exibição: `standalone`.
- Registro do service worker: somente depois de entrar na área administrativa.
- Script: `/admin-sw.js`, autorizado somente para o escopo `/admin/`.

Navegações administrativas usam rede com `cache: no-store`. Em falha de conexão, apenas `/admin/offline` é exibida. Agenda, clientes, formulários, respostas do servidor e páginas autenticadas não são gravados no Cache Storage. O cache contém somente o fallback sem dados, ícones e arquivos imutáveis de `/_next/static/`.

Quando existe uma versão nova, ela aguarda. A interface avisa a administradora e só recarrega depois que ela escolhe atualizar, evitando perder um formulário em andamento. O registro antigo de `/sw.js` é removido de forma restrita, sem apagar caches de terceiros.

## Segurança implementada

- Argon2id para senhas e comparação dummy contra enumeração por tempo.
- Sessões aleatórias armazenadas como hash no banco.
- Cookie administrativo `HttpOnly`, `SameSite=Lax`, `Secure` em produção e restrito a `/admin`.
- Expiração de sessão, logout no servidor e mensagem previsível de sessão expirada.
- Rate limit por e-mail e por endereço de rede.
- Autorização dentro das funções de dados e Server Actions.
- Validação Zod com allowlist; campos protegidos não são aceitos por espalhamento do payload.
- Prisma parametrizado; nenhuma consulta SQL construída por concatenação de entrada.
- Proteção de origem para ações baseadas em cookie.
- Dados sensíveis da ficha criptografados com AES-GCM.
- Cabeçalhos CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Páginas administrativas com `Cache-Control: private, no-store`.
- Auditoria de ações administrativas sem senhas, tokens ou conteúdo clínico.
- Mensagens genéricas no cliente; stack traces e erros do banco não são expostos pela interface.

A CSP ainda precisa permitir estilos e scripts inline exigidos pela configuração atual do Next.js. Uma evolução futura pode adotar nonce por requisição, desde que seja validada sem quebrar hidratação, PWA ou deploy.

## Variáveis de ambiente

Somente estes nomes são necessários atualmente:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SENSITIVE_DATA_KEY`
- `INITIAL_SETUP_ENABLED`

Nenhuma dessas variáveis usa o prefixo `NEXT_PUBLIC_`. Valores reais nunca devem aparecer em documentação, repositório, logs ou navegador.

## Evolução futura para várias empresas

O domínio já mantém separados usuário, cliente, profissional/recurso, serviço, agendamento e configurações. Marca e identificadores do studio estão centralizados. Isso reduz acoplamento sem introduzir multi-tenancy prematuro.

Quando a comercialização for realmente aprovada, a primeira mudança deve ser introduzir `Organization` e relacionar explicitamente os registros que pertencem a ela. Depois, todas as consultas e constraints deverão receber o escopo da organização, com migração de dados, índices compostos, autorização e testes de isolamento. Não basta adicionar um `tenantId` no frontend. O plano completo está em `SAAS_FUTURE_ROADMAP.md`.
