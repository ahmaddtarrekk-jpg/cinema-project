const state = {
  token: null,
  role: 'user',
  name: '',
  msg: '',
  catalog: [],
  chatOpen: true,
  chatInput: 'اعرض كل الافلام',
  chatHistory: [],
  suggestions: [],
  selected: null,
  seats: {},
  holdKey: '',
  amount: 0,
  cardNumber: '4242 4242 4242 4242',
  cardHolder: 'Demo User',
  expMonth: '12',
  expYear: '2029',
  cvv: '123',
  paymentIntentId: '',
  otp: '',
  demoOtp: '',
  adminOverview: null,
  adminBookings: []
};

const app = document.getElementById('app');
const api = async (path, method='GET', body) => {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? {'Content-Type':'application/json'} : {}),
      ...(state.token ? {Authorization:`Bearer ${state.token}`} : {})
    },
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

function allMovies() {
  return state.catalog.flatMap(c => c.movies.map(m => ({...m, cinemaId:c.id, cinemaName:c.name, city:c.city, heroImage:c.heroImage})));
}

function renderLogin() {
  app.innerHTML = `
  <div class="login-page" style="background-image:linear-gradient(120deg, rgba(8,9,19,.75), rgba(22,10,25,.72)), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1900&q=80')">
    <div class="aurora a1"></div><div class="aurora a2"></div><div class="aurora a3"></div>
    <div class="login-card">
      <h1>🎬 CineBook Pro</h1>
      <p>تجربة حجز سينما احترافية</p>
      <input id="email" value="demo@cinema.com" placeholder="Email" />
      <input id="password" type="password" value="123456" placeholder="Password" />
      <button id="loginBtn">Login</button>
      <small>${state.msg || ''}</small>
      <small>Admin: admin@cinema.com / admin123</small>
    </div>
  </div>`;
  document.getElementById('loginBtn').onclick = login;
}

async function login() {
  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const data = await api('/api/login', 'POST', {email, password});
    state.token = data.token; state.name = data.name; state.role = data.role;
    await loadCatalog();
    if (state.role === 'admin') await loadAdmin();
    render();
  } catch (e) { state.msg = e.message; renderLogin(); }
}

async function loadCatalog() { const data = await api('/api/catalog'); state.catalog = data.cinemas; }
async function loadAdmin() {
  const [overview, bookings] = await Promise.all([api('/api/admin/overview'), api('/api/admin/bookings')]);
  state.adminOverview = overview; state.adminBookings = bookings.bookings;
}

async function askChat() {
  try {
    const data = await api('/api/chat', 'POST', {message: state.chatInput});
    state.chatHistory.push({role:'user', text:state.chatInput}, {role:'bot', text:data.reply});
    state.suggestions = data.suggestions; state.chatInput = '';
    render();
  } catch (e) { state.msg = e.message; render(); }
}

async function pickMovie(idx) {
  const option = state.suggestions[idx];
  state.selected = { option, movie: option.movie, time: option.movie.times[0] };
  state.holdKey=''; state.paymentIntentId=''; state.demoOtp='';
  await loadSeats();
  render();
}

async function loadSeats() {
  if (!state.selected) return;
  const data = await api(`/api/seats/${state.selected.movie.id}/${state.selected.time}`);
  state.seats = data.seats;
}

async function reserveSeat(seatId) {
  try {
    const d = await api('/api/reserve','POST',{movieId:state.selected.movie.id,time:state.selected.time,seatId});
    state.msg=d.message; state.holdKey=d.holdKey; state.amount=d.amount;
    await loadSeats(); render();
  } catch(e){ state.msg=e.message; render(); }
}

async function createPaymentIntent() {
  try {
    const d = await api('/api/create-payment-intent','POST',{holdKey:state.holdKey,cardNumber:state.cardNumber,cardHolder:state.cardHolder,expMonth:state.expMonth,expYear:state.expYear,cvv:state.cvv});
    state.paymentIntentId=d.paymentIntentId; state.demoOtp=d.demoOtp; state.msg=d.message; render();
  } catch(e){ state.msg=e.message; render(); }
}

