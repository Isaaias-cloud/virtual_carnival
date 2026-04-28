    USE virtual_carnival;

INSERT INTO games (code, name, description, image_path, music_path) VALUES
('ducks',      'Pick the Ducks',
    'Catch as many ducks as you can with your fishing rod before time runs out. Big yellow ducks are easy. Small pink ones are quick. The mythical black duck appears once per game.',
    '/images/stand_ducks.png',  '/audio/game_ducks.mp3'),
('darts',      'Balloon Darts',
    'Pop balloons on the wall with darts. The wall gets denser as the clock ticks down.',
    '/images/stand_darts.png',  '/audio/game_darts.mp3'),
('horses',     'Horse Races',
    'Pick the horse you think will win. Win the race for points. Win in a row for bonus points.',
    '/images/stand_horses.png', '/audio/game_horses.mp3'),
('memory',     'Scam Memory Cups',
    'Place a bet and follow the ball under the cups. But be warned: the cups are not honest.',
    '/images/stand_memory.png', '/audio/game_memory.mp3'),
('striker',    'High Striker',
    'Test your strength. Time the marker. Score up to 100 points multiplied by your speed bonus.',
    '/images/stand_striker.png','/audio/game_striker.mp3');
