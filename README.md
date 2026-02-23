# Cinema Booking Platform

A full-stack cinema booking demo with:
- Animated professional login screen.
- AI-style movie recommendation by mood/genre.
- Multiple cinemas and movies.
- Seat selection + reservation + payment confirmation.
- Real-time booking updates without refresh using Server-Sent Events.
- Backend seat locking to prevent double booking.

## Run
```bash
node server.js
```
Then open `http://localhost:3000`.

## Demo login
- Email: `demo@cinema.com`
- Password: `123456`

## Payment validation
To complete booking:
- Payment code must be: `PAYMENT-OK`
- Card last 4 digits: any 4 digits
