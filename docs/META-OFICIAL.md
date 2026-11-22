# Meta Cloud API oficial — integração técnica inicial

O ConnectFlow permanece um **MVP demonstrativo**, não um SaaS para dados reais. A API oficial foi integrada ao backend apenas para testes controlados. Não há integração com sessão de WhatsApp Web, nem envio em massa real. A integração não garante prevenção de banimentos.

## Implementado
- GET `/api/meta/webhook`: valida `hub.verify_token` e responde ao `hub.challenge`.
- POST `/api/meta/webhook`: valida `X-Hub-Signature-256` com o segredo do app Meta sobre os bytes originais, antes de interpretar JSON. Confirma recebimento, mas **não persiste conversas nem dispara fluxos**.
- GET `/api/meta/status`: mostra somente estado de configuração, exige administrador; nunca devolve chaves.
- POST `/api/meta/test-template`: permite **somente** template previamente aprovado e número explicitamente incluído na lista de testes, com permissão de administrador, confirmação e consentimento. Envio real fica bloqueado por padrão.

## Configuração segura
1. Crie um aplicativo em https://developers.facebook.com/apps e habilite WhatsApp Business Platform. Para produção, siga processo oficial de verificação e permissões Meta.
2. Obtenha `Phone Number ID`, token autorizado para Cloud API, segredo do aplicativo e crie um webhook verify token forte.
3. Defina variáveis conforme `.env.meta.example` no gerenciador seguro da hospedagem. Não coloque chaves no React, no repositório ou nas capturas de tela.
4. Publique em HTTPS. Configure em Meta o callback `https://SEU-DOMINIO/api/meta/webhook`, seu token de verificação e inscrição no campo `messages`.
5. Faça primeiro a verificação GET e teste de POST assinado. A URL local `localhost` não é acessível aos servidores Meta.
6. Para envio controlado, adicione **apenas destinatários de teste com autorização explícita** em `META_TEST_RECIPIENTS`, mantenha o template aprovado na WABA conectada e, após revisar todos os controles, defina `META_ENABLE_LIVE_SEND=true`.
7. Entre como administrador e faça POST `/api/meta/test-template` com JSON:

```json
{"to":"5511999999999","template":"nome_template_aprovado","language":"pt_BR","confirmedOptIn":true,"confirm":"CONFIRMO_ENVIO_TESTE"}
```

Este endpoint não está na UI e não é um disparador de campanhas. Não use números de clientes reais neste MVP.

## Coexistence para números que já usam WhatsApp Business
Não tente registrar diretamente o número atual como número novo na API. Para preservá-lo no aplicativo, é necessário **Embedded Signup com suporte a WhatsApp Business App Coexistence**, por integração/Tech Provider elegível e mediante verificação de elegibilidade pela Meta. O conector aqui implementado funciona **após** a vinculação autorizada e provisionamento de credenciais; ele **não implementa o Embedded Signup nem habilita Coexistence sozinho**.

## O que falta antes de vender assinaturas
- PostgreSQL persistente e identidade `tenant_id` validada em todas as operações; isolamento entre empresas e credenciais criptografadas por tenant.
- Autenticação e sessões persistentes, remover login demo, CSRF/rate limiting, controle de privilégios, logs sem PII e LGPD.
- Embedded Signup oficial multiempresa, revisão e permissões do app Meta.
- Processamento durável, idempotente e assíncrono dos webhooks; CRM de conversas e roteamento.
- Registro comprovável de opt-in/opt-out, políticas de templates e janelas, fila com limites, backoff e monitoramento de qualidade.
- Cota/cobrança por empresa, monitoramento, testes de produção, backups e recuperação de falhas.
