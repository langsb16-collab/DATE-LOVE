import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JTbit.me</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-blue-600 mb-4">JTbit.me</h1>
        <p class="text-2xl text-gray-700">Connected Successfully! ✅</p>
        <p class="text-gray-500 mt-4">도메인 연결 성공!</p>
      </div>
    </body>
    </html>
  `);
});

export default app;
