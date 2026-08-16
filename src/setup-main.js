// The setup page: turns a channel name into a Browser Source URL, and shows a live
// preview of the effect so nobody has to go live to find out what it looks like.

import { DEFAULTS, readConfig, clampDuration, normalizeChannel } from './config.js';
import { TwitchChat } from './twitch-chat.js';
import { TomatoShow } from './round.js';
import { tomatoSprite } from './sprite.js';

const $ = (id) => document.getElementById(id);

const channelEl = $('channel');
const durationEl = $('duration');
const cornerEl = $('corner');
const linkEl = $('link');
const statusEl = $('channelStatus');

for (const id of ['logo', 'pIcon']) {
  $(id).getContext('2d').drawImage(tomatoSprite(), 0, 0);
}

// --- link building --------------------------------------------------------

function buildLink() {
  const channel = normalizeChannel(channelEl.value);
  const duration = clampDuration(durationEl.value);
  const corner = cornerEl.value;

  // Resolve against this page so the link works on GitHub Pages and locally alike.
  const url = new URL('overlay.html', window.location.href);
  if (channel) url.searchParams.set('channel', channel);
  if (duration !== DEFAULTS.duration) url.searchParams.set('duration', String(duration));
  if (corner !== DEFAULTS.corner) url.searchParams.set('corner', corner);
  return url.toString();
}

/**
 * Put the current settings in this page's own address bar. The page already reads these
 * params on load, so this closes the loop: reload, bookmark or send the page link and it
 * comes back with every box filled in, instead of losing the work to a stray refresh.
 *
 * replaceState, not pushState — nudging a duration should not fill the back button with
 * every value it passed through on the way.
 */
function syncPageUrl() {
  const { search } = new URL(buildLink());
  history.replaceState(null, '', search || window.location.pathname);
}

function refreshLink() {
  linkEl.value = buildLink();
  syncPageUrl();
  preview.timer.root.dataset.corner = cornerEl.value;
}

$('copy').addEventListener('click', async () => {
  linkEl.select();
  try {
    await navigator.clipboard.writeText(linkEl.value);
  } catch {
    document.execCommand('copy');
  }
  const btn = $('copy');
  btn.textContent = 'Copied';
  setTimeout(() => { btn.textContent = 'Copy link'; }, 1600);
});

// --- preview --------------------------------------------------------------

const previewEl = $('preview');
const hintEl = $('pHint');

const preview = new TomatoShow({
  frontCanvas: $('pFront'),
  splatCanvas: $('pSplat'),
  timerEl: $('pTimer'),
  host: previewEl,
  config: { ...DEFAULTS, duration: 8 },
});

function hideHint() {
  hintEl.style.display = 'none';
}

$('demoRound').addEventListener('click', () => {
  hideHint();
  preview.start(clampDuration(durationEl.value));
});

$('demoFew').addEventListener('click', () => {
  hideHint();
  if (!preview.active) preview.start(6);
  for (let i = 0; i < 5; i++) preview.throwOne();
});

$('demoMany').addEventListener('click', () => {
  hideHint();
  if (!preview.active) preview.start(6);
  for (let i = 0; i < 70; i++) preview.throwOne();
});

// --- live channel check ---------------------------------------------------
// Twitch accepts a JOIN to a channel that does not exist, silently. Without this a
// typo would look exactly like a broken overlay, so confirm real messages arrive.

let chat = null;
let checkTimer = null;

function checkChannel() {
  if (chat) {
    chat.close();
    chat = null;
  }
  const channel = normalizeChannel(channelEl.value);
  statusEl.className = 'status';

  if (!channel) {
    statusEl.textContent = 'Enter your channel name.';
    return;
  }

  statusEl.textContent = `Checking #${channel}…`;
  let seen = 0;
  chat = new TwitchChat(channel);

  chat.addEventListener('chat', () => {
    seen++;
    if (seen === 1) {
      statusEl.className = 'status ok';
      statusEl.textContent = `Reading #${channel} — chat is coming through.`;
    }
  });

  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    if (seen === 0) {
      statusEl.className = 'status warn';
      statusEl.textContent =
        `Connected, but no messages from #${channel} yet. That is normal if chat is ` +
        'quiet — but double-check the spelling if you expected activity.';
    }
  }, 12000);

  chat.connect();
}

for (const el of [channelEl, durationEl, cornerEl]) {
  el.addEventListener('input', refreshLink);
}
channelEl.addEventListener('change', checkChannel);

// This page takes the same params as the overlay, through the same parser, so it can be
// handed to a streamer with everything already chosen -- setup for someone else's channel
// is otherwise a spelling test they have to pass before anything works. Reusing
// readConfig is the point: if the two ever disagreed, a link would preview one thing and
// install another.
const incoming = readConfig(window.location.search);
if (incoming.channel) channelEl.value = incoming.channel;
durationEl.value = String(incoming.duration);
cornerEl.value = incoming.corner;

refreshLink();
checkChannel();
