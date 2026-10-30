// Company Knowledge Base Management API Router (Requirement 10)
import { Hono } from 'hono';
import { db, dbQueries } from '../db/schema.js';
export const knowledgeRouter = new Hono();
// List knowledge items
knowledgeRouter.get('/', (c) => {
    const category = c.req.query('category');
    const items = dbQueries.getCompanyKnowledge(category);
    return c.json({ items });
});
// Create knowledge item
knowledgeRouter.post('/', async (c) => {
    const body = await c.req.json();
    if (!body.title || !body.content || !body.category) {
        return c.json({ error: 'title, content, and valid category are required.' }, 400);
    }
    const id = `kb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    dbQueries.insertKnowledge({
        id,
        category: body.category,
        title: body.title,
        content: body.content,
        isActive: true,
    });
    return c.json({ success: true, id }, 201);
});
// Update knowledge item
knowledgeRouter.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    db.prepare(`
    UPDATE company_knowledge
    SET title = COALESCE(?, title),
        content = COALESCE(?, content),
        category = COALESCE(?, category),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(body.title || null, body.content || null, body.category || null, body.isActive !== undefined ? (body.isActive ? 1 : 0) : null, id);
    return c.json({ success: true });
});
// Delete / deactivate knowledge item
knowledgeRouter.delete('/:id', (c) => {
    const id = c.req.param('id');
    db.prepare('DELETE FROM company_knowledge WHERE id = ?').run(id);
    return c.json({ success: true });
});