async function confirmPayment() {
  try {
    const d = await api('/api/confirm-payment','POST',{paymentIntentId:state.paymentIntentId, otp:state.otp});
    state.msg=d.message; state.holdKey=''; state.paymentIntentId=''; state.demoOtp=''; await loadSeats(); render();
  } catch(e){ state.msg=e.message; render(); }
}

async function addMovie() {
  try {
    const f = Object.fromEntries(new FormData(document.getElementById('adminForm')).entries());
    await api('/api/admin/movies','POST',f); state.msg='Movie added'; await loadCatalog(); await loadAdmin(); render();
  } catch(e){ state.msg=e.message; render(); }
}

function renderAdmin() {
  const movies = allMovies();
  app.innerHTML = `
  <div class="admin-wrap">
    <aside class="admin-sidebar"><h2>🎞️ Admin</h2><p>${state.name}</p><button id="logout">Logout</button></aside>
    <main class="admin-main">
      <section class="kpis">
        <div class="kpi"><h4>Total Revenue</h4><strong>${state.adminOverview?.totalRevenue || 0} EGP</strong></div>
        <div class="kpi"><h4>Bookings</h4><strong>${state.adminOverview?.bookingsCount || 0}</strong></div>
        <div class="kpi"><h4>Customers</h4><strong>${state.adminOverview?.customersCount || 0}</strong></div>
        <div class="kpi"><h4>Top Movie</h4><strong>${state.adminOverview?.topMovie?.title || '-'}</strong></div>
      </section>
      <section class="panel admin-form"><h3>➕ Add New Movie</h3>
        <form id="adminForm" class="grid4">
          <select name="cinemaId">${state.catalog.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
          <input name="title" placeholder="Title" required />
          <input name="genre" placeholder="Genre" value="Drama" />
          <input name="price" placeholder="Price" value="180" />
          <input name="rating" placeholder="Rating" value="8" />
          <input name="times" placeholder="18:00,21:00" value="18:00,21:00" />
          <input name="moods" placeholder="sad,deep" value="sad,deep" />
          <input name="poster" placeholder="Poster URL" />
        </form>
        <button id="addMovie">Save Movie</button>
      </section>
      <section class="panel"><h3>🎬 Movies Library</h3><div class="admin-movies-grid">${movies.map(m=>`<article class="mini-card"><img src="${m.poster}"/><div><strong>${m.title}</strong><p>${m.cinemaName} • ${m.price} EGP</p></div></article>`).join('')}</div></section>
      <section class="panel"><h3>🧾 Latest Bookings</h3><table class="booking-table"><thead><tr><th>Customer</th><th>Cinema</th><th>Movie</th><th>Seat</th><th>Amount</th><th>Time</th></tr></thead><tbody>${state.adminBookings.map(b=>`<tr><td>${b.customer}</td><td>${b.cinema}</td><td>${b.movie}</td><td>${b.seatId}</td><td>${b.amount}</td><td>${b.time}</td></tr>`).join('')}</tbody></table></section>
      <p class="status">${state.msg || ''}</p>
    </main>
  </div>`;
  document.getElementById('logout').onclick = () => location.reload();
  document.getElementById('addMovie').onclick = addMovie;
}

