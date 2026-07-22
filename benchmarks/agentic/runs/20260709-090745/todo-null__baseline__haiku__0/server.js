const http = require('http');
const url = require('url');

let todos = [];
let nextId = 1;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  const sendJson = (statusCode, data) => {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  };

  // GET /todos
  if (pathname === '/todos' && method === 'GET') {
    sendJson(200, todos);
    return;
  }

  // POST /todos
  if (pathname === '/todos' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
          sendJson(400, { error: 'Title is required' });
          return;
        }
        const todo = { id: nextId++, title: data.title, done: false };
        todos.push(todo);
        sendJson(201, todo);
      } catch (e) {
        sendJson(400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // GET /todos/:id or DELETE /todos/:id
  const match = pathname.match(/^\/todos\/(\d+)$/);
  if (match) {
    const id = parseInt(match[1], 10);

    if (method === 'GET') {
      const todo = todos.find(t => t.id === id);
      if (!todo) {
        sendJson(404, { error: 'Not found' });
        return;
      }
      sendJson(200, todo);
      return;
    }

    if (method === 'DELETE') {
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) {
        sendJson(404, { error: 'Not found' });
        return;
      }
      todos.splice(index, 1);
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // 404 for unknown routes
  sendJson(404, { error: 'Not found' });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
