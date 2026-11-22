// Demonstração didática: SEM acesso à Receita, Sefaz, provedores ou verificação de identidade.
// Não persistimos CNPJ, identidade ou códigos enviados nesta rota.
export function validCnpj(value) {
  const digits=String(value??'').replace(/\D/g,'');
  if(!/^\d{14}$/.test(digits)||/^(\d)\1{13}$/.test(digits))return false;
  const calc=(t,weights)=>{const sum=[...t].reduce((n,d,i)=>n+Number(d)*weights[i],0);const rest=sum%11;return rest<2?0:11-rest;};
  return Number(digits[12])===calc(digits.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2])&&Number(digits[13])===calc(digits.slice(0,13),[6,5,4,3,2,9,8,7,6,5,4,3,2]);
}
export function simulateQualification(body={}){
  const action=String(body.action||'start');
  const kind=String(body.kind||'');
  if(action==='start')return {step:'kind',status:'triagem',message:'Você é lojista ou trabalha como MEI revendedor? Selecione uma opção.',choices:['Lojista','MEI','Não sou revendedor'],demo:true};
  if(action==='kind'){
    if(kind==='Não sou revendedor')return {step:'finish',status:'fora_do_perfil',message:'Este fluxo de demonstração é destinado a lojistas e revendedores. A equipe poderá orientar outros contatos, conforme a política da empresa.',canTransfer:false,demo:true};
    if(!['Lojista','MEI'].includes(kind))return {step:'kind',status:'triagem',message:'Escolha Lojista ou MEI.',demo:true};
    return {step:'cnpj',status:'aguardando_cnpj',message:`Certo! Para continuar como ${kind}, digite um CNPJ para verificar somente o formato e os dígitos verificadores nesta simulação.`,demo:true};
  }
  if(action==='cnpj'){
    if(!['Lojista','MEI'].includes(kind))return {step:'kind',status:'triagem',message:'Primeiro escolha o perfil comercial.',demo:true};
    if(!validCnpj(body.cnpj))return {step:'cnpj',status:'cnpj_formato_invalido',message:'O CNPJ informado não passou na validação matemática. Confira os 14 dígitos. Não foi realizada consulta à Receita Federal.',demo:true};
    const reference={'33000167000101':'PETRÓLEO BRASILEIRO S.A. - PETROBRAS','47960950000121':'MAGAZINE LUIZA S.A.'}[String(body.cnpj).replace(/\D/g,'')];
    return {step:'link',status:'vinculo_pendente',message:reference?`CNPJ com dígitos válidos. Exemplo público identificado: ${reference}. Nome retirado de documento institucional, SEM consulta atual à Receita ou Sefaz. NENHUM vínculo com essa empresa está comprovado. Código fictício de teste: DEMO-OK.`:'O formato do CNPJ passou na validação matemática. Empresa: NÃO CONSULTADA. O vínculo com essa empresa ainda NÃO está comprovado. Para testar a etapa seguinte, use o código fictício DEMO-OK.',company:reference||'Empresa não consultada',registry:'não consultado',canTransfer:false,demo:true};
  }
  if(action==='link'){
    if(!['Lojista','MEI'].includes(kind)||!validCnpj(body.cnpj))return {step:'cnpj',status:'cnpj_pendente',message:'Faça primeiro a validação matemática do CNPJ.',canTransfer:false,demo:true};
    if(String(body.code||'').trim().toUpperCase()!=='DEMO-OK')return {step:'link',status:'vinculo_pendente',message:'Código fictício incorreto. O lead continua retido na triagem. Para simular a aprovação use DEMO-OK.',canTransfer:false,demo:true};
    return {step:'finish',status:'aprovado_apenas_em_simulacao',message:'Fluxo de demonstração concluído. Em uma operação real, o lead só poderá ser liberado após consulta oficial da empresa e comprovação efetiva de vínculo. Nenhum vendedor foi notificado e nenhum cliente foi aprovado.',canTransfer:false,demo:true};
  }
  return {step:'kind',status:'triagem',message:'Etapa desconhecida. Reinicie a simulação.',demo:true};
}
