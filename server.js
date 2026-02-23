const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const SECRET = 'cinema-super-secret-key';

const users = [
  { id: 1, email: 'demo@cinema.com', password: '123456', name: 'Demo User' },
  { id: 2, email: 'sara@cinema.com', password: 'password', name: 'Sara' }
];

const cinemas = [
  { id: 'cinema-1', name: 'Nile Stars Cinema', city: 'Cairo', movies: [
    { id: 'm1', title: 'Silent Hearts', genre: 'Romance', mood: ['romantic', 'calm'] },
    { id: 'm2', title: 'Shadow Protocol', genre: 'Action', mood: ['excited', 'adventure'] },
    { id: 'm3', title: 'Tears of Winter', genre: 'Drama', mood: ['sad', 'deep'] }
  ]},
  { id: 'cinema-2', name: 'Skyline Cinema', city: 'Alexandria', movies: [
    { id: 'm4', title: 'Code of Future', genre: 'Sci-Fi', mood: ['curious', 'smart'] },
    { id: 'm5', title: 'Laugh Track', genre: 'Comedy', mood: ['happy', 'light'] },
    { id: 'm6', title: 'Broken Promise', genre: 'Drama', mood: ['sad', 'realistic'] }
  ]}
];

const showtimes = { m1:['17:00','20:00'], m2:['18:00','22:00'], m3:['16:30','21:30'], m4:['19:15'], m5:['15:00','19:00'], m6:['20:30'] };
const seatMap = new Map();
const temporaryHolds = new Map();
const sseClients = new Map();

const roomId = (movieId, time) => `${movieId}_${time}`;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

function sign(payload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('base64url');
  return `${raw}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(raw).digest('base64url');
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString()); } catch { return null; }
}

function auth(reqUrl, req) {
  const authHeader = req.headers.authorization?.replace('Bearer ', '');
  return verify(authHeader || reqUrl.searchParams.get('token'));
}

function ensureSeats(movieId, time) {
  const key = roomId(movieId, time);
  if (!seatMap.has(key)) {
    const seats = {};
    for (const row of ['A','B','C','D','E']) for (let i=1; i<=8; i++) seats[`${row}${i}`] = { status:'available', by:null };
    seatMap.set(key, seats);
  }
  return seatMap.get(key);
}

function broadcast(movieId, time, payload) {
  const key = roomId(movieId, time);
  const clients = sseClients.get(key) || [];
  for (const res of clients) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

function serveStatic(reqPath, res) {
  const filePath = reqPath === '/' ? '/public/index.html' : `/public${reqPath}`;
  const abs = path.join(__dirname, filePath);
  if (!abs.startsWith(path.join(__dirname, 'public'))) return sendJson(res, 403, { message: 'Forbidden' });
  fs.readFile(abs, (err, data) => {
    if (err) return sendJson(res, 404, { message: 'Not Found' });
    const ext = path.extname(abs);
    const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'POST' && reqUrl.pathname === '/api/login') {
    const { email, password } = await parseBody(req);
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return sendJson(res, 401, { message: 'Email or password is wrong' });
    return sendJson(res, 200, { token: sign({ id:user.id, name:user.name, email:user.email }), name:user.name });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/forgot-password') {
    const { email } = await parseBody(req);
    return sendJson(res, 200, { message: `Reset instructions sent to ${email || 'your email'} (demo code: RESET-2026).` });
  }

  const user = auth(reqUrl, req);
  if (reqUrl.pathname.startsWith('/api/') && !['/api/login','/api/forgot-password'].includes(reqUrl.pathname) && !user) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/recommend') {
    const { mood = '', genre = '' } = await parseBody(req);
    const m = mood.toLowerCase();
    const g = genre.toLowerCase();
    const suggestions = [];
    for (const cinema of cinemas) {
      for (const movie of cinema.movies) {
        if (movie.mood.some((x) => m.includes(x)) || movie.genre.toLowerCase().includes(g)) {
          suggestions.push({ cinemaName: cinema.name, city: cinema.city, movie, showtimes: showtimes[movie.id] || [] });
        }
      }
    }
    if (!suggestions.length) cinemas.forEach((c) => suggestions.push({ cinemaName:c.name, city:c.city, movie:c.movies[0], showtimes:showtimes[c.movies[0].id] || [] }));
    return sendJson(res, 200, { suggestions: suggestions.slice(0, 6) });
  }

  if (req.method === 'GET' && reqUrl.pathname.startsWith('/api/seats/')) {
    const [, , , movieId, time] = reqUrl.pathname.split('/');
    return sendJson(res, 200, { seats: ensureSeats(movieId, time) });
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/events') {
    const movieId = reqUrl.searchParams.get('movieId');
    const time = reqUrl.searchParams.get('time');
    const key = roomId(movieId, time);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive'
    });
    if (!sseClients.has(key)) sseClients.set(key, []);
    sseClients.get(key).push(res);
    req.on('close', () => {
      sseClients.set(key, (sseClients.get(key) || []).filter((x) => x !== res));
    });
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/reserve') {
    const { movieId, time, seatId } = await parseBody(req);
    const seats = ensureSeats(movieId, time);
    const seat = seats[seatId];
    if (!seat) return sendJson(res, 400, { message: 'Seat not found' });
    if (seat.status !== 'available') return sendJson(res, 409, { message: 'Seat already taken' });
    seat.status = 'held'; seat.by = user.id;
    const holdKey = `${user.id}_${roomId(movieId, time)}_${seatId}`;
    temporaryHolds.set(holdKey, { userId:user.id, movieId, time, seatId });
    broadcast(movieId, time, { seatId, status: 'held' });
    return sendJson(res, 200, { message: 'Seat held for payment', holdKey });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/confirm-payment') {
    const { holdKey, paymentCode, cardLast4 } = await parseBody(req);
    const hold = temporaryHolds.get(holdKey);
    if (!hold || hold.userId !== user.id) return sendJson(res, 400, { message: 'Invalid reservation state' });
    if (paymentCode !== 'PAYMENT-OK' || !/^\d{4}$/.test(cardLast4 || '')) return sendJson(res, 400, { message: 'Payment data invalid.' });
    const seat = ensureSeats(hold.movieId, hold.time)[hold.seatId];
    if (seat.status !== 'held' || seat.by !== user.id) return sendJson(res, 409, { message: 'Seat hold expired' });
    seat.status = 'booked';
    temporaryHolds.delete(holdKey);
    broadcast(hold.movieId, hold.time, { seatId: hold.seatId, status: 'booked' });
    return sendJson(res, 200, { message: 'Booking confirmed and paid successfully' });
  }

  serveStatic(reqUrl.pathname, res);
});

server.listen(PORT, () => console.log(`Cinema app running on http://localhost:${PORT}`));
