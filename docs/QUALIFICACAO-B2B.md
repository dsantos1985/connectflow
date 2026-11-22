# Qualificação empresarial — versão demonstrativa

Fluxo: perfil Lojista ou MEI → validação apenas matemática do CNPJ → segunda etapa com código fictício `DEMO-OK` → resultado simulado. O código NÃO comprova vínculo e NÃO libera vendedor ou campanha. A opção "Não sou revendedor" encerra a triagem B2B.

No menu **Automações**, abra a nova seção **Qualificação de Lojistas e MEIs**. Use apenas CNPJ fictício matematicamente válido. A API utilizada é `POST /api/qualification/simulate`, com sessão autenticada e ações `kind`, `cnpj`, `link`. Nenhum dado do formulário é persistido no banco do MVP.

**Antes de produção:** consultar situação cadastral por fonte autorizada; validar elegibilidade comercial e comprovante de vínculo por mecanismo verificável (não apenas código informado pelo próprio solicitante); revisão de exceções; controles LGPD; persistência multiempresa em PostgreSQL; autorização e trilha de auditoria; integração WhatsApp oficial; consentimento de marketing separado.

A política de pedido mínimo da Robson Atacado (R$ 500 somente na primeira compra) é uma regra de uma implantação específica, não do núcleo SaaS.
