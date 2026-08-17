/**
 * js/widgets/tasks.js - Focus Tasks Attention Widget
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';

export const widget = {
  name: 'tasks',
  label: 'Focus Tasks',
  icon: '📋',

  async render(container) {
    const tasks = await store.getTasks();
    const activeTasks = tasks.filter(t => t.status !== 'completed');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">📋 Focus Tasks</div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="btn-icon btn-xs" id="widget-add-task" title="Add task">+</button>
            <a href="#projects" class="btn-icon btn-xs" title="Manage Projects & Phases">↗</a>
          </div>
        </div>
        <div class="widget-body" id="widget-tasks-list">
          ${activeTasks.length === 0 
            ? emptyStateHtml('Nothing pressing.') 
            : activeTasks.slice(0, 6).map(t => `
              <div class="kv-row" style="align-items: center;">
                <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer; flex: 1;">
                  <input type="checkbox" class="widget-task-check" data-id="${escapeHtml(t.id)}" />
                  <span style="font-size: var(--font-size-sm);">${escapeHtml(t.title)}</span>
                </label>
                <button class="btn-icon btn-xs widget-task-delete" data-id="${escapeHtml(t.id)}" title="Delete">✕</button>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    // Event: Add Task
    const addBtn = container.querySelector('#widget-add-task');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        await showModal({
          title: 'Add Quick Task',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="quick-task-title">Task Description</label>
              <input type="text" id="quick-task-title" placeholder="What needs doing now?" required />
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Add to Workbench',
              className: 'btn-primary',
              onClick: async (body) => {
                const title = body.querySelector('#quick-task-title').value.trim();
                if (!title) return false;
                await store.saveTask({
                  title,
                  status: 'todo'
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Complete Task & Offer Deletion
    container.querySelectorAll('.widget-task-check').forEach((chk) => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const task = (await store.getTasks()).find(t => t.id === id);
        if (task) {
          task.status = 'completed';
          await store.saveTask(task);

          setTimeout(async () => {
            const shouldDelete = confirm(`Task "${task.title}" is complete! Would you like to clear it from the workbench?`);
            if (shouldDelete) {
              await store.deleteTask(id);
            }
            await this.render(container);
          }, 200);
        }
      });
    });

    // Event: Delete Task
    container.querySelectorAll('.widget-task-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await store.deleteTask(id);
        await this.render(container);
      });
    });
  }
};
