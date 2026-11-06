// Tests du serveur du jeu à deux : cd serveur && npm test

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { WebSocket } from 'ws';
import { cleanName, createFarkleServer } from './serveur.js';

const ORIGIN = 'http://localhost:8765';
const OPTIONS = { mise: 25, cible: 4000, speciaux: true, maison: { ouverture: true, troisFarkles: false } };

// Un client de test : sa boîte de réception, et l’attente du prochain message d’un genre donné
function client(port, origin = ORIGIN) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin });
  const inbox = [], waiting = [];
  ws.on('message', (data) => {
    const m = JSON.parse(data), i = waiting.findIndex((w) => w.type === m.t);
    if (i >= 0) waiting.splice(i, 1)[0].resolve(m); else inbox.push(m);
  });
  return {
    ws,
    open: () => new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); }),
    send: (m) => ws.send(JSON.stringify(m)),
    next: (type) => new Promise((resolve, reject) => {
      const i = inbox.findIndex((m) => m.t === type);
      if (i >= 0) return resolve(inbox.splice(i, 1)[0]);
      const w = { type, resolve };
      waiting.push(w);
      setTimeout(() => reject(new Error(`pas de message « ${type} »`)), 1000).unref();
    }),
    close: () => new Promise((res) => { if (ws.readyState === 3) res(); else { ws.once('close', res); ws.close(); } }),
    silent: async (type) => { await new Promise((r) => setTimeout(r, 60)); return !inbox.some((m) => m.t === type); },
  };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server, port;
before(async () => {
  server = createFarkleServer({ createLimit: 1000, codeLimit: 1000, messageLimit: 100000, forfeitAfter: 50 });
  port = await server.listen(0, '127.0.0.1');
});
after(() => server.close());

const connect = async (p = port) => { const c = client(p); await c.open(); return c; };
async function fullTable() {
  const a = await connect(), b = await connect();
  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS, main: ['soufre', 'cornu'] });
  const made = await a.next('cree');
  b.send({ t: 'rejoindre', code: made.table.code, nom: 'Boris', main: ['plombe'] });
  const seated = await b.next('assis');
  return { a, b, code: made.table.code, jetons: [made.jeton, seated.jeton], debut: await a.next('debut') };
}

test('le nom est nettoyé et limité à 12 caractères', () => {
  assert.equal(cleanName('  Jean\n  Pierre \u0007'), 'Jean Pierre');
  assert.equal(cleanName('ABCDEFGHIJKLMNOP'), 'ABCDEFGHIJKL');
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName(42), '');
});

test('créer : un code de 5 lettres sans I ni O, un nom obligatoire, des options vérifiées', async () => {
  const a = await connect();
  a.send({ t: 'creer', nom: ' ', options: OPTIONS });
  assert.equal((await a.next('erreur')).raison, 'nom');
  a.send({ t: 'creer', nom: 'Anna', options: { ...OPTIONS, mise: 33 } });
  assert.equal((await a.next('erreur')).raison, 'options');
  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  const made = await a.next('cree');
  assert.match(made.table.code, /^[A-HJ-NP-Z]{5}$/);
  assert.equal(made.table.mise, 25);
  await a.close();
});

test('voir montre la table sans s’y asseoir ; un code faux est refusé ; une table pleine aussi', async () => {
  const a = await connect(), v = await connect();
  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  const { table } = await a.next('cree');
  v.send({ t: 'voir', code: table.code.toLowerCase() });
  const seen = await v.next('table');
  assert.deepEqual([seen.table.maitre, seen.table.mise, seen.table.speciaux], ['Anna', 25, true]);
  assert.ok(await a.silent('debut'));
  v.send({ t: 'voir', code: 'ZZZZZ' });
  assert.equal((await v.next('erreur')).raison, 'introuvable');

  const b = await connect(), c = await connect();
  b.send({ t: 'rejoindre', code: table.code, nom: 'Boris' });
  await b.next('assis');
  c.send({ t: 'rejoindre', code: table.code, nom: 'Carla' });
  assert.equal((await c.next('erreur')).raison, 'pleine');
  await Promise.all([a, v, b, c].map((x) => x.close()));
});

