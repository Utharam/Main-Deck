/**
 * js/pages/stressbuster.js - 2-Minute Micro Resets & Re-entry Guard (Enhanced)
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';

let activeInterval = null;
let activeAnimationId = null;

const DEFAULT_LOVED_ONES = [
  { id: 'lo-1', name: 'Mom', emoji: '❤️' },
  { id: 'lo-2', name: 'Dad', emoji: '❤️' },
  { id: 'lo-3', name: 'Partner', emoji: '💕' },
  { id: 'lo-4', name: 'Kids', emoji: '🌸' },
  { id: 'lo-5', name: 'My Pet', emoji: '🐶' }
];

export async function render(container) {
  cleanupGame();

  const lastUsed = await store.getMeta('lastStressBusterTime');
  const now = Date.now();
  const guardBypassed = sessionStorage.getItem('stress_guard_bypassed') === 'true';

  if (lastUsed && !guardBypassed) {
    const elapsedMinutes = (now - new Date(lastUsed).getTime()) / (1000 * 60);
    if (elapsedMinutes < 15) {
      renderReentryGuard(container);
      return;
    }
  }

  sessionStorage.removeItem('stress_guard_bypassed');

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">🧠 2-Minute Stress Buster</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              A brief, non-competitive micro-reset. Take 2 minutes, then return to what matters.
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
        <!-- 1. Swat Mosquito -->
        <div class="card game-card" data-game="mosquito" style="cursor: pointer; text-align: center; padding: var(--space-6) var(--space-4);">
          <div style="font-size: 3rem; margin-bottom: var(--space-2);">🦟</div>
          <h3 style="font-size: var(--font-size-md);">Swat the Mosquito</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;">
            A buzzing annoyance. Swat it. Satisfying and brief.
          </p>
          <button class="btn btn-sm btn-secondary" style="margin-top: var(--space-3); width: 100%;">Start (2 min)</button>
        </div>

        <!-- 2. Pop Balloons -->
        <div class="card game-card" data-game="balloons" style="cursor: pointer; text-align: center; padding: var(--space-6) var(--space-4);">
          <div style="font-size: 3rem; margin-bottom: var(--space-2);">🎈</div>
          <h3 style="font-size: var(--font-size-md);">Pop Balloons</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;">
            Gentle floating bubbles and balloons. Click to pop.
          </p>
          <button class="btn btn-sm btn-secondary" style="margin-top: var(--space-3); width: 100%;">Start (2 min)</button>
        </div>

        <!-- 3. Smash Distractions -->
        <div class="card game-card" data-game="smash" style="cursor: pointer; text-align: center; padding: var(--space-6) var(--space-4);">
          <div style="font-size: 3rem; margin-bottom: var(--space-2);">🔨</div>
          <h3 style="font-size: var(--font-size-md);">Smash Distractions</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;">
            Whack-a-problem with a big hammer. Satisfying cartoon smash!
          </p>
          <button class="btn btn-sm btn-secondary" style="margin-top: var(--space-3); width: 100%;">Start (2 min)</button>
        </div>

        <!-- 4. Love Them -->
        <div class="card game-card" data-game="lovethem" style="cursor: pointer; text-align: center; padding: var(--space-6) var(--space-4);">
          <div style="font-size: 3rem; margin-bottom: var(--space-2);">❤️</div>
          <h3 style="font-size: var(--font-size-md);">Love Them</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;">
            A tiny emotional reset. Choose a loved one and send love.
          </p>
          <button class="btn btn-sm btn-secondary" style="margin-top: var(--space-3); width: 100%;">Start (2 min)</button>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.game-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const gameType = card.getAttribute('data-game');
      await store.setMeta('lastStressBusterTime', new Date().toISOString());
      launchGame(container, gameType);
    });
  });
}

function renderReentryGuard(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="card" style="text-align: center; padding: var(--space-8) var(--space-6);">
        <div style="font-size: 3rem; margin-bottom: var(--space-2);">🧠</div>
        <h2>You used the 2-minute reset recently.</h2>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); max-width: 480px; margin: var(--space-2) auto var(--space-6);">
          The Workbench helps you finish work so you can leave it behind. Maybe check your project progress first?
        </p>

        <div style="display: flex; gap: var(--space-3); justify-content: center;">
          <a href="#projects" class="btn btn-primary">📋 Open Project Progress</a>
          <button id="btn-bypass-guard" class="btn btn-ghost">Continue to Stress Buster anyway</button>
        </div>
      </div>
    </div>
  `;

  const bypassBtn = container.querySelector('#btn-bypass-guard');
  if (bypassBtn) {
    bypassBtn.addEventListener('click', () => {
      sessionStorage.setItem('stress_guard_bypassed', 'true');
      render(container);
    });
  }
}

function launchGame(container, gameType) {
  let secondsRemaining = 120;

  container.innerHTML = `
    <div class="page-container">
      <div class="card" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4);">
        <button id="btn-exit-game" class="btn btn-xs btn-secondary">← Back</button>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Time Remaining:</span>
          <strong id="game-timer" style="font-size: var(--font-size-md); color: var(--color-primary); font-variant-numeric: tabular-nums;">02:00</strong>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden; position: relative; height: 460px; background-color: var(--color-bg-subtle);">
        <div id="game-canvas-area" style="width: 100%; height: 100%; position: relative; cursor: default; user-select: none;"></div>
      </div>
    </div>
  `;

  const timerEl = container.querySelector('#game-timer');
  const exitBtn = container.querySelector('#btn-exit-game');
  const gameArea = container.querySelector('#game-canvas-area');

  exitBtn.addEventListener('click', () => {
    cleanupGame();
    render(container);
  });

  activeInterval = setInterval(() => {
    secondsRemaining--;
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    if (timerEl) {
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (secondsRemaining <= 0) {
      endGame(container);
    }
  }, 1000);

  if (gameType === 'mosquito') startMosquitoGame(gameArea);
  else if (gameType === 'balloons') startBalloonsGame(gameArea);
  else if (gameType === 'smash') startSmashGame(gameArea);
  else if (gameType === 'lovethem') startLoveThemGame(gameArea);
}

function endGame(container) {
  cleanupGame();
  container.innerHTML = `
    <div class="page-container">
      <div class="card" style="text-align: center; padding: var(--space-8) var(--space-6);">
        <div style="font-size: 3rem; margin-bottom: var(--space-2);">🌿</div>
        <h2>2 minutes are up.</h2>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: var(--space-2) auto var(--space-6); max-width: 440px;">
          Take a breath, relax your shoulders, and head back to your workbench.
        </p>
        <div style="display: flex; gap: var(--space-3); justify-content: center;">
          <a href="#projects" class="btn btn-primary">📋 Check Projects</a>
          <a href="#home" class="btn btn-secondary">🏠 Home</a>
        </div>
      </div>
    </div>
  `;
}

function cleanupGame() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
  if (activeAnimationId) {
    cancelAnimationFrame(activeAnimationId);
    activeAnimationId = null;
  }
}

/* ==================== 1. SWATTING MOSQUITO ==================== */
function startMosquitoGame(area) {
  area.style.background = 'radial-gradient(circle, var(--color-bg-surface) 0%, var(--color-bg-subtle) 100%)';
  area.style.cursor = 'crosshair';
  
  const mosquito = document.createElement('div');
  mosquito.style.cssText = 'position: absolute; font-size: 2.5rem; transition: transform 0.15s ease, left 0.4s ease, top 0.4s ease; cursor: pointer;';
  mosquito.textContent = '🦟';
  area.appendChild(mosquito);

  function moveMosquito() {
    const maxX = area.clientWidth - 60;
    const maxY = area.clientHeight - 60;
    mosquito.style.left = `${Math.max(10, Math.random() * maxX)}px`;
    mosquito.style.top = `${Math.max(10, Math.random() * maxY)}px`;
  }
  moveMosquito();
  setInterval(moveMosquito, 1200);

  mosquito.addEventListener('click', (e) => {
    e.stopPropagation();
    const splat = document.createElement('div');
    splat.style.cssText = `position: absolute; left: ${mosquito.style.left}; top: ${mosquito.style.top}; font-size: 2rem; pointer-events: none;`;
    splat.textContent = '💥 SWAT!';
    area.appendChild(splat);
    setTimeout(() => splat.remove(), 600);
    moveMosquito();
  });

  area.addEventListener('click', (e) => {
    if (e.target === mosquito) return;
    const miss = document.createElement('div');
    miss.style.cssText = `position: absolute; left: ${e.offsetX - 15}px; top: ${e.offsetY - 15}px; font-size: 1.2rem; pointer-events: none; opacity: 0.7;`;
    miss.textContent = '💨';
    area.appendChild(miss);
    setTimeout(() => miss.remove(), 400);
  });
}

