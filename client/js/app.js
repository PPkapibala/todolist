(function () {
  'use strict';

  // --- Auth DOM ---
  const loginPage = document.getElementById('loginPage');
  const githubLoginBtn = document.getElementById('githubLoginBtn');
  const appEl = document.getElementById('app');

  // --- Tabs ---
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = {
    home: document.getElementById('tabHome'),
    todos: document.getElementById('tabTodos'),
    stats: document.getElementById('tabStats'),
    profile: document.getElementById('tabProfile'),
  };

  // --- Home DOM ---
  const greeting = document.getElementById('greeting');
  const todayDate = document.getElementById('todayDate');
  const homeAddBtn = document.getElementById('homeAddBtn');
  const homeRing = document.getElementById('homeRing');
  const homePct = document.getElementById('homePct');
  const homeProgressSub = document.getElementById('homeProgressSub');
  const homeTotalCount = document.getElementById('homeTotalCount');
  const homeDoneCount = document.getElementById('homeDoneCount');
  const homePendingCount = document.getElementById('homePendingCount');
  const homeRateText = document.getElementById('homeRateText');
  const homeTodayList = document.getElementById('homeTodayList');
  const homeTodayEmpty = document.getElementById('homeTodayEmpty');
  const homeViewAll = document.getElementById('homeViewAll');

  // --- Todos DOM ---
  const addInput = document.getElementById('addInput');
  const addBtn = document.getElementById('addBtn');
  const addOptions = document.getElementById('addOptions');
  const addPriority = document.getElementById('addPriority');
  const addCategory = document.getElementById('addCategory');
  const addDueDate = document.getElementById('addDueDate');
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const viewModeBtns = document.querySelectorAll('.view-mode-btn');
  const listView = document.getElementById('listView');
  const calendarView = document.getElementById('calendarView');
  const kanbanView = document.getElementById('kanbanView');
  const todoList = document.getElementById('todoList');
  const todoLoading = document.getElementById('todoLoading');
  const emptyState = document.getElementById('emptyState');
  const footer = document.getElementById('footer');
  const todoStats = document.getElementById('todoStats');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const calTitle = document.getElementById('calTitle');
  const calGrid = document.getElementById('calGrid');

  // --- Stats DOM ---
  const statsRing = document.getElementById('statsRing');
  const statsRatePct = document.getElementById('statsRatePct');
  const statsRateSub = document.getElementById('statsRateSub');
  const statsStreak = document.getElementById('statsStreak');
  const statsPending = document.getElementById('statsPending');
  const weekChart = document.getElementById('weekChart');
  const weekLabels = document.getElementById('weekLabels');
  const statsMonthTotal = document.getElementById('statsMonthTotal');
  const statsMonthDone = document.getElementById('statsMonthDone');
  const statsMonthRate = document.getElementById('statsMonthRate');

  // --- Profile DOM ---
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileThemeBtn = document.getElementById('profileThemeBtn');
  const profileThemeText = document.getElementById('profileThemeText');
  const profileExportBtn = document.getElementById('profileExportBtn');
  const profileImportBtn = document.getElementById('profileImportBtn');
  const profileLogoutBtn = document.getElementById('profileLogoutBtn');

  // --- Edit Dialog DOM ---
  const editOverlay = document.getElementById('editOverlay');
  const editContent = document.getElementById('editContent');
  const editPriority = document.getElementById('editPriority');
  const editCategory = document.getElementById('editCategory');
  const editDueDate = document.getElementById('editDueDate');
  const editCancel = document.getElementById('editCancel');
  const editSave = document.getElementById('editSave');

  // --- Global DOM ---
  const snackbar = document.getElementById('snackbar');
  const snackbarText = document.getElementById('snackbarText');
  const snackbarUndo = document.getElementById('snackbarUndo');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmText = document.getElementById('confirmText');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  const fileInput = document.getElementById('fileInput');

  // --- State ---
  let allTodos = [];
  let currentFilter = 'all';
  let currentSearch = '';
  let snackbarTimer = null;
  let lastDeletedTodo = null;
  let confirmResolve = null;
  let currentTab = 'home';
  let editingTodoId = null;
  let currentViewMode = 'list';
  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();

  // ========================= TAB SWITCHING =========================
  function switchTab(tab) {
    currentTab = tab;
    navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.tab === tab);
    });
    Object.entries(tabPages).forEach(([key, el]) => {
      el.classList.toggle('active', key === tab);
    });
    if (tab === 'home') refreshHome();
    if (tab === 'todos') renderTodos();
    if (tab === 'stats') refreshStats();
    if (tab === 'profile') refreshProfile();
  }

  // ========================= THEME =========================
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeUI();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI();
  }

  function updateThemeUI() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (profileThemeText) profileThemeText.textContent = isDark ? '浅色模式' : '深色模式';
  }

  // ========================= DATA =========================
  async function loadAllTodos() {
    try {
      const res = await api.getTodos({});
      allTodos = res.data || [];
    } catch (err) {
      allTodos = [];
      showSnackbar('加载失败：' + err.message);
    }
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }

  function getTodayTodos() {
    return allTodos.filter(t => isToday(t.due_date));
  }

  function getFilteredTodos() {
    let list = allTodos;
    if (currentFilter === 'active') list = list.filter(t => !t.completed);
    else if (currentFilter === 'completed') list = list.filter(t => t.completed);
    if (currentSearch) {
      const s = currentSearch.toLowerCase();
      list = list.filter(t => t.content.toLowerCase().includes(s));
    }
    return list;
  }

  // ========================= HOME TAB =========================
  function refreshHome() {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) greeting.textContent = '上午好';
    else if (hour < 18) greeting.textContent = '下午好';
    else greeting.textContent = '晚上好';

    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    todayDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekNames[now.getDay()]}`;

    const todayList = getTodayTodos();
    const todayDone = todayList.filter(t => t.completed).length;
    const todayTotal = todayList.length;
    const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    homePct.textContent = pct;
    homeProgressSub.textContent = `${todayDone} / ${todayTotal} 已完成`;

    const circumference = 2 * Math.PI * 34; // r=34
    homeRing.style.strokeDashoffset = circumference - (circumference * pct / 100);

    const total = allTodos.length;
    const done = allTodos.filter(t => t.completed).length;
    const pending = total - done;
    const overallRate = total > 0 ? Math.round((done / total) * 100) : 0;

    homeTotalCount.textContent = total;
    homeDoneCount.textContent = done;
    homePendingCount.textContent = pending;
    homeRateText.textContent = overallRate + '%';

    homeTodayList.innerHTML = '';
    const previewList = todayList.slice(0, 5);
    if (previewList.length === 0) {
      homeTodayEmpty.style.display = '';
    } else {
      homeTodayEmpty.style.display = 'none';
      previewList.forEach(todo => {
        homeTodayList.appendChild(createTodoEl(todo));
      });
    }
  }

  // ========================= VIEW MODE =========================
  function switchViewMode(mode) {
    currentViewMode = mode;
    viewModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    listView.style.display = mode === 'list' ? '' : 'none';
    calendarView.style.display = mode === 'calendar' ? '' : 'none';
    kanbanView.style.display = mode === 'kanban' ? '' : 'none';
    renderTodosView();
  }

  // ========================= TODOS TAB =========================
  function renderTodosView() {
    if (currentViewMode === 'list') renderListView();
    else if (currentViewMode === 'calendar') renderCalendarView();
    else if (currentViewMode === 'kanban') renderKanbanView();
  }

  function renderTodos() { renderTodosView(); }

  function renderListView() {
    const todos = getFilteredTodos();
    todoList.innerHTML = '';

    if (todos.length === 0) {
      emptyState.style.display = '';
      footer.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    footer.style.display = 'flex';

    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    todoStats.textContent = `共 ${total} 项，已完成 ${completed} 项`;

    todos.forEach(todo => {
      todoList.appendChild(createTodoEl(todo));
    });
  }

  // ========================= CALENDAR VIEW =========================
  function renderCalendarView() {
    const year = calYear;
    const month = calMonth;
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    calTitle.textContent = `${year}年 ${monthNames[month]}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const todos = getFilteredTodos();
    const todosByDate = {};
    todos.forEach(t => {
      if (!t.due_date) return;
      const dd = new Date(t.due_date);
      const key = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
      if (!todosByDate[key]) todosByDate[key] = [];
      todosByDate[key].push(t);
    });

    calGrid.innerHTML = '';
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      let dayNum, dateKey, isOtherMonth = false;

      if (i < firstDay) {
        dayNum = daysInPrev - firstDay + i + 1;
        const pm = month === 0 ? 11 : month - 1;
        const py = month === 0 ? year - 1 : year;
        dateKey = `${py}-${String(pm+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        isOtherMonth = true;
      } else if (i - firstDay >= daysInMonth) {
        dayNum = i - firstDay - daysInMonth + 1;
        const nm = month === 11 ? 0 : month + 1;
        const ny = month === 11 ? year + 1 : year;
        dateKey = `${ny}-${String(nm+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        isOtherMonth = true;
      } else {
        dayNum = i - firstDay + 1;
        dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      }

      if (isOtherMonth) cell.classList.add('other-month');
      if (dateKey === todayStr) cell.classList.add('today');

      const dayEl = document.createElement('div');
      dayEl.className = 'cal-day';
      dayEl.textContent = dayNum;
      cell.appendChild(dayEl);

      const dayTodos = todosByDate[dateKey] || [];
      const maxShow = 2;
      dayTodos.slice(0, maxShow).forEach(t => {
        const tag = document.createElement('div');
        tag.className = `cal-task priority-${t.priority || 'medium'}${t.completed ? ' completed' : ''}`;
        tag.textContent = t.content;
        tag.addEventListener('click', () => openEditDialog(t));
        cell.appendChild(tag);
      });
      if (dayTodos.length > maxShow) {
        const more = document.createElement('div');
        more.className = 'cal-more';
        more.textContent = `+${dayTodos.length - maxShow}`;
        cell.appendChild(more);
      }

      calGrid.appendChild(cell);
    }
  }

  // ========================= KANBAN VIEW =========================
  function renderKanbanView() {
    const todos = getFilteredTodos();
    const categories = ['工作', '学习', '生活', ''];
    const cols = kanbanView.querySelectorAll('.kanban-col-list');

    cols.forEach(col => {
      col.innerHTML = '';
      const cat = col.dataset.category;
      const catTodos = todos.filter(t => {
        if (cat === '') return !t.category || !categories.slice(0, 3).includes(t.category);
        return t.category === cat;
      });

      catTodos.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      if (catTodos.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;color:var(--text-muted);font-size:12px;padding:16px 0';
        empty.textContent = '暂无任务';
        col.appendChild(empty);
        return;
      }

      catTodos.forEach(todo => {
        const card = document.createElement('div');
        card.className = `kanban-card priority-${todo.priority || 'medium'}${todo.completed ? ' completed' : ''}`;

        const top = document.createElement('div');
        top.style.cssText = 'display:flex;gap:8px;align-items:flex-start';

        const check = document.createElement('span');
        check.className = 'kanban-card-check';
        check.innerHTML = todo.completed ? '✓' : '';
        check.addEventListener('click', e => { e.stopPropagation(); toggleComplete(todo); });
        top.appendChild(check);

        const textWrap = document.createElement('div');
        textWrap.style.flex = '1';
        const text = document.createElement('div');
        text.className = 'kanban-card-text';
        text.textContent = todo.content;
        textWrap.appendChild(text);

        if (todo.due_date) {
          const meta = document.createElement('div');
          meta.className = 'kanban-card-meta';
          meta.textContent = fmtDate(new Date(todo.due_date));
          textWrap.appendChild(meta);
        }
        top.appendChild(textWrap);
        card.appendChild(top);

        card.addEventListener('click', () => openEditDialog(todo));
        col.appendChild(card);
      });
    });
  }

  function createTodoEl(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('button');
    checkbox.className = 'todo-checkbox';
    checkbox.innerHTML = todo.completed ? '✓' : '';
    checkbox.addEventListener('click', () => toggleComplete(todo));

    const content = document.createElement('div');
    content.className = 'todo-content';

    const text = document.createElement('div');
    text.className = 'todo-text';
    text.textContent = todo.content;
    text.addEventListener('dblclick', () => openEditDialog(todo));
    content.appendChild(text);

    const meta = document.createElement('div');
    meta.className = 'todo-meta';

    const priorityLabel = { high: '高', medium: '中', low: '低' };
    const ptag = document.createElement('span');
    ptag.className = `todo-tag priority-${todo.priority || 'medium'}`;
    ptag.textContent = priorityLabel[todo.priority] || '中';
    meta.appendChild(ptag);

    if (todo.category) {
      const ctag = document.createElement('span');
      ctag.className = 'todo-tag category';
      ctag.textContent = todo.category;
      meta.appendChild(ctag);
    }

    if (todo.due_date) {
      const dtag = document.createElement('span');
      const dueDate = new Date(todo.due_date);
      const diffMs = dueDate - new Date();
      if (diffMs < 0 && !todo.completed) {
        dtag.className = 'todo-tag overdue';
        dtag.textContent = '⚠ ' + fmtDate(dueDate);
      } else {
        dtag.className = 'todo-tag due';
        dtag.textContent = fmtDate(dueDate);
      }
      meta.appendChild(dtag);
    }

    content.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'todo-action-btn';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => openEditDialog(todo));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'todo-action-btn';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => handleDelete(todo));
    actions.appendChild(delBtn);

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);

    return li;
  }

  function fmtDate(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    if (h === '00' && min === '00') return `${m}-${day}`;
    return `${m}-${day} ${h}:${min}`;
  }

  async function addTodo() {
    const content = addInput.value.trim();
    if (!content) return;

    const tempTodo = {
      id: 'temp-' + Date.now(),
      content,
      completed: false,
      priority: addPriority.value,
      category: addCategory.value,
      due_date: addDueDate.value ? new Date(addDueDate.value).toISOString() : null,
      created_at: new Date().toISOString(),
    };

    addInput.value = '';
    addPriority.value = 'medium';
    addCategory.value = '';
    addDueDate.value = '';
    addOptions.classList.remove('visible');

    allTodos.unshift(tempTodo);
    refreshCurrentView();

    try {
      const res = await api.createTodo({
        content: tempTodo.content,
        priority: tempTodo.priority,
        category: tempTodo.category,
        dueDate: tempTodo.due_date,
      });
      const idx = allTodos.indexOf(tempTodo);
      if (idx !== -1 && res.data) allTodos[idx] = res.data;
    } catch (err) {
      const idx = allTodos.indexOf(tempTodo);
      if (idx !== -1) allTodos.splice(idx, 1);
      refreshCurrentView();
      showSnackbar('添加失败：' + err.message);
    }
  }

  async function toggleComplete(todo) {
    const newVal = !todo.completed;
    todo.completed = newVal;
    refreshCurrentView();
    try {
      await api.updateTodo(todo.id, { completed: newVal });
    } catch (err) {
      todo.completed = !newVal;
      refreshCurrentView();
      showSnackbar('操作失败：' + err.message);
    }
  }

  function openEditDialog(todo) {
    editingTodoId = todo.id;
    editContent.value = todo.content;
    editPriority.value = todo.priority || 'medium';
    editCategory.value = todo.category || '';
    if (todo.due_date) {
      const d = new Date(todo.due_date);
      const offset = d.getTimezoneOffset() * 60000;
      editDueDate.value = new Date(d - offset).toISOString().slice(0, 16);
    } else {
      editDueDate.value = '';
    }
    editOverlay.classList.add('show');
    editContent.focus();
  }

  function closeEditDialog() {
    editOverlay.classList.remove('show');
    editingTodoId = null;
  }

  async function saveEdit() {
    if (!editingTodoId) return;
    const todo = allTodos.find(t => t.id === editingTodoId);
    if (!todo) return;

    const updates = {
      content: editContent.value.trim(),
      priority: editPriority.value,
      category: editCategory.value,
      dueDate: editDueDate.value ? new Date(editDueDate.value).toISOString() : null,
    };

    if (!updates.content) { showSnackbar('内容不能为空'); return; }

    const todoId = editingTodoId;
    const backup = { content: todo.content, priority: todo.priority, category: todo.category, due_date: todo.due_date };
    todo.content = updates.content;
    todo.priority = updates.priority;
    todo.category = updates.category;
    todo.due_date = updates.dueDate;
    closeEditDialog();
    refreshCurrentView();

    try {
      await api.updateTodo(todoId, updates);
    } catch (err) {
      Object.assign(todo, backup);
      refreshCurrentView();
      showSnackbar('编辑失败：' + err.message);
    }
  }

  async function handleDelete(todo) {
    const ok = await showConfirm('删除任务', `确定要删除「${todo.content}」吗？`);
    if (!ok) return;

    const idx = allTodos.indexOf(todo);
    allTodos.splice(idx, 1);
    lastDeletedTodo = todo;
    refreshCurrentView();
    showSnackbar('任务已删除', true);

    try {
      await api.deleteTodo(todo.id);
    } catch (err) {
      allTodos.splice(idx, 0, todo);
      refreshCurrentView();
      showSnackbar('删除失败：' + err.message);
    }
  }

  async function handleUndo() {
    if (!lastDeletedTodo) return;
    hideSnackbar();
    const restored = { ...lastDeletedTodo, id: 'temp-' + Date.now() };
    allTodos.unshift(restored);
    lastDeletedTodo = null;
    refreshCurrentView();
    showSnackbar('已撤销删除');

    try {
      const res = await api.createTodo({
        content: restored.content,
        priority: restored.priority,
        category: restored.category,
        dueDate: restored.due_date,
      });
      const idx = allTodos.indexOf(restored);
      if (idx !== -1 && res.data) allTodos[idx] = res.data;
    } catch (err) {
      const idx = allTodos.indexOf(restored);
      if (idx !== -1) allTodos.splice(idx, 1);
      refreshCurrentView();
      showSnackbar('撤销失败：' + err.message);
    }
  }

  async function handleClearCompleted() {
    const ok = await showConfirm('清除已完成', '确定要删除所有已完成的任务吗？');
    if (!ok) return;

    const backup = [...allTodos];
    const removed = allTodos.filter(t => t.completed);
    allTodos = allTodos.filter(t => !t.completed);
    refreshCurrentView();
    showSnackbar(`已删除 ${removed.length} 项已完成任务`);

    try {
      await api.clearCompleted();
    } catch (err) {
      allTodos = backup;
      refreshCurrentView();
      showSnackbar('操作失败：' + err.message);
    }
  }

  function refreshCurrentView() {
    if (currentTab === 'home') refreshHome();
    if (currentTab === 'todos') renderTodos();
    if (currentTab === 'stats') refreshStats();
  }

  async function reloadData() {
    await loadAllTodos();
    refreshCurrentView();
  }

  // ========================= STATS TAB =========================
  function refreshStats() {
    const total = allTodos.length;
    const done = allTodos.filter(t => t.completed).length;
    const pending = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    statsRatePct.textContent = pct;
    statsRateSub.textContent = `${done} / ${total} 完成`;
    const circ = 2 * Math.PI * 34;
    statsRing.style.strokeDashoffset = circ - (circ * pct / 100);

    statsStreak.textContent = calcStreak() + '天';
    statsPending.textContent = pending;

    renderWeekChart();

    const now = new Date();
    const monthTodos = allTodos.filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthDone = monthTodos.filter(t => t.completed).length;
    const monthRate = monthTodos.length > 0 ? Math.round((monthDone / monthTodos.length) * 100) : 0;

    statsMonthTotal.textContent = monthTodos.length;
    statsMonthDone.textContent = monthDone;
    statsMonthRate.textContent = monthRate + '%';

    const catMap = {};
    allTodos.forEach(t => {
      const cat = t.category || '其他';
      if (!catMap[cat]) catMap[cat] = { total: 0, done: 0 };
      catMap[cat].total++;
      if (t.completed) catMap[cat].done++;
    });
    const catList = Object.entries(catMap).sort((a, b) => b[1].done - a[1].done);
    const catMax = Math.max(...catList.map(c => c[1].done), 1);
    const statsCategoryList = document.getElementById('statsCategoryList');
    statsCategoryList.innerHTML = '';
    catList.forEach(([name, data]) => {
      const row = document.createElement('div');
      row.className = 'stats-cat-row';
      row.innerHTML = `
        <div class="stats-cat-label">${name}</div>
        <div class="stats-cat-bar-bg">
          <div class="stats-cat-bar-fill" style="width:${(data.done / catMax) * 100}%"></div>
        </div>
        <div class="stats-cat-count">${data.done}</div>
      `;
      statsCategoryList.appendChild(row);
    });
  }

  function calcStreak() {
    const dateSet = new Set();
    allTodos.filter(t => t.completed).forEach(t => {
      const d = new Date(t.created_at || t.due_date);
      if (d) dateSet.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (dateSet.has(key)) streak++;
      else break;
    }
    return streak;
  }

  function renderWeekChart() {
    weekChart.innerHTML = '';
    weekLabels.innerHTML = '';
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const counts = [];
    const labels = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayTodos = allTodos.filter(t => {
        const c = new Date(t.created_at);
        const created = `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`;
        return created === key && t.completed;
      });
      counts.push(dayTodos.length);
      labels.push(dayNames[d.getDay()]);
    }

    const max = Math.max(...counts, 1);
    counts.forEach((c, i) => {
      const bar = document.createElement('div');
      bar.className = 'stats-bar';
      bar.style.height = Math.max((c / max) * 100, 4) + '%';
      if (c > 0) {
        const val = document.createElement('div');
        val.className = 'stats-bar-val';
        val.textContent = c;
        bar.appendChild(val);
      }
      weekChart.appendChild(bar);

      const lbl = document.createElement('div');
      lbl.className = 'stats-bar-label';
      lbl.textContent = labels[i];
      weekLabels.appendChild(lbl);
    });
  }

  // ========================= PROFILE TAB =========================
  function refreshProfile() {
    // user info is set in showApp
  }

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
    } catch (err) {
      showSnackbar('导出失败：' + err.message);
    }
  }

  function handleImportClick() {
    fileInput.click();
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.todos || data.data;
      if (!Array.isArray(arr)) throw new Error('无效的数据格式');
      const res = await api.importTodos(arr);
      showSnackbar(res.message);
      await reloadData();
    } catch (err) {
      showSnackbar('导入失败：' + err.message);
    }
    fileInput.value = '';
  }

  // ========================= SNACKBAR =========================
  function showSnackbar(text, showUndoBtn = false) {
    snackbarText.textContent = text;
    snackbarUndo.style.display = showUndoBtn ? '' : 'none';
    snackbar.classList.add('show');
    clearTimeout(snackbarTimer);
    snackbarTimer = setTimeout(hideSnackbar, 4000);
  }

  function hideSnackbar() {
    snackbar.classList.remove('show');
    clearTimeout(snackbarTimer);
  }

  // ========================= CONFIRM DIALOG =========================
  function showConfirm(title, text) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmOverlay.classList.add('show');
    return new Promise(resolve => { confirmResolve = resolve; });
  }

  function closeConfirm(result) {
    confirmOverlay.classList.remove('show');
    if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
  }

  // ========================= AUTH =========================
  function showApp(session) {
    const user = auth.getUser(session);
    loginPage.style.display = 'none';
    appEl.style.display = '';

    if (user) {
      if (user.avatar) {
        profileAvatar.src = user.avatar;
        profileAvatar.alt = user.name || '';
        profileAvatar.style.display = '';
      } else {
        profileAvatar.style.display = 'none';
      }
      profileName.textContent = user.name || '用户';
      profileEmail.textContent = user.email || '';
    }
  }

  function showLogin() {
    loginPage.style.display = 'flex';
    appEl.style.display = 'none';
  }

  // ========================= EVENTS =========================
  function bindEvents() {
    // Auth
    githubLoginBtn.addEventListener('click', async () => {
      try { await auth.signInWithGitHub(); }
      catch (err) { showSnackbar('登录失败：' + err.message); }
    });

    // Tab Nav
    navItems.forEach(n => {
      n.addEventListener('click', () => switchTab(n.dataset.tab));
    });

    // Home
    homeAddBtn.addEventListener('click', () => {
      switchTab('todos');
      setTimeout(() => addInput.focus(), 100);
    });
    homeViewAll.addEventListener('click', () => switchTab('todos'));

    // Todos
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    addInput.addEventListener('focus', () => addOptions.classList.add('visible'));
    addBtn.addEventListener('click', addTodo);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentFilter = btn.dataset.filter;
        renderTodosView();
      });
    });

    viewModeBtns.forEach(btn => {
      btn.addEventListener('click', () => switchViewMode(btn.dataset.mode));
    });

    calPrev.addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendarView();
    });
    calNext.addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendarView();
    });

    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        renderTodos();
      }, 300);
    });

    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // Profile
    profileThemeBtn.addEventListener('click', toggleTheme);
    profileExportBtn.addEventListener('click', handleExport);
    profileImportBtn.addEventListener('click', handleImportClick);
    fileInput.addEventListener('change', handleImportFile);
    profileLogoutBtn.addEventListener('click', async () => {
      try { await auth.signOut(); }
      catch (err) { showSnackbar('退出失败：' + err.message); }
    });

    // Edit dialog
    editSave.addEventListener('click', saveEdit);
    editCancel.addEventListener('click', closeEditDialog);
    editOverlay.addEventListener('click', e => {
      if (e.target === editOverlay) closeEditDialog();
    });
    editContent.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveEdit();
    });

    // Global
    snackbarUndo.addEventListener('click', handleUndo);
    confirmCancel.addEventListener('click', () => closeConfirm(false));
    confirmOk.addEventListener('click', () => closeConfirm(true));
    confirmOverlay.addEventListener('click', e => {
      if (e.target === confirmOverlay) closeConfirm(false);
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.add-bar') && !e.target.closest('.add-options')) {
        addOptions.classList.remove('visible');
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeConfirm(false);
        closeEditDialog();
        addOptions.classList.remove('visible');
      }
    });
  }

  // ========================= INIT =========================
  async function init() {
    initTheme();
    bindEvents();

    const session = await auth.getSession();
    if (session) {
      showApp(session);
      todoLoading.style.display = 'flex';
      await loadAllTodos();
      todoLoading.style.display = 'none';
      refreshHome();
    } else {
      showLogin();
    }

    auth.onAuthStateChange(async session => {
      if (session) {
        showApp(session);
        todoLoading.style.display = 'flex';
        await loadAllTodos();
        todoLoading.style.display = 'none';
        refreshHome();
      } else {
        showLogin();
      }
    });
  }

  init();
})();
