const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const SECRET = 'cinema-super-secret-key';
const HOLD_MS = 7 * 60 * 1000;

const users = [
  { id: 1, email: 'demo@cinema.com', password: '123456', name: 'Demo User' },
  { id: 2, email: 'sara@cinema.com', password: 'password', name: 'Sara Ali' }
];

const cinemas = [
  {
    id: 'cairo-downtown',
    name: 'Downtown IMAX',
    city: 'Cairo',
    heroImage: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=1600&q=80',
    screens: [
      {
        id: 'screen-1',
        movies: [
          { id: 'mv101', title: 'The Last Script', genre: 'Drama', moods: ['sad', 'deep', 'serious', 'زهقان'], duration: 124, rating: 8.2, basePrice: 180, times: ['13:00', '16:20', '20:10'], poster: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv102', title: 'Laughing in Cairo', genre: 'Comedy', moods: ['happy', 'fun', 'زهقان'], duration: 104, rating: 7.8, basePrice: 140, times: ['12:40', '15:10', '18:45'], poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv103', title: 'Crimson Line', genre: 'Action', moods: ['excited', 'adventure', 'حماس'], duration: 131, rating: 8.0, basePrice: 210, times: ['14:00', '18:00', '22:00'], poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv104', title: 'Moonlight Letters', genre: 'Romance', moods: ['romantic', 'calm', 'حب'], duration: 116, rating: 7.9, basePrice: 165, times: ['11:30', '17:00', '21:30'], poster: 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?auto=format&fit=crop&w=900&q=80' }
        ]
      }
    ]
  },
  {
    id: 'alex-sea',
    name: 'Sea View Cinema',
    city: 'Alexandria',
    heroImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
    screens: [
      {
        id: 'screen-2',
        movies: [
          { id: 'mv105', title: 'Neon Orbit', genre: 'Sci-Fi', moods: ['curious', 'smart', 'خيال'], duration: 128, rating: 8.4, basePrice: 220, times: ['13:20', '17:40', '21:55'], poster: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv106', title: 'Broken Promise', genre: 'Drama', moods: ['sad', 'realistic', 'deep'], duration: 118, rating: 8.1, basePrice: 170, times: ['12:00', '16:10', '20:20'], poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv107', title: 'City of Secrets', genre: 'Thriller', moods: ['tense', 'mystery', 'غامض'], duration: 113, rating: 7.7, basePrice: 190, times: ['14:10', '19:00', '23:00'], poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv108', title: 'Sunny Days', genre: 'Family', moods: ['light', 'happy', 'family'], duration: 96, rating: 7.5, basePrice: 120, times: ['10:40', '13:30', '17:20'], poster: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80' }
        ]
      }
    ]
  },
  {
    id: 'giza-stars',
    name: 'Giza Stars Multiplex',
    city: 'Giza',
    heroImage: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?auto=format&fit=crop&w=1600&q=80',
    screens: [
      {
        id: 'screen-3',
        movies: [
          { id: 'mv109', title: 'Under the Rain', genre: 'Romance', moods: ['romantic', 'sad', 'calm'], duration: 109, rating: 7.6, basePrice: 150, times: ['11:15', '15:45', '20:15'], poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv110', title: 'Turbo Shift', genre: 'Action', moods: ['excited', 'adventure', 'زهقان'], duration: 126, rating: 7.9, basePrice: 205, times: ['12:50', '16:50', '21:50'], poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv111', title: 'Mind Maze', genre: 'Mystery', moods: ['curious', 'smart', 'غامض'], duration: 121, rating: 8.3, basePrice: 195, times: ['13:40', '18:30', '22:40'], poster: 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=900&q=80' },
          { id: 'mv112', title: 'Weekend Chaos', genre: 'Comedy', moods: ['happy', 'fun', 'زهقان'], duration: 101, rating: 7.4, basePrice: 135, times: ['10:20', '14:20', '19:10'], poster: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?auto=format&fit=crop&w=900&q=80' }
        ]
      }
    ]
  }
];

const movieIndex = new Map();
const offerings = [];
for (const cinema of cinemas) {
  for (const screen of cinema.screens) {
    for (const movie of screen.movies) {
      movieIndex.set(movie.id, movie);
      offerings.push({ cinemaId: cinema.id, cinemaName: cinema.name, city: cinema.city, screenId: screen.id, movieId: movie.id, heroImage: cinema.heroImage });
    }
  }
}

const seatMap = new Map();
const temporaryHolds = new Map();
const paymentIntents = new Map();
const bookings = [];
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
    for (const row of ['A', 'B', 'C', 'D', 'E', 'F']) {
      for (let i = 1; i <= 10; i++) {
        const seatName = `${row}${i}`;
        seats[seatName] = { status: 'available', by: null, updatedAt: Date.now() };
      }
    }
    seatMap.set(key, seats);
  }
  return seatMap.get(key);
}

