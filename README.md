# 🍅 Tomato'd

Let Twitch chat throw tomatoes at you, live on stream.

<p align="center">
  <img src="docs/demo.gif" alt="A round of tomatoes thrown at a stream, then wiped" width="640">
</p>

A mod or the broadcaster types `!tomato`. A countdown appears, and for the next 30 seconds
anyone typing `TomatoTime` hurls a tomato from the viewer's side of the screen at the
streamer, where it splatters. Say it more than once in a message and you throw one per
repeat, up to five. When the timer runs out, the screen wipes clean.

## Setup

Add one **Browser Source** in OBS:

1. **Sources → + → Browser**
2. Paste your link, set **Width 1920**, **Height 1080**, click OK
3. Drag the layer to the top of your source list

```
https://abdullahmorrison.github.io/tomatod/overlay.html?channel=YOUR_CHANNEL
```

Or get your link from the [setup page](https://abdullahmorrison.github.io/tomatod/). It
takes the same `channel` param, so you can send a streamer a link with their channel
already filled in.

Only mods and the broadcaster can start a round. `abdullahmorrison` can start one on any
channel without a badge (`DEFAULT_ALLOW` in `src/config.js`); `&allow=name1,name2` extends
that list rather than replacing it.

## Commands

| Typed | Does |
|---|---|
| `!tomato` | Start a round |
| `!tomato 60` | Start a round of a given length |
| `!tomato +30` | Add thirty seconds without clearing the screen |
| `!wipe` | End early and clear. Also `!tomato stop`/`cancel`/`end`/`clear` |

Anything still in the air when a round ends fades out with the splatter rather than
vanishing mid-flight.

## Settings

All settings are URL params; the setup page writes them for you.

| Param | Default | Meaning |
|---|---|---|
| `channel` | *(required)* | Twitch channel to read |
| `duration` | `30` | Round length in seconds |
| `corner` | `bottom-right` | Timer position |
| `word` | `TomatoTime` | Trigger text, matched as a whole word |
| `maxPerMessage` | `5` | Throws one message can make. `0`/`none`/`unlimited` uncaps it |
| `command` | `!tomato` | Command that starts a round |
| `cancel` | `!wipe` | Command that ends one early |
| `maxInFlight` | *(unlimited)* | Cap on concurrent tomatoes, if a machine can't keep up |
| `wipeMs` | `800` | Screen wipe duration |
| `debug` | `off` | Status panel plus keyboard tests |
| `demo` | `off` | Runs a round by itself |
| `allow` | *(none)* | Extra logins that may start a round, comma-separated |

## How it works

Anonymous `justinfan` IRC over WebSocket — no OAuth, no bot account, no backend. Mod and
broadcaster status arrive as tags on every message, so the permission check needs no API
call. The broadcaster is *not* flagged `mod=1`, so both are checked separately.

Two stacked canvases: splats are stamped once and left alone, so a buried screen still
costs nothing per frame; only airborne tomatoes are redrawn. There is no cap on how many
can be in the air. Landed tomatoes go on a free list and are reused, so the pool grows to
whatever the busiest moment needed and then stops allocating. The frame loop stops
completely when nothing is happening — the source sits loaded for a whole stream.

All the art is generated in code: a 16×16 pixel tomato and procedural pixel splats, drawn
upscaled with smoothing off. No image files, nothing to fail mid-stream.

**The throw** travels *away* from the viewer, at the streamer — entering large and close at
the bottom of frame and shrinking as it recedes, along an arc, spinning. Something landing
high on screen is further away, so it arrives smaller and leaves a smaller splat.

Twitch rejects a message identical to the sender's previous one, so a chatter cannot repeat
`TomatoTime` line after line. Each occurrence within one message counts instead, up to
`maxPerMessage` — which lets one person keep throwing while stopping a pasted wall of
emotes from burying the screen on its own.

## Development

```
node serve.js       # http://localhost:4747
npm test            # command parsing and config
```

No dependencies, no build step — the files in this repo are the deployed site. The tests
deliberately cover only parsing and config, where a regression would be silent; everything
visual is checked with `debug=on`.

```
http://localhost:4747/overlay.html?channel=tenzinniznet&debug=on
```

With `debug=on`: `R` round, `E` +15s, `T` throw one, `Y` throw 50, `C` cancel. Append
`&demo=1` to watch it run with no chat and no keypresses.

If OBS runs on Windows while this serves from WSL, `localhost` forwards automatically.
