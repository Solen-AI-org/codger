const http = require('http');
const url = require('url');

let todos = [];
let nextId = 1;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Content-Type', 'application/json');

  // GET /todos
  if (method === 'GET' && pathname === '/todos') {
    res.writeHead(200);
    res.end(JSON.stringify(todos));
    return;
  }

  // POST /todos
  if (method === 'POST' && pathname === '/todos') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Title is required and must be a non-empty string' }));
          return;
        }
        const todo = {
          id: nextId++,
          title: data.title,
          done: false
        };
        todos.push(todo);
        res.writeHead(201);
        res.end(JSON.stringify(todo));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Match GET/DELETE /todos/:id
  const idMatch = pathname.match(/^\/todos\/(\d+)$/);

  if (method === 'GET' && idMatch) {
    const id = parseInt(idMatch[1]);
    const todo = todos.find(t => t.id === id);
    if (todo) {
      res.writeHead(200);
      res.end(JSON.stringify(todo));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  if (method === 'DELETE' && idMatch) {
    const id = parseInt(idMatch[1]);
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.splice(index, 1);
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
