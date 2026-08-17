/**
 * js/pages/notes.js - Quick Notes & Documentation Scratchpad
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { formatDate } from '../utils/time.js';

export async function render(container) {
  const notes = await store.getNotes();
  const projects = await store.getProjects();

  container.innerHTML = `
    <div class="page-container">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📝 Quick Notes</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Capture thoughts, scratchpads, and context immediately.
            </div>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-new-note">+ New Note</button>
        </div>
      </div>

      ${notes.length === 0 
        ? '<div class="card"><div class="empty-state">No notes written. Keep thoughts out of your head and on the workbench.</div></div>'
        : `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4);">
            ${notes.map(note => {
              const linkedProj = projects.find(p => p.id === note.projectId);
              return `
                <div class="card note-card" data-note-id="${escapeHtml(note.id)}" style="cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-2);">
                      <strong style="font-size: var(--font-size-md);">${escapeHtml(note.title)}</strong>
                      <span style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${formatDate(note.updatedAt)}</span>
                    </div>
                    ${linkedProj ? `<span class="badge badge-primary" style="margin-bottom: 6px;">📁 ${escapeHtml(linkedProj.name)}</span>` : ''}
                    <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); white-space: pre-wrap; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                      ${escapeHtml(note.content || 'Empty note')}
                    </p>
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-3); border-top: 1px solid var(--color-border); padding-top: var(--space-2);">
                    <button class="btn btn-xs btn-secondary btn-edit-note" data-note-id="${escapeHtml(note.id)}">Edit</button>
                    <button class="btn-icon btn-xs btn-delete-note" data-note-id="${escapeHtml(note.id)}" title="Delete note">🗑️</button>
                  </div>
                </div>
              `;
            }).join('')}
           </div>`
      }
    </div>
  `;

  // Attach Event: New Note
  const newNoteBtn = container.querySelector('#btn-new-note');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', async () => {
      await openNoteEditor(null, projects, container);
    });
  }

  // Attach Event: Edit Note
  container.querySelectorAll('.btn-edit-note, .note-card').forEach((el) => {
    el.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-delete-note')) return;
      const noteId = el.getAttribute('data-note-id');
      const note = notes.find(n => n.id === noteId);
      if (note) {
        await openNoteEditor(note, projects, container);
      }
    });
  });

  // Attach Event: Delete Note
  container.querySelectorAll('.btn-delete-note').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const noteId = btn.getAttribute('data-note-id');
      if (confirm('Delete this note?')) {
        await store.deleteNote(noteId);
        render(container);
      }
    });
  });
}

async function openNoteEditor(existingNote, projects, container) {
  const isEditing = !!existingNote;
  await showModal({
    title: isEditing ? 'Edit Note' : 'New Note',
    contentHtml: `
      <div class="form-group">
        <label class="form-label" for="note-title">Title</label>
        <input type="text" id="note-title" value="${escapeHtml(existingNote?.title || '')}" placeholder="e.g. Call notes with FM" required />
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="note-project">Associated Project (Optional)</label>
        <select id="note-project">
          <option value="">-- Standalone Note --</option>
          ${projects.map(p => `
            <option value="${escapeHtml(p.id)}" ${existingNote?.projectId === p.id ? 'selected' : ''}>
              ${escapeHtml(p.name)}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="note-content">Content</label>
        <textarea id="note-content" rows="6" placeholder="Write context, action items, or scratchpad...">${escapeHtml(existingNote?.content || '')}</textarea>
      </div>
    `,
    buttons: [
      { text: 'Cancel', className: 'btn-ghost', value: null },
      {
        text: isEditing ? 'Update Note' : 'Save Note',
        className: 'btn-primary',
        onClick: async (body) => {
          const title = body.querySelector('#note-title').value.trim();
          const projectId = body.querySelector('#note-project').value || null;
          const content = body.querySelector('#note-content').value.trim();

          if (!title) {
            alert('Please enter a note title.');
            return false;
          }

          await store.saveNote({
            id: existingNote?.id,
            title,
            projectId,
            content,
            standalone: !projectId
          });
          return true;
        }
      }
    ]
  });

  render(container);
}
