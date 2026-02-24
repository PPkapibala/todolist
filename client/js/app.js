(function () {
  'use strict';

  // --- DOM Elements ---
  const themeToggle = document.getElementById('themeToggle');
  const menuToggle = document.getElementById('menuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const addInput = document.getElementById('addInput');
  const addBtn = document.getElementById('addBtn');
  const addOptions = document.getElementById('addOptions');
  const addPriority = document.getElementById('addPriority');
  const addCategory = document.getElementById('addCategory');
  const addDueDate = document.getElementById('addDueDate');
  const searchInput = document.getElementById('searchInput');
  const viewTabs = document.querySelectorAll('.view-tab');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const todoList = document.getElementById('todoList');
  const todoLoading = document.getElementById('todoLoading');
  const emptyState = document.getElementById('emptyState');
  const footer = document.getElementById('footer');
  const todoStats = document.getElementById('todoStats');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  const snackbar = document.getElementById('snackbar');
  const snackbarText = document.getElementById('snackbarText');
  const snackbarUndo = document.getElementById('snackbarUndo');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmText = document.getElementById('confirmText');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');

  // --- State ---
  let todos = [];
  let allTodos = [];
  let currentView = 'all';
  let currentFilter = 'all';
  let currentSearch = '';
  let snackbarTimer = null;
  let lastDeletedTodo = null;
  let confirmResolve = null;
  let dragItem = null;

  // --- Theme ---
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }

  // --- Todos ---
  async function loadTodos() {
    todoLoading.style.display = 'flex';
    todoList.innerHTML = '';
    emptyState.style.display = 'none';
    footer.style.display = 'none';

    try {
      const params = {};
      if (currentFilter === 'active') params.completed = 'false';
      else if (currentFilter === 'completed') params.completed = 'true';
      if (currentSearch) params.search = currentSearch;

      const res = await api.getTodos(params);
      allTodos = res.data;
      todos = currentView === 'today' ? filterTodayTodos(allTodos) : allTodos;
    } catch (err) {
      todos = [];
      showSnackbar('加载失败：' + err.message);
    }

    todoLoading.style.display = 'none';
    renderTodos();
    updateViewBadges();
  }

  function renderTodos() {
    todoList.innerHTML = '';

    if (todos.length === 0) {
      emptyState.style.display = '';
      const emptyIcon = emptyState.querySelector('.empty-state-icon');
      const emptyTitle = emptyState.querySelector('.empty-state-title');
      const emptyText = emptyState.querySelector('.empty-state-text');
      if (currentView === 'today') {
        emptyIcon.textContent = '🎉';
        emptyTitle.textContent = '今日暂无待办';
        emptyText.textContent = '添加任务时设置今天的截止日期即可在这里看到';
      } else {
        emptyIcon.textContent = '📝';
        emptyTitle.textContent = '暂无任务';
        emptyText.textContent = '在上方输入框中添加你的第一个任务吧';
      }
      footer.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    footer.style.display = 'flex';

    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    todoStats.textContent = `共 ${total} 项，已完成 ${completed} 项`;

    todos.forEach((todo) => {
      todoList.appendChild(createTodoEl(todo));
    });
  }

  function createTodoEl(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.setAttribute('draggable', 'true');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('button');
    checkbox.className = 'todo-checkbox' + (todo.completed ? ' checked' : '');
    checkbox.setAttribute('aria-label', todo.completed ? '标记为未完成' : '标记为已完成');
    checkbox.addEventListener('click', () => toggleComplete(todo));

    const body = document.createElement('div');
    body.className = 'todo-body';

    const content = document.createElement('div');
    content.className = 'todo-content';
    content.textContent = todo.content;
    content.addEventListener('dblclick', () => startEdit(todo, content));

    body.appendChild(content);

    const meta = document.createElement('div');
    meta.className = 'todo-meta';

    const priorityLabel = { high: '高', medium: '中', low: '低' };
    const priorityTag = document.createElement('span');
    priorityTag.className = `todo-tag priority-${todo.priority || 'medium'}`;
    priorityTag.textContent = priorityLabel[todo.priority] || '中';
    meta.appendChild(priorityTag);

    if (todo.category) {
      const catTag = document.createElement('span');
      catTag.className = 'todo-tag category';
      catTag.textContent = todo.category;
      meta.appendChild(catTag);
    }

    if (todo.due_date) {
      const dueTag = document.createElement('span');
      dueTag.className = 'todo-tag due';
      const dueDate = new Date(todo.due_date);
      const now = new Date();
      const diffMs = dueDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffMs < 0 && !todo.completed) {
        dueTag.classList.add('overdue');
        dueTag.textContent = '⚠ ' + formatDate(dueDate);
      } else if (diffHours < 24 && diffHours > 0 && !todo.completed) {
        dueTag.classList.add('soon');
        dueTag.textContent = '⏰ ' + formatDate(dueDate);
      } else {
        dueTag.textContent = '📅 ' + formatDate(dueDate);
      }
      meta.appendChild(dueTag);
    }

    if (meta.children.length > 0) body.appendChild(meta);

    // Edit panel
    const editPanel = document.createElement('div');
    editPanel.className = 'todo-edit-panel';

    const editPriority = document.createElement('select');
    editPriority.setAttribute('aria-label', '优先级');
    editPriority.innerHTML = '<option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">🟢 低</option>';
    editPriority.value = todo.priority || 'medium';

    const editCategory = document.createElement('select');
    editCategory.setAttribute('aria-label', '分类');
    editCategory.innerHTML = '<option value="">无分类</option><option value="工作">💼 工作</option><option value="学习">📚 学习</option><option value="生活">🏠 生活</option>';
    editCategory.value = todo.category || '';

    const editDueDate = document.createElement('input');
    editDueDate.type = 'datetime-local';
    editDueDate.setAttribute('aria-label', '截止日期');
    if (todo.due_date) {
      const d = new Date(todo.due_date);
      const offset = d.getTimezoneOffset() * 60000;
      editDueDate.value = new Date(d - offset).toISOString().slice(0, 16);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-save-btn';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', async () => {
      try {
        await api.updateTodo(todo.id, {
          priority: editPriority.value,
          category: editCategory.value,
          dueDate: editDueDate.value ? new Date(editDueDate.value).toISOString() : null,
        });
        await loadTodos();
        showSnackbar('任务已更新');
      } catch (err) {
        showSnackbar('更新失败：' + err.message);
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      editPanel.classList.remove('active');
    });

    editPanel.appendChild(editPriority);
    editPanel.appendChild(editCategory);
    editPanel.appendChild(editDueDate);
    editPanel.appendChild(saveBtn);
    editPanel.appendChild(cancelBtn);

    body.appendChild(editPanel);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'todo-action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.setAttribute('aria-label', '编辑任务');
    editBtn.addEventListener('click', () => {
      editPanel.classList.toggle('active');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-action-btn delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.setAttribute('aria-label', '删除任务');
    deleteBtn.addEventListener('click', () => handleDelete(todo));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    li.addEventListener('dragstart', (e) => {
      dragItem = li;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      dragItem = null;
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragItem || dragItem === li) return;
      const rect = li.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        todoList.insertBefore(dragItem, li);
      } else {
        todoList.insertBefore(dragItem, li.nextSibling);
      }
    });

    return li;
  }

  function formatDate(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    if (h === '00' && min === '00') return `${m}-${d}`;
    return `${m}-${d} ${h}:${min}`;
  }

  async function addTodo() {
    const content = addInput.value.trim();
    if (!content) return;

    try {
      const todo = {
        content,
        priority: addPriority.value,
        category: addCategory.value,
        dueDate: addDueDate.value ? new Date(addDueDate.value).toISOString() : null,
      };
      await api.createTodo(todo);
      addInput.value = '';
      addPriority.value = 'medium';
      addCategory.value = '';
      addDueDate.value = '';
      addOptions.classList.remove('active');
      await loadTodos();
    } catch (err) {
      showSnackbar('添加失败：' + err.message);
    }
  }

  async function toggleComplete(todo) {
    try {
      await api.updateTodo(todo.id, { completed: !todo.completed });
      await loadTodos();
    } catch (err) {
      showSnackbar('操作失败：' + err.message);
    }
  }

  function startEdit(todo, contentEl) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-content-edit';
    input.value = todo.content;
    input.maxLength = 500;

    contentEl.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
      const newContent = input.value.trim();
      if (newContent && newContent !== todo.content) {
        try {
          await api.updateTodo(todo.id, { content: newContent });
          await loadTodos();
        } catch (err) {
          showSnackbar('编辑失败：' + err.message);
          input.replaceWith(contentEl);
        }
      } else {
        input.replaceWith(contentEl);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') input.replaceWith(contentEl);
    });
    input.addEventListener('blur', save);
  }

  async function handleDelete(todo) {
    const ok = await showConfirm('删除任务', `确定要删除「${todo.content}」吗？`);
    if (!ok) return;

    try {
      await api.deleteTodo(todo.id);
      lastDeletedTodo = todo;
      showSnackbar('任务已删除', true);
      await loadTodos();
    } catch (err) {
      showSnackbar('删除失败：' + err.message);
    }
  }

  async function handleUndo() {
    if (!lastDeletedTodo) return;
    hideSnackbar();
    try {
      await api.createTodo({
        content: lastDeletedTodo.content,
        priority: lastDeletedTodo.priority,
        category: lastDeletedTodo.category,
        dueDate: lastDeletedTodo.due_date,
      });
      lastDeletedTodo = null;
      await loadTodos();
      showSnackbar('已撤销删除');
    } catch (err) {
      showSnackbar('撤销失败：' + err.message);
    }
  }

  async function handleClearCompleted() {
    const ok = await showConfirm('清除已完成', '确定要删除所有已完成的任务吗？此操作无法撤销。');
    if (!ok) return;

    try {
      const res = await api.clearCompleted();
      showSnackbar(res.message);
      await loadTodos();
    } catch (err) {
      showSnackbar('操作失败：' + err.message);
    }
  }

  async function handleReorder() {
    const items = Array.from(todoList.children).map((li) => ({ id: li.dataset.id }));
    try {
      await api.reorderTodos(items);
    } catch { /* silent */ }
  }

  // --- Export / Import ---
  async function handleExport() {
    try {
      const res = await api.exportTodos();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todolist-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSnackbar('数据已导出');
      userDropdown.classList.remove('active');
    } catch (err) {
      showSnackbar('导出失败：' + err.message);
    }
  }

  function handleImportClick() {
    fileInput.click();
    userDropdown.classList.remove('active');
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const todosArr = Array.isArray(data) ? data : data.todos || data.data;
      if (!Array.isArray(todosArr)) throw new Error('无效的数据格式');

      const res = await api.importTodos(todosArr);
      showSnackbar(res.message);
      await loadTodos();
    } catch (err) {
      showSnackbar('导入失败：' + err.message);
    }
    fileInput.value = '';
  }

  // --- Snackbar ---
  function showSnackbar(text, showUndoBtn = false) {
    snackbarText.textContent = text;
    snackbarUndo.style.display = showUndoBtn ? '' : 'none';
    snackbar.classList.add('active');
    clearTimeout(snackbarTimer);
    snackbarTimer = setTimeout(hideSnackbar, 5000);
  }

  function hideSnackbar() {
    snackbar.classList.remove('active');
    clearTimeout(snackbarTimer);
  }

  // --- Confirm Dialog ---
  function showConfirm(title, text) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmOverlay.classList.add('active');
    return new Promise((resolve) => { confirmResolve = resolve; });
  }

  function closeConfirm(result) {
    confirmOverlay.classList.remove('active');
    if (confirmResolve) {
      confirmResolve(result);
      confirmResolve = null;
    }
  }

  // --- Search debounce ---
  let searchTimer = null;
  function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      loadTodos();
    }, 300);
  }

  // --- View Tabs ---
  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }

  function filterTodayTodos(list) {
    return list.filter((t) => isToday(t.due_date));
  }

  function switchView(view) {
    currentView = view;
    viewTabs.forEach((tab) => {
      const isActive = tab.dataset.view === view;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    loadTodos();
  }

  function updateViewBadges() {
    const todayCount = allTodos.filter((t) => !t.completed && isToday(t.due_date)).length;
    viewTabs.forEach((tab) => {
      if (tab.dataset.view === 'today') {
        let badge = tab.querySelector('.view-tab-badge');
        if (todayCount > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'view-tab-badge';
            tab.appendChild(badge);
          }
          badge.textContent = todayCount;
        } else if (badge) {
          badge.remove();
        }
      }
    });
  }

  // --- Event Listeners ---
  function bindEvents() {
    themeToggle.addEventListener('click', toggleTheme);

    menuToggle.addEventListener('click', () => {
      userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        userDropdown.classList.remove('active');
      }
    });

    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', handleImportClick);
    fileInput.addEventListener('change', handleImportFile);

    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    addInput.addEventListener('focus', () => {
      addOptions.classList.add('active');
    });
    addBtn.addEventListener('click', addTodo);

    viewTabs.forEach((tab) => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentFilter = btn.dataset.filter;
        loadTodos();
      });
    });

    searchInput.addEventListener('input', handleSearch);
    clearCompletedBtn.addEventListener('click', handleClearCompleted);
    snackbarUndo.addEventListener('click', handleUndo);
    confirmCancel.addEventListener('click', () => closeConfirm(false));
    confirmOk.addEventListener('click', () => closeConfirm(true));
    confirmOverlay.addEventListener('click', (e) => {
      if (e.target === confirmOverlay) closeConfirm(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeConfirm(false);
        addOptions.classList.remove('active');
      }
    });

    todoList.addEventListener('dragend', handleReorder);
  }

  // --- Init ---
  function init() {
    initTheme();
    bindEvents();
    loadTodos();
  }

  init();
})();
