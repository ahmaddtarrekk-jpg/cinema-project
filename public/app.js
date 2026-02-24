let token = null;
let selected = null;
let holdKey = null;
let events = null;

const q = (id) => document.getElementById(id);

q('login-btn').onclick = async () => {
  const email = q('email').value.trim();
  const password = q('password').value.trim();
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) return q('login-msg').textContent = data.message;
  token = data.token;
  q('welcome').textContent = `Welcome ${data.name}`;
  q('login-screen').classList.remove('active');
  q('dashboard').style.display = 'flex';
};

q('forgot-btn').onclick = async () => {
  const email = q('email').value.trim();
  const res = await fetch('/api/forgot-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  });
  q('login-msg').textContent = (await res.json()).message;
};

q('logout').onclick = () => location.reload();

q('ask-ai').onclick = async () => {
  const mood = q('mood').value.trim();
  const genre = q('genre').value.trim();
  const res = await fetch('/api/recommend', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mood, genre })
  });
  const data = await res.json();
  q('ai-results').innerHTML = data.suggestions.map((s) => `
    <div class="card">
      <strong>${s.movie.title}</strong> (${s.movie.genre})<br />
      ${s.cinemaName} - ${s.city}<br />
      Times: ${s.showtimes.join(', ')}
      <button onclick="selectMovie('${s.movie.id}','${s.showtimes[0]}','${s.movie.title}','${s.cinemaName}')">Choose</button>
    </div>`).join('');
};

window.selectMovie = async (movieId, time, title, cinemaName) => {
  selected = { movieId, time, title, cinemaName };
  if (events) events.close();
  events = new EventSource(`/api/events?movieId=${movieId}&time=${time}&token=${token}`);
  events.onmessage = () => {
    q('seat-msg').textContent = 'Realtime update received';
    renderSeats();
  };
  q('selection-info').textContent = `Selected: ${title} at ${cinemaName} (${time})`;
  await renderSeats();
};

async function renderSeats() {
  if (!selected) return;
  const res = await fetch(`/api/seats/${selected.movieId}/${selected.time}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  q('seat-grid').innerHTML = '';
  Object.entries(data.seats).forEach(([id, seat]) => {
    const b = document.createElement('button');
    b.className = `seat ${seat.status}`;
    b.textContent = id;
    b.disabled = seat.status !== 'available';
    b.onclick = () => reserveSeat(id);
    q('seat-grid').appendChild(b);
  });
}

async function reserveSeat(seatId) {
  const res = await fetch('/api/reserve', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ movieId: selected.movieId, time: selected.time, seatId })
  });
  const data = await res.json();
  q('seat-msg').textContent = data.message;
  if (res.ok) {
    holdKey = data.holdKey;
    q('payment-box').classList.remove('hidden');
  }
  renderSeats();
}

q('confirm-payment').onclick = async () => {
  const cardLast4 = q('card-last4').value.trim();
  const paymentCode = q('payment-code').value.trim();
  const res = await fetch('/api/confirm-payment', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ holdKey, cardLast4, paymentCode })
  });
  q('seat-msg').textContent = (await res.json()).message;
  renderSeats();
};