test('la partie commence pour les deux avec les noms et les mains figées', async () => {
  const { a, b, debut } = await fullTable();
  const other = await b.next('debut');
  assert.deepEqual(debut, other);
  assert.deepEqual(debut.noms, ['Anna', 'Boris']);
  assert.deepEqual(debut.mains, [['soufre', 'cornu'], ['plombe']]);
  assert.ok(debut.premier === 0 || debut.premier === 1);
  await a.close(); await b.close();
});

test('dés spéciaux interdits : les mains sont vides', async () => {
  const a = await connect(), b = await connect();
  a.send({ t: 'creer', nom: 'Anna', options: { ...OPTIONS, speciaux: false }, main: ['soufre'] });
  const { table } = await a.next('cree');
  b.send({ t: 'rejoindre', code: table.code, nom: 'Boris', main: ['plombe'] });
  assert.deepEqual((await b.next('debut')).mains, [[], []]);
  await a.close(); await b.close();
});

test('les gestes sont relayés aux deux joueurs, dans l’ordre', async () => {
  const { a, b } = await fullTable();
  for (const i of [0, 1, 2]) a.send({ t: 'action', cid: `a${i}`, a: { k: 'de', i } });
  for (const i of [0, 1, 2]) {
    const seen = await b.next('action'), echo = await a.next('action');
    assert.deepEqual(seen, echo);
    assert.equal(seen.a.i, i);
    assert.equal(seen.de, 0);
    assert.equal(seen.seq, i + 1);
  }
  await a.close(); await b.close();
});

test('après une coupure : le joueur reçoit ce qu’il a manqué, et un geste renvoyé ne compte pas deux fois', async () => {
  const { a, b, code, jetons } = await fullTable();
  a.send({ t: 'action', cid: 'x1', a: { k: 'lancer', v: [1, 2, 3, 4, 5, 6] } });
  await b.next('action');
  await b.close();
  assert.equal((await a.next('presence')).la, false);
  a.send({ t: 'action', cid: 'x2', a: { k: 'de', i: 0 } });
  a.send({ t: 'action', cid: 'x2', a: { k: 'de', i: 0 } }); // renvoi : ignoré
  await a.next('action'); await a.next('action');
  const back = await connect();
  back.send({ t: 'reprendre', code, jeton: jetons[1], dernier: 1 });
  const r = await back.next('repris');
  assert.equal(r.place, 1);
  assert.equal(r.neuf, false);
  assert.deepEqual(r.actions.map((e) => e.cid), ['x2']);
  assert.equal((await a.next('presence')).la, true);
  await a.close(); await back.close();
});

test('après un rechargement : le dernier instantané et les gestes qui le suivent', async () => {
  const { a, b, code, jetons } = await fullTable();
  a.send({ t: 'action', cid: 'y1', a: { k: 'lancer', v: [1] } });
  await a.next('action');
  a.send({ t: 'etat', cid: 'e1', data: { scores: [300, 0] } });
  assert.equal((await a.next('ack')).cid, 'e1');
  a.send({ t: 'action', cid: 'y2', a: { k: 'de', i: 3 } });
  await a.next('action');
  const back = await connect();
  back.send({ t: 'reprendre', code, jeton: jetons[1], dernier: -1 });
  const r = await back.next('repris');
  assert.equal(r.neuf, true);
  assert.deepEqual(r.etat, { scores: [300, 0] });
  assert.deepEqual(r.actions.map((e) => e.cid), ['y2']);
  assert.deepEqual(r.noms, ['Anna', 'Boris']);
  await a.close(); await b.close(); await back.close();
});

test('un faux jeton ne reprend pas de place ; une table inconnue est annoncée disparue', async () => {
  const { a, b, code } = await fullTable();
  const c = await connect();
  c.send({ t: 'reprendre', code, jeton: 'faux', dernier: -1 });
  assert.equal((await c.next('erreur')).raison, 'disparue');
  c.send({ t: 'reprendre', code: 'ZZZZZ', jeton: 'faux', dernier: -1 });
  assert.equal((await c.next('erreur')).raison, 'disparue');
  await a.close(); await b.close(); await c.close();
});

