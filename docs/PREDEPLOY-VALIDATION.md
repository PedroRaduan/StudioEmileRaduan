# Validação reproduzível de pré-deploy / staging

## Contrato

`npm run validate:predeploy` só termina com código **0** se migrations, isolamento multi-tenant, concorrência e limpeza das fixtures forem aprovados. Qualquer falha, timeout, relatório ausente ou teste omitido resulta em **exit 1**, sem aprovação. Não publique ignorando esse retorno.

O comando não inicia deploy nem acessa o banco da aplicação. Não é um teste HTTP/E2E de login: exercita o Prisma tenantizado, o serviço real de criação de agendamentos e as constraints do PostgreSQL. A autenticação HTTP, RLS e RBAC de endpoints exigem verificações complementares; não são declarados como cobertos por esta suíte.

## Destino obrigatório: banco exclusivo, sem dados reais

Nunca use produção, uma réplica com dados de clientes ou a base operacional de staging. Provisione **outro banco**, vazio e descartável, com credenciais sem acesso à produção.

| Variável | Obrigatória | Valor |
| --- | --- | --- |
| `VALIDATION_ENV` | Sim | `local`, `ci` ou `staging` |
| `VALIDATION_DATABASE_URL` | Sim | PostgreSQL com usuário `agenda_validation` e banco `agenda_validation` ou `agenda_validation_<sufixo>` |
| `VALIDATION_DB_ACK` | Sim | `dedicated-non-production-database` |
| `VALIDATION_ALLOWED_HOST` | Só remoto | Hostname exato do banco exclusivo de staging, sem esquema/porta |

- Sem variáveis, o comando falha **antes de conectar**. Não existe fallback para `DATABASE_URL`.
- `.env.local` e `.env` não são carregados pelo runner nem pelo Prisma invocado por ele.
- `NODE_ENV=production` e `VERCEL_ENV=production` são recusados.
- Somente loopback é permitido para local/CI. Destino remoto exige `staging`, host exato autorizado e `sslmode=require` ou `verify-full` (normalizado para verificação de certificado).
- URL não aceita parâmetros de redirecionamento de conexão, como `host`, `options`, `user` ou `dbname`. Não use pooler que remapeie usuário/banco.
- Antes de migrations, uma consulta read-only verifica `current_database()` e `current_user`.
- Não é necessário fornecer secrets de sessão, e-mail ou integrações. Uma chave efêmera é criada para o processo.
- Nomes/flags são proteções contra erro operacional, não prova de que um banco é não produtivo. Mantenha credenciais de produção fora do job e aplique isolamento de rede/IAM. Não renomeie um banco real para contornar a proteção.

## Execução local (PowerShell)

Pré-requisitos: Node 24, dependências instaladas com `npm ci` e Docker com engine Linux ativo.

```powershell
docker compose -p agenda-predeploy -f compose.validation.yml up -d --wait
Copy-Item .env.validation.example .env.validation
npm run validate:predeploy:local
if ($LASTEXITCODE -ne 0) { throw "Pré-deploy bloqueado." }
# Segunda execução: verifica repetibilidade no mesmo schema.
npm run validate:predeploy:local
if ($LASTEXITCODE -ne 0) { throw "Pré-deploy bloqueado." }
```

Copie o exemplo somente se ainda não existir seu arquivo local. `.env.validation` é ignorado pelo Git. A porta é **127.0.0.1:54339**, separada do banco de desenvolvimento. O Compose usa PostgreSQL 16 e armazenamento temporário, sem montar volumes da aplicação. CI e local usam a mesma major; se precisar de reprodutibilidade binária estrita, fixe o mesmo digest da imagem nos dois arquivos e atualize-o com os patches de segurança.

Ao terminar, `docker compose -p agenda-predeploy -f compose.validation.yml down` remove **apenas esse ambiente descartável**, incluindo seus dados temporários. Não execute comandos genéricos de prune ou limpeza de outros projetos.

## CI e staging

O workflow `.github/workflows/predeploy-validation.yml` roda em PRs, push em main e acionamento manual. Cria PostgreSQL descartável sem secrets externos, aplica todas as migrations versionadas (sem seed de clientes), executa o gate duas vezes e disponibiliza relatórios JSON por 14 dias. O job possui timeout de 15 minutos; cada subprocesso tem limite de 3 minutos.

