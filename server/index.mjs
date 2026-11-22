import {simulateQualification, validCnpj} from './qualification.mjs';
import {status as metaStatus, challenge as metaChallenge, validSignature as metaValidSignature, sendApprovedTemplate} from './meta.mjs';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const datafile=process.env.DATA_FILE||path.join(base,'data.json');
const sid=()=>crypto.randomUUID();
// Ambiente online: somente dados fictícios; não é uma implantação SaaS de produção.
const now=()=>new Date().toISOString();
const hash=p=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex')};
const verify=(p,h)=>{try{const [s,k]=h.split(':');return crypto.timingSafeEqual(crypto.scryptSync(p,s,64),Buffer.from(k,'hex'))}catch{return false}};
const initial=()=>({users:[{id:'admin',name:'Administrador',email:'demo@connectflow.local',password:hash('Demo@123456'),role:'admin',active:true}],contacts:[
{id:'c1',name:'Mariana Oliveira',phone:'5519991112233',company:'MO Acessórios',segment:'Revendedor',stage:'Negociação',tags:['Smartwatch','VIP'],consent:true,source:'Cadastro presencial',value:2850,owner:'admin',last:'2026-11-20T10:00:00.000Z'},
{id:'c2',name:'Carlos Mendes',phone:'5519992223344',company:'CM Tech',segment:'Revendedor',stage:'Qualificado',tags:['Cabos'],consent:true,source:'WhatsApp',value:1200,owner:'admin',last:'2026-11-19T15:00:00.000Z'},
{id:'c3',name:'Fernanda Costa',phone:'5519993334455',company:'F Costa',segment:'Novo cliente',stage:'Novo lead',tags:['Powerbank'],consent:false,source:'Instagram',value:600,owner:'admin',last:'2026-11-18T13:00:00.000Z'},
{id:'c4',name:'Ricardo Almeida',phone:'5519994445566',company:'RA Eletrônicos',segment:'Revendedor',stage:'Venda realizada',tags:['Headset','VIP'],consent:true,source:'Loja',value:4350,owner:'admin',last:'2026-11-17T11:00:00.000Z'},
{id:'c5',name:'Patrícia Souza',phone:'5519995556677',company:'PS Imports',segment:'Revendedor',stage:'Proposta',tags:['Carregador'],consent:true,source:'Indicação',value:1780,owner:'admin',last:'2026-11-16T09:00:00.000Z'},
{id:'c6',name:'Joana Ribeiro',phone:'5519990000001',company:'JR Acessórios (fictícia)',segment:'MEI',stage:'Novo lead',tags:['Aguardando CNPJ','Demo'],consent:false,source:'Simulação',value:450,owner:'admin',last:now()},
{id:'c7',name:'Lucas Ferreira',phone:'5519990000002',company:'LF Tecnologia (fictícia)',segment:'Lojista',stage:'Qualificado',tags:['Vínculo pendente','Demo'],consent:false,source:'Simulação',value:950,owner:'admin',last:now()},
{id:'c8',name:'Bruna Martins',phone:'5519990000003',company:'BM Imports (fictícia)',segment:'MEI',stage:'Novo lead',tags:['CNPJ pendente','Demo'],consent:false,source:'Simulação',value:0,owner:'admin',last:now()},
{id:'c9',name:'Rafael Gomes',phone:'5519990000004',company:'RG Celulares (fictícia)',segment:'Revendedor',stage:'Proposta',tags:['B2B','Demo'],consent:false,source:'Simulação',value:1560,owner:'admin',last:now()},
{id:'c10',name:'Aline Teixeira',phone:'5519990000005',company:'AT Comércio (fictícia)',segment:'Lojista',stage:'Negociação',tags:['Aguardando aprovação','Demo'],consent:false,source:'Simulação',value:2200,owner:'admin',last:now()}],campaigns:[{id:'m1',name:'Novidades para revendedores',segment:'Revendedor',body:'Olá, {{nome}}! Temos novidades para sua loja. Quer receber nosso catálogo atualizado?',status:'Simulada',audience:4,created:now(),sent:0}],flows:[{id:'f1',name:'Recepção de revendedores',trigger:'catalogo',answer:'Olá! Você já trabalha com revenda de produtos?',yes:'Perfeito! Vou encaminhar nosso catálogo e avisar um vendedor.',no:'Sem problema! Nossa equipe vai explicar como começar a comprar no atacado.',active:true,created:now()},{id:'f2',name:'Atendimento sobre horários',trigger:'horario',answer:'Você quer saber nosso horário de funcionamento?',yes:'Nossa equipe pode confirmar os horários atualizados para você.',no:'Vou encaminhar você para um atendente.',active:false,created:now()}],logs:[],audits:[],knowledge:[{id:'k1',question:'Como receber o catálogo?',answer:'Nossa equipe pode apresentar o catálogo atualizado e orientar sobre os produtos disponíveis.',status:'approved',category:'Catálogo',created:now()},{id:'k2',question:'Qual o pedido mínimo?',answer:'Consulte as condições comerciais com a equipe responsável.',status:'approved',category:'Compras',created:now()}],settings:{provider:'simulator',company:'Empresa Demonstrativa',number:'',webhook:''}});
let db;
try{db=JSON.parse(fs.readFileSync(datafile,'utf8'))}catch{db=initial(); save()}
db.knowledge ||= [];
function save(){const tmp=datafile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,datafile)}
const sessions=new Map();
const resJson=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'});res.end(JSON.stringify(data))};
const audit=(user,action)=>{db.audits.unshift({id:sid(),user:user?.name||'sistema',action,at:now()});db.audits=db.audits.slice(0,120);save()};
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,active:u.active});
const read=async(req)=>{let b='';for await(const chunk of req){b+=chunk;if(b.length>1_000_000)throw Error('Corpo muito grande')}try{return b?JSON.parse(b):{}}catch{throw Error('JSON inválido')}};
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
const sendCookie=(res,t)=>{res.setHeader('set-cookie',`rc_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`)};
const okString=(s,n=160)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
const stages=['Novo lead','Qualificado','Proposta','Negociação','Venda realizada'];
const registryExamples=[
{cnpj:'33000167000101',name:'PETRÓLEO BRASILEIRO S.A. - PETROBRAS',kind:'Empresa',source:'https://petrobras.com.br/pt/privacidade-protecao-de-dados/cliente-fornecedor-consumidor-concorrente',sourceLabel:'Página institucional Petrobras'},
{cnpj:'47960950000121',name:'MAGAZINE LUIZA S.A.',kind:'Empresa',source:'https://ri.magazineluiza.com.br/Download.aspx?Arquivo=KRY1pAlqwOcMplYYj+uenA%3D%3D',sourceLabel:'Documento de RI Magazine Luiza'}
].map(e=>({...e,mathematicallyValid:validCnpj(e.cnpj),receitaStatus:'Não consultado',sefazStatus:'Não consultado',buyerRelation:'Não confirmado',eligible:false}));

