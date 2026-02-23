const { useMemo, useState, useEffect } = React;

const api = async (path, method = 'GET', token, body) => {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@cinema.com');
  const [password, setPassword] = useState('123456');
  const [loginMsg, setLoginMsg] = useState('');

  const [chatInput, setChatInput] = useState('اعرض كل الافلام الي عندك');
  const [chatHistory, setChatHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const [selected, setSelected] = useState(null);
  const [seats, setSeats] = useState({});
  const [seatMsg, setSeatMsg] = useState('');
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

  const allMovies = useMemo(() => catalog.flatMap((c) => c.movies.map((m) => ({ ...m, cinemaName: c.name, city: c.city }))), [catalog]);

  useEffect(() => {
    if (!token) return;
    api('/api/catalog', 'GET', token)
      .then((data) => setCatalog(data.cinemas))
      .catch((err) => setSeatMsg(err.message));
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    const events = new EventSource(`/api/events?movieId=${selected.movie.id}&time=${selected.time}&token=${token}`);
    events.onmessage = () => {
      setSeatMsg('Realtime update received');
      loadSeats(selected);
    };
    return () => events.close();
  }, [token, selected]);

  const login = async () => {
    try {
      const data = await api('/api/login', 'POST', null, { email, password });
      setToken(data.token);
      setName(data.name);
      setLoginMsg('');
    } catch (err) {
      setLoginMsg(err.message);
    }
  };

  const forgotPassword = async () => {
    try {
      const data = await api('/api/forgot-password', 'POST', null, { email });
      setLoginMsg(data.message);
    } catch (err) {
      setLoginMsg(err.message);
    }
  };

  const askChat = async () => {
    try {
      const data = await api('/api/chat', 'POST', token, { message: chatInput });
      setChatHistory((prev) => [...prev, { role: 'user', text: chatInput }, { role: 'bot', text: data.reply }]);
      setSuggestions(data.suggestions);
      setChatInput('');
    } catch (err) {
      setSeatMsg(err.message);
    }
  };

  const pickOption = async (option) => {
    const time = option.movie.times[0];
    const selectedItem = { option, movie: option.movie, time };
    setSelected(selectedItem);
    setHoldKey('');
    setPaymentIntentId('');
    setOtp('');
    setDemoOtp('');
    await loadSeats(selectedItem);
  };

  const loadSeats = async (selectedItem = selected) => {
    if (!selectedItem) return;
    try {
      const data = await api(`/api/seats/${selectedItem.movie.id}/${selectedItem.time}`, 'GET', token);
      setSeats(data.seats);
    } catch (err) {
      setSeatMsg(err.message);
    }
  };

  const reserveSeat = async (seatId) => {
    try {
      const data = await api('/api/reserve', 'POST', token, { movieId: selected.movie.id, time: selected.time, seatId });
      setSeatMsg(data.message);
      setHoldKey(data.holdKey);
      setAmount(data.amount);
      loadSeats();
    } catch (err) {
      setSeatMsg(err.message);
    }
  };

  const createPaymentIntent = async () => {
    try {
      const data = await api('/api/create-payment-intent', 'POST', token, {
        holdKey,
        cardNumber,
        cardHolder,
        expMonth,
        expYear,
        cvv
      });
      setSeatMsg(data.message);
      setPaymentIntentId(data.paymentIntentId);
      setDemoOtp(data.demoOtp);
    } catch (err) {
      setSeatMsg(err.message);
    }
  };

  const confirmPayment = async () => {
    try {
      const data = await api('/api/confirm-payment', 'POST', token, { paymentIntentId, otp });
      setSeatMsg(data.message);
      setHoldKey('');
      setPaymentIntentId('');
      setDemoOtp('');
      loadSeats();
    } catch (err) {
      setSeatMsg(err.message);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="blob b1"></div><div className="blob b2"></div><div className="blob b3"></div>
        <div className="login-card">
          <h1>🎬 Cinema Pro</h1>
          <p>احجز فيلمك بشكل احترافي وسريع</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
          <button onClick={login}>Login</button>
          <button className="ghost" onClick={forgotPassword}>Forget Password</button>
          {!!loginMsg && <small>{loginMsg}</small>}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header>
        <h2>Welcome, {name}</h2>
        <button onClick={() => window.location.reload()}>Logout</button>
      </header>

      <section className="panel">
        <h3>🤖 AI Cinema Chatbot</h3>
        <p>جرّب: "اعرض كل الافلام" أو "انا زهقان" أو "عايز فيلم دراما"</p>
        <div className="row">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="اكتب مزاجك او نوع الفيلم..." />
          <button onClick={askChat}>اسأل البوت</button>
        </div>
        <div className="chat-box">
          {chatHistory.map((msg, i) => <div key={i} className={`chat ${msg.role}`}>{msg.text}</div>)}
        </div>
        <div className="cards">
          {suggestions.map((option, i) => (
            <div key={i} className="card">
              <h4>{option.movie.title}</h4>
              <p>{option.movie.genre} • ⭐ {option.movie.rating}</p>
              <p>{option.cinemaName} - {option.city}</p>
              <p>Times: {option.movie.times.join(' | ')}</p>
              <p className="price">Price: {option.movie.price} EGP</p>
              <button onClick={() => pickOption(option)}>اختار الفيلم</button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>🎞️ كل الأفلام المتاحة ({allMovies.length})</h3>
        <div className="mini-grid">
          {allMovies.map((m) => <span key={`${m.id}-${m.cinemaName}`}>{m.title} ({m.genre}) - {m.price} EGP</span>)}
        </div>
      </section>

      {selected && (
        <section className="panel">
          <h3>💺 Seat Selection</h3>
          <p>{selected.movie.title} - {selected.time} - السعر {selected.movie.price} EGP</p>
          <div className="seat-grid">
            {Object.entries(seats).map(([seatId, seat]) => (
              <button
                key={seatId}
                className={`seat ${seat.status}`}
                disabled={seat.status !== 'available'}
                onClick={() => reserveSeat(seatId)}
              >
                {seatId}
              </button>
            ))}
          </div>

          {holdKey && (
            <div className="payment-box">
              <h4>💳 Secure Payment</h4>
              <p>Amount: {amount} EGP</p>
              <div className="row two">
                <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" />
                <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Card holder" />
              </div>
              <div className="row three">
                <input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" />
                <input value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY" />
                <input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="CVV" />
              </div>
              <button onClick={createPaymentIntent}>Create Payment Intent</button>

              {paymentIntentId && (
                <>
                  <p className="hint">Demo OTP: {demoOtp}</p>
                  <div className="row">
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
                    <button onClick={confirmPayment}>Confirm Payment</button>
                  </div>
                </>
              )}
            </div>
          )}
          {!!seatMsg && <p className="status">{seatMsg}</p>}
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
