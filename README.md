# 🎪 Virtual Carnival

A multiplayer carnival web app with **5 games**, a **Ruby (Sinatra) REST API**, **MySQL** for persistence, and a **Bootstrap 5 + Canvas** frontend.

> Built to your spec. If you've never used Ruby before, follow this README step by step — it'll work end-to-end.

---

## 1. Project Structure

```
virtual_carnival/
├── app.rb                  # Sinatra app + REST API
├── config.ru               # Rack entrypoint
├── Gemfile                 # Ruby dependencies
├── README.md               # this file
├── config/
│   └── database.yml        # DB connection settings — EDIT YOUR PASSWORD HERE
├── db/
│   ├── schema.sql          # tables, triggers, stored procedures
│   └── seed.sql            # seeds the 5 games
├── public/                 # served as static files
│   ├── css/styles.css      # all styling + 5 color palettes
│   ├── js/                 # frontend logic
│   │   ├── api.js          # REST client
│   │   ├── session.js      # current-session players + medals
│   │   ├── palette.js      # palette switcher
│   │   ├── audio.js        # background music + SFX
│   │   ├── dice.js         # 18-sided dice animation
│   │   ├── game_common.js  # shared helpers
│   │   ├── game_ducks.js
│   │   ├── game_darts.js
│   │   ├── game_horses.js
│   │   ├── game_memory.js
│   │   └── game_striker.js
│   ├── images/             # ⬅ YOU drop the carnival images here (see §5)
│   ├── audio/              # ⬅ YOU drop the music + SFX here (see §5)
│   └── uploads/            # auto-created — player profile photos
└── views/                  # ERB templates
    ├── layout.erb
    ├── index.erb           # title screen
    ├── games.erb           # games carousel
    ├── game_ducks.erb
    ├── game_darts.erb
    ├── game_horses.erb
    ├── game_memory.erb
    └── game_striker.erb
```

---

## 2. Install Ruby (first time only)

You need **Ruby 3.0 or newer** and the **MySQL client libraries** for the `mysql2` gem.

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install ruby-full build-essential libmysqlclient-dev
```

### macOS (with Homebrew)
```bash
brew install ruby mysql
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Windows
1. Download and install **RubyInstaller with DevKit** from https://rubyinstaller.org/
2. During install, also install MSYS2 dev tools when prompted.
3. Install MySQL Server: https://dev.mysql.com/downloads/installer/

Verify:
```bash
ruby -v          # should print 3.0+
gem -v
```

---

## 3. Install MySQL & Create the Database

1. Make sure MySQL Server is running (`brew services start mysql`, or `sudo systemctl start mysql`, or the Windows service).
2. From the project root:
   ```bash
   mysql -u root -p < db/schema.sql
   mysql -u root -p < db/seed.sql
   ```
3. Open `config/database.yml` and edit `password:` to match your MySQL root password (or change `username:` to your own DB user).

---

## 4. Install Project Dependencies

From the project root:
```bash
gem install bundler            # one-time
bundle install
```

If `mysql2` fails to compile, you're missing the MySQL client headers — see step 2.

---

## 5. Drop in Images and Audio

The app expects the following assets. Place them in `public/images/` and `public/audio/` with these EXACT filenames:

### `public/images/`
| filename | what it is |
|---|---|
| `bg_start.png`     | Background for the title screen (any carnival/circus shot, ideally 1920×1080) |
| `bg_games.png`     | Background for the games carousel page (different from above) |
| `stand_ducks.png`  | "Pick the Ducks" stand image (used as carousel slide AND blurred behind the game) |
| `stand_darts.png`  | "Balloon Darts" stand image |
| `stand_horses.png` | "Horse Races" stand image |
| `stand_memory.png` | "Scam Memory Cups" stand image |
| `stand_striker.png`| "High Striker" stand image |
| `default_avatar.svg` | (already provided) default profile photo |

> Also OK to use `.jpg` instead of `.png` — but if you do, edit the `image_path` rows in `db/seed.sql` to match.

### `public/audio/`
| filename | what it is |
|---|---|
| `bgm_start.mp3`   | Music for the title screen and games carousel |
| `game_ducks.mp3`  | Music inside the ducks game |
| `game_darts.mp3`  | Music inside the darts game |
| `game_horses.mp3` | Music inside the horse-races game |
| `game_memory.mp3` | Music inside the cup-shuffle game |
| `game_striker.mp3`| Music inside the high-striker game |
| `sfx_quack.mp3`   | (optional) duck-catch SFX |
| `sfx_pop.mp3`     | (optional) balloon pop SFX |
| `sfx_strike.mp3`  | (optional) strength-tester thump SFX |
| `sfx_win.mp3`     | (optional) bet-won SFX |
| `sfx_lose.mp3`    | (optional) bet-lost SFX |

> SFX files are optional — the app gracefully ignores missing audio.

---

## 6. Run the App

```bash
bundle exec ruby app.rb
```

Or via Rack:
```bash
bundle exec rackup -p 4567
```

Open http://localhost:4567 in your browser.

---

## 7. How It Works

