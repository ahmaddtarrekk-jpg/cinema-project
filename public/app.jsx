const { useMemo, useState, useEffect } = React;

const api = async (path, method = 'GET', token, body) => {
  const response = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

function App() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@cinema.com');
  const [password, setPassword] = useState('123456');
  const [msg, setMsg] = useState('');

  const [catalog, setCatalog] = useState([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('اعرض كل الافلام');
  const [chatHistory, setChatHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [selected, setSelected] = useState(null);
  const [seats, setSeats] = useState({});
  const [holdKey, setHoldKey] = useState('');
  const [amount, setAmount] = useState(0);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('Demo User');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2029');
  const [cvv, setCvv] = useState('123');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  const [adminOverview, setAdminOverview] = useState(null);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminForm, setAdminForm] = useState({ cinemaId: 'cairo-downtown', title: '', genre: 'Drama', moods: 'sad,deep', duration: '110', rating: '8', price: '180', times: '18:00,21:00', poster: '' });

  const allMovies = useMemo(() => catalog.flatMap((c) => c.movies.map((m) => ({ ...m, cinemaId: c.id, cinemaName: c.name, city: c.city, heroImage: c.heroImage }))), [catalog]);
  const heroBg = selected?.option?.heroImage || catalog[0]?.heroImage || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80';

  useEffect(() => {
    if (!token) return;
    refreshCatalog();
    if (role === 'admin') {
      loadAdmin();
      setChatOpen(false);
    }
  }, [token, role]);

  useEffect(() => {
    if (!token || !selected) return;
    const events = new EventSource(`/api/events?movieId=${selected.movie.id}&time=${selected.time}&token=${token}`);
    events.onmessage = () => loadSeats(selected);
    return () => events.close();
  }, [token, selected]);

  const refreshCatalog = async () => {
    try {
      const data = await api('/api/catalog', 'GET', token);
      setCatalog(data.cinemas);
    } catch (e) { setMsg(e.message); }
  };

  const loadAdmin = async () => {
    try {
      const [overview, bookings] = await Promise.all([
        api('/api/admin/overview', 'GET', token),
        api('/api/admin/bookings', 'GET', token)
      ]);
      setAdminOverview(overview);
      setAdminBookings(bookings.bookings);
    } catch (e) { setMsg(e.message); }
  };

  const login = async () => {
    try {
      const data = await api('/api/login', 'POST', null, { email, password });
      setToken(data.token); setName(data.name); setRole(data.role || 'user'); setMsg('');
    } catch (e) { setMsg(e.message); }
  };

  const askChat = async () => {
    if (!chatInput.trim()) return;
    try {
      const data = await api('/api/chat', 'POST', token, { message: chatInput });
      setChatHistory((p) => [...p, { role: 'user', text: chatInput }, { role: 'bot', text: data.reply }]);
      setSuggestions(data.suggestions);
      setChatInput('');
    } catch (e) { setMsg(e.message); }
  };

  const pickMovie = async (option) => {
    const selectedItem = { option, movie: option.movie, time: option.movie.times[0] };
    setSelected(selectedItem);
    setHoldKey(''); setPaymentIntentId(''); setDemoOtp('');
    await loadSeats(selectedItem);
  };

  const loadSeats = async (selectedItem = selected) => {
    if (!selectedItem) return;
    try {
      const data = await api(`/api/seats/${selectedItem.movie.id}/${selectedItem.time}`, 'GET', token);
      setSeats(data.seats);
    } catch (e) { setMsg(e.message); }
  };

  const reserveSeat = async (seatId) => {
    try {
      const data = await api('/api/reserve', 'POST', token, { movieId: selected.movie.id, time: selected.time, seatId });
      setMsg(data.message); setHoldKey(data.holdKey); setAmount(data.amount); loadSeats();
    } catch (e) { setMsg(e.message); }
  };

  const createPaymentIntent = async () => {
    try {
      const data = await api('/api/create-payment-intent', 'POST', token, { holdKey, cardNumber, cardHolder, expMonth, expYear, cvv });
      setPaymentIntentId(data.paymentIntentId); setDemoOtp(data.demoOtp); setMsg(data.message);
    } catch (e) { setMsg(e.message); }
  };

  const confirmPayment = async () => {
    try {
      const data = await api('/api/confirm-payment', 'POST', token, { paymentIntentId, otp });
      setMsg(data.message); setHoldKey(''); setPaymentIntentId(''); setDemoOtp(''); loadSeats();
      if (role === 'admin') loadAdmin();
    } catch (e) { setMsg(e.message); }
  };

  const addMovie = async () => {
    try {
      await api('/api/admin/movies', 'POST', token, adminForm);
      setMsg('Movie added successfully');
      await refreshCatalog();
      await loadAdmin();
    } catch (e) { setMsg(e.message); }
  };

  const updateMovie = async (movieId) => {
    try {
      await api(`/api/admin/movies/${movieId}`, 'PUT', token, { title: `${Date.now()} ${allMovies.find((m) => m.id === movieId)?.title || ''}`, price: 199 });
      setMsg('Movie updated');
      await refreshCatalog();
    } catch (e) { setMsg(e.message); }
  };

  if (!token) {
    return <div className="login-page" style={{ backgroundImage: "linear-gradient(120deg, rgba(8,9,19,.75), rgba(22,10,25,.72)), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1900&q=80')" }}>
      <div className="aurora a1"></div><div className="aurora a2"></div><div className="aurora a3"></div>
      <div className="login-card">
        <h1>🎬 CineBook Pro</h1>
        <p>تجربة حجز سينما احترافية</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
        <button onClick={login}>Login</button>
        <small>{msg}</small>
      </div>
    </div>;
  }

  if (role === 'admin') {
    return <div className="admin-wrap">
      <aside className="admin-sidebar">
        <h2>🎞️ Admin</h2>
        <p>Cinema control center</p>
      </aside>
      <main className="admin-main">
        <section className="kpis">
          <div className="kpi"><h4>Total Revenue</h4><strong>{adminOverview?.totalRevenue || 0} EGP</strong></div>
          <div className="kpi"><h4>Bookings</h4><strong>{adminOverview?.bookingsCount || 0}</strong></div>
          <div className="kpi"><h4>Customers</h4><strong>{adminOverview?.customersCount || 0}</strong></div>
          <div className="kpi"><h4>Top Movie</h4><strong>{adminOverview?.topMovie?.title || '-'}</strong></div>
        </section>

        <section className="panel admin-form">
          <h3>➕ Add New Movie</h3>
          <div className="grid4">
            <select value={adminForm.cinemaId} onChange={(e) => setAdminForm({ ...adminForm, cinemaId: e.target.value })}>{catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input placeholder="Title" value={adminForm.title} onChange={(e) => setAdminForm({ ...adminForm, title: e.target.value })} />
            <input placeholder="Genre" value={adminForm.genre} onChange={(e) => setAdminForm({ ...adminForm, genre: e.target.value })} />
            <input placeholder="Price" value={adminForm.price} onChange={(e) => setAdminForm({ ...adminForm, price: e.target.value })} />
            <input placeholder="Rating" value={adminForm.rating} onChange={(e) => setAdminForm({ ...adminForm, rating: e.target.value })} />
            <input placeholder="Times (18:00,21:00)" value={adminForm.times} onChange={(e) => setAdminForm({ ...adminForm, times: e.target.value })} />
            <input placeholder="Moods (comma separated)" value={adminForm.moods} onChange={(e) => setAdminForm({ ...adminForm, moods: e.target.value })} />
            <input placeholder="Poster URL" value={adminForm.poster} onChange={(e) => setAdminForm({ ...adminForm, poster: e.target.value })} />
          </div>
          <button onClick={addMovie}>Save Movie</button>
        </section>

        <section className="panel">
          <h3>🎬 Movies Library</h3>
          <div className="admin-movies-grid">
            {allMovies.map((m) => <article key={m.id} className="mini-card"><img src={m.poster} alt={m.title} /><div><strong>{m.title}</strong><p>{m.cinemaName} • {m.price} EGP</p><button onClick={() => updateMovie(m.id)}>Quick Update</button></div></article>)}
          </div>
        </section>

        <section className="panel">
          <h3>🧾 Latest Bookings</h3>
          <table className="booking-table"><thead><tr><th>Customer</th><th>Cinema</th><th>Movie</th><th>Seat</th><th>Amount</th><th>Time</th></tr></thead><tbody>{adminBookings.map((b, i) => <tr key={i}><td>{b.customer}</td><td>{b.cinema}</td><td>{b.movie}</td><td>{b.seatId}</td><td>{b.amount}</td><td>{b.time}</td></tr>)}</tbody></table>
        </section>
        <p className="status">{msg}</p>
      </main>
    </div>;
  }

  return <div className="app-shell">
    <section className="hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(5,6,14,.2), rgba(5,6,14,.95)), url('${heroBg}')` }}>
      <header className="topbar"><h2>CineBook</h2><div className="user-pill">{name}</div><button onClick={() => window.location.reload()}>Logout</button></header>
      <div className="hero-copy"><h1>اختار سينيمتك</h1><p>تجربة مرتبة، Animated، وسريعة</p></div>
    </section>

    <main className="content-grid">
      <section className="movies-panel full-width">
        <h3>ترشيحات البوت</h3>
        <div className="cards">
          {suggestions.map((option, i) => <article key={i} className="card"><img src={option.movie.poster} alt={option.movie.title} /><div className="card-body"><h4>{option.movie.title}</h4><p>{option.movie.genre} • ⭐ {option.movie.rating}</p><p>{option.cinemaName} - {option.city}</p><p className="times">{option.movie.times.join(' • ')}</p><p className="price">{option.movie.price} EGP</p><button onClick={() => pickMovie(option)}>احجز الآن</button></div></article>)}
        </div>
      </section>
    </main>

    <section className="catalog-panel"><h3>كل الأفلام</h3><div className="mini-grid">{allMovies.map((m) => <div key={`${m.id}-${m.cinemaName}`} className="mini-card"><img src={m.poster} alt={m.title} /><div><strong>{m.title}</strong><p>{m.genre} - {m.price} EGP</p></div></div>)}</div></section>

    {selected && <section className="panel seat-panel"><h3>💺 {selected.movie.title}</h3><p>{selected.time} • {selected.movie.price} EGP</p><div className="seat-grid">{Object.entries(seats).map(([seatId, seat]) => <button key={seatId} className={`seat ${seat.status}`} disabled={seat.status !== 'available'} onClick={() => reserveSeat(seatId)}>{seatId}</button>)}</div>
      {holdKey && <div className="payment-box"><h4>💳 Payment</h4><p>Amount: {amount} EGP</p><div className="row two"><input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} /><input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} /></div><div className="row three"><input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} /><input value={expYear} onChange={(e) => setExpYear(e.target.value)} /><input value={cvv} onChange={(e) => setCvv(e.target.value)} /></div><button onClick={createPaymentIntent}>Create Payment Intent</button>{paymentIntentId && <><p className="hint">Demo OTP: {demoOtp}</p><div className="row"><input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" /><button onClick={confirmPayment}>Confirm</button></div></>}</div>}
      <p className="status">{msg}</p>
    </section>}

    <button className="chat-fab" onClick={() => setChatOpen((v) => !v)}>💬</button>
    {chatOpen && <section className="chat-floating"><h4>مساعدك السينمائي</h4><div className="chat-box">{chatHistory.length === 0 && <div className="chat bot">أهلًا 👋 قولي مودك.</div>}{chatHistory.map((c, i) => <div key={i} className={`chat ${c.role}`}>{c.text}</div>)}</div><div className="chat-input-row"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="اكتب رسالتك..." /><button onClick={askChat}>ارسال</button></div></section>}
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
