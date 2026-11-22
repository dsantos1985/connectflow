import crypto from 'node:crypto';

const env = process.env;
const cfg = () => ({
  version: env.META_GRAPH_VERSION || 'v26.0',
  phoneId: env.META_PHONE_NUMBER_ID || '',
  token: env.META_ACCESS_TOKEN || '',
  appSecret: env.META_APP_SECRET || '',
  verifyToken: env.META_WEBHOOK_VERIFY_TOKEN || '',
  allowLive: env.META_ENABLE_LIVE_SEND === 'true',
  permittedNumbers: (env.META_TEST_RECIPIENTS || '').split(',').map(x => x.trim()).filter(Boolean)
});
export function status() {
  const c = cfg();
  return {provider:'meta-cloud-api',configured:!!(c.phoneId && c.token && c.appSecret && c.verifyToken),liveSendEnabled:c.allowLive,allowlistedTestRecipients:c.permittedNumbers.length,webhookPath:'/api/meta/webhook',graphVersion:c.version};
}
export function challenge(url) {
  const c=cfg();
  if (!c.verifyToken || url.searchParams.get('hub.mode')!=='subscribe') return null;
  const supplied=Buffer.from(url.searchParams.get('hub.verify_token')||'');
  const expected=Buffer.from(c.verifyToken);
  if (supplied.length!==expected.length || !crypto.timingSafeEqual(supplied,expected)) return null;
  return url.searchParams.get('hub.challenge') || '';
}
export function validSignature(raw, header) {
  const c=cfg();
  if (!c.appSecret || !header?.startsWith('sha256=')) return false;
  const actual=Buffer.from(header.slice(7),'hex');
  const expected=crypto.createHmac('sha256',c.appSecret).update(raw).digest();
  return actual.length===expected.length && crypto.timingSafeEqual(actual,expected);
}
export async function sendApprovedTemplate({to,template,language='pt_BR',components=[]}) {
  const c=cfg();
  if(!c.allowLive) throw new Error('Envio real desativado (META_ENABLE_LIVE_SEND=false)');
  if(!c.token || !c.phoneId) throw new Error('Integração Meta sem credenciais');
  if(!/^\d{11,15}$/.test(to) || !/^[a-z0-9_]{1,512}$/.test(template)) throw new Error('Telefone ou template inválido');
  if(!c.permittedNumbers.includes(to)) throw new Error('Destinatário não autorizado: adicione apenas números de teste a META_TEST_RECIPIENTS');
  if(!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) throw new Error('Idioma inválido');
  if(!Array.isArray(components) || JSON.stringify(components).length>5000) throw new Error('Componentes inválidos');
  const endpoint=`https://graph.facebook.com/${encodeURIComponent(c.version)}/${encodeURIComponent(c.phoneId)}/messages`;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(endpoint,{
      method:'POST',signal:controller.signal,
      headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},
      body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:template,language:{code:language},...(components.length?{components}:{})}})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(`Meta recusou o envio (HTTP ${response.status}; código ${data?.error?.code||'desconhecido'})`);
    return {id:data?.messages?.[0]?.id||null,status:'accepted_by_meta'};
  } finally {clearTimeout(timeout)}
}
