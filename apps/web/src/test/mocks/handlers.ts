import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/persons', () => HttpResponse.json([])),
  http.post('/api/persons', () => HttpResponse.json({ id: 1, name: 'Test' }, { status: 201 })),
  http.get('/api/relationships', () => HttpResponse.json([])),
  http.get('/api/relationships/person/:personId', () => HttpResponse.json([])),
  http.post('/api/relationships', () => HttpResponse.json({ id: 1 }, { status: 201 })),
  http.get('/api/trees', () => HttpResponse.json([])),
  http.post('/api/trees', () =>
    HttpResponse.json(
      { id: 1, name: 'Test Tree', description: null, ownerId: '1', createdAt: '', updatedAt: '' },
      { status: 201 },
    )),
  http.post('/api/trees/:treeId/members', () =>
    HttpResponse.json({ id: 1, treeId: 1, userId: 'user-2', role: 'viewer', createdAt: '' }, { status: 201 })),
];
