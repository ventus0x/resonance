import express from 'express';
import path from 'path';
import apiRouter from './server/api.ts';
import { streamService } from './server/streamService.ts';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Resonance Music API', timestamp: new Date().toISOString() });
  });

  // Direct song discovery and streaming endpoints (supporting GET /search?q= and GET /stream?videoId=)
  app.get('/search', async (req, res) => {
    const q = (req.query.q as string) || '';
    try {
      const results = await streamService.searchMusic(q);
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/stream', (req, res) => {
    streamService.proxyStream(req, res);
  });

  app.get('/resolve-youtube', async (req, res) => {
    const title = (req.query.title as string) || '';
    const artist = (req.query.artist as string) || '';
    const fallback = (req.query.fallback as string) || undefined;
    try {
      const result = await streamService.resolveYouTubeVideoId(title, artist, fallback);
      res.json(result);
    } catch {
      res.status(500).json({ videoId: null, duration: 210 });
    }
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Serve uploads folder static assets
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Resonance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
