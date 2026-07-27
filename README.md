# Veritas

Veritas is a dual-player realtime psychological perception game built with MongoDB, Express, React, Node.js, Socket.io, Tailwind CSS, Framer Motion, Lucide React, and Recharts.

## Project Structure

- `server`: Express, Socket.io, Mongoose models, question seed data, scoring engine.
- `client`: Vite React app with responsive dark glassmorphism UI.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Set `MONGO_URI` in `server/.env` to your MongoDB connection string and set `ADMIN_KEY` to the key you want for the admin dashboard. Then seed the question bank:

```bash
npm run seed
```

4. Run the backend and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

The client defaults to `http://localhost:5173` and the server defaults to `http://localhost:4000`.

## Gameplay Flow

1. A player enters their name, chooses the relationship type, and creates a room.
2. The second player enters their name and joins with the six-digit room code.
3. The first Target is chosen randomly. After that, Target and Observer/Asker alternate each round.
4. The Observer/Asker sees relationship-aware AI-style draft questions at the top.
5. The asker can copy a draft into the main input, edit it, or type a fully custom question.
6. The Target answers and marks the answer as truth or lie.
7. The Observer guesses the exact answer and whether it was truth or lie.
8. The synchronized reveal shows the game-relevant result to both players.
9. After ten rounds, Veritas calculates the final Predictability Index and Conformity Matrix.

## Admin Dashboard

Open:

```text
http://localhost:5173/admin
```

Enter the `ADMIN_KEY` from `server/.env`.

The admin dashboard shows session-level audit data, including player names, relationship type, who asked each question, whether the question came from an AI draft or custom input, final submitted question text, selected answers, truth/lie flags, guesses, and round audit events. This data is not shown to players during normal gameplay.

## Socket Events

Client to server:

- `create_room`
- `join_room`
- `submit_target_move`
- `submit_guest_guess`
- `submit_round_question`
- `next_round`

Server to client:

- `room_created`
- `joined_room`
- `player_joined`
- `game_started`
- `question_ready`
- `target_submitted`
- `reveal_countdown`
- `reveal_round`
- `game_over`
- `game_error`
- `player_disconnected`
# veins
