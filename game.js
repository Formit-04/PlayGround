const canvas = document.getElementById('ocean');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const species = [
  { name: 'Sunscale', emoji: '🐠', rarity: 'COMMON', color: '#f9a84a', value: 18, xp: 14, size: 1.0, flavor: 'A flash of gold in the shallows.' },
  { name: 'Silverfin', emoji: '🐟', rarity: 'COMMON', color: '#d2e8e2', value: 22, xp: 16, size: 1.08, flavor: 'Quick, bright, and always on the move.' },
  { name: 'Moon Jelly', emoji: '🪼', rarity: 'UNCOMMON', color: '#a9a4ff', value: 48, xp: 28, size: 1.12, flavor: 'A drifting lantern from the blue.' },
  { name: 'Reef Runner', emoji: '🐠', rarity: 'UNCOMMON', color: '#ff6e78', value: 55, xp: 32, size: 1.2, flavor: 'A streak of color from the reef.' },
  { name: 'Blue Marlin', emoji: '🐟', rarity: 'RARE', color: '#33d1d1', value: 145, xp: 76, size: 1.6, flavor: 'Built for speed in the open water.' },
  { name: 'Mako Shark', emoji: '🦈', rarity: 'RARE', color: '#90b9cc', value: 220, xp: 105, size: 1.65, flavor: 'A powerful hunter of the deep.' },
  { name: 'Ghost Ray', emoji: '🦈', rarity: 'EPIC', color: '#a9c8d8', value: 450, xp: 180, size: 1.8, flavor: 'Silent wings glide through the twilight.' },
  { name: 'Abyssal Angler', emoji: '🐡', rarity: 'EPIC', color: '#93e4bd', value: 620, xp: 230, size: 1.6, flavor: 'Its tiny light reveals a world below.' },
  { name: 'Great White', emoji: '🦈', rarity: 'LEGENDARY', color: '#e4eee6', value: 1300, xp: 440, size: 2.2, flavor: 'A legend, finally brought to the surface.' },
  { name: 'Blue Whale', emoji: '🐋', rarity: 'LEGENDARY', color: '#4ba8c7', value: 2200, xp: 650, size: 2.7, flavor: 'The ocean itself seems to rise with it.' },
  { name: 'Golden Koi', emoji: '🐠', rarity: 'LEGENDARY', color: '#ffd369', value: 1800, xp: 520, size: 1.65, flavor: 'A golden visitor from a faraway sea.' },
  { name: 'Leviathan', emoji: '🐉', rarity: 'MYTHIC', color: '#c196ef', value: 5000, xp: 1200, size: 3, flavor: 'The oldest story in the deepest water.' }
];
const rods = [
  { id: 'bamboo', name: 'Bamboo Rod', emoji: '🎣', desc: 'A humble start.', price: 0, reel: 1, luck: 0, control: 1 },
  { id: 'fiberglass', name: 'Fiberglass Rod', emoji: '🪄', desc: 'A smoother, steadier cast.', price: 180, reel: 1.2, luck: 5, control: 1.15 },
  { id: 'carbon', name: 'Carbon Rod', emoji: '⚓', desc: 'Lightweight with real bite.', price: 520, reel: 1.5, luck: 12, control: 1.35 },
  { id: 'deepsea', name: 'Deep Sea Rod', emoji: '🌊', desc: 'Made for serious depths.', price: 1250, reel: 1.9, luck: 22, control: 1.6 },
  { id: 'abyss', name: 'Abyssal Rod', emoji: '✨', desc: 'For anglers chasing legends.', price: 3200, reel: 2.5, luck: 38, control: 2 }
];
const SAVE_KEY = 'deep-blue-progress-v2';
const freshSave = () => ({ coins: 240, caught: 0, xp: 0, level: 1, log: {}, best: null, owned: ['bamboo'], equipped: 'bamboo' });
let save = freshSave();
try {
  const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (stored && typeof stored === 'object') save = { ...freshSave(), ...stored, log: stored.log || {}, owned: Array.isArray(stored.owned) ? stored.owned : ['bamboo'] };
} catch (error) { console.warn('Could not load saved progress.', error); }
let W = 0, H = 0, dpr = 1, time = 0, state = 'idle', timer = 0, reelProgress = 0, tension = 40;
let last = performance.now(), activeFish = null, toastTimer = 0, filter = 'all';
const currentRod = () => rods.find(rod => rod.id === save.equipped) || rods[0];
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (error) { console.warn('Could not save progress.', error); } }
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize); resize();
function rand(a, b) { return a + Math.random() * (b - a); }
function poly(points, fill, stroke = null, width = 1) {
  ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function drawFish(x, y, size, color, dir = 1, kind = 'fish', alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * size, size); ctx.globalAlpha = alpha; ctx.shadowColor = color; ctx.shadowBlur = 14 * size;
  if (kind === 'whale') {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 50, 24, 0, 0, Math.PI * 2); ctx.fill();
    poly([[-39,-3],[-66,-23],[-57,0],[-66,20],[-37,9]], color); poly([[-1,-17],[13,-32],[22,-15]], color); poly([[-12,17],[-1,27],[9,17]], color);
    ctx.fillStyle = '#092331'; ctx.beginPath(); ctx.arc(39, -7, 2.1, 0, 7); ctx.fill();
  } else if (kind === 'shark') {
    poly([[-34,0],[-55,-19],[-49,0],[-56,18],[-33,8]], color); ctx.beginPath(); ctx.ellipse(-1, 0, 39, 15, -.02, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    poly([[-9,-12],[4,-34],[13,-12]], color); poly([[9,10],[22,25],[27,10]], color); poly([[-22,8],[-36,20],[-10,13]], color);
    ctx.fillStyle = 'rgba(228,245,236,.67)'; ctx.beginPath(); ctx.moveTo(20,5); ctx.lineTo(36,7); ctx.lineTo(25,11); ctx.fill();
    ctx.fillStyle = '#071c29'; ctx.beginPath(); ctx.arc(27, -5, 2, 0, 7); ctx.fill();
  } else {
    poly([[-21,0],[-42,-18],[-37,0],[-43,16],[-20,8]], color); ctx.beginPath(); ctx.ellipse(0, 0, 29, 13, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    poly([[-5,-10],[3,-25],[12,-9]], color); poly([[2,8],[9,21],[14,8]], color);
    ctx.fillStyle = 'rgba(248,250,231,.75)'; ctx.beginPath(); ctx.arc(19, -4, 2.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#092332'; ctx.beginPath(); ctx.arc(20, -4, 1, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function pathWave(y, amp, phase, color, width) {
  ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x * .009 + phase) * amp + Math.sin(x * .021 + phase * 1.8) * amp * .28);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, '#83d0d0'); gradient.addColorStop(.24, '#398fa0'); gradient.addColorStop(.54, '#125d76'); gradient.addColorStop(1, '#06283e');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * .66, H * .19, 2, W * .66, H * .19, H * .4); sun.addColorStop(0, 'rgba(250,248,203,.28)'); sun.addColorStop(.35, 'rgba(190,237,221,.09)'); sun.addColorStop(1, 'rgba(138,222,215,0)'); ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H * .7);
  for (let i = 0; i < 8; i++) { const x = W * (.51 + i * .038) + Math.sin(time * .2 + i) * 13; ctx.beginPath(); ctx.moveTo(x, H * .17); ctx.lineTo(x + 4, H * .58); ctx.strokeStyle = 'rgba(210,248,225,.025)'; ctx.lineWidth = 15; ctx.stroke(); }
  for (let i = 0; i < 14; i++) pathWave(H * (.24 + i * .012), 1.8 + i * .2, time * .4 + i, 'rgba(231,255,239,.12)', 1);
  for (let i = 0; i < 17; i++) { const x = (i * 137 + time * 8) % (W + 160) - 80, y = H * (.48 + (i % 6) * .075); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 24, y + 9, x + 68, y + Math.sin(time + i) * 7); ctx.strokeStyle = 'rgba(142,222,211,.07)'; ctx.lineWidth = 1; ctx.stroke(); }
}
function drawAmbient() {
  for (let i = 0; i < 7; i++) { const x = W * (.18 + i * .105) + Math.sin(time * .35 + i * 2) * 60, y = H * (.39 + (i % 4) * .1) + Math.sin(time * .7 + i) * 16; drawFish(x, y, (.3 + (i % 3) * .11) * H / 800, '#a4d5d0', Math.sin(time * .3 + i) > 0 ? 1 : -1, 'fish', .28); }
  for (let i = 0; i < 22; i++) { const x = (i * 113 + Math.sin(time * .3 + i) * 26) % W, y = H - ((time * 18 + i * 97) % (H * .65 + 70)); ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); ctx.fillStyle = 'rgba(190,237,227,.2)'; ctx.fill(); }
  const y = H * .28, glow = ctx.createLinearGradient(0, y - 18, 0, y + 21); glow.addColorStop(0, 'rgba(227,247,228,.06)'); glow.addColorStop(.48, 'rgba(215,247,231,.4)'); glow.addColorStop(1, 'rgba(141,222,217,.05)'); ctx.fillStyle = glow; ctx.fillRect(0, y - 16, W, 36);
  for (let i = 0; i < 8; i++) pathWave(y + (i - 4) * 3.5, 2.8, time * .65 + i * .7, 'rgba(224,251,235,.38)', 1.3);
}
function drawBoat() {
  const cx = W * .5, base = H * .83, hull = ctx.createLinearGradient(0, base, 0, H); hull.addColorStop(0, '#233c42'); hull.addColorStop(.5, '#132b35'); hull.addColorStop(1, '#081a25');
  poly([[cx-W*.29,base],[cx+W*.29,base],[cx+W*.22,H],[cx-W*.19,H]], hull, 'rgba(199,226,210,.17)', 1);
  poly([[cx-W*.29,base],[cx+W*.29,base],[cx+W*.21,base+14],[cx-W*.21,base+14]], '#b9ab84'); poly([[cx-W*.27,base+4],[cx+W*.27,base+4],[cx+W*.2,base+18],[cx-W*.2,base+18]], '#34484a');
  for (let i = 0; i < 8; i++) { const y = base + 22 + i * 12; ctx.beginPath(); ctx.moveTo(cx - W * (.21 - i * .011), y); ctx.lineTo(cx + W * (.21 - i * .011), y); ctx.strokeStyle = 'rgba(182,185,151,.19)'; ctx.lineWidth = 1; ctx.stroke(); }
  const rodX = cx + W * .22, rodY = H * .79; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(rodX, rodY); ctx.quadraticCurveTo(rodX + W * .04, rodY - H * .12, rodX + W * .13, rodY - H * .24); ctx.strokeStyle = '#594b34'; ctx.lineWidth = 4; ctx.stroke();
  const tipX = rodX + W * .13, tipY = rodY - H * .24, lineEndX = state === 'idle' ? tipX + W * .02 : W * .58, lineEndY = state === 'idle' ? H * .43 : state === 'casting' ? H * (.31 + Math.sin(time * 3) * .08) : state === 'waiting' ? H * .49 : state === 'bite' ? H * .53 : H * .51;
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(tipX + W * .07, (tipY + lineEndY) * .45, lineEndX, lineEndY); ctx.strokeStyle = 'rgba(230,250,228,.72)'; ctx.lineWidth = 1; ctx.stroke();
  if (state !== 'idle' && state !== 'casting') { ctx.fillStyle = '#f0db8d'; ctx.beginPath(); ctx.arc(lineEndX, lineEndY, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#d1c59c'; ctx.fillRect(cx - W * .25, base + 2, W * .5, 2);
}
function drawActionFish() {
  if (!activeFish || state === 'idle' || state === 'casting') return;
  const progress = state === 'waiting' ? 0 : Math.min(1, reelProgress / 100), x = W * .58 + Math.sin(time * 1.6) * Math.max(3, 25 - progress * 17), y = H * (.56 - progress * .09) + Math.sin(time * 2.2) * 7;
  const kind = activeFish.name.includes('Whale') ? 'whale' : activeFish.name.includes('Shark') || activeFish.name.includes('White') ? 'shark' : 'fish';
  drawFish(x, y, activeFish.size * (.35 + progress * .65) * H / 800, activeFish.color, Math.sin(time * 1.25) > 0 ? 1 : -1, kind, .7 + progress * .3);
  if (state === 'bite') for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y + 10 + i * 5, 18 + i * 9, 3 + i, 0, 0, Math.PI * 2); ctx.strokeStyle = `rgba(214,247,227,${.26 - i * .06})`; ctx.stroke(); }
}
function render(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt; drawBackground(); drawAmbient(); drawActionFish(); drawBoat();
  if (state === 'waiting') { timer -= dt; if (timer <= 0) bite(); }
  else if (state === 'bite') { timer -= dt; if (timer <= 0) missFish(); }
  else if (state === 'reeling') {
    const rod = currentRod(); reelProgress += dt * rand(14, 24) * rod.reel; tension += dt * (Math.random() - .45) * 45 / rod.control; tension = clamp(tension, 8, 94);
    if (tension > 78) tension = clamp(tension - dt * 48 * rod.control, 8, 90); if (tension < 22) tension = clamp(tension + dt * 28 * rod.control, 8, 90);
    $('tensionFill').style.width = `${tension}%`; $('tensionMarker').style.left = `${tension}%`; $('tensionText').textContent = tension > 75 ? 'DANGER' : tension < 27 ? 'SLACK' : 'STEADY'; $('tensionText').style.color = tension > 75 ? '#ff9b86' : tension < 27 ? '#ffe394' : '#eaf6e8';
    if (tension > 92) breakLine(); else if (reelProgress >= 100) landFish();
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
function setStatus(text) { $('statusText').textContent = text; }
function resetButton() { $('buttonText').textContent = 'CAST YOUR LINE'; $('castCaption').textContent = 'A whole ocean. Anything could bite.'; $('castButton').classList.remove('busy'); $('castButton').style.background = ''; $('intro').style.opacity = ''; }
function cast() {
  if (document.querySelector('.overlay.open')) return;
  if (state === 'idle') {
    state = 'casting'; $('intro').style.opacity = '.22'; $('fishLabel').classList.add('visible'); $('spottedName').textContent = 'Something is out there'; $('castButton').classList.add('busy'); $('buttonText').textContent = 'LINE IN THE WATER'; $('castCaption').textContent = 'Waiting for a bite…'; setStatus('LINE OUT — WATCH THE WATER');
    timer = 1.25; setTimeout(() => { if (state === 'casting') { state = 'waiting'; timer = rand(2.4, 6.2); setStatus('WAITING FOR A BITE'); } }, 1250);
  } else if (state === 'bite') {
    state = 'reeling'; reelProgress = 5; tension = 42; $('tensionBox').classList.add('active'); $('buttonText').textContent = 'REEL IT IN!'; $('castCaption').textContent = 'Keep the tension in the green zone'; setStatus('FISH ON! — REEL IT IN'); $('castButton').style.background = '#f0d892';
  } else if (state === 'reeling') { reelProgress += 8 * currentRod().reel; tension = clamp(tension + (Math.random() - .5) * 16 / currentRod().control, 10, 90); }
}
function chooseFish() {
  const luck = currentRod().luck / 100, roll = Math.random();
  const tier = roll < .52 - luck * .35 ? 0 : roll < .78 - luck * .2 ? 1 : roll < .92 - luck * .08 ? 2 : roll < .985 - luck * .025 ? 3 : roll < .998 - luck * .008 ? 4 : 5;
  const pools = [species.slice(0,2), species.slice(2,4), species.slice(4,6), species.slice(6,8), species.slice(8,11), species.slice(11)];
  const pool = pools[tier] || pools[5]; return pool[Math.floor(Math.random() * pool.length)];
}
function bite() { state = 'bite'; activeFish = chooseFish(); timer = 1.8; setStatus('BITE! — PRESS SPACE NOW'); $('buttonText').textContent = 'HOOK IT!'; $('castCaption').textContent = 'Quick! Press SPACE to set the hook'; $('castButton').style.background = '#f2da91'; $('fishLabel').classList.add('visible'); $('spottedName').textContent = activeFish.name; toast('SOMETHING TOOK THE BAIT!'); }
function missFish() { state = 'idle'; activeFish = null; resetButton(); $('fishLabel').classList.remove('visible'); setStatus('THE FISH GOT AWAY'); $('castCaption').textContent = 'No worries. The ocean is full of them.'; toast('THE FISH GOT AWAY — TRY AGAIN'); }
function breakLine() { state = 'idle'; activeFish = null; resetButton(); $('tensionBox').classList.remove('active'); $('fishLabel').classList.remove('visible'); setStatus('SNAP! THE LINE BROKE'); $('castCaption').textContent = 'Easy does it. Keep tension in the green.'; toast('LINE SNAPPED — TRY A GENTLER REEL'); }
function landFish() {
  state = 'idle'; const fish = activeFish; activeFish = null; resetButton(); $('tensionBox').classList.remove('active'); $('fishLabel').classList.remove('visible');
  const weight = Number((rand(.6, 14) * fish.size).toFixed(1)); save.caught++; save.coins += fish.value; save.xp += fish.xp;
  save.log[fish.name] = { count: (save.log[fish.name]?.count || 0) + 1, best: Math.max(save.log[fish.name]?.best || 0, weight), last: Date.now() };
  if (!save.best || weight > save.best.weight) save.best = { name: fish.name, weight };
  while (save.xp >= save.level * 100) { save.xp -= save.level * 100; save.level++; }
  $('catchBadge').textContent = save.log[fish.name].count === 1 ? 'NEW SPECIES' : 'CATCH LANDED'; $('catchName').textContent = fish.name; $('catchArt').textContent = fish.emoji;
  $('catchRarity').textContent = fish.rarity; $('catchRarity').className = `catch-rarity ${fish.rarity.toLowerCase()}`; $('catchFlavor').textContent = fish.flavor;
  $('catchWeight').textContent = `${weight.toFixed(1)} kg`; $('catchValue').textContent = `+${fish.value} ✦`; $('catchCard').classList.add('open'); $('catchLayer').setAttribute('aria-hidden', 'false');
  $('castCaption').textContent = 'A beautiful catch. Ready for another?'; setStatus('NICE CATCH — THE OCEAN RUNS DEEP'); updateHUD(); updateLog(); persist();
}
function updateHUD() {
  const rod = currentRod(); $('coins').textContent = save.coins.toLocaleString(); $('storeCoins').textContent = save.coins.toLocaleString(); $('caughtCount').textContent = save.caught;
  $('level').textContent = String(save.level).padStart(2, '0'); $('xpFill').style.width = `${save.xp / (save.level * 100) * 100}%`; $('xpLabel').textContent = `${save.xp} / ${save.level * 100} XP`;
  $('rank').textContent = save.level >= 20 ? 'OCEAN LEGEND' : save.level >= 10 ? 'MASTER ANGLER' : save.level >= 5 ? 'SKILLED ANGLER' : 'ROOKIE';
  $('bestWeight').textContent = save.best ? `BEST ${save.best.weight.toFixed(1)} KG` : 'BEST —'; $('logCount').textContent = `${Object.keys(save.log).length} / ${species.length}`;
  $('rodName').textContent = rod.name; $('rodDesc').textContent = rod.desc; $('rodEmblem').textContent = rod.emoji; $('rodChip').textContent = rod.name.toUpperCase();
  $('statReel').style.width = `${Math.min(100, rod.reel / 2.5 * 100)}%`; $('statLuck').style.width = `${Math.min(100, 18 + rod.luck * 2)}%`; $('statControl').style.width = `${Math.min(100, rod.control / 2 * 100)}%`;
  $('statReelVal').textContent = `${rod.reel.toFixed(1)}×`; $('statLuckVal').textContent = `+${rod.luck}%`; $('statControlVal').textContent = `${rod.control.toFixed(1)}×`;
}
function updateLog() {
  const found = Object.keys(save.log).length, total = save.caught, best = save.best;
  $('logUnique').textContent = found; $('logTotal').textContent = total; $('logBest').textContent = best ? `${best.name} · ${best.weight.toFixed(1)} kg` : '—';
  $('logPercent').textContent = `${Math.round(found / species.length * 100)}%`; $('completionRing').style.setProperty('--progress', `${found / species.length * 100}%`);
  $('foundTabCount').textContent = found; $('missingTabCount').textContent = species.length - found;
  $('fishGrid').innerHTML = '';
  species.filter(fish => filter === 'all' || (filter === 'found' ? !!save.log[fish.name] : !save.log[fish.name])).forEach(fish => {
    const record = save.log[fish.name], card = document.createElement('article'); card.className = `fish-card ${record ? 'discovered' : 'undiscovered'} ${fish.rarity.toLowerCase()}`;
    card.innerHTML = `<span class="fish-card-art">${record ? fish.emoji : '？'}</span><div class="fish-card-info"><b>${record ? fish.name : 'Unknown species'}</b><span>${record ? fish.rarity : 'UNDISCOVERED'}</span></div><div class="fish-card-count">${record ? `×${record.count}<small>BEST ${record.best.toFixed(1)} KG</small>` : '<small>—</small>'}</div>`;
    $('fishGrid').appendChild(card);
  });
}
function renderStore() {
  $('rodList').innerHTML = '';
  rods.forEach((rod, index) => {
    const owned = save.owned.includes(rod.id), equipped = save.equipped === rod.id, canBuy = save.coins >= rod.price, card = document.createElement('article');
    card.className = `rod-card ${equipped ? 'equipped' : ''} ${owned ? 'owned' : ''}`;
    const next = rods[index + 1];
    card.innerHTML = `<div class="rod-card-icon">${rod.emoji}</div><div class="rod-card-main"><div class="rod-card-title"><b>${rod.name}</b>${equipped ? '<span class="equipped-tag">EQUIPPED</span>' : ''}</div><p>${rod.desc}</p><div class="rod-card-stats"><span>REEL <b>${rod.reel.toFixed(1)}×</b></span><span>LUCK <b>+${rod.luck}%</b></span><span>CONTROL <b>${rod.control.toFixed(1)}×</b></span></div>${next ? `<small class="next-up">NEXT: ${next.name}</small>` : '<small class="next-up">TOP-TIER EQUIPMENT</small>'}</div><button class="rod-action" type="button" data-rod="${rod.id}" ${equipped || (!owned && !canBuy) ? 'disabled' : ''}>${equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `BUY · ${rod.price.toLocaleString()} ✦`}</button>`;
    $('rodList').appendChild(card);
  });
}
function openOverlay(id) { $(id).classList.add('open'); document.body.classList.add('modal-open'); if (id === 'storeOverlay') renderStore(); if (id === 'logOverlay') updateLog(); }
function closeOverlays() { document.querySelectorAll('.overlay.open').forEach(overlay => overlay.classList.remove('open')); document.body.classList.remove('modal-open'); }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2200); }
$('castButton').addEventListener('click', cast);
$('openLog').addEventListener('click', () => openOverlay('logOverlay')); $('viewLogLink').addEventListener('click', () => openOverlay('logOverlay'));
$('openStore').addEventListener('click', () => openOverlay('storeOverlay')); $('upgradeRod').addEventListener('click', () => openOverlay('storeOverlay'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeOverlays));
document.querySelectorAll('.overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlays(); }));
$('logTabs').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; filter = button.dataset.filter; $('logTabs').querySelectorAll('button').forEach(tab => tab.classList.toggle('active', tab === button)); updateLog(); });
$('rodList').addEventListener('click', event => {
  const button = event.target.closest('[data-rod]'); if (!button || button.disabled) return;
  const rod = rods.find(item => item.id === button.dataset.rod); if (!rod) return;
  if (!save.owned.includes(rod.id)) { if (save.coins < rod.price) return toast('NOT ENOUGH COINS FOR THAT ROD'); save.coins -= rod.price; save.owned.push(rod.id); toast(`${rod.name.toUpperCase()} PURCHASED`); }
  save.equipped = rod.id; persist(); updateHUD(); renderStore();
});
$('resetSave').addEventListener('click', () => { if (!window.confirm('Reset all catches, coins, levels, and rods? This cannot be undone.')) return; save = freshSave(); filter = 'all'; persist(); updateHUD(); updateLog(); renderStore(); toast('PROGRESS RESET'); });
function closeCatch() { $('catchCard').classList.remove('open'); $('catchLayer').setAttribute('aria-hidden', 'true'); }
$('closeCatch').addEventListener('click', closeCatch); $('keepButton').addEventListener('click', () => { closeCatch(); toast('CATCH ADDED TO YOUR LOGBOOK'); });
window.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); cast(); }
  if (event.code === 'Escape') { closeOverlays(); closeCatch(); }
});
setInterval(() => { $('weather').textContent = Math.random() > .7 ? 'SEA BREEZE' : 'CLEAR SKIES'; $('depth').textContent = String(Math.floor(38 + Math.sin(time * .4) * 11 + Math.random() * 5)).padStart(3, '0'); }, 2200);
updateHUD(); updateLog(); persist();