/* ==================== 2. POPPING BALLOONS ==================== */
function startBalloonsGame(area) {
  const balloonEmojis = ['🎈', '🫧', '🟡', '🟣', '🟢', '🔵'];
  
  function spawnBalloon() {
    if (!area.isConnected) return;
    const b = document.createElement('div');
    b.style.cssText = `
      position: absolute;
      bottom: -40px;
      left: ${Math.random() * (area.clientWidth - 50)}px;
      font-size: 2.5rem;
      cursor: pointer;
      user-select: none;
      transition: bottom 6s linear, opacity 0.3s ease;
    `;
    b.textContent = balloonEmojis[Math.floor(Math.random() * balloonEmojis.length)];
    area.appendChild(b);

    setTimeout(() => {
      b.style.bottom = `${area.clientHeight + 50}px`;
    }, 50);

    b.addEventListener('click', () => {
      b.textContent = '✨ POP!';
      b.style.fontSize = '1.8rem';
      setTimeout(() => b.remove(), 250);
    });

    setTimeout(() => {
      if (b.parentNode) b.remove();
    }, 6500);
  }

  setInterval(spawnBalloon, 800);
  for (let i = 0; i < 4; i++) spawnBalloon();
}

/* ==================== 3. SMASH DISTRACTIONS (BIGGER HAMMER & SMASHED EFFECT) ==================== */
function startSmashGame(area) {
  area.style.background = 'radial-gradient(circle, var(--color-bg-surface) 0%, var(--color-bg-subtle) 100%)';
  
  const targets = ['📧 Unread Email', '📊 100-Page Report', '⏰ Fake Urgency', '🤯 Chaos', '📑 Broken Spreadsheet', '📞 Unplanned Meeting', '📝 Bureaucracy'];

  function spawnTarget() {
    if (!area.isConnected) return;
    const item = document.createElement('div');
    item.className = 'card smash-target';
    item.style.cssText = `
      position: absolute;
      left: ${Math.random() * (area.clientWidth - 180)}px;
      top: ${Math.random() * (area.clientHeight - 90)}px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 600;
      padding: var(--space-3) var(--space-4);
      user-select: none;
      box-shadow: var(--shadow-md);
      transition: transform 120ms ease, opacity 300ms ease;
    `;
    item.textContent = targets[Math.floor(Math.random() * targets.length)];
    area.appendChild(item);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSmashAnimation(area, e.clientX, e.clientY, item);
    });

    setTimeout(() => {
      if (item.parentNode) item.remove();
    }, 4500);
  }

  // Click on empty space also shows hammer swing
  area.addEventListener('click', (e) => {
    if (e.target.closest('.smash-target')) return;
    showHammerSwing(area, e.offsetX, e.offsetY);
  });

  setInterval(spawnTarget, 900);
  spawnTarget();
}

