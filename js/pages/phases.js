/**
 * js/pages/phases.js - Phase Detail, Context Preservation & Phase Management
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';

export async function render(container) {
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(hash.split('?')[1] || '');
  let activeProjectId = urlParams.get('projectId');

  const projects = await store.getProjects();
  if (projects.length === 0) {
    container.innerHTML = `
      <div class="page-container">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">🧩 Phase Management</h2>
          </div>
          <div class="empty-state">
            No projects available. Please <a href="#projects">create a project</a> first.
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
    activeProjectId = projects[0].id;
  }

  const currentProject = projects.find(p => p.id === activeProjectId);
  const phases = await store.getPhasesByProject(activeProjectId);
  phases.sort((a, b) => (a.order || 0) - (b.order || 0));

  const allProjectTasks = await store.getTasksByProject(activeProjectId);

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">Project</span>
            <h2 class="card-title">${escapeHtml(currentProject.name)}</h2>
          </div>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <select id="project-selector" style="font-size: var(--font-size-sm);">
              ${projects.map(p => `
                <option value="${escapeHtml(p.id)}" ${p.id === activeProjectId ? 'selected' : ''}>
                  ${escapeHtml(p.name)}
                </option>
              `).join('')}
            </select>
            <button class="btn btn-sm btn-primary" id="btn-add-phase">+ Add Phase</button>
          </div>
        </div>
      </div>

      ${phases.length === 0 
        ? '<div class="card"><div class="empty-state">No phases in this project yet. Click "+ Add Phase" to add structured milestones.</div></div>'
        : `<div style="display: flex; flex-direction: column; gap: var(--space-4);">
            ${phases.map((phase, idx) => {
              const phaseTasks = allProjectTasks.filter(t => t.phaseId === phase.id);
              const completedTasks = phaseTasks.filter(t => t.status === 'completed').length;
              const isMarkedDone = phase.status === 'completed';
              const isAutoDone = phaseTasks.length > 0 && completedTasks === phaseTasks.length;
              const isDone = isMarkedDone || isAutoDone;

              return `
                <div class="card phase-card" data-phase-id="${escapeHtml(phase.id)}" style="${isDone ? 'border-color: var(--color-success);' : ''}">
                  <div class="card-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="badge ${isDone ? 'badge-success' : 'badge-primary'}">
                        ${isDone ? '✅ Complete' : `Phase ${idx + 1}`}
                      </span>
                      <strong style="font-size: var(--font-size-md);">${escapeHtml(phase.name)}</strong>
                    </div>
                    <div style="display: flex; align-items: center; gap: var(--space-2);">
                      <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                        ${completedTasks} / ${phaseTasks.length} tasks
                      </span>
                      <button class="btn btn-xs ${isDone ? 'btn-secondary' : 'btn-primary'} btn-toggle-phase-status" data-phase-id="${escapeHtml(phase.id)}">
                        ${isDone ? 'Reopen' : '✓ Complete Phase'}
                      </button>
                      <button class="btn btn-xs btn-secondary btn-add-task-to-phase" data-phase-id="${escapeHtml(phase.id)}">+ Task</button>
                      <button class="btn-icon btn-xs btn-edit-phase" data-phase-id="${escapeHtml(phase.id)}" title="Edit phase name & order">✏️</button>
                      <button class="btn-icon btn-xs btn-delete-phase" data-phase-id="${escapeHtml(phase.id)}" title="Delete phase">🗑️</button>
                    </div>
                  </div>

                  <!-- Phase Context & Preservation Notes -->
                  <div style="background-color: var(--color-bg-subtle); padding: var(--space-3); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-muted);">
                        Context & Notes (Preserved for return)
                      </span>
                      <button class="btn btn-xs btn-ghost btn-save-notes" data-phase-id="${escapeHtml(phase.id)}">Save Notes</button>
                    </div>
                    <textarea class="phase-notes-input" data-phase-id="${escapeHtml(phase.id)}" rows="2" style="width: 100%; font-size: var(--font-size-sm);" placeholder="Add context, roadblocks, or next action (e.g. 'Waiting for FM transfer verification')...">${escapeHtml(phase.notes || '')}</textarea>
                  </div>

                  <!-- Tasks List for this Phase -->
                  <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-1);">
                    <div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle);">
                      Tasks (${phaseTasks.length})
                    </div>
                    ${phaseTasks.length === 0 
                      ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">No tasks under this phase. Click "+ Task" to add.</div>'
                      : phaseTasks.map(task => {
                        const isTaskDone = task.status === 'completed';
                        return `
                          <div class="kv-row" style="padding: var(--space-2) 0; align-items: center;">
                            <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer; flex: 1;">
                              <input type="checkbox" class="task-checkbox" data-task-id="${escapeHtml(task.id)}" ${isTaskDone ? 'checked' : ''} />
                              <span style="${isTaskDone ? 'text-decoration: line-through; opacity: 0.6;' : 'font-weight: 500;'}">${escapeHtml(task.title)}</span>
                            </label>
                            <button class="btn-icon btn-xs btn-delete-task" data-task-id="${escapeHtml(task.id)}" title="Delete task">✕</button>
                          </div>
                        `;
                      }).join('')
                    }
                  </div>
                </div>
              `;
            }).join('')}
           </div>`
      }
    </div>
  `;

  // Attach Event: Project Selector change
  const projSelector = container.querySelector('#project-selector');
  if (projSelector) {
    projSelector.addEventListener('change', (e) => {
      window.location.hash = `#phases?projectId=${e.target.value}`;
    });
  }

  // Attach Event: Add Phase (Name + Notes)
  const addPhaseBtn = container.querySelector('#btn-add-phase');
  if (addPhaseBtn) {
    addPhaseBtn.addEventListener('click', async () => {
      await showModal({
        title: 'Add New Phase',
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="new-phase-name">Phase Name</label>
            <input type="text" id="new-phase-name" placeholder="e.g. Reconciliation & Audit" required />
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label" for="new-phase-notes">Phase Context & Initial Notes (Optional)</label>
            <textarea id="new-phase-notes" rows="3" placeholder="Context, dependencies, or notes for when you return..."></textarea>
          </div>
        `,
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Create Phase',
            className: 'btn-primary',
            onClick: async (body) => {
              const name = body.querySelector('#new-phase-name').value.trim();
              const notes = body.querySelector('#new-phase-notes').value.trim();
              if (!name) return false;
              await store.savePhase({
                projectId: activeProjectId,
                name,
                order: phases.length + 1,
                notes,
                status: 'in_progress'
              });
              return true;
            }
          }
        ]
      });
      render(container);
    });
  }

  // Attach Event: Edit Phase
  container.querySelectorAll('.btn-edit-phase').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phaseId = btn.getAttribute('data-phase-id');
      const phase = phases.find(p => p.id === phaseId);
      if (phase) {
        await showModal({
          title: 'Edit Phase',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="edit-phase-name">Phase Name</label>
              <input type="text" id="edit-phase-name" value="${escapeHtml(phase.name)}" required />
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="edit-phase-notes">Context / Notes</label>
              <textarea id="edit-phase-notes" rows="3">${escapeHtml(phase.notes || '')}</textarea>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Changes',
              className: 'btn-primary',
              onClick: async (body) => {
                const name = body.querySelector('#edit-phase-name').value.trim();
                const notes = body.querySelector('#edit-phase-notes').value.trim();
                if (!name) return false;
                phase.name = name;
                phase.notes = notes;
                await store.savePhase(phase);
                return true;
              }
            }
          ]
        });
        render(container);
      }
    });
  });

  // Attach Event: Toggle Phase Status (Complete / Reopen)
  container.querySelectorAll('.btn-toggle-phase-status').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phaseId = btn.getAttribute('data-phase-id');
      const phase = phases.find(p => p.id === phaseId);
      if (phase) {
        phase.status = phase.status === 'completed' ? 'in_progress' : 'completed';
        await store.savePhase(phase);
        render(container);
      }
    });
  });

  // Attach Event: Delete Phase
  container.querySelectorAll('.btn-delete-phase').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phaseId = btn.getAttribute('data-phase-id');
      if (confirm('Delete this phase? Associated tasks will remain in the project.')) {
        await store.deletePhase(phaseId);
        render(container);
      }
    });
  });

  // Attach Event: Add Task to Phase
  container.querySelectorAll('.btn-add-task-to-phase').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phaseId = btn.getAttribute('data-phase-id');
      await showModal({
        title: 'Add Task to Phase',
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="new-task-title">Task Description</label>
            <input type="text" id="new-task-title" placeholder="e.g. Confirm transfer with FM" required />
          </div>
        `,
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Add Task',
            className: 'btn-primary',
            onClick: async (body) => {
              const title = body.querySelector('#new-task-title').value.trim();
              if (!title) return false;
              await store.saveTask({
                title,
                projectId: activeProjectId,
                phaseId,
                status: 'todo'
              });
              return true;
            }
          }
        ]
      });
      render(container);
    });
  });

  // Attach Event: Task Completion & Deletion Prompt
  container.querySelectorAll('.task-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', async (e) => {
      const taskId = e.target.getAttribute('data-task-id');
      const isChecked = e.target.checked;
      
      const task = (await store.getTasks()).find(t => t.id === taskId);
      if (task) {
        task.status = isChecked ? 'completed' : 'todo';
        await store.saveTask(task);

        if (isChecked) {
          setTimeout(async () => {
            const shouldDelete = confirm(`Task "${task.title}" is complete! Would you like to clear it from the workbench?`);
            if (shouldDelete) {
              await store.deleteTask(taskId);
            }
            render(container);
          }, 300);
        } else {
          render(container);
        }
      }
    });
  });

  // Attach Event: Delete Task
  container.querySelectorAll('.btn-delete-task').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const taskId = btn.getAttribute('data-task-id');
      await store.deleteTask(taskId);
      render(container);
    });
  });

  // Attach Event: Save Notes
  container.querySelectorAll('.btn-save-notes').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phaseId = btn.getAttribute('data-phase-id');
      const textarea = container.querySelector(`.phase-notes-input[data-phase-id="${phaseId}"]`);
      if (textarea) {
        const phase = phases.find(p => p.id === phaseId);
        if (phase) {
          phase.notes = textarea.value.trim();
          await store.savePhase(phase);
          btn.textContent = 'Saved! ✓';
          setTimeout(() => { btn.textContent = 'Save Notes'; }, 1500);
        }
      }
    });
  });
}
