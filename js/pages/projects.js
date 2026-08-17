/**
 * js/pages/projects.js - Projects & Progress Compact Grid & Expandable Cards
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { exportProject } from '../utils/export.js';

export async function render(container) {
  const projects = await store.getProjects();

  const projectCards = await Promise.all(projects.map(async (project) => {
    const phases = await store.getPhasesByProject(project.id);
    const tasks = await store.getTasksByProject(project.id);
    
    phases.sort((a, b) => (a.order || 0) - (b.order || 0));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const isCompleted = project.status === 'completed' || (totalTasks > 0 && completedTasks === totalTasks);

    return `
      <div class="card project-card" data-project-id="${escapeHtml(project.id)}">
        <div class="card-header" style="cursor: pointer;">
          <div style="flex: 1; padding-right: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge ${isCompleted ? 'badge-success' : 'badge-primary'}">${isCompleted ? '✅ Complete' : 'Active'}</span>
              <h3 class="card-title" style="font-size: var(--font-size-md);">${escapeHtml(project.name)}</h3>
            </div>
            ${project.description ? `
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px; line-height: 1.4;">
                ${escapeHtml(project.description)}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; gap: var(--space-2); align-items: center;" onclick="event.stopPropagation();">
            <a href="#phases?projectId=${escapeHtml(project.id)}" class="btn btn-xs btn-primary">Open Phases ↗</a>
            <button class="btn-icon btn-xs btn-toggle-expand" data-id="${escapeHtml(project.id)}" title="Toggle phase breakdown">▼</button>
            <button class="btn-icon btn-xs btn-export-project" data-id="${escapeHtml(project.id)}" title="Share project (JSON)">📤</button>
            <button class="btn-icon btn-xs btn-edit-project" data-id="${escapeHtml(project.id)}" title="Edit project">✏️</button>
            <button class="btn-icon btn-xs btn-delete-project" data-id="${escapeHtml(project.id)}" title="Delete project">🗑️</button>
          </div>
        </div>

        <!-- Progress Bar Summary -->
        <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2);">
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted);">
            <span>Milestones: ${phases.length} phases</span>
            <span style="font-weight: 600;">${completedTasks} / ${totalTasks} tasks (${progressPercent}%)</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <!-- Collapsible Phases Breakdown -->
        <div class="project-phases-dropdown" id="phases-dropdown-${escapeHtml(project.id)}" style="display: none; margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px dashed var(--color-border);">
          <div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle); margin-bottom: var(--space-2);">
            Phases Overview (${phases.length})
          </div>
          ${phases.length === 0 
            ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">No phases created. Click "Open Phases" to add structure.</div>'
            : `<div style="display: flex; flex-direction: column; gap: var(--space-1);">
                ${phases.map((ph, idx) => {
                  const phaseTasks = tasks.filter(t => t.phaseId === ph.id);
                  const phaseCompleted = phaseTasks.filter(t => t.status === 'completed').length;
                  const isPhaseDone = ph.status === 'completed' || (phaseTasks.length > 0 && phaseCompleted === phaseTasks.length);
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); padding: 4px 8px; background-color: var(--color-bg-subtle); border-radius: var(--radius-sm);">
                      <span>${isPhaseDone ? '✅' : '🟡'} Phase ${idx + 1}: <strong>${escapeHtml(ph.name)}</strong></span>
                      <span class="badge badge-default">${phaseCompleted} / ${phaseTasks.length} tasks</span>
                    </div>
                  `;
                }).join('')}
               </div>`
          }
        </div>
      </div>
    `;
  }));

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📋 Projects & Progress</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              High-level overview of projects. Click cards to view phase breakdowns or open detail views.
            </div>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-new-project">+ New Project</button>
        </div>
      </div>

      ${projects.length === 0 
        ? '<div class="card"><div class="empty-state">No projects yet. Create your first project to break work into structured phases.</div></div>'
        : `<div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${projectCards.join('')}
           </div>`
      }
    </div>
  `;

  // Attach Event: Expand/Collapse Phases Dropdown
  container.querySelectorAll('.project-card').forEach((card) => {
    const projId = card.getAttribute('data-project-id');
    const dropdown = card.querySelector(`#phases-dropdown-${projId}`);
    const toggleBtn = card.querySelector('.btn-toggle-expand');

    card.querySelector('.card-header').addEventListener('click', () => {
      if (dropdown) {
        const isHidden = dropdown.style.display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
        if (toggleBtn) toggleBtn.textContent = isHidden ? '▲' : '▼';
      }
    });
  });

  // Attach Event: New Project
  const newProjectBtn = container.querySelector('#btn-new-project');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', async () => {
      await openProjectEditor(null, container);
    });
  }

  // Attach Event: Edit Project
  container.querySelectorAll('.btn-edit-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = btn.getAttribute('data-id');
      const proj = projects.find(p => p.id === projId);
      if (proj) {
        await openProjectEditor(proj, container);
      }
    });
  });

  // Attach Event: Export Project
  container.querySelectorAll('.btn-export-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = btn.getAttribute('data-id');
      const proj = projects.find(p => p.id === projId);
      if (proj) {
        await exportProject(proj);
      }
    });
  });

  // Attach Event: Delete Project
  container.querySelectorAll('.btn-delete-project').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this project and all its phases and tasks?')) {
        await store.deleteProject(projId);
        render(container);
      }
    });
  });
}

async function openProjectEditor(existingProj, container) {
  const isEditing = !!existingProj;
  await showModal({
    title: isEditing ? 'Edit Project' : 'Create New Project',
    contentHtml: `
      <div class="form-group">
        <label class="form-label" for="proj-name">Project Name</label>
        <input type="text" id="proj-name" value="${escapeHtml(existingProj?.name || '')}" placeholder="e.g. Month-End Closing" required />
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="proj-desc">Objective / Description</label>
        <textarea id="proj-desc" rows="3" placeholder="What does successful completion look like?">${escapeHtml(existingProj?.description || '')}</textarea>
      </div>
    `,
    buttons: [
      { text: 'Cancel', className: 'btn-ghost', value: null },
      {
        text: isEditing ? 'Update Project' : 'Create Project',
        className: 'btn-primary',
        onClick: async (body) => {
          const name = body.querySelector('#proj-name').value.trim();
          const description = body.querySelector('#proj-desc').value.trim();
          if (!name) {
            alert('Please enter a project name.');
            return false;
          }

          if (isEditing) {
            existingProj.name = name;
            existingProj.description = description;
            await store.saveProject(existingProj);
          } else {
            const newProj = await store.saveProject({
              name,
              description,
              status: 'active'
            });
            // Auto create Phase 1
            await store.savePhase({
              projectId: newProj.id,
              name: 'Phase 1: Initial Preparation',
              order: 1,
              notes: '',
              status: 'in_progress'
            });
          }
          return true;
        }
      }
    ]
  });

  render(container);
}
