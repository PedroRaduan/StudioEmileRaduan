# Emile Raduan Beauty Face

Sistema de agenda e gestão para um único studio. O projeto possui página pública, agenda administrativa, cadastro de clientes, serviços, disponibilidade, pagamentos manuais, relatórios, permissões e PWA instalável.

Este guia foi escrito para quem está começando. Siga as etapas na ordem e não pule a configuração do banco ou das variáveis de segurança.

## O que já está implementado

- Agenda diária, semanal, mensal e em lista.
- Criação, reagendamento, cancelamento e histórico de atendimentos.
- Proteção contra dois agendamentos no mesmo horário.
- Expediente semanal, intervalos, bloqueios e datas especiais.
- Cadastro de clientes e informações sensíveis criptografadas.
- Serviços, valores, duração, sinal e orientações editáveis.
- Registro manual de pagamentos e sinais.
- Mensagens preparadas para WhatsApp, sem fingir uma automação ativa.
- Relatórios operacionais e financeiros.
- Controle de permissões para administradora e recepcionista.
- Conta separada para clientes e autoagendamento opcional.
- PWA instalável, tela sem conexão e cache de conteúdo não sensível.
- Auditoria, termos versionados e solicitações relacionadas à LGPD.

## O que ainda precisa ser feito antes do uso real

Use esta lista como visão geral. As instruções detalhadas aparecem nas próximas seções.

- [ ] Instalar Node.js 24 LTS.
- [ ] Instalar as dependências com `npm install`.
- [ ] Configurar um PostgreSQL local para desenvolvimento.
- [ ] Criar o arquivo `.env.local` com segredos próprios.
- [ ] Aplicar as migrations e inicializar o banco vazio.
- [ ] Testar o sistema localmente.
- [ ] Colocar o código em um repositório privado no GitHub, GitLab ou Bitbucket.
- [ ] Criar um PostgreSQL gerenciado para produção.
- [ ] Configurar as variáveis no Vercel.
- [ ] Aplicar as migrations no banco de produção.
- [ ] Criar a conta administrativa de produção.
- [ ] Desativar a criação inicial de contas.
- [ ] Preencher os dados reais do studio, serviços e horários.
- [ ] Ativar e testar backups do banco.
- [ ] Revisar termos, política de privacidade e política de cancelamento.

> Nunca use o PostgreSQL do Docker como banco da versão publicada. O endereço `localhost` funciona somente no seu computador.

---

## Parte 1 — Executar no computador

### 1. Instale os programas necessários

Instale:

1. [Node.js 24 LTS](https://nodejs.org/);
2. [Docker Desktop](https://www.docker.com/products/docker-desktop/);
3. [Git](https://git-scm.com/downloads), caso ainda não esteja instalado;
4. Um editor como [Visual Studio Code](https://code.visualstudio.com/).

Depois, abra o PowerShell e confirme as versões:

```powershell
node --version
npm --version
docker --version
git --version
```

O Node deve aparecer como `v24.x.x`. Não execute `npm install -g npm@latest`; use o npm fornecido com o Node 24.

### 2. Abra a pasta do projeto

No PowerShell:

```powershell
cd "C:\Users\Sharif\Downloads\AgendaEmile"
```

### 3. Instale as dependências

```powershell
npm install
```

Se o npm mostrar vulnerabilidades, primeiro execute:

```powershell
npm audit
```

Use `npm audit fix` somente quando a correção não exigir `--force`. Nunca use `npm audit fix --force` sem revisar as mudanças e testar todo o sistema.

### 4. Crie o PostgreSQL local com Docker

Abra o Docker Desktop e espere até ele indicar que está funcionando.

Escolha uma senha exclusiva para o banco local. No comando abaixo, substitua `SUA_SENHA_LOCAL_FORTE` pela senha escolhida, nos dois lugares em que ela aparecer neste tutorial.

```powershell
docker run --name emile-agenda-db `
  -e POSTGRES_USER=emile_app `
  -e POSTGRES_PASSWORD=SUA_SENHA_LOCAL_FORTE `
  -e POSTGRES_DB=emile_agenda `
  -p 127.0.0.1:54329:5432 `
  -v emile-agenda-pgdata:/var/lib/postgresql/data `
  --restart unless-stopped `
  -d postgres:17-alpine
```

Esse comando cria um banco persistente. Fechar o Docker não apaga os dados.

Se o contêiner já existir, não execute `docker run` novamente. Inicie-o com:

```powershell
docker start emile-agenda-db
```

Confira se o banco está ativo:

```powershell
docker ps --filter "name=emile-agenda-db"
```

### 5. Crie as chaves de segurança

Gere o segredo das sessões:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Gere a chave de criptografia dos dados sensíveis:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Guarde os dois resultados temporariamente. Eles são diferentes e não devem ser enviados por mensagem, colocados no GitHub ou exibidos no navegador.

### 6. Crie o arquivo `.env.local`

Faça uma cópia do exemplo:

```powershell
Copy-Item .env.example .env.local
```

Abra `.env.local` no editor e deixe-o semelhante a este modelo:

```dotenv
DATABASE_URL="postgresql://emile_app:SUA_SENHA_LOCAL_FORTE@localhost:54329/emile_agenda"
SESSION_SECRET="COLE_AQUI_O_PRIMEIRO_SEGREDO_GERADO"
SENSITIVE_DATA_KEY="COLE_AQUI_A_CHAVE_BASE64_GERADA"
INITIAL_SETUP_ENABLED="false"
```

Regras importantes:

- a senha do `DATABASE_URL` deve ser a mesma usada no Docker;
- não use os textos de exemplo como segredos;
- não remova as aspas;
- `.env.local` já está ignorado pelo Git e não deve ser enviado ao repositório;
- não use a conexão do banco de produção durante o desenvolvimento comum.

### 7. Prepare o banco local

Valide a configuração:

```powershell
npx prisma validate
```

Aplique todas as migrations:

```powershell
npm run db:migrate
```

Crie apenas as configurações estruturais iniciais, sem clientes, serviços ou agendamentos fictícios:

```powershell
npm run db:seed
```

### 8. Inicie o sistema

```powershell
npm run dev
```

Abra:

- página pública: [http://localhost:3000](http://localhost:3000);
- administração: [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

Quando o banco ainda não possuir administradora, o sistema abrirá a configuração inicial. Informe seu próprio nome, e-mail e uma senha forte diretamente na interface.

### 9. Configure a agenda pela primeira vez

Depois de entrar, siga esta ordem:

1. **Configurações:** informe WhatsApp, endereço, Instagram e textos públicos;
2. **Serviços:** cadastre os procedimentos reais, duração e valores;
3. **Horários semanais:** configure expediente e almoço;
4. **Bloqueios e exceções:** registre folgas e datas especiais;
5. **Clientes:** cadastre uma cliente apenas para seu teste interno;
6. **Agenda:** crie um atendimento e confirme se ele aparece no horário correto.

### 10. Execute as verificações locais

```powershell
npm test
npm run lint
npm run build
npm audit --omit=dev
```

O resultado esperado é:

- testes aprovados;
- lint sem erros;
- build concluído;
- nenhuma vulnerabilidade conhecida em dependências de produção.

---

## Parte 2 — Colocar o código em um repositório

O caminho mais simples para publicar no Vercel é conectar um repositório Git.

### 1. Confirme que segredos não serão enviados

```powershell
git status --short
```

O arquivo `.env.local` não deve aparecer na lista. Nunca use `git add -f` para enviar arquivos `.env`.

### 2. Crie um repositório privado

No GitHub, GitLab ou Bitbucket, crie um repositório vazio e privado. Não adicione README ou `.gitignore` pela página, porque o projeto já possui esses arquivos.

### 3. Envie o código

Substitua `URL_DO_REPOSITORIO` pelo endereço informado pelo provedor:

```powershell
git add .
git commit -m "Preparar agenda para publicação"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Se o remoto `origin` já existir, não execute `git remote add` novamente. Confira com:

```powershell
git remote -v
```

---

## Parte 3 — Criar o PostgreSQL de produção

O Vercel hospeda a aplicação, mas a agenda precisa de um PostgreSQL gerenciado separado. Para iniciantes, uma opção simples é a integração Neon disponível no [Vercel Marketplace](https://vercel.com/marketplace/neon).

### Opção recomendada: Neon pelo Vercel

1. Entre no painel do Vercel;
2. abra **Marketplace**;
3. procure por **Neon**;
4. escolha **Create New Neon Account** se ainda não possuir uma conta;
5. crie o banco na região mais próxima disponível;
6. conecte o banco ao projeto da agenda;
7. confirme que a integração criou a variável `DATABASE_URL`.

O `DATABASE_URL` de produção deve começar com `postgresql://` e normalmente terminar com parâmetros como `sslmode=require`. Nunca coloque esse valor no código.

### Se você criou o Neon separadamente

1. Abra o projeto no painel do Neon;
2. clique em **Connect**;
3. copie a connection string;
4. no Vercel, abra **Project → Settings → Environment Variables**;
5. crie a variável `DATABASE_URL` com a connection string;
6. marque apenas **Production** neste primeiro momento;
7. salve.

Não use o mesmo banco de produção em deploys de Preview. Quando precisar de previews, crie um banco ou branch separado.

---

## Parte 4 — Configurar o projeto no Vercel

### 1. Importe o repositório

1. Entre em [vercel.com](https://vercel.com/);
2. clique em **Add New → Project**;
3. importe o repositório da agenda;
4. confirme o framework **Next.js**;
5. mantenha a pasta raiz como `./`, caso o projeto não esteja dentro de outra pasta;
6. ainda não clique em Deploy até cadastrar as variáveis.

O projeto já fixa o Node em `24.x`, versão LTS suportada pelo Vercel.

### 2. Gere segredos exclusivos para produção

Não reutilize os segredos do `.env.local`.

No PowerShell, gere um novo `SESSION_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Gere uma nova `SENSITIVE_DATA_KEY`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

### 3. Cadastre as variáveis no Vercel

Em **Project → Settings → Environment Variables**, cadastre:

| Nome | Valor | Ambiente inicial |
| --- | --- | --- |
| `DATABASE_URL` | Connection string do PostgreSQL gerenciado | Production |
| `SESSION_SECRET` | Primeiro segredo novo | Production |
| `SENSITIVE_DATA_KEY` | Chave Base64 nova | Production |
| `INITIAL_SETUP_ENABLED` | `true` | Production |

Os valores são segredos. Não use o prefixo `NEXT_PUBLIC_`, pois isso os enviaria ao navegador.

### 4. Configure o comando de build

Em **Project → Settings → Build and Deployment**, use:

```text
npm run build
```

Esse comando aplica migrations pendentes com `prisma migrate deploy` e depois compila o sistema. Não use `prisma migrate dev` em produção.

Mantenha:

- Install Command: `npm install`;
- Framework Preset: `Next.js`;
- Output Directory: padrão do Next.js;
- Node.js Version: `24.x`.

### 5. Faça o primeiro deploy

Clique em **Deploy**. No log, procure por:

- `Database schema is up to date` ou migrations aplicadas;
- `Compiled successfully`;
- `Generating static pages` concluído;
- ausência de `DATABASE_URL` não configurada.

Se você adicionou ou alterou uma variável depois de um deploy, é obrigatório fazer **Redeploy**. Deploys antigos não recebem variáveis novas.

### 6. Inicialize a base de produção

Depois que o deploy e as migrations terminarem, execute o seed uma única vez a partir do seu computador.

No PowerShell, use temporariamente a connection string de produção:

```powershell
$env:DATABASE_URL="COLE_AQUI_A_CONNECTION_STRING_DE_PRODUCAO"
npm run db:seed
Remove-Item Env:DATABASE_URL
```

Esse seed não cria clientes, avaliações, serviços ou agendamentos. Ele cria somente a configuração estrutural e a agenda principal.

Não coloque a connection string de produção no `.env.local` apenas para executar o seed.

### 7. Crie a administradora de produção

1. Abra `https://SEU-DOMINIO/admin/configuracao-inicial`;
2. informe nome, e-mail e uma senha forte;
3. aceite os documentos apresentados;
4. entre no painel;
5. se a interface indicar que o acesso inicial é provisório, abra **Configurações → Acesso administrativo** e torne-o definitivo;
6. não compartilhe essa conta com recepcionistas; crie acessos separados quando necessário.

### 8. Feche a configuração inicial

Assim que a administradora estiver funcionando:

1. abra **Vercel → Project → Settings → Environment Variables**;
2. altere `INITIAL_SETUP_ENABLED` para `false`;
3. salve;
4. faça um novo deploy;
5. confirme que `/admin/configuracao-inicial` redireciona para `/admin/login`.

Essa etapa é obrigatória.

---

## Parte 5 — Configuração antes de cadastrar clientes reais

Dentro da administração, conclua:

- [ ] nome e identidade do studio;
- [ ] WhatsApp, Instagram, e-mail e endereço;
- [ ] serviços reais, valores e duração;
- [ ] horários semanais e intervalos;
- [ ] política de cancelamento e reagendamento;
- [ ] termos e consentimentos revisados juridicamente;
- [ ] mensagens de confirmação e lembrete;
- [ ] regras de sinal e formas de pagamento;
- [ ] permissões dos usuários internos;
- [ ] teste de agendamento, cancelamento e reagendamento;
- [ ] teste em celular Android e iPhone;
- [ ] revisão de contraste, teclado e acessibilidade.

O WhatsApp continua manual até que um provedor oficial seja configurado. O sistema prepara a mensagem e abre a conversa, mas não afirma que houve envio automático.

---

## Parte 6 — Backup e recuperação

Não use o sistema com dados reais sem backup.

1. Ative backups automáticos ou recuperação pontual no provedor PostgreSQL;
2. confira a retenção disponível no plano contratado;
3. restrinja o acesso ao painel do banco;
4. use autenticação em dois fatores no Vercel, Git e provedor do banco;
5. faça um teste de restauração em um banco separado;
6. registre a data, a pessoa responsável e o resultado do teste;
7. repita o teste periodicamente e antes de alterações grandes.

Uma estratégia de backup só é válida quando a restauração já foi testada.

---

## Parte 7 — Instalar como aplicativo no celular

### Android

1. Abra o site publicado no Chrome;
2. toque no menu de três pontos;
3. escolha **Instalar aplicativo** ou **Adicionar à tela inicial**;
4. confirme.

### iPhone

1. Abra o site no Safari;
2. toque em **Compartilhar**;
3. escolha **Adicionar à Tela de Início**;
4. confirme o nome e toque em **Adicionar**.

O site publicado pelo Vercel já utiliza HTTPS, requisito necessário para a PWA.

---

## Solução de problemas

### `Cannot resolve environment variable: DATABASE_URL`

A variável não existe no ambiente em que o comando está sendo executado.

No computador:

- confirme que `.env.local` existe;
- confira o nome exato `DATABASE_URL`;
- confirme que o Docker está ativo;
- execute `npx prisma validate`.

No Vercel:

- abra **Settings → Environment Variables**;
- confirme que `DATABASE_URL` está marcada para Production;
- salve e faça Redeploy.

### Aviso sobre `engines.node`

O projeto deve possuir:

```json
"engines": {
  "node": "24.x"
}
```

Não use `>=22`, pois isso permite que uma nova versão principal seja escolhida automaticamente.

### `npm@latest` não é compatível com a versão do Node

Não atualize o npm globalmente. Instale o Node 24 LTS e use o npm que acompanha essa versão.

### `P1001: Can't reach database server`

- localmente, abra o Docker Desktop e execute `docker start emile-agenda-db`;
- em produção, confira a connection string, o SSL e o status do provedor;
- nunca use `localhost` no Vercel.

### O build funciona localmente, mas falha no Vercel

Confira, nesta ordem:

1. Node `24.x`;
2. `DATABASE_URL` de produção;
3. `SESSION_SECRET`;
4. `SENSITIVE_DATA_KEY`;
5. Build Command `npm run build` (as migrations já são aplicadas automaticamente antes da compilação);
6. novo deploy depois de salvar variáveis.

### O site publicou, mas a administração não abre

- confirme se as migrations foram aplicadas;
- verifique os logs da Function no Vercel;
- confirme se o banco está ativo;
- não exponha o valor das variáveis nos logs;
- se ainda não houver administradora, habilite temporariamente `INITIAL_SETUP_ENABLED=true`, faça o deploy e conclua o primeiro acesso.

### Porta 3000 ocupada

O Next.js poderá escolher outra porta, como `3001`. Use a URL exibida pelo comando `npm run dev`.

---

## Comandos úteis

```powershell
# Desenvolvimento
npm run dev

# Testes
npm test

# Qualidade
npm run lint
npm run build
npm audit --omit=dev

# Banco
npx prisma validate
npm run db:migrate
npm run db:seed

# Docker local
docker start emile-agenda-db
docker stop emile-agenda-db
docker logs --tail 50 emile-agenda-db
```

---

## Integrações ainda pendentes

Dependem de provedores externos e não devem ser tratadas como ativas até serem configuradas:

- envio automático pela WhatsApp Business Platform;
- e-mail transacional;
- SMS;
- Pix dinâmico;
- cartão on-line;
- armazenamento privado de fotos e comprovantes;
- assinatura eletrônica;
- monitoramento externo de erros.

Veja [docs/integracoes-pendentes.md](docs/integracoes-pendentes.md).

## Documentação complementar

- [Manual da dona](docs/manual-da-dona.md)
- [Manual da cliente](docs/manual-da-cliente.md)
- [Checklist de segurança](docs/checklist-seguranca.md)
- [Checklist de LGPD](docs/checklist-lgpd.md)
- [Design system](docs/design-system.md)
- [Integrações pendentes](docs/integracoes-pendentes.md)

## Referências oficiais

- [Vercel — Deploy com repositórios Git](https://vercel.com/docs/git)
- [Vercel — Variáveis de ambiente](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel — Versões do Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel Marketplace — Neon](https://vercel.com/marketplace/neon)
- [Neon — Conexão manual com o Vercel](https://neon.com/docs/guides/vercel-manual)
- [Prisma — Aplicar migrations em produção](https://docs.prisma.io/docs/cli/migrate/deploy)
- [Prisma — Deploy no Vercel](https://docs.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel)

## Observação jurídica

Textos legais, prazos de retenção, bases legais, termos de procedimento e políticas do studio precisam ser revisados por profissional qualificado antes do uso com dados reais.