const routes=async(req,res,url,user)=>{
const method=req.method,route=url.pathname;
if(route==='/api/health'&&method==='GET')return resJson(res,200,{status:'ok',mode:'simulation'});
if(route==='/api/meta/status'&&method==='GET')return user?.role==='admin'?resJson(res,200,metaStatus()):resJson(res,403,{error:'Somente administradores'});
if(route==='/api/meta/test-template'&&method==='POST'){
if(user?.role!=='admin')return resJson(res,403,{error:'Somente administradores'});
if(process.env.META_ENABLE_LIVE_SEND!=='true')return resJson(res,403,{error:'Envio real desativado'});
const b=await read(req);
if(b.confirm!== 'CONFIRMO_ENVIO_TESTE' || b.confirmedOptIn!==true)return resJson(res,400,{error:'Confirmação explícita e opt-in do destinatário de teste são obrigatórios'});
try{const result=await sendApprovedTemplate({to:String(b.to||''),template:String(b.template||''),language:String(b.language||'pt_BR'),components:b.components||[]});audit(user,'Enviou template de teste pela API oficial Meta');return resJson(res,200,result)}catch(e){return resJson(res,400,{error:e.message})}
}
if(route==='/api/login'&&method==='POST'){
const body=await read(req);const u=db.users.find(x=>x.email===String(body.email||'').trim().toLowerCase()&&x.active);if(!u||!verify(String(body.password||''),u.password))return resJson(res,401,{error:'Credenciais inválidas'});
const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{id:u.id,expiry:Date.now()+8*3600_000});sendCookie(res,token);audit(u,'Login');return resJson(res,200,{user:publicUser(u)});
}
if(route==='/api/logout'&&method==='POST'){const t=cookie(req).rc_session;sessions.delete(t);sendCookie(res,'deleted');return resJson(res,200,{ok:true})}
if(!user)return resJson(res,401,{error:'Sessão expirada. Faça login novamente.'});
if(route==='/api/me')return resJson(res,200,{user:publicUser(user)});
if(route==='/api/dashboard')return resJson(res,200,{contacts:db.contacts.length,optins:db.contacts.filter(c=>c.consent).length,opportunities:db.contacts.filter(c=>c.stage!=='Venda realizada').reduce((s,c)=>s+Number(c.value||0),0),won:db.contacts.filter(c=>c.stage==='Venda realizada').reduce((s,c)=>s+Number(c.value||0),0),campaigns:db.campaigns.length,flows:db.flows.filter(f=>f.active).length,stages:stages.map(s=>({name:s,count:db.contacts.filter(c=>c.stage===s).length})),logs:db.logs.slice(0,5),audits:db.audits.slice(0,6)});
if(route==='/api/users'&&method==='GET')return user.role==='admin'?resJson(res,200,{items:db.users.map(publicUser)}):resJson(res,200,{items:[]});
if(route==='/api/users'&&method==='POST'){
if(user.role!=='admin')return resJson(res,403,{error:'Acesso reservado ao administrador'});
const b=await read(req);if(!okString(b.name,90)||!okString(b.email,150)||!okString(b.password,128)||String(b.password).length<10||!['admin','manager','agent'].includes(b.role))return resJson(res,400,{error:'Confira os dados (senha mínima de 10 caracteres)'});
if(db.users.some(x=>x.email===b.email.trim().toLowerCase()))return resJson(res,409,{error:'E-mail já cadastrado'});
const obj={id:sid(),name:b.name.trim(),email:b.email.trim().toLowerCase(),password:hash(b.password),role:b.role,active:true};db.users.push(obj);audit(user,'Criou usuário '+obj.email);return resJson(res,201,{item:publicUser(obj)});
}
if(route.startsWith('/api/users/')&&method==='PATCH'){
if(user.role!=='admin')return resJson(res,403,{error:'Acesso negado'});
const u=db.users.find(x=>x.id===route.split('/')[3]);if(!u)return resJson(res,404,{error:'Usuário não encontrado'});const b=await read(req);if(u.id===user.id&&b.active===false)return resJson(res,400,{error:'Não pode desativar a própria conta'});if(typeof b.active==='boolean')u.active=b.active;if(['admin','manager','agent'].includes(b.role))u.role=b.role;audit(user,'Atualizou usuário '+u.email);return resJson(res,200,{item:publicUser(u)});
}
if(route==='/api/contacts'&&method==='GET')return resJson(res,200,{items:db.contacts});
if(route==='/api/contacts'&&method==='POST'){
const b=await read(req);if(!okString(b.name,90)||!/^\d{11,15}$/.test(String(b.phone||'')))return resJson(res,400,{error:'Nome e telefone internacional (somente dígitos) são obrigatórios'});
if(db.contacts.some(c=>c.phone===b.phone))return resJson(res,409,{error:'Número já cadastrado'});
const obj={id:sid(),name:b.name.trim(),phone:b.phone,company:String(b.company||'').slice(0,100),segment:String(b.segment||'Novo cliente').slice(0,60),stage:'Novo lead',tags:[],consent:b.consent===true,source:'Cadastro manual',value:0,owner:user.id,last:now()};db.contacts.unshift(obj);audit(user,'Criou contato '+obj.name);return resJson(res,201,{item:obj});
}
if(route.startsWith('/api/contacts/')&&method==='PATCH'){
const c=db.contacts.find(x=>x.id===route.split('/')[3]);if(!c)return resJson(res,404,{error:'Contato não encontrado'});if(user.role==='agent'&&c.owner!==user.id)return resJson(res,403,{error:'Contato não atribuído a você'});const b=await read(req);if(stages.includes(b.stage))c.stage=b.stage;if(typeof b.consent==='boolean')c.consent=b.consent;if(typeof b.value==='number'&&Number.isFinite(b.value)&&b.value>=0)c.value=b.value;if(okString(b.segment,60))c.segment=b.segment.trim();c.last=now();audit(user,'Atualizou contato '+c.name);return resJson(res,200,{item:c});
}
if(route==='/api/campaigns'&&method==='GET')return resJson(res,200,{items:db.campaigns});
if(route==='/api/campaigns'&&method==='POST'){
if(user.role==='agent')return resJson(res,403,{error:'Somente administração e gerência criam campanhas'});
const b=await read(req);if(!okString(b.name,120)||!okString(b.body,1000))return resJson(res,400,{error:'Título e mensagem obrigatórios'});const eligible=db.contacts.filter(x=>x.consent&&(b.segment==='Todos'||x.segment===b.segment));const obj={id:sid(),name:b.name.trim(),body:b.body.trim(),segment:b.segment||'Todos',status:'Rascunho',audience:eligible.length,sent:0,created:now()};db.campaigns.unshift(obj);audit(user,'Criou campanha '+obj.name);return resJson(res,201,{item:obj});
}
if(route.match(/^\/api\/campaigns\/[^/]+\/simulate$/)&&method==='POST'){
if(user.role==='agent')return resJson(res,403,{error:'Permissão insuficiente'});
const c=db.campaigns.find(x=>x.id===route.split('/')[3]);if(!c)return resJson(res,404,{error:'Campanha não encontrada'});
const eligible=db.contacts.filter(x=>x.consent&&(c.segment==='Todos'||x.segment===c.segment));c.status='Simulada';c.audience=eligible.length;c.sent=0;
for(const contact of eligible)db.logs.unshift({id:sid(),campaign:c.name,contact:contact.name,at:now(),status:'Simulado (não enviado)',preview:c.body.replaceAll('{{nome}}',contact.name)});
db.logs=db.logs.slice(0,300);audit(user,`Simulou ${eligible.length} mensagens da campanha ${c.name}`);return resJson(res,200,{count:eligible.length});
}
if(route==='/api/qualification/save-demo'&&method==='POST'){
 if(user.role==='agent')return resJson(res,403,{error:'Apenas administradores e gerentes podem registrar qualificações demonstrativas'});
 const b=await read(req);
 const c=db.contacts.find(x=>x.id===b.contactId);
 if(!c)return resJson(res,404,{error:'Contato não encontrado'});
 if(!['MEI','Lojista'].includes(b.kind))return resJson(res,400,{error:'Perfil comercial inválido'});
 const digits=String(b.cnpj||'').replace(/\D/g,'');
 if(!validCnpj(digits))return resJson(res,400,{error:'CNPJ com dígitos verificadores inválidos'});
 // Não atribuir CNPJ de empresa pública a pessoas fictícias do CRM.
 if(registryExamples.some(x=>x.cnpj===digits))return resJson(res,400,{error:'Exemplo público não pode ser associado a um contato fictício'});
 const result=simulateQualification({action:'link',kind:b.kind,cnpj:digits,code:b.code});
 if(result.status!=='aprovado_apenas_em_simulacao')return resJson(res,400,{error:'Conclua corretamente as duas etapas do laboratório antes de registrar'});
 // Armazena só os 4 últimos dígitos, para não coletar CNPJ no ambiente fictício.
 c.qualification={mode:'simulation',kind:b.kind,cnpjLast4:digits.slice(-4),registryStatus:'não_consultado',sefazStatus:'não_consultado',buyerLink:'não_comprovado',demoStatus:'concluido',commercialRelease:false,verifiedAt:null,updatedAt:now()};
 c.last=now();
 audit(user,'Registrou triagem simulada, sem liberação comercial, para '+c.name);
 return resJson(res,200,{item:c,notice:'Triagem simulada registrada. Consulta oficial e vínculo real pendentes; transferência bloqueada.'});
}
if(route==='/api/qualification/examples'&&method==='GET')return resJson(res,200,{items:registryExamples,notice:'Exemplos de CNPJ de empresas reais publicados em sites oficiais das próprias empresas. Situação cadastral atual e SEFAZ NÃO consultadas; não são clientes nem contatos.'});
if(route==='/api/qualification/simulate'&&method==='POST'){
const b=await read(req);
return resJson(res,200,simulateQualification(b));
}
if(route==='/api/flows'&&method==='GET')return resJson(res,200,{items:db.flows});
if(route==='/api/flows'&&method==='POST'){
if(user.role==='agent')return resJson(res,403,{error:'Permissão insuficiente'});const b=await read(req);if(!okString(b.name,100)||!okString(b.trigger,100)||!okString(b.answer,800)||!okString(b.yes,800)||!okString(b.no,800))return resJson(res,400,{error:'Preencha todos os campos'});
const obj={id:sid(),name:b.name.trim(),trigger:b.trigger.toLowerCase().trim(),answer:b.answer.trim(),yes:b.yes.trim(),no:b.no.trim(),active:false,created:now()};db.flows.unshift(obj);audit(user,'Criou fluxo '+obj.name);return resJson(res,201,{item:obj});
}
if(route.match(/^\/api\/flows\/[^/]+$/)&&method==='PATCH'){
if(user.role==='agent')return resJson(res,403,{error:'Permissão insuficiente'});const f=db.flows.find(x=>x.id===route.split('/')[3]);if(!f)return resJson(res,404,{error:'Fluxo não encontrado'});const b=await read(req);if(typeof b.active==='boolean')f.active=b.active;audit(user,'Alterou fluxo '+f.name);return resJson(res,200,{item:f});
}
if(route==='/api/flows/simulate'&&method==='POST'){
const b=await read(req);const message=String(b.message||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const f=db.flows.find(x=>x.active&&message.includes(x.trigger.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));return resJson(res,200,{matched:!!f,flow:f?{name:f.name,answer:f.answer,yes:f.yes,no:f.no}:null});
}
if(route==='/api/knowledge'&&method==='GET')return resJson(res,200,{items:db.knowledge});
if(route==='/api/knowledge'&&method==='POST'){
if(user.role==='agent')return resJson(res,403,{error:'Permissão insuficiente'});
const b=await read(req);if(!okString(b.question,250)||!okString(b.answer,1200))return resJson(res,400,{error:'Pergunta e resposta são obrigatórias'});
const obj={id:sid(),question:b.question.trim(),answer:b.answer.trim(),status:'pending',category:String(b.category||'Geral').slice(0,60),created:now()};db.knowledge.unshift(obj);audit(user,'Criou sugestão de conhecimento');return resJson(res,201,{item:obj});
}
if(route.match(/^\/api\/knowledge\/[^/]+$/)&&method==='PATCH'){
if(user.role!=='admin')return resJson(res,403,{error:'Aprovação exclusiva de administrador'});
const k=db.knowledge.find(x=>x.id===route.split('/')[3]);if(!k)return resJson(res,404,{error:'Item não encontrado'});
const b=await read(req);if(!['approved','rejected','pending'].includes(b.status))return resJson(res,400,{error:'Status inválido'});
k.status=b.status;audit(user,'Revisou item de conhecimento');return resJson(res,200,{item:k});
}
if(route==='/api/reports'&&method==='GET'){
if(user.role==='agent')return resJson(res,403,{error:'Acesso reservado à gestão'});
const segments=[...new Set(db.contacts.map(c=>c.segment))].map(name=>({name,total:db.contacts.filter(c=>c.segment===name).length,optins:db.contacts.filter(c=>c.segment===name&&c.consent).length}));
return resJson(res,200,{contacts:db.contacts.length,optins:db.contacts.filter(c=>c.consent).length,won:db.contacts.filter(c=>c.stage==='Venda realizada').reduce((a,c)=>a+Number(c.value||0),0),simulated:db.logs.length,campaigns:db.campaigns.length,segments,stages:stages.map(name=>({name,total:db.contacts.filter(c=>c.stage===name).length}))});
}
if(route==='/api/audits'&&method==='GET')return user.role==='admin'?resJson(res,200,{items:db.audits}):resJson(res,403,{error:'Acesso negado'});
return resJson(res,404,{error:'Rota não encontrada'});
};
const server=http.createServer(async(req,res)=>{try{
const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
// O webhook da Meta não utiliza cookies ou sessão. Verificamos o token no GET
// e a assinatura HMAC sobre os bytes originais no POST.
if(url.pathname==='/api/meta/webhook'){
  if(req.method==='GET'){
    const value=metaChallenge(url);
    if(value===null){res.writeHead(403);return res.end('Forbidden')}
    res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});return res.end(value);
  }
  if(req.method==='POST'){
    const pieces=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>1_000_000)return resJson(res,413,{error:'Payload acima do limite'});pieces.push(chunk)}
    const raw=Buffer.concat(pieces);
    if(!metaValidSignature(raw,req.headers['x-hub-signature-256']))return resJson(res,401,{error:'Assinatura Meta inválida'});
    let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return resJson(res,400,{error:'Payload inválido'})}
    // Não aciona automações nem grava PII neste MVP demonstrativo.
    const count=(payload.entry||[]).reduce((n,e)=>n+(e.changes||[]).length,0);
    console.log(`[meta-webhook] Evento validado; alterações: ${count}`);
    return resJson(res,200,{received:true});
  }
  return resJson(res,405,{error:'Método não permitido'});
}
if(!url.pathname.startsWith('/api')){const dist=path.resolve(base,'../dist');let file=path.resolve(dist,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(dist+path.sep)&&file!==path.join(dist,'index.html'))return resJson(res,403,{error:'Proibido'});if(!fs.existsSync(file))file=path.join(dist,'index.html');if(!fs.existsSync(file))return resJson(res,404,{error:'Inicie a interface com npm run dev'});const ext=path.extname(file);res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'})[ext]||'application/octet-stream');return fs.createReadStream(file).pipe(res)}
if(!['GET','POST','PATCH'].includes(req.method))return resJson(res,405,{error:'Método não permitido'});
if(req.method!=='GET'){const origin=req.headers.origin;const host=req.headers.host;if(origin&&new URL(origin).host!==host&&!(new URL(origin).hostname==='127.0.0.1'&&new URL(origin).port==='5173'&&host==='127.0.0.1:3333'))return resJson(res,403,{error:'Origem não permitida'})}
const token=cookie(req).rc_session;const session=sessions.get(token);const user=session&&session.expiry>Date.now()?db.users.find(x=>x.id===session.id&&x.active):null;
return await routes(req,res,url,user);
}catch(e){return resJson(res,400,{error:e.message||'Erro inesperado'})}});
server.listen(Number(process.env.PORT||3333),process.env.HOST||'127.0.0.1',()=>console.log('API ConnectFlow: http://127.0.0.1:3333'));