### Title screen
- Pick a color palette (5 included — pastel pink, fuchsia/black, blue/purple, mint, dark carnival).
- Type a username and click **Add Player** — repeat for each carnival-goer. New usernames create a DB row, existing ones are loaded.
- Click **Start Game** to enter the games hall.
- Click **Scoreboards** for global per-game tables. Inside the modal:
  - **Reset Score** and **Delete Player** both ask for *double* confirmation.
  - **Double-click a username** → inline rename, saved instantly.
  - **Double-click a profile photo** → upload a new image (saved to `public/uploads/`).

### Games hall
- Bootstrap carousel of the 5 stands. Hover any stand for a glowing pulse animation.
- Each stand has: a **Play** button and a **View Top Scores** button (per-game leaderboard, top score only).
- A floating **Session Medals** panel tracks who's ahead this session.
- **End Game** button (top-left) clears the session and returns to the title screen.

### Inside a game
- Each game starts with an animated 18-sided **dice roll** for turn order (except Horse Races).
- HUD: title, time counter (where applicable), live side scoreboard with the active player highlighted.
- Background = the stand image, blurred and dimmed.
- Each game has its own background music; SFX play on key events.

### After every game
- A results modal shows the ranking and the winner.
- The winner is awarded a **session medal** AND a `times_won` increment in the database. Personal max & last scores are committed via the `register_play()` stored procedure — a trigger updates `max_score` automatically when needed.
- Choose **Play Again** (scores stack, then commit again) or **Back to Games**.

---

## 8. The Database

Tables:
- **players** — `id`, `username` (unique), `photo_path`, `games_won`, `total_plays`, timestamps.
- **games** — `id`, `code`, `name`, `description`, `image_path`, `music_path`.
- **player_games** — many-to-many: `player_id`, `game_id`, `max_score`, `last_score`, `times_won`, `last_played_at`.
- **score_history** — append-only audit log of every play.

Logic objects:
- **Trigger `trg_player_games_maxscore`** — automatically keeps `max_score` ≥ `last_score` on UPDATE.
- **Procedure `register_play(player_id, game_id, score, won)`** — upserts into `player_games`, logs to `score_history`, increments `total_plays`, awards medal if `won = TRUE`.
- **Procedure `reset_player_scores(player_id)`** — wipes a single player's scores in one call.

---

## 9. REST API Reference

All JSON. Base path `/api`.

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/api/games`                          | List the 5 games |
| `GET`    | `/api/players`                        | List all players |
| `GET`    | `/api/players/:id`                    | Player + per-game scores |
| `GET`    | `/api/players/by_username/:username`  | Lookup by username |
| `POST`   | `/api/players`                        | `{ "username": "..." }` — create or load existing |
| `PATCH`  | `/api/players/:id`                    | `{ "username": "newname" }` — rename |
| `POST`   | `/api/players/:id/photo`              | `multipart/form-data` field `photo` |
| `PATCH`  | `/api/players/:id/scores`             | `{ "game_id": 1, "score": 120, "won": true }` |
| `DELETE` | `/api/players/:id/scores`             | reset scores to 0 |
| `DELETE` | `/api/players/:id`                    | hard-delete player |
| `GET`    | `/api/scoreboard/:game_code`          | top 100 for one game |
| `GET`    | `/api/scoreboards`                    | all scoreboards in one call |

---

## 10. Game Rules Recap

| Game | Win condition | Notable mechanics |
|---|---|---|
| **Pick the Ducks** | Highest score wins | 30→0 timer (unit = 1.5s real). Ducks: 🟡10pt, 🔵15pt, 🩷25pt, ⚫50pt (one per game). Cursor shakes. |
| **Balloon Darts**  | Highest score wins | 0.5s throw cooldown, no hold. Wall scales 5×5 → 7×7 → 10×10 as time runs down. |
| **Horse Races**    | Most points after N races (= player count) wins | 7 horses, predetermined winner each race. **+5 × streak length** bonus when same player wins consecutive races. |
| **Scam Memory**    | Most money wins (or none, if everyone bankrupts) | $1000 start, 4 bets/tries each. Ball relocates to a *random* cup after the shuffle (it's the SCAM). Bankrupt players are skipped. |
| **High Striker**   | Highest single hit wins | Marker oscillates on a lane; the closer to the random target, the higher the raw score (0–100). Time multiplier (faster = up to 2×). Bonus for **perfect** hits (+25), **on-fire after-perfect** (+10), and **consecutive close** streaks (+5×streak). |

Ties on any game start a sudden-death extra round between the tied players.

---

## 11. Common Issues

- **`Mysql2::Error: Access denied`** → fix the password in `config/database.yml`.
- **`LoadError: cannot load mysql2`** → install the MySQL client headers (see §2) and `bundle install` again.
- **Music doesn't autoplay** → modern browsers block autoplay until the user clicks/keys. Just click anywhere on the page once.
- **Profile photo upload fails** → make sure the `public/uploads/` folder is writable.

---

## 12. Extending

- Add a new color palette: paste a new `body[data-palette="..."]` block into `public/css/styles.css` and a new `<span class="palette-swatch">` in `views/index.erb`.
- Add a new SFX: drop the file into `public/audio/` and call `AudioManager.sfx('/audio/your.mp3')` from any game JS.
- Add a sixth game: copy any of the `views/game_*.erb` + `public/js/game_*.js` pair, register a new game in `db/seed.sql`, add the route in `app.rb`'s valid list.

Have fun. 🎡
