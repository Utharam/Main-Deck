/**
 * js/pages/sop.js - Standard Operating Procedures (SOP) Grid Overview & Reader
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { exportSOP } from '../utils/export.js';
import { readJsonFile, handleImport } from '../utils/import.js';

export async function render(container) {
  const sops = await store.getSOPs();

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📚 Standard Operating Procedures (SOP)</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Quick-reference process cards. Glance at procedures or click to view full steps.
            </div>
          </div>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <label class="btn btn-sm btn-secondary" style="cursor: pointer;">
              📥 Import SOP
              <input type="file" id="sop-import-input" accept=".json,.sop.json" style="display: none;" />
            </label>
            <button class="btn btn-sm btn-primary" id="btn-new-sop">+ New SOP</button>
          </div>
        </div>
      </div>

      ${sops.length === 0 
        ? '<div class="card"><div class="empty-state">No standard procedures saved. Create one (e.g. Bank Reconciliation) for quick reference.</div></div>'
        : `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4);">
            ${sops.map(sop => {
              const steps = Array.isArray(sop.steps) ? sop.steps : [];
              return `
                <div class="card sop-grid-card" data-id="${escapeHtml(sop.id)}" style="display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 150ms ease, border-color 150ms ease;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
                      <strong style="font-size: var(--font-size-md); line-height: 1.3;">📖 ${escapeHtml(sop.title)}</strong>
                      <span class="badge badge-primary" style="flex-shrink: 0; margin-left: 6px;">${steps.length} ${steps.length === 1 ? 'step' : 'steps'}</span>
                    </div>
                    ${sop.description ? `
                      <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: var(--space-3);">
                        ${escapeHtml(sop.description)}
                      </p>
                    ` : ''}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: var(--space-2); margin-top: var(--space-3);">
                    <button class="btn btn-xs btn-primary btn-view-sop" data-id="${escapeHtml(sop.id)}">Read Steps ↗</button>
                    <div style="display: flex; gap: var(--space-1); align-items: center;">
                      <button class="btn-icon btn-xs btn-export-sop" data-id="${escapeHtml(sop.id)}" title="Export individual SOP (JSON)">📤</button>
                      <button class="btn-icon btn-xs btn-edit-sop" data-id="${escapeHtml(sop.id)}" title="Edit SOP">✏️</button>
                      <button class="btn-icon btn-xs btn-delete-sop" data-id="${escapeHtml(sop.id)}" title="Delete SOP">🗑️</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
           </div>`
      }
    </div>
  `;

  // Attach Event: Click Card or View Button to Read SOP
  container.querySelectorAll('.sop-grid-card, .btn-view-sop').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-export-sop') || e.target.closest('.btn-edit-sop') || e.target.closest('.btn-delete-sop')) {
        return;
      }
      const sopId = el.getAttribute('data-id');
      const sop = sops.find(s => s.id === sopId);
      if (sop) {
        openSopReaderModal(sop, container);
      }
    });
  });

  // Attach Event: New SOP
  const newSopBtn = container.querySelector('#btn-new-sop');
  if (newSopBtn) {
    newSopBtn.addEventListener('click', async () => {
      await openSopEditor(null, container);
    });
  }

  // Attach Event: Edit SOP
  container.querySelectorAll('.btn-edit-sop').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sopId = btn.getAttribute('data-id');
      const sop = sops.find(s => s.id === sopId);
      if (sop) {
        await openSopEditor(sop, container);
      }
    });
  });

  // Attach Event: Export SOP (Selective JSON)
  container.querySelectorAll('.btn-export-sop').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sopId = btn.getAttribute('data-id');
      const sop = sops.find(s => s.id === sopId);
      if (sop) {
        exportSOP(sop);
      }
    });
  });

  // Attach Event: Delete SOP
  container.querySelectorAll('.btn-delete-sop').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sopId = btn.getAttribute('data-id');
      if (confirm('Delete this Standard Operating Procedure?')) {
        await store.deleteSOP(sopId);
        render(container);
      }
    });
  });

  // Attach Event: Import SOP
  const importInput = container.querySelector('#sop-import-input');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const json = await readJsonFile(file);
          const res = await handleImport(json);
          alert(res.message);
          render(container);
        } catch (err) {
          alert(`Import Error: ${err.message}`);
        }
      }
    });
  }
}

/**
 * Clean Reader Modal for SOP Steps
 */
