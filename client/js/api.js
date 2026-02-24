const API_BASE = window.API_BASE || '/api';

const api = {
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || '请求失败');
    return data;
  },

  getTodos(params = {}) {
    const query = new URLSearchParams();
    if (params.completed !== undefined) query.set('completed', params.completed);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.due_today) query.set('due_today', params.due_today);
    const qs = query.toString();
    return this.request(`/todos${qs ? '?' + qs : ''}`);
  },

  createTodo(todo) {
    return this.request('/todos', {
      method: 'POST',
      body: JSON.stringify(todo),
    });
  },

  updateTodo(id, updates) {
    return this.request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteTodo(id) {
    return this.request(`/todos/${id}`, { method: 'DELETE' });
  },

  reorderTodos(items) {
    return this.request('/todos/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },

  clearCompleted() {
    return this.request('/todos/completed', { method: 'DELETE' });
  },

  exportTodos() {
    return this.request('/todos/export');
  },

  importTodos(todos) {
    return this.request('/todos/import', {
      method: 'POST',
      body: JSON.stringify({ todos }),
    });
  },
};
