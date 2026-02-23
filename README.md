# Cinema Pro Booking (React + Node)

A full-stack cinema booking project with a React frontend and a Node.js backend.

## Features
- Cinematic professional UI with animated login background.
- Real cinema-style hero sections and movie cards with rich images.
- AI-like chatbot that understands requests like:
  - "اعرض كل الافلام"
  - "انا زهقان"
  - "عايز فيلم دراما"
- Large movie catalog across multiple cinemas.
- Movie details with genre, rating, showtimes, and ticket price.
- Real-time seat updates for concurrent users (without refresh) using SSE.
- Seat lock/hold to prevent double booking.
- Payment flow with card validation + payment intent + OTP confirmation.

## Run
```bash
node server.js
```
Open: `http://localhost:3000`

## Demo credentials
- Email: `demo@cinema.com`
- Password: `123456`

## Notes on payment
This is a **sandbox/demo payment flow** that includes realistic validations:
- Card number (Luhn check)
- Card holder name
- Expiry month/year
- CVV
- OTP confirmation step
