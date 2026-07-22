const http = require('http');
const url = require('url');

const todos = [];
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
      if (body.length > 1e6) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing or empty title' }));
          return;
        }

        const todo = {
          id: nextId++,
          title: data.title.trim(),
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

  // GET /todos/:id
  const getMatch = pathname.match(/^\/todos\/(\d+)$/);
  if (method === 'GET' && getMatch) {
    const id = parseInt(getMatch[1], 10);
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

  // DELETE /todos/:id
  const deleteMatch = pathname.match(/^\/todos\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1], 10);
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

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
