// Serveur du jeu à deux : il tient les tables et leurs codes, relaie les gestes dans l’ordre et garde de quoi
// reconnecter un joueur. Il ne connaît pas les règles : chaque navigateur fait tourner la partie de son côté.
// Les tables ne vivent qu’en mémoire : un redémarrage les perd, et le jeu rend alors leur mise aux joueurs.

import { randomBytes, randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // ni I ni O, qu’on confond avec 1 et 0
const STAKES = [0, 10, 25, 50, 100], TARGETS = [2000, 4000, 8000];
const NAME_MAX = 12, HAND_MAX = 6, LOG_MAX = 5000;
const MIN = 60_000, HOUR = 60 * MIN;
const DEFAULTS = {
  maxTables: 500, maxMessage: 8 * 1024,
  waitingTtl: HOUR, idleTtl: 30 * MIN, maxAge: 24 * HOUR, // sans second joueur ; tout le monde parti ou partie finie ; quoi qu’il arrive
  forfeitAfter: 3 * MIN,
  createLimit: 20, codeLimit: 30, limitWindow: 10 * MIN, // par adresse : créations, codes essayés qui n’existent pas
  messageLimit: 100, messageWindow: 10_000,              // par connexion
  sweepEvery: MIN, heartbeat: 25_000,
  origins: /^https:\/\/farkle\.jibhey\.fr$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
};

export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  const flat = raw.replace(/[\p{C}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return [...flat].slice(0, NAME_MAX).join('').trim();
}
const cleanHand = (h) => (Array.isArray(h) ? h.filter((id) => typeof id === 'string' && /^[a-z]{1,20}$/.test(id)).slice(0, HAND_MAX) : []);
const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };

export function createFarkleServer(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const tables = new Map(), limits = new Map();

  function newCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
      if (!tables.has(code)) return code;
    }
  }
  // Compteur par adresse et par genre, remis à zéro à la fin de sa fenêtre
  function overLimit(ip, kind, max) {
    const key = `${kind}:${ip}`, now = Date.now();
    let l = limits.get(key);
    if (!l || now > l.until) { l = { n: 0, until: now + cfg.limitWindow }; limits.set(key, l); }
    return l.n >= max ? true : (l.n++, false);
  }
  const tableInfo = (t) => ({ code: t.code, maitre: t.players[0].name, mise: t.stake, cible: t.target, speciaux: t.special, maison: t.house });
  const hands = (t) => t.players.map((p) => (t.special ? p.hand : []));
  const startInfo = (t) => ({ table: tableInfo(t), noms: t.players.map((p) => p.name), mains: hands(t), premier: t.starter, manche: t.round, base: t.logBase });
  const touch = (t) => { t.active = Date.now(); };
  function presence(t, place) {
    const other = t.players[1 - place];
    if (other) send(other.ws, { t: 'presence', la: !!t.players[place].ws });
  }
  // Un geste entre dans le journal de la manche et part chez les deux joueurs (l’écho sert d’accusé de réception)
  function relay(t, de, cid, a) {
    if (cid) t.cids.add(cid);
    const entry = { seq: ++t.seq, de, cid, a };
    t.log.push(entry);
    if (t.log.length > LOG_MAX) t.log.shift();
    for (const p of t.players) if (p) send(p.ws, { t: 'action', ...entry });
  }
  function startRound(t) {
    t.round++; t.over = false; t.log = []; t.logBase = t.seq; t.state = null; t.cids = new Set(); t.rematch = new Set();
    t.starter = t.round === 1 ? randomInt(2) : 1 - t.starter;
    t.players.forEach((p) => send(p.ws, { t: 'debut', ...startInfo(t) }));
  }
  function seat(ws, t, place) {
    const p = t.players[place];
    if (p.ws && p.ws !== ws) { p.ws.seat = null; p.ws.close(4001, 'remplacee'); }
    p.ws = ws; p.gone = 0;
    ws.seat = { table: t, place };
  }
  function unseat(ws) {
    if (!ws.seat) return;
    const { table: t, place } = ws.seat, p = t.players[place];
    ws.seat = null;
    if (p.ws !== ws) return;
    p.ws = null; p.gone = Date.now();
    touch(t);
    presence(t, place);
  }

  const handlers = {
    p(ws) { send(ws, { t: 'p' }); },
    creer(ws, m) {
      const name = cleanName(m.nom), o = m.options || {};
      if (!name) return send(ws, { t: 'erreur', raison: 'nom' });
      if (!STAKES.includes(o.mise) || !TARGETS.includes(o.cible)) return send(ws, { t: 'erreur', raison: 'options' });
      if (tables.size >= cfg.maxTables) return send(ws, { t: 'erreur', raison: 'complet' });
      if (overLimit(ws.ip, 'creer', cfg.createLimit)) return send(ws, { t: 'erreur', raison: 'trop' });
      unseat(ws);
      const now = Date.now();
      const t = { code: newCode(), stake: o.mise, target: o.cible, special: !!o.speciaux,
        house: { ouverture: !!o.maison?.ouverture, troisFarkles: !!o.maison?.troisFarkles },
        players: [{ name, hand: cleanHand(m.main), token: randomBytes(16).toString('hex'), ws: null, gone: 0 }, null],
        round: 0, starter: 0, seq: 0, logBase: 0, log: [], state: null, cids: new Set(), rematch: new Set(), over: false, created: now, active: now };
      tables.set(t.code, t);
      seat(ws, t, 0);
      send(ws, { t: 'cree', jeton: t.players[0].token, place: 0, table: tableInfo(t) });
    },
    voir(ws, m) {
      const t = tables.get(String(m.code || '').toUpperCase());
      if (!t && overLimit(ws.ip, 'code', cfg.codeLimit)) return send(ws, { t: 'erreur', raison: 'trop' });
      if (!t) return send(ws, { t: 'erreur', raison: 'introuvable' });
      if (t.players[1]) return send(ws, { t: 'erreur', raison: 'pleine' });
      send(ws, { t: 'table', table: tableInfo(t) });
    },
    rejoindre(ws, m) {
      const name = cleanName(m.nom), t = tables.get(String(m.code || '').toUpperCase());
      if (!name) return send(ws, { t: 'erreur', raison: 'nom' });
      if (!t && overLimit(ws.ip, 'code', cfg.codeLimit)) return send(ws, { t: 'erreur', raison: 'trop' });
      if (!t) return send(ws, { t: 'erreur', raison: 'introuvable' });
      if (t.players[1]) return send(ws, { t: 'erreur', raison: 'pleine' });
      unseat(ws);
      t.players[1] = { name, hand: cleanHand(m.main), token: randomBytes(16).toString('hex'), ws: null, gone: 0 };
      seat(ws, t, 1);
      touch(t);
      send(ws, { t: 'assis', jeton: t.players[1].token, place: 1, code: t.code });
      startRound(t);
    },
    // Retour d’un joueur : après une coupure (`dernier` : le dernier geste qu’il a vu), on lui renvoie ce qui lui manque ;
    // après un rechargement de la page (dernier < 0), le dernier instantané et les gestes qui le suivent
    reprendre(ws, m) {
      const t = tables.get(String(m.code || '').toUpperCase());
      const place = t ? t.players.findIndex((p) => p && p.token === m.jeton) : -1;
      if (place < 0) return send(ws, { t: 'erreur', raison: 'disparue' });
      unseat(ws);
      seat(ws, t, place);
      touch(t);
      const dernier = Number.isInteger(m.dernier) ? m.dernier : -1;
      const other = t.players[1 - place];
      const msg = { t: 'repris', place, table: tableInfo(t), commencee: t.round > 0, fini: t.over, adversaireLa: !!(other && other.ws) };
      if (t.round) {
        Object.assign(msg, startInfo(t));
        const fresh = dernier < t.logBase; // rechargée, ou la manche a changé pendant son absence
        if (fresh && t.state) { msg.etat = t.state.data; msg.actions = t.log.filter((e) => e.seq > t.state.seq); }
        else msg.actions = t.log.filter((e) => e.seq > (fresh ? t.logBase : dernier));
        msg.neuf = fresh;
        msg.depuis = fresh && t.state ? t.state.seq : fresh ? t.logBase : dernier;
      }
      send(ws, msg);
      presence(t, place);
    },
    action(ws, m) {
      const s = ws.seat;
      if (!s || !s.table.round || s.table.over || !m.a || typeof m.a !== 'object') return;
      const t = s.table;
      touch(t);
      // renvoi après une coupure : le geste est déjà au journal, le joueur reçoit son écho avec le reste
      if (m.cid && t.cids.has(m.cid)) return;
      if (m.a.k === 'abandon') t.over = true;
      relay(t, s.place, m.cid, m.a);
    },
    // Instantané à un point stable : il vaut pour tous les gestes reçus jusque-là
    etat(ws, m) {
      const s = ws.seat;
      if (!s || !s.table.round || s.table.over || !m.data || typeof m.data !== 'object') return;
      s.table.state = { seq: s.table.seq, data: m.data };
      touch(s.table);
      send(ws, { t: 'ack', cid: m.cid });
    },
    fin(ws) {
      if (!ws.seat) return;
      ws.seat.table.over = true;
      touch(ws.seat.table);
    },
    // L’autre est absent depuis assez longtemps : le joueur présent peut réclamer la victoire
    forfait(ws) {
      const s = ws.seat;
      if (!s || !s.table.round || s.table.over) return;
      const t = s.table, other = t.players[1 - s.place];
      if (!other || other.ws || Date.now() - other.gone < cfg.forfeitAfter) return send(ws, { t: 'erreur', raison: 'tropTot' });
      t.over = true;
      touch(t);
      relay(t, s.place, null, { k: 'forfait' });
    },
    revanche(ws) {
      const s = ws.seat;
      if (!s || !s.table.over) return;
      const t = s.table;
      t.rematch.add(s.place);
      touch(t);
      send(t.players[1 - s.place]?.ws, { t: 'revanche' });
      if (t.rematch.size === 2) startRound(t);
    },
    quitter(ws) {
      const s = ws.seat;
      if (!s) return;
      const t = s.table, other = t.players[1 - s.place];
      unseat(ws);
      if (!t.round) { tables.delete(t.code); return; } // personne d’autre à la table
      t.players[s.place].left = true;
      if (other) send(other.ws, { t: 'parti' });
      if (t.players.every((p) => p.left)) tables.delete(t.code);
    },
  };

  function sweep(now = Date.now()) {
    for (const [code, t] of tables) {
      const nobody = t.players.every((p) => !p || !p.ws);
      const quiet = now - t.active;
      if (now - t.created > cfg.maxAge || (!t.players[1] && quiet > cfg.waitingTtl) || (t.players[1] && (nobody || t.over) && quiet > cfg.idleTtl)) {
        t.players.forEach((p) => { if (p && p.ws) { p.ws.seat = null; send(p.ws, { t: 'erreur', raison: 'disparue' }); } });
        tables.delete(code);
      }
    }
    for (const [key, l] of limits) if (now > l.until) limits.delete(key);
  }

  const http = createServer((req, res) => {
    const ok = req.url === '/ws/sante';
    res.writeHead(ok ? 200 : 404, { 'content-type': 'text/plain' });
    res.end(ok ? 'ok' : 'introuvable');
  });
  const wss = new WebSocketServer({
    server: http, path: '/ws', maxPayload: cfg.maxMessage, perMessageDeflate: false,
    verifyClient: ({ origin }) => cfg.origins.test(origin || ''),
  });
  wss.on('connection', (ws, req) => {
    // derrière Caddy, l’adresse du joueur est dans X-Forwarded-For ; le port n’écoute qu’en local
    ws.ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    ws.alive = true; ws.count = 0; ws.since = Date.now();
    ws.on('pong', () => { ws.alive = true; });
    ws.on('close', () => unseat(ws));
    ws.on('error', () => ws.terminate());
    ws.on('message', (data, binary) => {
      const now = Date.now();
      if (now - ws.since > cfg.messageWindow) { ws.since = now; ws.count = 0; }
      if (++ws.count > cfg.messageLimit) return ws.close(4008, 'trop de messages');
      if (binary) return;
      let m;
      try { m = JSON.parse(data); } catch { return; }
      if (m && Object.hasOwn(handlers, m.t)) handlers[m.t](ws, m);
    });
  });
  const beat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false;
      ws.ping();
    }
  }, cfg.heartbeat);
  const sweeper = setInterval(sweep, cfg.sweepEvery);
  beat.unref(); sweeper.unref();

  return {
    http, tables, sweep,
    listen: (port, host) => new Promise((resolve) => { http.listen(port, host, () => resolve(http.address().port)); }),
    close: () => new Promise((resolve) => {
      clearInterval(beat); clearInterval(sweeper);
      for (const ws of wss.clients) ws.terminate();
      wss.close(() => http.close(() => resolve()));
    }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = +(process.env.PORT || 8790);
  createFarkleServer().listen(port, process.env.HOST || '0.0.0.0').then((p) => console.log(`Serveur du Farkle sur le port ${p}`));
}
