const http = require('http');

const data = JSON.stringify({ email: 'admin@trends.com', password: 'password123' });
const req = http.request('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const json = JSON.parse(body);
    const token = json.data.accessToken;
    console.log('Got token');
    
    // Test search
    const searchReq = http.request('http://localhost:4000/api/products?page=1&limit=10&search=shirt', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log('Search response status:', res2.statusCode);
        console.log('Search response body:', body2);
      });
    });
    searchReq.end();
  });
});
req.write(data);
req.end();
