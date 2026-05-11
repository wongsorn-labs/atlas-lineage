import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/persons', () => HttpResponse.json([])),
  http.post('/api/persons', () => HttpResponse.json({ id: 1, name: 'Test' }, { status: 201 })),
  http.get('/api/relationships', () => HttpResponse.json([])),
  http.post('/api/relationships', () => HttpResponse.json({ id: 1 }, { status: 201 })),
];
