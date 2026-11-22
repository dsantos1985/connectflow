# ConnectFlow — Demonstração Online (versão independente)

Aplicação CRM/WhatsApp simulada com a mesma base funcional do MVP local, sem vínculos visuais com Robson Atacado. Tema escuro por padrão, botão de alternância para claro, preferência no navegador.

## Testar no Windows

Pré-requisitos: Node.js 22+ e npm.

```powershell
npm install
npm run dev
```

Abra http://127.0.0.1:5173. Para testar a aplicação empacotada: `npm run build` e `npm start`, em http://127.0.0.1:3333.

Login demonstrativo: `demo@connectflow.local` / `Demo@123456`. São credenciais **públicas e compartilhadas**. Nunca cadastre informações reais.

## Publicar no Render

1. Envie esta pasta para um repositório GitHub, preferencialmente privado.
2. No Render, crie um *Blueprint* apontando para o `render.yaml`, ou um Web Service usando Dockerfile e plano gratuito (quando disponível).
3. Faça o deploy. Render atribui endereço HTTPS.
4. Compartilhe somente para demonstração, sem dados reais e sem cobrança.

**Limitação fundamental:** o plano gratuito pode suspender instâncias e perder arquivos locais. O banco desta versão é JSON no contêiner (em `/tmp`), sem persistência garantida, sem isolamento multiempresa e sem faturamento. A ausência de volume persistente implica perda de alterações no redeploy/reinício. Antes de publicar como SaaS, implementar PostgreSQL gerenciado, autenticação persistente, cadastro de organizações/tenant_id, isolamento de dados, controle de acesso em todas as consultas, cadastro seguro de contas, cobrança, backup, antifraude, rate limit e LGPD.

A integração WhatsApp real **não** está conectada; toda campanha é simulada. Os fluxos são regras, não IA treinada.

## Novo laboratório de qualificação B2B
Em **Automações → Qualificação de Lojistas e MEIs**, existe uma simulação de triagem em duas etapas. Ela verifica apenas os dígitos matemáticos do CNPJ e simula um segundo passo por código fictício; NÃO consulta Receita/Sefaz, NÃO verifica representação, NÃO encaminha leads e NÃO envia WhatsApp. Consulte `docs/QUALIFICACAO-B2B.md`. Teste: `node --test tests/qualification.test.mjs`.
