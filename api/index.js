const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function getSupabase(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function requireAuth(req, res, next) {
  const supabase = getSupabase(req);
  if (!supabase) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '请先登录' },
    });
  }
  req.supabase = supabase;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use('/api/todos', requireAuth);

app.get('/api/todos/export', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('todos')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.get('/api/todos', async (req, res) => {
  try {
    const { completed, category, search, due_today } = req.query;
    let query = req.supabase.from('todos').select('*');

    if (completed === 'true') query = query.eq('completed', true);
    else if (completed === 'false') query = query.eq('completed', false);

    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('content', `%${search}%`);

    if (due_today === 'true') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      query = query.gte('due_date', startOfDay).lt('due_date', endOfDay);
    }

    query = query.order('order', { ascending: true })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.post('/api/todos/import', async (req, res) => {
  try {
    const { todos } = req.body;
    if (!Array.isArray(todos)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '数据格式错误' },
      });
    }

    const { data: { user } } = await req.supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录' },
      });
    }

    const { data: maxRow } = await req.supabase
      .from('todos')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = maxRow ? maxRow.order + 1 : 0;

    const rows = todos.map((t) => ({
      content: t.content,
      completed: t.completed || false,
      priority: t.priority || 'medium',
      category: t.category || '',
      due_date: t.due_date || t.dueDate || null,
      order: nextOrder++,
      user_id: user.id,
    }));

    const { data, error } = await req.supabase
      .from('todos')
      .insert(rows)
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: `已导入 ${data.length} 项任务`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { content, priority, category, dueDate } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '任务内容不能为空' },
      });
    }

    const { data: { user } } = await req.supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '请先登录' },
      });
    }

    const { data: maxRow } = await req.supabase
      .from('todos')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = maxRow ? maxRow.order + 1 : 0;

    const { data, error } = await req.supabase
      .from('todos')
      .insert({
        content: content.trim(),
        priority: priority || 'medium',
        category: category || '',
        due_date: dueDate || null,
        order: nextOrder,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.put('/api/todos/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '参数格式错误' },
      });
    }

    const updates = items.map((item, index) =>
      req.supabase.from('todos').update({ order: index }).eq('id', item.id)
    );
    await Promise.all(updates);

    res.json({ success: true, message: '排序已更新' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  try {
    const { content, completed, priority, category, dueDate } = req.body;

    const updates = {};
    if (content !== undefined) updates.content = content;
    if (completed !== undefined) updates.completed = completed;
    if (priority !== undefined) updates.priority = priority;
    if (category !== undefined) updates.category = category;
    if (dueDate !== undefined) updates.due_date = dueDate;

    const { data, error } = await req.supabase
      .from('todos')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '任务不存在' },
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.delete('/api/todos/completed', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('todos')
      .delete()
      .eq('completed', true)
      .select('id');

    if (error) throw error;

    const deletedCount = data ? data.length : 0;
    res.json({
      success: true,
      data: { deletedCount },
      message: `已删除 ${deletedCount} 项已完成任务`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('todos')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '任务不存在' },
      });
    }

    res.json({ success: true, data, message: '任务已删除' });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

module.exports = app;
