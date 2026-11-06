import 'dotenv/config';
import app from './app';

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`ProPDF API listening on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received; closing HTTP server`);
  server.close((error) => {
    if (error) {
      console.error('Server shutdown failed', error);
      process.exitCode = 1;
    }
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
