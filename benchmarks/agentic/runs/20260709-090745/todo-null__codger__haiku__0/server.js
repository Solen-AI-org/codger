const http = require('http');

const todos = [];
let nextId = 1;

const server = http.createServer((req, res) => {
  const method = req.method;
  const path = req.url.split('?')[0];

  res.setHeader('Content-Type', 'application/json');

  if (path === '/todos' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(todos));
  } else if (path === '/todos' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.title !== 'string' || data.title.trim() === '') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Title must be a non-empty string' }));
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
  } else if (path.match(/^\/todos\/\d+$/) && method === 'GET') {
    const id = parseInt(path.split('/')[2]);
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(todo));
  } else if (path.match(/^\/todos\/\d+$/) && method === 'DELETE') {
    const id = parseInt(path.split('/')[2]);
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      res.writeHead(404);
      res.end();
      return;
    }
    todos.splice(index, 1);
    res.writeHead(204);
    res.end();
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
