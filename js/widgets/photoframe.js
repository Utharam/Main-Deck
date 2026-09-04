/**
 * js/widgets/photoframe.js - Personal Desk Photo Frame Widget
 * Placed under "Days Since" in the right attention rail.
 * Supports up to 5 photos, random shuffling, smooth crossfading, and hide/collapse.
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { icons } from '../icons.js';

let activeTimer = null;
let currentPhotoIndex = 0;

/**
 * Compress and resize an image file using an offscreen canvas
 * @param {File} file 
 * @param {number} maxDim Max width/height
 * @returns {Promise<string>} Base64 Data URL
 */
function compressImage(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.85 quality for minimal IndexedDB footprint
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export const widget = {
  name: 'photoframe',
  label: 'Photo Frame',
  icon: '🖼️',

  async render(container) {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }

    let photos = (await store.getSetting('photoframePhotos', [])) || [];
    let isCollapsed = (await store.getSetting('photoframeCollapsed', false)) || false;

    if (photos.length > 0 && currentPhotoIndex >= photos.length) {
      currentPhotoIndex = 0;
    }

    const currentPhoto = photos.length > 0 ? photos[currentPhotoIndex] : null;

    container.innerHTML = `
      <div class="widget-card photoframe-card">
        <div class="widget-header">
          <div class="widget-title">
            <span style="display: inline-flex; align-items: center; color: var(--color-primary);">${icons.image}</span>
            <span>Photo Frame</span>
            ${photos.length > 0 ? `<span class="photoframe-counter-badge">${photos.length}/5</span>` : ''}
          </div>
          <div style="display: flex; gap: 2px; align-items: center;">
            ${photos.length > 1 ? `
              <button class="btn-icon btn-xs" id="btn-photoframe-shuffle" title="Shuffle photo randomly">
                ${icons.shuffle}
              </button>
            ` : ''}
            <button class="btn-icon btn-xs" id="btn-photoframe-manage" title="Manage photos (up to 5)">
              ${icons.plus}
            </button>
            <button class="btn-icon btn-xs" id="btn-photoframe-toggle" title="${isCollapsed ? 'Expand photo frame' : 'Hide photo frame'}">
              ${isCollapsed ? icons.chevronDown : icons.chevronUp}
            </button>
          </div>
        </div>

        <div class="widget-body" id="photoframe-body" style="${isCollapsed ? 'display: none;' : ''}">
          ${photos.length === 0 ? `
            <div class="photoframe-empty-prompt">
              <span style="font-size: 1.5rem; opacity: 0.6;">🖼️</span>
              <p>Keep loved ones or calming memories in view on your desk.</p>
              <button class="btn btn-xs btn-primary" id="btn-empty-add-photos" style="margin-top: 4px;">
                + Add Photos (Max 5)
              </button>
            </div>
          ` : `
            <div class="photoframe-viewport" id="photoframe-viewport" title="Click to shuffle randomly">
              <img 
                id="photoframe-active-img" 
                class="photoframe-img" 
                src="${escapeHtml(currentPhoto.dataUrl)}" 
                alt="${escapeHtml(currentPhoto.caption || 'Desk Photo')}" 
              />
              ${currentPhoto.caption ? `
                <div class="photoframe-overlay">
                  <span class="photoframe-caption-text" id="photoframe-caption">
                    ${escapeHtml(currentPhoto.caption)}
                  </span>
                </div>
              ` : ''}
            </div>
          `}
        </div>
      </div>
    `;

    // Function to pick a new random index without immediate repetition
    const pickRandomIndex = () => {
      if (photos.length <= 1) return 0;
      let nextIndex = currentPhotoIndex;
      while (nextIndex === currentPhotoIndex) {
        nextIndex = Math.floor(Math.random() * photos.length);
      }
      return nextIndex;
    };

    // Smoothly transition to another photo
    const transitionToPhoto = (newIndex) => {
      if (photos.length === 0) return;
      currentPhotoIndex = newIndex;
      const photo = photos[currentPhotoIndex];
      const imgEl = container.querySelector('#photoframe-active-img');
      const captionEl = container.querySelector('#photoframe-caption');

      if (imgEl && photo) {
        imgEl.style.opacity = '0';
        setTimeout(() => {
          imgEl.src = photo.dataUrl;
          imgEl.alt = photo.caption || 'Desk Photo';
          if (captionEl) {
            captionEl.textContent = photo.caption || '';
          }
          imgEl.style.opacity = '1';
        }, 150);
      }
    };

    // Random shuffle click handlers
    const shuffleBtn = container.querySelector('#btn-photoframe-shuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        transitionToPhoto(pickRandomIndex());
      });
    }

    const viewportEl = container.querySelector('#photoframe-viewport');
    if (viewportEl) {
      viewportEl.addEventListener('click', () => {
        if (photos.length > 1) {
          transitionToPhoto(pickRandomIndex());
        }
      });
    }

    // Auto-shuffle timer: shuffle every 30 seconds if more than 1 photo exists and not collapsed
    if (photos.length > 1 && !isCollapsed) {
      activeTimer = setInterval(() => {
        transitionToPhoto(pickRandomIndex());
      }, 30000);
    }

    // Collapse / Hide Toggle Handler
    const toggleBtn = container.querySelector('#btn-photoframe-toggle');
    const bodyEl = container.querySelector('#photoframe-body');
    if (toggleBtn && bodyEl) {
      toggleBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        await store.setSetting('photoframeCollapsed', isCollapsed);
        if (isCollapsed) {
          bodyEl.style.display = 'none';
          toggleBtn.innerHTML = icons.chevronDown;
          toggleBtn.title = 'Expand photo frame';
          if (activeTimer) {
            clearInterval(activeTimer);
            activeTimer = null;
          }
        } else {
          bodyEl.style.display = 'flex';
          toggleBtn.innerHTML = icons.chevronUp;
          toggleBtn.title = 'Hide photo frame';
          if (photos.length > 1 && !activeTimer) {
            activeTimer = setInterval(() => {
              transitionToPhoto(pickRandomIndex());
            }, 30000);
          }
        }
      });
    }

    // Open Photo Manager Modal Handler
    const openManageModal = async () => {
      let currentPhotos = (await store.getSetting('photoframePhotos', [])) || [];

      await showModal({
        title: '🖼️ Manage Desk Photos',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5;">
              Select up to <strong>5 photos</strong> to display in your desk frame. Photos will shuffle randomly. All photos live exclusively in your local browser.
            </div>

            <!-- Upload input -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background-color: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">
              <label for="input-photo-upload" class="btn btn-sm btn-primary" style="cursor: pointer; gap: 6px;">
                <span>+ Choose Image</span>
                <input 
                  type="file" 
                  id="input-photo-upload" 
                  accept="image/png, image/jpeg, image/webp" 
                  style="display: none;" 
                  ${currentPhotos.length >= 5 ? 'disabled' : ''}
                />
              </label>
              <span id="photo-upload-hint" style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-variant-numeric: tabular-nums;">
                ${currentPhotos.length} / 5 slots used
              </span>
            </div>

            <!-- Photo Thumbnails List -->
            <div id="modal-photo-grid" class="photo-manage-grid">
              ${currentPhotos.map(p => `
                <div class="photo-manage-item" data-id="${escapeHtml(p.id)}">
                  <img src="${escapeHtml(p.dataUrl)}" alt="${escapeHtml(p.caption || 'Photo')}" />
                  <button class="photo-manage-delete" data-id="${escapeHtml(p.id)}" title="Remove photo">
                    ${icons.close}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `,
        buttons: [
          { text: 'Done', className: 'btn-primary btn-sm', value: true }
        ],
        onMount: (modalBody) => {
          const fileInput = modalBody.querySelector('#input-photo-upload');
          const grid = modalBody.querySelector('#modal-photo-grid');
          const hint = modalBody.querySelector('#photo-upload-hint');

          const updateGridUI = () => {
            hint.textContent = `${currentPhotos.length} / 5 slots used`;
            if (fileInput) {
              fileInput.disabled = currentPhotos.length >= 5;
            }
            grid.innerHTML = currentPhotos.map(p => `
              <div class="photo-manage-item" data-id="${escapeHtml(p.id)}">
                <img src="${escapeHtml(p.dataUrl)}" alt="${escapeHtml(p.caption || 'Photo')}" />
                <button class="photo-manage-delete" data-id="${escapeHtml(p.id)}" title="Remove photo">
                  ${icons.close}
                </button>
              </div>
            `).join('');

            // Reattach delete listeners
            grid.querySelectorAll('.photo-manage-delete').forEach(delBtn => {
              delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = delBtn.getAttribute('data-id');
                currentPhotos = currentPhotos.filter(item => item.id !== id);
                await store.setSetting('photoframePhotos', currentPhotos);
                updateGridUI();
              });
            });
          };

          // File selection event
          if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
              const files = Array.from(e.target.files);
              if (!files || files.length === 0) return;

              for (const file of files) {
                if (currentPhotos.length >= 5) break;
                try {
                  const compressedUrl = await compressImage(file, 1200);
                  currentPhotos.push({
                    id: 'pf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                    dataUrl: compressedUrl,
                    caption: file.name.replace(/\.[^/.]+$/, '').substring(0, 30),
                    addedAt: new Date().toISOString()
                  });
                } catch (err) {
                  console.error('Image compression failed:', err);
                }
              }

              await store.setSetting('photoframePhotos', currentPhotos);
              fileInput.value = '';
              updateGridUI();
            });
          }

          // Initial delete listeners
          grid.querySelectorAll('.photo-manage-delete').forEach(delBtn => {
            delBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const id = delBtn.getAttribute('data-id');
              currentPhotos = currentPhotos.filter(item => item.id !== id);
              await store.setSetting('photoframePhotos', currentPhotos);
              updateGridUI();
            });
          });
        }
      });

      // Re-render widget after modal closes
      widget.render(container);
    };

    const manageBtn = container.querySelector('#btn-photoframe-manage');
    if (manageBtn) {
      manageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openManageModal();
      });
    }

    const emptyAddBtn = container.querySelector('#btn-empty-add-photos');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', openManageModal);
    }
  }
};
