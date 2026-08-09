# Roadmap futuro para SaaS

Este documento é somente planejamento. Nenhuma das fases abaixo está ativa no produto atual.

## Fase 1 — Sistema interno atual

Consolidar o uso por um único studio, com agenda, clientes, serviços, segurança, PWA administrativo, backup e operação estável.

## Fase 2 — Introdução formal de Organization/Tenant

Criar a entidade `Organization`, associar o studio existente a ela e planejar uma migração retrocompatível. Ainda sem cadastro público ou cobrança.

## Fase 3 — Isolamento completo dos dados por tenant

Adicionar escopo obrigatório às entidades do negócio, índices e constraints compostas; revisar consultas, jobs, arquivos, auditoria e testes contra vazamento entre organizações.

## Fase 4 — Sistema de usuários e permissões

Formalizar proprietário, administrador, recepcionista e profissional por organização, com convites, revogação e menor privilégio.

## Fase 5 — White-label

Permitir nome, logo, ícones, cores, domínio e textos por organização usando tokens e configurações centralizadas.

## Fase 6 — Planos e limites

Definir recursos e limites comerciais somente depois de medir o uso real e validar o modelo de negócio.

## Fase 7 — Cobrança recorrente

Integrar um provedor de pagamentos, webhooks assinados, idempotência, reconciliação, inadimplência e auditoria financeira.

## Fase 8 — Onboarding de empresas

Criar cadastro, verificação, configuração guiada, importação e checklists próprios para novos estabelecimentos.

## Fase 9 — Painel de gerenciamento da plataforma

Adicionar operação interna com acesso fortemente auditado, suporte seguro, métricas e ferramentas que não permitam leitura indiscriminada de dados dos clientes.

## Fase 10 — Produto SaaS comercial

Validar escala, observabilidade, suporte, termos comerciais, portabilidade, recuperação de desastre e requisitos legais antes do lançamento amplo.