function triggerSmashAnimation(area, clientX, clientY, targetEl) {
  const rect = area.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // Show big hammer swing
  showHammerSwing(area, x, y);

  // Apply crushed / smashed effect to target
  targetEl.style.transform = 'scale(0.75, 0.45) rotate(-6deg)';
  targetEl.style.backgroundColor = 'var(--color-danger-subtle)';
  targetEl.style.borderColor = 'var(--color-danger)';
  targetEl.style.color = 'var(--color-danger)';
  targetEl.style.opacity = '0.7';
  targetEl.textContent = '💥 CRUSHED!';

  // Spawn comic impact text & star burst
  const smashBanner = document.createElement('div');
  smashBanner.style.cssText = `
    position: absolute;
    left: ${x - 40}px;
    top: ${y - 45}px;
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--color-danger);
    pointer-events: none;
    user-select: none;
    z-index: 100;
    text-shadow: 0 2px 10px rgba(220, 38, 38, 0.4);
    animation: smashPop 400ms ease-out forwards;
  `;
  smashBanner.textContent = '⚡ SMASH!';
  area.appendChild(smashBanner);

  setTimeout(() => {
    if (smashBanner.parentNode) smashBanner.remove();
    if (targetEl.parentNode) targetEl.remove();
  }, 400);
}