async function openSopReaderModal(sop, container) {
  const steps = Array.isArray(sop.steps) ? sop.steps : [];

  await showModal({
    title: `📖 ${sop.title}`,
    contentHtml: `
      ${sop.description ? `
        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border);">
          ${escapeHtml(sop.description)}
        </div>
      ` : ''}

      <div style="display: flex; flex-direction: column; gap: var(--space-3); max-height: 380px; overflow-y: auto; padding-right: 4px;">
        ${steps.length === 0 
          ? '<div class="empty-state">No steps in this procedure.</div>'
          : steps.map((st, idx) => `
            <div style="display: flex; gap: var(--space-3); padding: var(--space-3); background-color: var(--color-bg-subtle); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
              <strong style="font-size: var(--font-size-sm); color: var(--color-primary); min-width: 54px;">Step ${idx + 1}:</strong>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-main); line-height: 1.5; flex: 1;">
                <div>${escapeHtml(st.title || st)}</div>
                ${st.note ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(st.note)}</div>` : ''}
              </div>
            </div>
          `).join('')
        }
      </div>
    `,
    buttons: [
      {
        text: '📤 Share (JSON)',
        className: 'btn-secondary btn-sm',
        onClick: () => {
          exportSOP(sop);
          return false; // keep modal open
        }
      },
      {
        text: '✏️ Edit Steps',
        className: 'btn-secondary btn-sm',
        onClick: async () => {
          await openSopEditor(sop, container);
          return true;
        }
      },
      { text: 'Close', className: 'btn-primary btn-sm', value: null }
    ]
  });
}

/**
 * Step Editor Modal
 */
async function openSopEditor(existingSop, container) {
  const isEditing = !!existingSop;
  let initialSteps = existingSop && Array.isArray(existingSop.steps) && existingSop.steps.length > 0
    ? existingSop.steps.map(s => typeof s === 'string' ? { title: s, note: '' } : s)
    : [
        { title: 'Download statement from banking portal', note: '' },
        { title: 'Match transactions against ledger', note: '' },
        { title: 'Flag unmatched items', note: '' }
      ];

  const renderStepsListHtml = (steps) => {
    return steps.map((s, idx) => `
      <div class="sop-step-row" data-idx="${idx}" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <span class="step-label" style="font-weight: 600; font-size: var(--font-size-xs); min-width: 45px;">Step ${idx + 1}</span>
        <input type="text" class="sop-step-title" value="${escapeHtml(s.title)}" placeholder="Enter step description..." style="flex: 1;" />
        <button type="button" class="btn-icon btn-xs btn-remove-step" title="Remove step">✕</button>
      </div>
    `).join('');
  };

  await showModal({
    title: isEditing ? 'Edit SOP' : 'Create New Standard Operating Procedure',
    contentHtml: `
      <div class="form-group">
        <label class="form-label" for="sop-title">Procedure Name</label>
        <input type="text" id="sop-title" value="${escapeHtml(existingSop?.title || '')}" placeholder="e.g. Bank Reconciliation" required />
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="sop-desc">Description / Purpose (Optional)</label>
        <input type="text" id="sop-desc" value="${escapeHtml(existingSop?.description || '')}" placeholder="e.g. Monthly reconciliation procedure for main operating account" />
      </div>

      <div style="margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="form-label">Procedure Steps</span>
          <button type="button" class="btn btn-xs btn-primary" id="btn-modal-add-step">+ Add Step</button>
        </div>
        <div id="sop-steps-container" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
          ${renderStepsListHtml(initialSteps)}
        </div>
      </div>
    `,
    onMount: (modalBody) => {
      const stepsContainer = modalBody.querySelector('#sop-steps-container');
      const addStepBtn = modalBody.querySelector('#btn-modal-add-step');

      const updateStepLabels = () => {
        const rows = stepsContainer.querySelectorAll('.sop-step-row');
        rows.forEach((row, i) => {
          const label = row.querySelector('.step-label');
          if (label) label.textContent = `Step ${i + 1}`;
        });
      };

      if (addStepBtn && stepsContainer) {
        addStepBtn.addEventListener('click', () => {
          const count = stepsContainer.querySelectorAll('.sop-step-row').length;
          const stepRow = document.createElement('div');
          stepRow.className = 'sop-step-row';
          stepRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
          stepRow.innerHTML = `
            <span class="step-label" style="font-weight: 600; font-size: var(--font-size-xs); min-width: 45px;">Step ${count + 1}</span>
            <input type="text" class="sop-step-title" value="" placeholder="Enter step description..." style="flex: 1;" />
            <button type="button" class="btn-icon btn-xs btn-remove-step" title="Remove step">✕</button>
          `;
          stepsContainer.appendChild(stepRow);

          const input = stepRow.querySelector('.sop-step-title');
          if (input) input.focus();

          stepRow.querySelector('.btn-remove-step').addEventListener('click', () => {
            stepRow.remove();
            updateStepLabels();
          });
        });

        stepsContainer.querySelectorAll('.btn-remove-step').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.target.closest('.sop-step-row').remove();
            updateStepLabels();
          });
        });
      }
    },
    buttons: [
      { text: 'Cancel', className: 'btn-ghost', value: null },
      {
        text: isEditing ? 'Update SOP' : 'Save SOP',
        className: 'btn-primary',
        onClick: async (body) => {
          const title = body.querySelector('#sop-title').value.trim();
          const description = body.querySelector('#sop-desc').value.trim();

          const stepInputs = body.querySelectorAll('.sop-step-row');
          const finalSteps = [];
          stepInputs.forEach((row) => {
            const stepTitle = row.querySelector('.sop-step-title').value.trim();
            if (stepTitle) {
              finalSteps.push({ title: stepTitle, note: '' });
            }
          });

          if (!title) {
            alert('Please enter a procedure name.');
            return false;
          }
          if (finalSteps.length === 0) {
            alert('Please include at least one step description.');
            return false;
          }

          await store.saveSOP({
            id: existingSop?.id,
            title,
            description,
            steps: finalSteps
          });
          return true;
        }
      }
    ]
  });

  render(container);
}
