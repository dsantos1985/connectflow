# ConnectFlow — teste seguro do Webhook no Windows

Este guia usa o proxy dedicado **webhook-proxy.mjs**, que permite acesso apenas a GET/POST em `/api/meta/webhook`. Não é uma publicação do SaaS ou integração multiempresa.

1. No PowerShell na pasta `online-connectflow`, carregue o token de verificação salvo localmente e a App Secret da Meta. Use o mesmo terminal ao iniciar o Node.js. Nunca compartilhe credenciais:

```powershell
$env:META_WEBHOOK_VERIFY_TOKEN = (Get-Content .\meta-webhook-token.txt -Raw).Trim()
$secret = Read-Host 'App Secret da Meta' -AsSecureString
$env:META_APP_SECRET = [System.Net.NetworkCredential]::new('', $secret).Password
npm.cmd run dev
```

2. Em outro terminal, na mesma pasta, execute `node .\webhook-proxy.mjs`.
3. Teste sem imprimir o token: abra outro PowerShell na pasta e rode

```powershell
$token = (Get-Content .\meta-webhook-token.txt -Raw).Trim()
$uri = 'http://127.0.0.1:3444/api/meta/webhook?hub.mode=subscribe&hub.verify_token=' + [uri]::EscapeDataString($token) + '&hub.challenge=123456'
try { $r = Invoke-WebRequest -Uri $uri -UseBasicParsing; 'HTTP: ' + $r.StatusCode; 'Desafio: ' + $r.Content } catch { 'Erro HTTP: ' + [int]$_.Exception.Response.StatusCode }
```

4. Se responder `HTTP: 200` e `Desafio: 123456`, em um **terceiro terminal** execute `cloudflared tunnel --url http://127.0.0.1:3444`. O terminal fornecerá uma URL HTTPS temporária.
5. Na Meta configure: URL de callback = `https://<dominio-aleatorio>.trycloudflare.com/api/meta/webhook` e token de verificação = mesmo valor de `meta-webhook-token.txt` (copiar localmente, sem enviá-lo ao chat). Não use `127.0.0.1` na Meta.
6. Após verificação, assine o campo `messages`, onde disponível, e teste com notificações de desenvolvimento. O backend **valida a assinatura POST**, mas **ainda não registra mensagens recebidas no CRM**.

ATENÇÃO: não inclua `meta-webhook-token.txt` no Git, não exponha outras portas da aplicação, não conecte o número pessoal como remetente neste teste. O túnel quick é temporário e muda de URL ao reiniciar.
