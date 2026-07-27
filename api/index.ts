import type { IncomingMessage, ServerResponse } from 'http';
import { createServerlessHandler } from '../apps/api/dist/apps/api/src/create-handler';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressApp = await createServerlessHandler();
  expressApp(req, res);
}
