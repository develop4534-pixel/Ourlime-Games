# GLITCH GARDEN

A 2D platform adventure (HTML5 Canvas + vanilla JavaScript, no dependencies, no build step).

## Run it
- Double-click `index.html`, or
- `python3 -m http.server` in this folder and open http://localhost:8000, or
- Open `glitch-garden-standalone.html` (everything bundled into one file; rebuild with `python3 tools/build_standalone.py`).

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys / A, D | on-screen arrows |
| Jump (hold = higher) | Space / W / Up | orange button |
| Pause | Esc / P | pause button (top right) |
| Menus | Mouse, Tab, Arrow keys, Enter | tap |

## Screens
Welcome, Main Menu (Play, Levels, How to Play, Settings, Credits), Level Select with locks, Gameplay + HUD, Pause, Victory, Game Over.
Levels: Sunny Garden, Floating Islands, Glitch Wilderness (unlocked in order; progress saved in localStorage).

## Files
- `index.html`, `css/style.css` – screens and the wood-and-vine UI kit
- `js/util.js` – save data (validated), input, helpers
- `js/audio.js` – procedural music and sound effects (Web Audio)
- `js/levels.js` – level data
- `js/game.js` – physics, collisions, items, hazards, camera
- `js/render.js` – responsive canvas rendering, parallax, robot, effects
- `js/ui.js`, `js/main.js` – screen manager, HUD, state machine, game loop
- `assets/` – cover art in several sizes (cover, logo and robot crops)
