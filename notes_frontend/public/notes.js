//
// All SPA logic for Notes app: manages notes, state, localStorage.
//
(() => {
  // Utility: ID generator
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Utility: save notes to localStorage
  function saveNotes(notes) {
    window.localStorage.setItem("notes", JSON.stringify(notes));
  }
  // Utility: load notes from localStorage
  function loadNotes() {
    try {
      return JSON.parse(window.localStorage.getItem("notes") || "[]");
    } catch {
      return [];
    }
  }

  // Utility: get all unique tags
  function allTags(notes) {
    const set = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  // State
  let notes = loadNotes();
  let noteId = notes.length > 0 ? notes[0].id : null;
  let editing = false;
  let searchValue = "";
  let tagFilter = "";
  let tagInputValue = "";
  let showBack = false; // On mobile

  // --- Elements ---
  const $sidebar = document.querySelector("aside.notes-sidebar");
  const $noteList = $sidebar?.querySelector(".note-list");
  const $search = $sidebar?.querySelector(".search-input");
  const $createBtn = $sidebar?.querySelector(".create-btn");
  // Top bar:
  const $topbar = document.querySelector(".notes-topbar");
  const $editBtn = $topbar?.querySelector(".edit-btn");
  const $saveBtn = $topbar?.querySelector(".save-btn");
  const $deleteBtn = $topbar?.querySelector(".delete-btn");
  const $backBtn = $topbar?.querySelector(".back-btn");
  // Main area
  const $mainPane = document.querySelector(".main-pane");
  // Forms/inputs
  let $titleInput = null;
  let $contentInput = null;

  // --- Render Functions ---
  function render() {
    // Grab elements fresh (in case replaced)
    $titleInput = document.querySelector(".note-title-input");
    $contentInput = document.querySelector(".note-content-input");

    // Notes sidebar
    if ($sidebar) {
      // Note list
      if ($noteList) {
        $noteList.innerHTML = "";
        let filteredNotes = notes
          .filter(n =>
            (!searchValue ||
              n.title.toLowerCase().includes(searchValue.trim().toLowerCase()) ||
              n.content.toLowerCase().includes(searchValue.trim().toLowerCase())) &&
            (!tagFilter || (n.tags || []).includes(tagFilter))
          );
        if (filteredNotes.length === 0) {
          let node = document.createElement("li");
          node.className = "muted";
          node.textContent = "No notes found";
          $noteList.appendChild(node);
        } else {
          filteredNotes.forEach(note => {
            let item = document.createElement("li");
            item.className = "note-item" + (note.id === noteId ? " active" : "");
            item.addEventListener("click", () => {
              noteId = note.id;
              editing = false;
              showBack = window.innerWidth <= 600;
              render();
            });
            let titleDiv = document.createElement("div");
            titleDiv.className = "note-title";
            titleDiv.textContent = note.title || "Untitled";
            item.appendChild(titleDiv);
            let tagsDiv = document.createElement("div");
            tagsDiv.className = "note-tags";
            (note.tags || []).forEach(tag => {
              let tg = document.createElement("span");
              tg.className = "note-tag";
              tg.textContent = tag;
              tagsDiv.appendChild(tg);
            });
            item.appendChild(tagsDiv);
            $noteList.appendChild(item);
          });
        }
      }
      // Tag filters
      let $tagsFilter = $sidebar.querySelector(".tags-filter");
      if ($tagsFilter) {
        $tagsFilter.innerHTML = "";
        let allTagList = allTags(notes);
        let addTagBtn = (label, tag) => {
          let btn = document.createElement("button");
          btn.textContent = label;
          if (tagFilter === tag) btn.classList.add("active");
          btn.addEventListener("click", e => {
            tagFilter = tag;
            render();
          });
          $tagsFilter.appendChild(btn);
        };
        addTagBtn("All", "");
        allTagList.forEach(tag => addTagBtn(tag, tag));
      }
      // Sidebar search
      if ($search) {
        $search.value = searchValue;
        $search.oninput = (e) => {
          searchValue = e.target.value;
          render();
        };
      }
      // Create
      if ($createBtn) {
        $createBtn.onclick = () => {
          const newNote = {
            id: genId(),
            title: "",
            content: "",
            tags: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
          notes = [newNote, ...notes];
          noteId = newNote.id;
          editing = true;
          showBack = window.innerWidth <= 600;
          saveNotes(notes);
          render();
        };
      }
    }

    // Topbar
    if ($topbar) {
      // Edit, Save, Delete
      let isNoteSelected = !!noteId && notes.some(n => n.id === noteId);
      if ($editBtn) {
        $editBtn.disabled = !isNoteSelected;
        $editBtn.onclick = () => {
          if (isNoteSelected) {
            editing = true;
            render();
            setTimeout(() => $titleInput?.focus(), 50);
          }
        };
      }
      if ($saveBtn) {
        $saveBtn.disabled = !isNoteSelected;
        $saveBtn.onclick = () => {
          if (!isNoteSelected) return;
          let idx = notes.findIndex(n => n.id === noteId);
          if ($titleInput && $contentInput) {
            notes[idx] = {
              ...notes[idx],
              title: $titleInput.value,
              content: $contentInput.value,
              updated: new Date().toISOString(),
            };
            editing = false;
            saveNotes(notes);
            render();
          }
        };
      }
      if ($deleteBtn) {
        $deleteBtn.disabled = !isNoteSelected;
        $deleteBtn.onclick = () => {
          if (!isNoteSelected) return;
          notes = notes.filter(n => n.id !== noteId);
          noteId = notes.length > 0 ? notes[0].id : null;
          editing = false;
          tagInputValue = "";
          saveNotes(notes);
          render();
        };
      }
      // Back button (mobile)
      if ($backBtn) {
        $backBtn.style.display = showBack ? "" : "none";
        $backBtn.onclick = () => {
          showBack = false;
          noteId = null;
          editing = false;
          render();
        };
      }
      // Tags
      let $tagsGroup = $topbar.querySelector(".tags-group");
      if ($tagsGroup) {
        let currTags = [];
        if (isNoteSelected) {
          currTags = notes.find(n => n.id === noteId)?.tags || [];
        }
        $tagsGroup.innerHTML =
          `<span class="tag-label">Tags:</span>` +
          currTags
            .map(
              t =>
                `<span class="main-tag">${t}<button class="tag-remove"${editing
                  ? ""
                  : " disabled"} title="Remove tag">×</button></span>`
            )
            .join("") +
          (editing
            ? `<form class="tag-form" autocomplete="off"><input class="tag-input" type="text" placeholder="Add tag" value="${tagInputValue}" maxlength="20" size="7" /><button class="tag-add-btn" type="submit" ${!tagInputValue.trim() ? "disabled" : ""}>+</button></form>`
            : "");
        // Tag remove
        $tagsGroup
          .querySelectorAll(".main-tag .tag-remove")
          .forEach((btn, i) => {
            btn.onclick = () => {
              if (!editing) return;
              let idx = notes.findIndex(n => n.id === noteId);
              if (idx >= 0) {
                notes[idx].tags = (notes[idx].tags || []).filter((_, j) => j !== i);
                saveNotes(notes);
                render();
              }
            };
          });
        // Tag form/add
        if (editing) {
          let $form = $tagsGroup.querySelector("form.tag-form");
          let $input = $tagsGroup.querySelector("input.tag-input");
          let $addBtn = $tagsGroup.querySelector("button.tag-add-btn");
          if ($input) {
            $input.value = tagInputValue;
            $input.oninput = e => {
              tagInputValue = e.target.value.replace(/[^\w\s-]/g, "").slice(0, 20);
              $addBtn.disabled = !tagInputValue.trim();
            };
            $input.onkeydown = e => {
              if (e.key === "Enter") {
                if (tagInputValue.trim()) $addBtn.click();
                e.preventDefault();
              }
            };
          }
          $form.onsubmit = e => {
            e.preventDefault();
            if (!tagInputValue.trim()) return;
            let idx = notes.findIndex(n => n.id === noteId);
            if (idx >= 0 && !notes[idx].tags.includes(tagInputValue.trim())) {
              notes[idx].tags = [...(notes[idx].tags || []), tagInputValue.trim()];
              tagInputValue = "";
              saveNotes(notes);
              render();
            }
          };
        }
      }
    }

    // Main pane
    if ($mainPane) {
      let isNoteSelected = noteId && notes.some(n => n.id === noteId);
      let currentNote = isNoteSelected
        ? notes.find(n => n.id === noteId)
        : null;
      if (!isNoteSelected) {
        $mainPane.innerHTML = `<section class="empty-state">
            <div>No note selected.</div>
            <div>Select or create a note to get started!</div>
          </section>`;
      } else {
        $mainPane.innerHTML = `<form spellcheck="true" autocomplete="off" class="note-form">
          <input
            class="note-title-input"
            type="text"
            placeholder="Title"
            value="${currentNote.title || ""}"
            ${editing ? "" : "disabled"}
            maxlength="60"
            required
            aria-label="Note Title"
          />
          <textarea
            class="note-content-input"
            rows="15"
            placeholder="Write your note here..."
            ${editing ? "" : "disabled"}
            aria-label="Note Content"
          >${currentNote.content || ""}</textarea>
        </form>`;
        // --- Input handlers
        let ti = $mainPane.querySelector(".note-title-input");
        let ci = $mainPane.querySelector(".note-content-input");
        if (ti && editing) {
          ti.focus();
          ti.oninput = e => {
            let idx = notes.findIndex(n => n.id === noteId);
            notes[idx].title = e.target.value;
          };
        }
        if (ci && editing) {
          ci.oninput = e => {
            let idx = notes.findIndex(n => n.id === noteId);
            notes[idx].content = e.target.value;
          };
        }
      }
    }
  }

  // Initial mount
  window.addEventListener("DOMContentLoaded", () => {
    render();
    // Responsive/mobile: showBack button if a note selected on mobile
    window.addEventListener("resize", () => {
      showBack = window.innerWidth <= 600 && !!noteId;
      render();
    });
  });
})();
