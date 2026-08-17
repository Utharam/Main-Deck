/**
 * js/widgets/stress.js - Stress Meter Widget (Pixel-Perfect End-to-End Slider)
 */

import * as store from '../store.js';

export const widget = {
  name: 'stress',
  label: 'Stress',
  icon: '🧠',

  async render(container) {
    let stressScore = await store.getSetting('stressScore', 20);

    const getSliderConfig = (val) => {
      if (val > 75) return { msg: '🔥 Take a breath.', color: '#ef4444' };
      if (val > 50) return { msg: '😬 One thing at a time.', color: '#f59e0b' };
      if (val > 25) return { msg: '🙂 Busy, but manageable.', color: '#0284c7' };
      return { msg: '😌 Keep this energy.', color: '#22c55e' };
    };

    const initialConfig = getSliderConfig(stressScore);

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-xs); user-select: none;">
        <span style="font-size: 1rem; cursor: pointer;" id="btn-stress-min" title="Set to 0 (Calm)">🧘</span>
        
        <!-- Custom Pixel-Perfect Slider Track -->
        <div 
          id="custom-stress-track" 
          tabindex="0" 
          role="slider"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${stressScore}"
          title="Click or drag to set your stress level"
          style="
            position: relative;
            width: 180px;
            height: 10px;
            background-color: var(--color-border);
            border-radius: 9999px;
            cursor: pointer;
            outline: none;
            display: flex;
            align-items: center;
          "
        >
          <!-- Dynamic Visual Fill -->
          <div 
            id="stress-fill-bar" 
            style="
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: ${stressScore}%;
              background-color: ${initialConfig.color};
              border-radius: 9999px;
              pointer-events: none;
              transition: width 40ms ease, background-color 150ms ease;
            "
          ></div>

          <!-- Knob (Reaches flush left at 0 and flush right at 100) -->
          <div 
            id="stress-knob" 
            style="
              position: absolute;
              left: ${stressScore}%;
              transform: translateX(-${stressScore}%);
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #ffffff;
              border: 2.5px solid ${initialConfig.color};
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
              pointer-events: none;
              transition: border-color 150ms ease;
            "
          ></div>
        </div>

        <span style="font-size: 1rem; cursor: pointer;" id="btn-stress-max" title="Set to 100 (Overwhelmed)">🔥</span>
        
        <!-- Score Badge -->
        <span 
          id="footer-stress-badge" 
          class="badge" 
          style="background-color: ${initialConfig.color}22; color: ${initialConfig.color}; font-weight: 700; min-width: 32px; text-align: center; font-variant-numeric: tabular-nums;"
        >
          ${stressScore}
        </span>
        
        <!-- Status Message -->
        <span 
          id="footer-stress-msg" 
          style="color: var(--color-text-muted); font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
        >
          ${initialConfig.msg}
        </span>
      </div>
    `;

    const track = container.querySelector('#custom-stress-track');
    const fillBar = container.querySelector('#stress-fill-bar');
    const knob = container.querySelector('#stress-knob');
    const badge = container.querySelector('#footer-stress-badge');
    const msgEl = container.querySelector('#footer-stress-msg');
    const btnMin = container.querySelector('#btn-stress-min');
    const btnMax = container.querySelector('#btn-stress-max');

    let isDragging = false;

    const setStressValue = async (val, save = true) => {
      val = Math.max(0, Math.min(100, Math.round(val)));
      stressScore = val;

      const config = getSliderConfig(val);

      if (fillBar) {
        fillBar.style.width = `${val}%`;
        fillBar.style.backgroundColor = config.color;
      }

      if (knob) {
        knob.style.left = `${val}%`;
        knob.style.transform = `translateX(-${val}%)`;
        knob.style.borderColor = config.color;
      }

      if (badge) {
        badge.textContent = val;
        badge.style.backgroundColor = `${config.color}22`;
        badge.style.color = config.color;
      }

      if (msgEl) {
        msgEl.textContent = config.msg;
      }

      if (track) {
        track.setAttribute('aria-valuenow', val);
      }

      if (save) {
        await store.setSetting('stressScore', val);
      }
    };

    const calculateValFromEvent = (e) => {
      const rect = track.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = clickX / rect.width;
      return ratio * 100;
    };

    // Pointer Events for buttery smooth dragging & clicking
    if (track) {
      track.addEventListener('pointerdown', (e) => {
        isDragging = true;
        track.setPointerCapture(e.pointerId);
        const val = calculateValFromEvent(e);
        setStressValue(val, false);
      });

      track.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const val = calculateValFromEvent(e);
        setStressValue(val, false);
      });

      const handlePointerUp = async (e) => {
        if (isDragging) {
          isDragging = false;
          try {
            track.releasePointerCapture(e.pointerId);
          } catch (err) {}
          const val = calculateValFromEvent(e);
          await setStressValue(val, true);
        }
      };

      track.addEventListener('pointerup', handlePointerUp);
      track.addEventListener('pointercancel', handlePointerUp);

      // Keyboard support (Left/Right arrow keys)
      track.addEventListener('keydown', async (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          await setStressValue(stressScore - 5, true);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          await setStressValue(stressScore + 5, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          await setStressValue(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          await setStressValue(100, true);
        }
      });
    }

    // Min/Max Emoji click helpers
    if (btnMin) btnMin.addEventListener('click', () => setStressValue(0, true));
    if (btnMax) btnMax.addEventListener('click', () => setStressValue(100, true));
  }
};