function releaseExpiredHolds() {
  const now = Date.now();
  for (const [holdKey, hold] of temporaryHolds.entries()) {
    if (now - hold.createdAt > HOLD_MS) {
      const seat = ensureSeats(hold.movieId, hold.time)[hold.seatId];
      if (seat.status === 'held' && seat.by === hold.userId) {
        seat.status = 'available';
        seat.by = null;
        seat.updatedAt = now;
        broadcast(hold.movieId, hold.time, { seatId: hold.seatId, status: 'available', reason: 'hold_expired' });
      }
      temporaryHolds.delete(holdKey);
    }
  }
}

setInterval(releaseExpiredHolds, 20000);

function broadcast(movieId, time, payload) {
  const clients = sseClients.get(roomId(movieId, time)) || [];
  for (const response of clients) response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function serveStatic(reqPath, res) {
  const normalized = reqPath === '/' ? '/public/index.html' : `/public${reqPath}`;
  const abs = path.join(__dirname, normalized);
  if (!abs.startsWith(path.join(__dirname, 'public'))) return sendJson(res, 403, { message: 'Forbidden' });
  fs.readFile(abs, (err, data) => {
    if (err) return sendJson(res, 404, { message: 'Not Found' });
    const ext = path.extname(abs);
    const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jsx': 'application/javascript' };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
}

function luhnValid(cardNumber) {
  const digits = cardNumber.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let value = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum % 10 === 0;
}

function parseIntent(text) {
  const value = text.toLowerCase();
  if (/all movies|كل الافلام|اعرض كل/.test(value)) return { type: 'list_all' };
  if (/زهقان|bored/.test(value)) return { type: 'bored' };
  if (/drama|دراما/.test(value)) return { type: 'genre', genre: 'Drama' };
  if (/romance|رومانسي/.test(value)) return { type: 'genre', genre: 'Romance' };
  if (/action|اكشن/.test(value)) return { type: 'genre', genre: 'Action' };
  if (/comedy|كوميدي/.test(value)) return { type: 'genre', genre: 'Comedy' };
  if (/خيال|sci|science/.test(value)) return { type: 'genre', genre: 'Sci-Fi' };
  return { type: 'mood', keyword: value.trim() };
}

function moviePayload(movie) {
  return {
    id: movie.id,
    title: movie.title,
    genre: movie.genre,
    duration: movie.duration,
    rating: movie.rating,
    price: movie.basePrice,
    times: movie.times,
    moods: movie.moods,
    poster: movie.poster
  };
}

function catalogPayload() {
  return cinemas.map((cinema) => ({
    id: cinema.id,
    name: cinema.name,
    city: cinema.city,
    heroImage: cinema.heroImage,
    movies: cinema.screens.flatMap((screen) => screen.movies.map(moviePayload))
  }));
}

function findMovieOptions(filterFn) {
  const out = [];
  for (const offer of offerings) {
    const movie = movieIndex.get(offer.movieId);
    if (!filterFn(movie)) continue;
    out.push({
      cinemaId: offer.cinemaId,
      cinemaName: offer.cinemaName,
      city: offer.city,
      heroImage: offer.heroImage,
      movie: moviePayload(movie)
    });
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'POST' && reqUrl.pathname === '/api/login') {
    const { email, password } = await parseBody(req);
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return sendJson(res, 401, { message: 'Email or password is wrong' });
    return sendJson(res, 200, { token: sign({ id: user.id, name: user.name, email: user.email }), name: user.name });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/forgot-password') {
    const { email } = await parseBody(req);
    return sendJson(res, 200, { message: `Password reset message sent to ${email || 'your inbox'} (demo code: RESET-2026).` });
  }

  const user = auth(reqUrl, req);
  if (reqUrl.pathname.startsWith('/api/') && !['/api/login', '/api/forgot-password'].includes(reqUrl.pathname) && !user) {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/catalog') {
    return sendJson(res, 200, { cinemas: catalogPayload() });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/chat') {
    const { message = '' } = await parseBody(req);
    const intent = parseIntent(message);
    let suggestions = [];
    let reply = '';

    if (intent.type === 'list_all') {
      suggestions = findMovieOptions(() => true);
      reply = `تمام ✨ عندي ${suggestions.length} اختيار متاح دلوقتي. تقدر تختار حسب السعر أو التقييم.`;
    } else if (intent.type === 'bored') {
      suggestions = findMovieOptions((movie) => ['Comedy', 'Action', 'Sci-Fi'].includes(movie.genre)).sort((a, b) => b.movie.rating - a.movie.rating);
      reply = 'لو زهقان فأنصحك بحاجة حماسية أو كوميدي 🎯. رشحت لك أعلى أفلام مناسبة للملل.';
    } else if (intent.type === 'genre') {
      suggestions = findMovieOptions((movie) => movie.genre === intent.genre).sort((a, b) => b.movie.rating - a.movie.rating);
      reply = `اختيارات ${intent.genre} عندي قوية جدًا، دي أفضل المتاح بالمواعيد والأسعار.`;
    } else {
      suggestions = findMovieOptions((movie) => movie.moods.some((m) => intent.keyword.includes(m)) || movie.genre.toLowerCase().includes(intent.keyword));
      if (!suggestions.length) suggestions = findMovieOptions(() => true).sort((a, b) => b.movie.rating - a.movie.rating).slice(0, 6);
      reply = 'فهمت مزاجك 🙌 دي أقرب ترشيحات مناسبة، وشايف كمان أفضل تقييمات احتياطي.';
    }

    return sendJson(res, 200, { reply, suggestions: suggestions.slice(0, 12) });
  }

  if (req.method === 'GET' && reqUrl.pathname.startsWith('/api/seats/')) {
    const [, , , movieId, time] = reqUrl.pathname.split('/');
    releaseExpiredHolds();
    return sendJson(res, 200, { seats: ensureSeats(movieId, time), holdMinutes: HOLD_MS / 60000 });
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/events') {
    const movieId = reqUrl.searchParams.get('movieId');
    const time = reqUrl.searchParams.get('time');
    const key = roomId(movieId, time);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    if (!sseClients.has(key)) sseClients.set(key, []);
    sseClients.get(key).push(res);
    req.on('close', () => sseClients.set(key, (sseClients.get(key) || []).filter((x) => x !== res)));
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/reserve') {
    releaseExpiredHolds();
    const { movieId, time, seatId } = await parseBody(req);
    const movie = movieIndex.get(movieId);
    if (!movie || !movie.times.includes(time)) return sendJson(res, 400, { message: 'Invalid movie or showtime' });

    const seats = ensureSeats(movieId, time);
    const seat = seats[seatId];
    if (!seat) return sendJson(res, 400, { message: 'Seat not found' });
    if (seat.status !== 'available') return sendJson(res, 409, { message: 'Seat already taken' });

    seat.status = 'held';
    seat.by = user.id;
    seat.updatedAt = Date.now();

    const holdKey = `${user.id}_${roomId(movieId, time)}_${seatId}_${crypto.randomBytes(6).toString('hex')}`;
    temporaryHolds.set(holdKey, { userId: user.id, movieId, time, seatId, createdAt: Date.now(), price: movie.basePrice });

    broadcast(movieId, time, { seatId, status: 'held' });
    return sendJson(res, 200, { message: `Seat ${seatId} locked for ${HOLD_MS / 60000} minutes`, holdKey, amount: movie.basePrice });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/create-payment-intent') {
    const { holdKey, cardNumber, cardHolder, expMonth, expYear, cvv } = await parseBody(req);
    const hold = temporaryHolds.get(holdKey);
    if (!hold || hold.userId !== user.id) return sendJson(res, 400, { message: 'Invalid reservation state' });

    if (!luhnValid(cardNumber || '')) return sendJson(res, 400, { message: 'Card number failed validation' });
    if (!/^[A-Za-z ]{3,}$/.test(cardHolder || '')) return sendJson(res, 400, { message: 'Card holder name is invalid' });
    if (!/^\d{2}$/.test(String(expMonth || '')) || Number(expMonth) < 1 || Number(expMonth) > 12) return sendJson(res, 400, { message: 'Invalid expiry month' });
    if (!/^\d{2,4}$/.test(String(expYear || ''))) return sendJson(res, 400, { message: 'Invalid expiry year' });
    if (!/^\d{3}$/.test(String(cvv || ''))) return sendJson(res, 400, { message: 'Invalid CVV' });

    const intentId = `pi_${crypto.randomBytes(7).toString('hex')}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    paymentIntents.set(intentId, { holdKey, userId: user.id, otp, createdAt: Date.now() });

    return sendJson(res, 200, {
      message: 'Payment intent created. OTP sent to your bank app (demo visible).',
      paymentIntentId: intentId,
      amount: hold.price,
      demoOtp: otp
    });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/confirm-payment') {
    const { paymentIntentId, otp } = await parseBody(req);
    const paymentIntent = paymentIntents.get(paymentIntentId);
    if (!paymentIntent || paymentIntent.userId !== user.id) return sendJson(res, 400, { message: 'Invalid payment intent' });
    if (paymentIntent.otp !== String(otp || '')) return sendJson(res, 400, { message: 'OTP is incorrect' });

    const hold = temporaryHolds.get(paymentIntent.holdKey);
    if (!hold || hold.userId !== user.id) return sendJson(res, 400, { message: 'Reservation was not found' });

    const seat = ensureSeats(hold.movieId, hold.time)[hold.seatId];
    if (seat.status !== 'held' || seat.by !== user.id) return sendJson(res, 409, { message: 'Seat hold expired or changed' });

    seat.status = 'booked';
    seat.updatedAt = Date.now();

    bookings.push({
      userId: user.id,
      movieId: hold.movieId,
      time: hold.time,
      seatId: hold.seatId,
      amount: hold.price,
      paidAt: new Date().toISOString(),
      paymentIntentId
    });

    temporaryHolds.delete(paymentIntent.holdKey);
    paymentIntents.delete(paymentIntentId);

    broadcast(hold.movieId, hold.time, { seatId: hold.seatId, status: 'booked' });
    return sendJson(res, 200, { message: 'Payment approved ✅ Booking confirmed successfully.' });
  }

  serveStatic(reqUrl.pathname, res);
});

server.listen(PORT, () => console.log(`Cinema app running on http://localhost:${PORT}`));