Para banco remoto exclusivo de staging, injete as quatro variáveis acima no seu job protegido e execute `npm run validate:predeploy`. A conta SQL precisa aplicar migrations, incluindo `btree_gist`, e manipular fixtures nesse banco, sem privilégios sobre produção. Não rode esse comando dentro do build Vercel com ambiente/credenciais produtivos.

### Tornar o resultado obrigatório antes de publicar

1. Na proteção de branch/ruleset do GitHub, exija o check **Tenant isolation and booking concurrency** e bloqueie merges com falha.
2. No pipeline que publica, faça o job de deploy depender do job de validação (`needs: database-safety` quando no mesmo workflow), sem `continue-on-error`, `|| true` ou `if: always()` no deploy.
3. Se houver deploy automático da Vercel, configure a integração para aguardar checks obrigatórios ou publique por um pipeline dependente do gate. **Um workflow isolado não impede sozinho o auto-deploy da Vercel.**
4. Exija uma aprovação nova para cada revisão de código; não reutilize um relatório antigo.

Essas regras externas de GitHub/Vercel não são alteradas pelo script e precisam ser configuradas pelo responsável pelo deploy.

## Cobertura e fixtures

- Dois usuários sintéticos sem login habilitado, duas organizações, memberships, clientes, serviços, recursos e expediente próprio. Nenhum usuário existente é selecionado.
- A → B e B → A: leitura por ID, alteração, exclusão de clientes/serviços/agendamentos, filtros manipulados e operações em lote.
- Criação de atendimento com cliente, serviço ou recurso estrangeiro é recusada. Controles positivos verificam que o próprio cliente continua acessível.
- Corridas de agendamento com início igual, duração sobreposta e sobreposição apenas de preparo/limpeza. Exatamente um vencedor; a rejeição precisa ser especificamente por conflito.
- Contagem dos registros persistidos depois das corridas, janelas adjacentes válidas e mesmo horário em tenants distintos.
- Inserção direta via Prisma de sistema testa a constraint de exclusão PostgreSQL, sem depender da busca prévia de conflitos da aplicação.
- Gravação e leitura dos dias semanais por chave composta, protegidas por tenant.
- Estoque/financeiro (gate completo): repetição concorrente de compra gera uma despesa; saídas concorrentes não deixam saldo negativo; uso não gera outra despesa; outro tenant e perfil STAFF são recusados.
- Criação das fixtures é transacional. A limpeza usa somente IDs de organizações/usuários criados pela execução, remove filhos primeiro e falha se não conseguir concluir. Não há reset de schema ou banco.

Os scripts antigos `test:integration` e `test:tenant-isolation` passam pelo mesmo bloqueio de segurança e executam uma suíte parcial. O relatório parcial contém `predeployApproved: false`; **não substitui o gate completo**.

## Relatórios e falhas

Cada execução produz `outputs/predeploy/<UUID>.json`, com destino sem credenciais, tempos, suíte, etapas, status e `predeployApproved`. Diretório ignorado pelo Git. Logs de processos Prisma, URLs completas, SQL e stack traces não são copiados para o relatório.

Se a conexão, migration, autorização, constraint ou limpeza falhar, corrija a causa e repita o comando completo. Erros inesperados são resumidos para não expor dados. Se o processo for morto/timeout antes do finally, a limpeza não é garantida: descarte apenas o container/banco de validação e recrie-o. Nunca use produção como alternativa a um Docker indisponível.

## Verificação desta implementação (06/09/2026)

- 125 testes unitários aprovados, incluindo proteção do destino/gate, navegação da agenda, valores de estoque e gravação financeira.
- ESLint, TypeScript e build local aprovados.
- Execuções sem configuração e com banco local indisponível retornaram exit 1 e relatório `predeployApproved: false`.
- A integração real com PostgreSQL ainda não foi executada neste computador: o engine Docker está indisponível. O workflow também precisa rodar no repositório antes de considerar o gate aprovado. Nenhum banco de produção foi usado.
