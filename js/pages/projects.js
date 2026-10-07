/**
 * js/pages/projects.js - Step-by-Step Projects & Phases Workspace
 * Seamlessly integrates project context notes and interactive phases on the go.
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { exportProject } from '../utils/export.js';
import { icons } from '../icons.js';

export async function render(container) {
  const projects = await store.getProjects();

  const projectCards = await Promise.all(projects.map(async (project) => {
    const phases = await store.getPhasesByProject(project.id);
    phases.sort((a, b) => (a.order || 0) - (b.order || 0));

    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.status === 'completed').length;
    const progressPercent = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
    const isCompleted = project.status === 'completed' || (totalPhases > 0 && completedPhases === totalPhases);

    return `
      <div class="card project-card" data-project-id="${escapeHtml(project.id)}">
        <!-- Project Header -->
        <div class="card-header">
          <div style="flex: 1; padding-right: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${isCompleted ? 'badge-success' : 'badge-primary'}">
                ${isCompleted ? 'Complete' : 'Active'}
              </span>
              <h3 class="card-title" style="font-size: 1.1rem;">${escapeHtml(project.name)}</h3>
            </div>
          </div>

          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <button class="btn-icon btn-xs btn-export-project" data-id="${escapeHtml(project.id)}" title="Share project (JSON)">${icons.share}</button>
            <button class="btn-icon btn-xs btn-edit-project" data-id="${escapeHtml(project.id)}" title="Edit project details">${icons.edit}</button>
            <button class="btn-icon btn-xs btn-delete-project" data-id="${escapeHtml(project.id)}" title="Delete project">${icons.trash}</button>
          </div>
        </div>

        <!-- Project Context Note Box -->
        <div class="project-context-box">
          <div class="project-context-label">
            <span>Project Context & Notes</span>
            <span style="font-size: 10px; opacity: 0.7;">Autosaves on edit</span>
          </div>
          <textarea 
            class="project-context-textarea" 
            data-proj-id="${escapeHtml(project.id)}" 
            rows="2" 
            placeholder="Add overarching context, goals, dependencies, or current blockers for this project..."
          >${escapeHtml(project.description || '')}</textarea>
        </div>

        <!-- Live Milestones Progress Bar -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted);">
            <span>Milestones: ${completedPhases} of ${totalPhases} phases complete</span>
            <span style="font-weight: 700; font-variant-numeric: tabular-nums;">${progressPercent}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <!-- Step-by-Step Phases Stepper -->
        <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-1);">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--color-text-subtle);">
            Step-by-Step Phases
          </div>

          <div class="phase-stepper">
            ${phases.length === 0 ? `
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; padding: 4px 0;">
                No phases yet. Add steps below to structure your path forward.
              </div>
            ` : phases.map((phase, idx) => {
              const isPhaseDone = phase.status === 'completed';
              return `
                <div class="phase-step-card ${isPhaseDone ? 'is-completed' : ''}" data-phase-id="${escapeHtml(phase.id)}">
                  <div class="phase-step-header">
                    <div class="phase-step-main">
                      <button 
                        class="phase-step-toggle" 
                        data-phase-id="${escapeHtml(phase.id)}" 
                        title="${isPhaseDone ? 'Phase complete! Click to reopen' : 'Click to complete this phase'}"
                      >
                        ${isPhaseDone ? '✓' : idx + 1}
                      </button>
                      <span class="phase-step-title">${escapeHtml(phase.name)}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px;">
                      <button class="btn-icon btn-xs btn-edit-phase" data-phase-id="${escapeHtml(phase.id)}" title="Rename phase">${icons.edit}</button>
                      <button class="btn-icon btn-xs btn-delete-phase" data-phase-id="${escapeHtml(phase.id)}" title="Remove phase">${icons.close}</button>
                    </div>
                  </div>

                  <!-- Phase Context Note Input -->
                  <input 
                    type="text" 
                    class="phase-step-note-input" 
                    data-phase-id="${escapeHtml(phase.id)}" 
                    placeholder="Phase context note (e.g. 'Waiting for manager verification')..." 
                    value="${escapeHtml(phase.notes || '')}"
                  />
                </div>
              `;
            }).join('')}

            <!-- Quick Add Phase Row on the go -->
            <button class="phase-add-btn" data-proj-id="${escapeHtml(project.id)}" title="Add next step">
              <span style="display: inline-flex;">${icons.plus}</span>
              <span>Add Step / Phase</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title" style="font-size: 1.25rem;">📋 Projects & Step-by-Step Phases</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Outline context notes and step-by-step milestones. Click any step circle to mark it complete.
            </div>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-new-project">+ New Project</button>
        </div>
      </div>

      ${projects.length === 0 
        ? '<div class="card"><div class="empty-state">No projects yet. Click "+ New Project" to set up your first roadmap.</div></div>'
        : `<div style="display: flex; flex-direction: column; gap: var(--space-4);">
            ${projectCards.join('')}
           </div>`
      }
    </div>
  `;

  // Attach Event: One-click Phase Completion Toggle
  container.querySelectorAll('.phase-step-toggle').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const phaseId = btn.getAttribute('data-phase-id');
      const allPhases = await store.getPhases();
      const phase = allPhases.find(p => p.id === phaseId);
      if (phase) {
        phase.status = phase.status === 'completed' ? 'in_progress' : 'completed';
        await store.savePhase(phase);
        render(container);
      }
    });
  });

  // Attach Event: Phase Context Note Autosave on Blur
  container.querySelectorAll('.phase-step-note-input').forEach((input) => {
    input.addEventListener('blur', async () => {
      const phaseId = input.getAttribute('data-phase-id');
      const allPhases = await store.getPhases();
      const phase = allPhases.find(p => p.id === phaseId);
      const val = input.value.trim();
      if (phase && phase.notes !== val) {
        phase.notes = val;
        await store.savePhase(phase);
      }
    });
  });

  // Attach Event: Project Context Note Autosave on Blur
  container.querySelectorAll('.project-context-textarea').forEach((textarea) => {
    textarea.addEventListener('blur', async () => {
      const projId = textarea.getAttribute('data-proj-id');
      const project = await store.getProject(projId);
      const val = textarea.value.trim();
      if (project && project.description !== val) {
        project.description = val;
        await store.saveProject(project);
      }
    });
  });

  // Attach Event: Add Phase on the go
  container.querySelectorAll('.phase-add-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = btn.getAttribute('data-proj-id');
      const existingPhases = await store.getPhasesByProject(projId);

      await showModal({
        title: 'Add Next Step / Phase',
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="add-step-name">Step Name</label>
            <input type="text" id="add-step-name" placeholder="e.g. Phase ${existingPhases.length + 1}: Final Review" required />
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label" for="add-step-note">Context Note (Optional)</label>
            <input type="text" id="add-step-note" placeholder="Dependencies, next action..." />
          </div>
        `,
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Add Phase',
            className: 'btn-primary',
            onClick: async (body) => {
              const name = body.querySelector('#add-step-name').value.trim();
              const notes = body.querySelector('#add-step-note').value.trim();
              if (!name) return false;

              await store.savePhase({
                projectId: projId,
                name,
                order: existingPhases.length + 1,
                notes,
                status: 'in_progress'
              });
              render(container);
              return true;
            }
          }
        ]
      });
    });
  });

  // Attach Event: Edit Phase Name on the go
  container.querySelectorAll('.btn-edit-phase').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const phaseId = btn.getAttribute('data-phase-id');
      const allPhases = await store.getPhases();
      const phase = allPhases.find(p => p.id === phaseId);
      if (phase) {
        await showModal({
          title: 'Edit Phase',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="edit-phase-title">Phase Name</label>
              <input type="text" id="edit-phase-title" value="${escapeHtml(phase.name)}" required />
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save',
              className: 'btn-primary',
              onClick: async (body) => {
                const name = body.querySelector('#edit-phase-title').value.trim();
                if (!name) return false;
                phase.name = name;
                await store.savePhase(phase);
                render(container);
                return true;
              }
            }
          ]
        });
      }
    });
  });

  // Attach Event: Delete Phase on the go
  container.querySelectorAll('.btn-delete-phase').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const phaseId = btn.getAttribute('data-phase-id');
      if (confirm('Delete this phase step?')) {
        await store.deletePhase(phaseId);
        render(container);
      }
    });
  });

  // Attach Event: New Project with Step-by-Step Phases upfront
  const newProjBtn = container.querySelector('#btn-new-project');
  if (newProjBtn) {
    newProjBtn.addEventListener('click', async () => {
      await showModal({
        title: 'Create Project with Step-by-Step Phases',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label" for="new-project-name">Project Name</label>
              <input type="text" id="new-project-name" placeholder="e.g. Dubai Home Cash" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-project-desc">Context Note (Overall Scope)</label>
              <textarea id="new-project-desc" rows="2" placeholder="e.g. Verify transactions, clean up data, plot expenses, get manager approval..."></textarea>
            </div>

            <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Step-by-Step Phases</label>
                <button type="button" class="btn btn-xs btn-secondary" id="btn-modal-add-step">+ Add Step</button>
              </div>

              <div id="modal-phase-inputs" style="display: flex; flex-direction: column; gap: var(--space-2);">
                <div class="modal-step-row">
                  <span class="modal-step-badge">Step 1:</span>
                  <input type="text" class="modal-phase-val" placeholder="e.g. Verify transactions" style="flex: 1;" />
                  <button type="button" class="btn-icon btn-xs btn-modal-del-step" title="Remove step">${icons.close}</button>
                </div>
                <div class="modal-step-row">
                  <span class="modal-step-badge">Step 2:</span>
                  <input type="text" class="modal-phase-val" placeholder="e.g. Clean up data & plot expenses" style="flex: 1;" />
                  <button type="button" class="btn-icon btn-xs btn-modal-del-step" title="Remove step">${icons.close}</button>
                </div>
                <div class="modal-step-row">
                  <span class="modal-step-badge">Step 3:</span>
                  <input type="text" class="modal-phase-val" placeholder="e.g. Manager approval" style="flex: 1;" />
                  <button type="button" class="btn-icon btn-xs btn-modal-del-step" title="Remove step">${icons.close}</button>
                </div>
              </div>
            </div>
          </div>
        `,
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Create Project',
            className: 'btn-primary',
            onClick: async (body) => {
              const name = body.querySelector('#new-project-name').value.trim();
              const description = body.querySelector('#new-project-desc').value.trim();
              if (!name) return false;

              const newProj = await store.saveProject({
                name,
                description,
                status: 'in_progress'
              });

              // Read all defined step inputs
              const stepInputs = Array.from(body.querySelectorAll('.modal-phase-val'));
              let order = 1;
              for (const input of stepInputs) {
                const stepName = input.value.trim();
                if (stepName) {
                  await store.savePhase({
                    projectId: newProj.id,
                    name: stepName,
                    order: order++,
                    notes: '',
                    status: 'in_progress'
                  });
                }
              }

              // If no steps were entered, add a default Step 1
              if (order === 1) {
                await store.savePhase({
                  projectId: newProj.id,
                  name: 'Phase 1: Initial Setup',
                  order: 1,
                  notes: '',
                  status: 'in_progress'
                });
              }

              render(container);
              return true;
            }
          }
        ],
        onMount: (modalBody) => {
          const containerSteps = modalBody.querySelector('#modal-phase-inputs');
          const addStepBtn = modalBody.querySelector('#btn-modal-add-step');

          const updateStepLabels = () => {
            const rows = containerSteps.querySelectorAll('.modal-step-row');
            rows.forEach((row, i) => {
              const badge = row.querySelector('.modal-step-badge');
              if (badge) badge.textContent = `Step ${i + 1}:`;
            });
          };

          if (addStepBtn && containerSteps) {
            addStepBtn.addEventListener('click', () => {
              const count = containerSteps.querySelectorAll('.modal-step-row').length + 1;
              const row = document.createElement('div');
              row.className = 'modal-step-row';
              row.innerHTML = `
                <span class="modal-step-badge">Step ${count}:</span>
                <input type="text" class="modal-phase-val" placeholder="e.g. Next milestone" style="flex: 1;" />
                <button type="button" class="btn-icon btn-xs btn-modal-del-step" title="Remove step">${icons.close}</button>
              `;
              row.querySelector('.btn-modal-del-step').onclick = () => {
                row.remove();
                updateStepLabels();
              };
              containerSteps.appendChild(row);
              row.querySelector('input').focus();
            });
          }

          containerSteps.querySelectorAll('.btn-modal-del-step').forEach(delBtn => {
            delBtn.onclick = () => {
              const row = delBtn.closest('.modal-step-row');
              if (containerSteps.querySelectorAll('.modal-step-row').length > 1) {
                row.remove();
                updateStepLabels();
              }
            };
          });
        }
      });
    });
  }

  // Attach Event: Edit Project
  container.querySelectorAll('.btn-edit-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const project = projects.find(p => p.id === id);
      if (project) {
        await showModal({
          title: 'Edit Project',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="edit-proj-name">Project Name</label>
              <input type="text" id="edit-proj-name" value="${escapeHtml(project.name)}" required />
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="edit-proj-desc">Context Note</label>
              <textarea id="edit-proj-desc" rows="3">${escapeHtml(project.description || '')}</textarea>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="edit-proj-status">Status</label>
              <select id="edit-proj-status">
                <option value="in_progress" ${project.status !== 'completed' ? 'selected' : ''}>Active / In Progress</option>
                <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Changes',
              className: 'btn-primary',
              onClick: async (body) => {
                const name = body.querySelector('#edit-proj-name').value.trim();
                const description = body.querySelector('#edit-proj-desc').value.trim();
                const status = body.querySelector('#edit-proj-status').value;
                if (!name) return false;

                project.name = name;
                project.description = description;
                project.status = status;
                await store.saveProject(project);
                render(container);
                return true;
              }
            }
          ]
        });
      }
    });
  });

  // Attach Event: Share Project (JSON)
  container.querySelectorAll('.btn-export-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      await exportProject(id);
    });
  });

  // Attach Event: Delete Project
  container.querySelectorAll('.btn-delete-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const project = projects.find(p => p.id === id);
      if (confirm(`Delete project "${project.name}" and all its phases?`)) {
        await store.deleteProject(id);
        render(container);
      }
    });
  });
}