test('forfait : refusé tant que l’autre est là ou trop tôt, accordé après l’attente', async () => {
  const { a, b } = await fullTable();
  a.send({ t: 'forfait' });
  assert.equal((await a.next('erreur')).raison, 'tropTot');
  await b.close();
  await a.next('presence');
  a.send({ t: 'forfait' });
  assert.equal((await a.next('erreur')).raison, 'tropTot');
  await sleep(70);
  a.send({ t: 'forfait' });
  assert.equal((await a.next('action')).a.k, 'forfait');
  await a.close();
});

test('revanche : il faut que les deux la demandent, et l’autre commence', async () => {
  const { a, b, debut } = await fullTable();
  await b.next('debut');
  a.send({ t: 'revanche' }); // la partie n’est pas finie : ignoré
  assert.ok(await b.silent('revanche'));
  a.send({ t: 'fin' }); b.send({ t: 'fin' });
  await sleep(20);
  a.send({ t: 'revanche' });
  await b.next('revanche');
  b.send({ t: 'revanche' });
  const again = await a.next('debut');
  assert.equal(again.manche, 2);
  assert.equal(again.premier, 1 - debut.premier);
  await a.close(); await b.close();
});

test('abandon : la partie est finie, le geste suivant n’est plus relayé', async () => {
  const { a, b } = await fullTable();
  a.send({ t: 'action', cid: 'z', a: { k: 'abandon' } });
  assert.equal((await b.next('action')).a.k, 'abandon');
  a.send({ t: 'action', cid: 'z2', a: { k: 'de', i: 1 } });
  assert.ok(await b.silent('action'));
  await a.close(); await b.close();
});

test('quitter une table en attente la supprime', async () => {
  const a = await connect(), v = await connect();
  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  const { table } = await a.next('cree');
  a.send({ t: 'quitter' });
  await sleep(20);
  v.send({ t: 'voir', code: table.code });
  assert.equal((await v.next('erreur')).raison, 'introuvable');
  await a.close(); await v.close();
});

test('une origine étrangère est refusée', async () => {
  const c = client(port, 'https://ailleurs.example');
  await assert.rejects(c.open());
});

test('un message trop gros coupe la connexion', async () => {
  const c = await connect();
  const closed = new Promise((r) => { c.ws.once('close', r); });
  c.ws.on('error', () => {});
  c.ws.send('x'.repeat(9 * 1024));
  assert.equal(await closed, 1009);
});

test('limites par adresse : créations et codes essayés', async () => {
  const s = createFarkleServer({ createLimit: 2, codeLimit: 2 });
  const p = await s.listen(0, '127.0.0.1');
  const c = await connect(p);
  for (let i = 0; i < 2; i++) { c.send({ t: 'creer', nom: 'Anna', options: OPTIONS }); await c.next('cree'); }
  c.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  assert.equal((await c.next('erreur')).raison, 'trop');
  for (let i = 0; i < 2; i++) { c.send({ t: 'voir', code: 'ZZZZZ' }); assert.equal((await c.next('erreur')).raison, 'introuvable'); }
  c.send({ t: 'voir', code: 'ZZZZZ' });
  assert.equal((await c.next('erreur')).raison, 'trop');
  await s.close();
});

test('expiration : table sans second joueur, table abandonnée par ses deux joueurs', async () => {
  const s = createFarkleServer({ waitingTtl: 100, idleTtl: 100 });
  const p = await s.listen(0, '127.0.0.1');
  const a = await connect(p), b = await connect(p);
  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  const { table: lonely } = await a.next('cree');
  s.sweep(Date.now() + 50);
  assert.ok(s.tables.has(lonely.code));
  s.sweep(Date.now() + 200);
  assert.ok(!s.tables.has(lonely.code));
  assert.equal((await a.next('erreur')).raison, 'disparue');

  a.send({ t: 'creer', nom: 'Anna', options: OPTIONS });
  const { table: full } = await a.next('cree');
  b.send({ t: 'rejoindre', code: full.code, nom: 'Boris' });
  await b.next('assis');
  s.sweep(Date.now() + 200);
  assert.ok(s.tables.has(full.code), 'les deux sont encore là');
  await a.close(); await b.close();
  await sleep(20);
  s.sweep(Date.now() + 200);
  assert.ok(!s.tables.has(full.code));
  await s.close();
});
