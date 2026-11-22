# Arquitetura de referência: Robson Connect

## Situação atual (MVP)

React/Vite -> API HTTP Node.js -> armazenamento em JSON. Autenticação por senha scrypt e sessão em memória com cookie HttpOnly. Mensageria simulada. Apenas dados sintéticos.

## Arquitetura para produção local

```
Usuários na LAN -> Reverse proxy HTTPS -> React SPA
                                    -> NestJS REST API
                                         -> PostgreSQL (Prisma)
                                         -> Redis (BullMQ)
                                         -> Worker de campanhas
                                         -> Worker de webhooks Meta
                                         -> Serviço de automações
                                         -> Serviço de conhecimento/IA
                                         -> Serviço de auditoria
```

Meta WhatsApp Cloud API é um serviço externo; a instalação local **não torna o envio offline**. Para recebimento de webhooks da Meta, publicar endpoint HTTPS seguro, protegido e validado, via gateway/reverse proxy apropriado.

## Domínios de dados previstos

- `users`, `roles`, `permissions`, `sessions`, `audit_events`
- `contacts`, `consents`, `tags`, `segments`, `contact_assignments`
- `pipelines`, `stages`, `deals`, `deal_events`
- `campaigns`, `approved_templates`, `campaign_recipients`, `message_attempts`
- `conversations`, `messages`, `webhook_events`, `provider_accounts`
- `automation_flows`, `automation_versions`, `automation_runs`, `automation_steps`
- `knowledge_items`, `knowledge_reviews`, `suggested_answers`
- `erp_sync_jobs`, `erp_customers`, `erp_orders`, `attribution_events`

## Papéis

- Administrador: controla cadastros, segurança, integrações e aprova respostas da base de conhecimento.
- Gerente: gerencia campanhas, operações e indicadores da equipe.
- Vendedor: apenas seus contatos/conversas, com escopo aplicado na API (política a completar antes da produção).

## Mensageria segura

1. Registrar origem e prova do opt-in, propósito, versão e data.
2. Segmentar e deduplicar destinatários; excluir opt-outs e números inválidos.
3. Definir template oficial aprovado para mensagens iniciadas pela empresa.
4. Registrar autorização e agendamento; enfileirar com deduplicação e limites.
5. Enviar pela API oficial com segredos somente no backend.
6. Consumir webhooks validados, conciliar IDs e estados, respeitar opt-out e encaminhamento ao humano.
7. Medir entrega, leitura, resposta, interesse e venda **somente quando houver eventos válidos e integração com ERP**.

## Integração Olist

A ser validada conforme permissões, APIs e modelo de dados da conta da empresa. Não presumir disponibilidade de endpoints. Identificar clientes usando chaves seguras, não aproximar dados comerciais apenas por nome/telefone sem auditoria.

