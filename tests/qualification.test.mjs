import test from 'node:test';
import assert from 'node:assert/strict';
import { validCnpj, simulateQualification } from '../server/qualification.mjs';

const example = '12345678000195'; // Número matematicamente válido para testes; não implica cadastro existente.
test('rejeita CNPJ inválido e repetido',()=>{
 assert.equal(validCnpj('00000000000000'),false);
 assert.equal(validCnpj('12345678000100'),false);
 assert.equal(validCnpj('1234567800019'),false);
});
test('aceita dígitos verificadores válidos sem consultar cadastro',()=>{
 assert.equal(validCnpj(example),true);
 const r=simulateQualification({action:'cnpj',kind:'MEI',cnpj:example});
 assert.equal(r.step,'link');assert.equal(r.registry,'não consultado');assert.equal(r.canTransfer,false);
});
test('não libera cliente por código fictício mesmo após fluxo concluído',()=>{
 const r=simulateQualification({action:'link',kind:'MEI',cnpj:example,code:'DEMO-OK'});
 assert.equal(r.step,'finish');assert.equal(r.canTransfer,false);assert.equal(r.demo,true);
});
test('não revendedor encerra triagem e código errado retém',()=>{
 assert.equal(simulateQualification({action:'kind',kind:'Não sou revendedor'}).status,'fora_do_perfil');
 assert.equal(simulateQualification({action:'link',kind:'Lojista',cnpj:example,code:'ERRADO'}).status,'vinculo_pendente');
});