function renderUser() {
  const movies = allMovies();
  const heroBg = state.selected?.option?.heroImage || state.catalog[0]?.heroImage || '';
  app.innerHTML = `
  <div class="app-shell">
    <section class="hero" style="background-image:linear-gradient(180deg, rgba(5,6,14,.2), rgba(5,6,14,.95)), url('${heroBg}')">
      <header class="topbar"><h2>CineBook</h2><div class="user-pill">${state.name}</div><button id="logout">Logout</button></header>
      <div class="hero-copy"><h1>اختار سينيمتك</h1><p>تجربة مرتبة، Animated، وسريعة</p></div>
    </section>
    <section class="movies-panel"><h3>ترشيحات البوت</h3><div class="cards">${state.suggestions.map((o,i)=>`<article class="card"><img src="${o.movie.poster}"/><div class="card-body"><h4>${o.movie.title}</h4><p>${o.movie.genre} • ⭐ ${o.movie.rating}</p><p>${o.cinemaName} - ${o.city}</p><p class="times">${o.movie.times.join(' • ')}</p><p class="price">${o.movie.price} EGP</p><button class="pick" data-i="${i}">احجز الآن</button></div></article>`).join('')}</div></section>
    <section class="catalog-panel"><h3>كل الأفلام</h3><div class="mini-grid">${movies.map(m=>`<div class="mini-card"><img src="${m.poster}"/><div><strong>${m.title}</strong><p>${m.genre} - ${m.price} EGP</p></div></div>`).join('')}</div></section>
    ${state.selected ? `<section class="panel seat-panel"><h3>💺 ${state.selected.movie.title}</h3><p>${state.selected.time} • ${state.selected.movie.price} EGP</p><div class="seat-grid">${Object.entries(state.seats).map(([id,s])=>`<button class="seat ${s.status}" ${s.status!=='available'?'disabled':''} data-seat="${id}">${id}</button>`).join('')}</div>
      ${state.holdKey ? `<div class="payment-box"><h4>💳 Payment</h4><p>Amount: ${state.amount} EGP</p>
      <div class="row two"><input id="cardNumber" value="${state.cardNumber}"/><input id="cardHolder" value="${state.cardHolder}"/></div>
      <div class="row three"><input id="expMonth" value="${state.expMonth}"/><input id="expYear" value="${state.expYear}"/><input id="cvv" value="${state.cvv}"/></div>
      <button id="createPayment">Create Payment Intent</button>
      ${state.paymentIntentId ? `<p class="hint">Demo OTP: ${state.demoOtp}</p><div class="row"><input id="otp" value="${state.otp}" placeholder="OTP"/><button id="confirmPayment">Confirm</button></div>` : ''}
      </div>` : ''}
      <p class="status">${state.msg || ''}</p></section>` : ''}
    <button class="chat-fab" id="chatFab">💬</button>
    ${state.chatOpen ? `<section class="chat-floating"><h4>مساعدك السينمائي</h4><div class="chat-box">${state.chatHistory.length===0?'<div class="chat bot">أهلًا 👋 قولي مودك.</div>':''}${state.chatHistory.map(c=>`<div class="chat ${c.role}">${c.text}</div>`).join('')}</div><div class="chat-input-row"><input id="chatInput" value="${state.chatInput}" placeholder="اكتب رسالتك..." /><button id="sendChat">ارسال</button></div></section>`:''}
  </div>`;

  document.getElementById('logout').onclick = () => location.reload();
  document.getElementById('chatFab').onclick = () => { state.chatOpen=!state.chatOpen; render(); };
  const chatInput=document.getElementById('chatInput'); if(chatInput) chatInput.oninput=e=>state.chatInput=e.target.value;
  const sendBtn=document.getElementById('sendChat'); if(sendBtn) sendBtn.onclick=askChat;
  document.querySelectorAll('.pick').forEach(b=>b.onclick=()=>pickMovie(Number(b.dataset.i)));
  document.querySelectorAll('[data-seat]').forEach(b=>b.onclick=()=>reserveSeat(b.dataset.seat));
  const cpay=document.getElementById('createPayment'); if(cpay) cpay.onclick=()=>{
    state.cardNumber=document.getElementById('cardNumber').value;
    state.cardHolder=document.getElementById('cardHolder').value;
    state.expMonth=document.getElementById('expMonth').value;
    state.expYear=document.getElementById('expYear').value;
    state.cvv=document.getElementById('cvv').value;
    createPaymentIntent();
  };
  const conf=document.getElementById('confirmPayment'); if(conf) conf.onclick=()=>{ state.otp=document.getElementById('otp').value; confirmPayment(); };
}

function render() {
  if (!state.token) return renderLogin();
  if (state.role === 'admin') return renderAdmin();
  return renderUser();
}

render();
