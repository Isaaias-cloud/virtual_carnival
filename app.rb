# =====================================================
# Virtual Carnival - Sinatra REST API + view server
# =====================================================
require 'sinatra'
require 'sinatra/json'
require 'mysql2'
require 'yaml'
require 'json'
require 'fileutils'
require 'securerandom'

set :bind, '0.0.0.0'
set :port, 4567
set :public_folder, File.expand_path('public', __dir__)
set :views,         File.expand_path('views',  __dir__)

# ----- DB connection helper -----
DB_CONFIG = YAML.load_file(File.expand_path('config/database.yml', __dir__))['development']

def db
  Thread.current[:db] ||= Mysql2::Client.new(
    host:     DB_CONFIG['host'],
    port:     DB_CONFIG['port'],
    username: DB_CONFIG['username'],
    password: DB_CONFIG['password'],
    database: DB_CONFIG['database'],
    encoding: DB_CONFIG['encoding'],
    reconnect: true,
    symbolize_keys: false
  )
end

UPLOAD_DIR = File.expand_path('public/uploads', __dir__)
FileUtils.mkdir_p(UPLOAD_DIR)

# =====================================================
# VIEWS
# =====================================================
get '/' do
  erb :index
end

get '/games' do
  erb :games
end

get '/game/:code' do
  code = params[:code]
  valid = %w[ducks darts horses memory striker]
  halt 404 unless valid.include?(code)
  @game_code = code
  erb :"game_#{code}"
end

# =====================================================
# REST API
# =====================================================

before '/api/*' do
  content_type :json
end

# ---- helpers ----
def player_to_hash(row)
  {
    id:          row['id'],
    username:    row['username'],
    photo_path:  row['photo_path'],
    games_won:   row['games_won'],
    total_plays: row['total_plays']
  }
end

def fetch_player_full(id)
  player = db.query("SELECT * FROM players WHERE id = #{id.to_i}").first
  return nil unless player
  scores = db.query(<<~SQL).to_a
    SELECT g.id AS game_id, g.code, g.name,
           COALESCE(pg.max_score, 0)  AS max_score,
           COALESCE(pg.last_score, 0) AS last_score,
           COALESCE(pg.times_won, 0)  AS times_won
    FROM games g
    LEFT JOIN player_games pg
      ON pg.game_id = g.id AND pg.player_id = #{id.to_i}
    ORDER BY g.id
  SQL
  player_to_hash(player).merge(scores: scores)
end

# ---- GAMES ----
get '/api/games' do
  rows = db.query('SELECT * FROM games ORDER BY id').to_a
  json rows
end

# ---- PLAYERS ----
get '/api/players' do
  rows = db.query('SELECT * FROM players ORDER BY username').to_a
  json rows.map { |r| player_to_hash(r) }
end

get '/api/players/:id' do
  p = fetch_player_full(params[:id])
  halt 404, { error: 'not found' }.to_json unless p
  json p
end

get '/api/players/by_username/:username' do
  uname = db.escape(params[:username])
  row = db.query("SELECT id FROM players WHERE username = '#{uname}' LIMIT 1").first
  halt 404, { error: 'not found' }.to_json unless row
  json fetch_player_full(row['id'])
end

post '/api/players' do
  payload = JSON.parse(request.body.read) rescue {}
  username = (payload['username'] || '').to_s.strip
  halt 400, { error: 'username required' }.to_json if username.empty?
  halt 400, { error: 'username too long' }.to_json if username.length > 40

  uname = db.escape(username)
  existing = db.query("SELECT id FROM players WHERE username = '#{uname}' LIMIT 1").first
  if existing
    json fetch_player_full(existing['id'])
  else
    db.query("INSERT INTO players (username) VALUES ('#{uname}')")
    new_id = db.last_id
    json fetch_player_full(new_id)
  end
end

# Rename player
patch '/api/players/:id' do
  payload = JSON.parse(request.body.read) rescue {}
  id = params[:id].to_i
  if payload['username']
    uname = db.escape(payload['username'].to_s.strip)
    halt 400, { error: 'username empty' }.to_json if uname.empty?
    begin
      db.query("UPDATE players SET username = '#{uname}' WHERE id = #{id}")
    rescue Mysql2::Error => e
      halt 409, { error: 'username already taken' }.to_json
    end
  end
  json fetch_player_full(id)
end

# Upload photo
post '/api/players/:id/photo' do
  id = params[:id].to_i
  halt 400, { error: 'no file' }.to_json unless params[:photo] && params[:photo][:tempfile]

  tempfile  = params[:photo][:tempfile]
  ext       = File.extname(params[:photo][:filename]).downcase
  ext       = '.png' unless %w[.png .jpg .jpeg .gif .webp].include?(ext)
  filename  = "player_#{id}_#{SecureRandom.hex(4)}#{ext}"
  dest      = File.join(UPLOAD_DIR, filename)
  FileUtils.cp(tempfile.path, dest)

  rel_path = "/uploads/#{filename}"
  db.query("UPDATE players SET photo_path = '#{db.escape(rel_path)}' WHERE id = #{id}")
  json fetch_player_full(id)
end

# Update score for a game
patch '/api/players/:id/scores' do
  payload = JSON.parse(request.body.read) rescue {}
  id       = params[:id].to_i
  game_id  = payload['game_id'].to_i
  score    = payload['score'].to_i
  won      = payload['won'] ? 1 : 0
  halt 400, { error: 'game_id and score required' }.to_json if game_id.zero?

  db.query("CALL register_play(#{id}, #{game_id}, #{score}, #{won})")
  json fetch_player_full(id)
end

# Reset scores
delete '/api/players/:id/scores' do
  id = params[:id].to_i
  db.query("CALL reset_player_scores(#{id})")
  json fetch_player_full(id)
end

# Delete player completely
delete '/api/players/:id' do
  id = params[:id].to_i
  db.query("DELETE FROM players WHERE id = #{id}")
  json({ deleted: id })
end

# ---- SCOREBOARDS ----
get '/api/scoreboard/:game_code' do
  code = db.escape(params[:game_code])
  rows = db.query(<<~SQL).to_a
    SELECT p.id, p.username, p.photo_path,
           pg.max_score, pg.last_score, pg.times_won
    FROM players p
    JOIN player_games pg ON pg.player_id = p.id
    JOIN games g         ON g.id = pg.game_id
    WHERE g.code = '#{code}'
    ORDER BY pg.max_score DESC, pg.last_score DESC
    LIMIT 100
  SQL
  json rows
end

# Aggregate scoreboard for ALL games (used on start page)
get '/api/scoreboards' do
  games = db.query('SELECT * FROM games ORDER BY id').to_a
  result = games.map do |g|
    rows = db.query(<<~SQL).to_a
      SELECT p.id, p.username, p.photo_path,
             pg.max_score, pg.last_score, pg.times_won
      FROM players p
      JOIN player_games pg ON pg.player_id = p.id
      WHERE pg.game_id = #{g['id'].to_i}
      ORDER BY pg.max_score DESC, pg.last_score DESC
      LIMIT 50
    SQL
    g.merge('scores' => rows)
  end
  json result
end

# ----- error handlers -----
not_found do
  if request.path_info.start_with?('/api/')
    content_type :json
    { error: 'not found' }.to_json
  else
    'Page not found'
  end
end

error do |e|
  if request.path_info.start_with?('/api/')
    content_type :json
    status 500
    { error: e.message }.to_json
  else
    "Server error: #{e.message}"
  end
end
