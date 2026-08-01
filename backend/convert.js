const fs = require('fs');
let data = fs.readFileSync('prisma/schema.prisma', 'utf8');
data = data.replace('provider = "postgresql"', 'provider = "sqlite"');
data = data.replace('url      = env("DATABASE_URL")', 'url      = "file:./dev.db"');
data = data.replace(/@db\.Decimal\(\d+, \d+\)/g, '');
data = data.replace(/Decimal/g, 'Float');
fs.writeFileSync('prisma/schema.prisma', data);
console.log('Schema updated to SQLite');