function showHammerSwing(area, x, y) {
  const hammer = document.createElement('div');
  hammer.style.cssText = `
    position: absolute;
    left: ${x - 30}px;
    top: ${y - 60}px;
    font-size: 3.8rem;
    pointer-events: none;
    user-select: none;
    z-index: 90;
    transform-origin: bottom left;
    transform: rotate(35deg) scale(1.2);
    transition: transform 100ms ease-in;
  `;
  hammer.textContent = '🔨';
  area.appendChild(hammer);

  // Fast swing down
  setTimeout(() => {
    hammer.style.transform = 'rotate(-25deg) scale(1.4)';
  }, 20);

  setTimeout(() => {
    hammer.remove();
  }, 240);
}

/* ==================== 4. LOVE THEM (ADD LOVED ONES + EMOJIS) ==================== */
async function startLoveThemGame(area) {
  area.style.background = 'radial-gradient(circle, rgba(244,114,182,0.12) 0%, var(--color-bg-surface) 100%)';
  area.style.display = 'flex';
  area.style.flexDirection = 'column';
  area.style.alignItems = 'center';
  area.style.justifyContent = 'center';
  area.style.cursor = 'pointer';

  let customLoved = await store.getSetting('lovedOnes', null);
  if (!customLoved || customLoved.length === 0) {
    customLoved = DEFAULT_LOVED_ONES;
    await store.setSetting('lovedOnes', customLoved);
  }

  let selectedPerson = customLoved[0] || { name: 'Mom', emoji: '❤️' };

  // Main Loved Name Display
  const lovedContainer = document.createElement('div');
  lovedContainer.style.cssText = 'text-align: center; z-index: 10; pointer-events: none; user-select: none;';
  lovedContainer.innerHTML = `
    <div style="font-size: 1.1rem; color: var(--color-text-muted); margin-bottom: 4px;">Click anywhere to send love to</div>
    <h1 id="loved-name" style="font-size: 2.5rem; color: #ec4899; text-shadow: 0 2px 10px rgba(236, 72, 153, 0.25);">
      ${selectedPerson.emoji || '❤️'} ${escapeHtml(selectedPerson.name)} ${selectedPerson.emoji || '❤️'}
    </h1>
    <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle); margin-top: 8px;">(Click anywhere on the screen)</div>
  `;
  area.appendChild(lovedContainer);

  // Top Selector Bar with Add Person Button
  const selectorBar = document.createElement('div');
  selectorBar.id = 'lovethem-selector-bar';
  selectorBar.style.cssText = 'position: absolute; top: 12px; display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; z-index: 20; max-width: 90%;';

  function renderLovedButtons() {
    selectorBar.innerHTML = '';
    customLoved.forEach((person) => {
      const isCurrent = person.name === selectedPerson.name;
      const b = document.createElement('button');
      b.className = `btn btn-xs ${isCurrent ? 'btn-primary' : 'btn-secondary'}`;
      b.textContent = `${person.emoji || '❤️'} ${person.name}`;
      b.onclick = (e) => {
        e.stopPropagation();
        selectedPerson = person;
        const h1 = lovedContainer.querySelector('#loved-name');
        if (h1) h1.textContent = `${person.emoji || '❤️'} ${escapeHtml(person.name)} ${person.emoji || '❤️'}`;
        renderLovedButtons();
      };
      selectorBar.appendChild(b);
    });

    // "+ Add Loved One" Button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-xs btn-ghost';
    addBtn.style.border = '1px dashed var(--color-border)';
    addBtn.textContent = '+ Add Person';
    addBtn.onclick = async (e) => {
      e.stopPropagation();
      await showModal({
        title: 'Add a Loved One',
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="loved-person-name">Name / Relationship</label>
            <input type="text" id="loved-person-name" placeholder="e.g. Maya / Grandpa / Charlie" required />
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label" for="loved-person-emoji">Emoji</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="loved-person-emoji" value="❤️" style="width: 60px; font-size: 1.3rem; text-align: center;" />
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${['❤️', '💕', '💖', '🌸', '🐶', '🐱', '🌟', '🥰', '🌺', '✨'].map(em => `
                  <button type="button" class="btn-icon btn-xs emoji-preset-btn" style="font-size: 1.1rem;">${em}</button>
                `).join('')}
              </div>
            </div>
          </div>
        `,
        onMount: (modalBody) => {
          modalBody.querySelectorAll('.emoji-preset-btn').forEach(b => {
            b.addEventListener('click', () => {
              const emInput = modalBody.querySelector('#loved-person-emoji');
              if (emInput) emInput.value = b.textContent;
            });
          });
        },
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Add to List',
            className: 'btn-primary',
            onClick: async (body) => {
              const name = body.querySelector('#loved-person-name').value.trim();
              const emoji = body.querySelector('#loved-person-emoji').value.trim() || '❤️';
              if (!name) return false;

              const newPerson = { id: 'lo-' + Date.now(), name, emoji };
              customLoved.push(newPerson);
              await store.setSetting('lovedOnes', customLoved);
              selectedPerson = newPerson;

              const h1 = lovedContainer.querySelector('#loved-name');
              if (h1) h1.textContent = `${emoji} ${escapeHtml(name)} ${emoji}`;
              renderLovedButtons();
              return true;
            }
          }
        ]
      });
    };
    selectorBar.appendChild(addBtn);
  }

  renderLovedButtons();
  area.appendChild(selectorBar);

  const heartEmojis = ['❤️', '💕', '💖', '💗', '💓', '✨', '🌸', '🥰'];

  area.addEventListener('click', (e) => {
    if (e.target.closest('#lovethem-selector-bar')) return;

    for (let i = 0; i < 7; i++) {
      const heart = document.createElement('div');
      const chosenEmoji = (i === 0 && selectedPerson.emoji) ? selectedPerson.emoji : heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
      heart.style.cssText = `
        position: absolute;
        left: ${e.offsetX + (Math.random() * 70 - 35)}px;
        top: ${e.offsetY + (Math.random() * 70 - 35)}px;
        font-size: ${Math.random() * 1.6 + 1.2}rem;
        pointer-events: none;
        user-select: none;
        transition: transform 1s ease-out, opacity 1s ease-out;
      `;
      heart.textContent = chosenEmoji;
      area.appendChild(heart);

      setTimeout(() => {
        heart.style.transform = `translate(${(Math.random() - 0.5) * 140}px, -${Math.random() * 120 + 40}px) scale(1.5)`;
        heart.style.opacity = '0';
      }, 20);

      setTimeout(() => heart.remove(), 1050);
    }
  });
}
