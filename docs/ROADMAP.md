# Roadmap de implementação

## Fase 0 — demonstração local (entrega deste ZIP)
- [x] UI responsiva e navegação dos nove módulos
- [x] Acesso administrador e cadastro de usuários
- [x] CRM Kanban e pipeline
- [x] Campanhas SEM envios reais
- [x] Fluxos por palavra-chave e simulação
- [x] Base de conhecimento com aprovação
- [x] Relatórios com indicadores demonstrativos
- [x] Dockerfile + Compose para Windows
- [ ] Compilação do front-end verificada neste ambiente (dependências npm indisponíveis)

## Fase 1 — base técnica de produção
- [ ] Migrar API para NestJS, PostgreSQL/Prisma e Redis/BullMQ
- [ ] Login robusto, MFA, recuperação e rotação/revogação de sessões
- [ ] Permissões por organização, carteira, contato e ação
- [ ] Testes automatizados e política de backup/restore
- [ ] Observabilidade, alertas, TLS, LGPD e revisão de segurança

## Fase 2 — operação WhatsApp oficial
- [ ] Criar/configurar conta Meta e obter autorizações
- [ ] Receber webhooks oficiais de forma segura
- [ ] Templates aprovados e políticas de consentimento
- [ ] Outbound com filas, logs, limites, retries e opt-out imediato
- [ ] Inbox multiusuário e transferência de atendimento

## Fase 3 — IA e integrações
- [ ] Catálogo e ERP Olist (após validação técnica)
- [ ] Assistente com recuperação de conhecimento revisado e escalonamento
- [ ] Editor visual drag-and-drop e versionamento de fluxos
- [ ] Atribuição de vendas com dados auditados

## Critério de produção

Não colocar em produção antes de validar: segurança/autorização, conformidade Meta/LGPD, integridade do banco, backup com restauração testada, proteção contra duplicação de mensagens, operação e suporte, e consentimento comprovável.
