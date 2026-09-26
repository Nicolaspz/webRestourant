import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadCache } from '../src/services/readCache.ts';

test('reutiliza resultados e isola alterações locais', async () => {
  const cache = new ReadCache(); let calls = 0;
  const load = async () => { calls++; return { name: 'Produto' }; };
  (await cache.get('user1', 'org1', 30000, load)).name = 'Alterado';
  assert.equal((await cache.get('user1', 'org1', 30000, load)).name, 'Produto');
  assert.equal(calls, 1);
});
test('junta consultas concorrentes', async () => {
  const cache = new ReadCache(); let calls = 0;
  const load = async () => { calls++; return 1; };
  await Promise.all([cache.get('u','k',1000,load), cache.get('u','k',1000,load)]);
  assert.equal(calls, 1);
});
test('separa sessões e organizações e respeita expiração e atualização forçada', async () => {
  const cache = new ReadCache(); let calls = 0;
  const load = async () => ++calls;
  await cache.get('u1','org1',1000,load);
  await cache.get('u1','org2',1000,load);
  await cache.get('u2','org1',1000,load);
  await cache.get('u2','org1',0,load,true);
  await cache.get('u2','org1',1000,load);
  assert.equal(calls, 5);
});
test('não guarda falhas nem repõe respostas invalidadas durante uma consulta', async () => {
  const cache = new ReadCache();
  await assert.rejects(cache.get('u','k',1000,async()=>{throw new Error('Falha');}));
  let resolve;
  const pending=cache.get('u','k',1000,()=>new Promise(r=>{resolve=r;}));
  cache.clear(); resolve('antigo'); await pending;
  assert.equal(await cache.get('u','k',1000,async()=>'novo'),'novo');
});
