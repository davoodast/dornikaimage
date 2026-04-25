const fs = require('fs');
const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('@tsconet1212', 12);
  const verify = await bcrypt.compare('@tsconet1212', hash);
  if (!verify) { console.error('VERIFY FAILED'); process.exit(1); }

  const jwtSecret = '1a03abd1c26247138bbb9f862cc72d54b69d5b11600428e2cfc3b864fd1107b1';

  // Escape ALL $ signs with \$ so dotenv-expand does NOT substitute them.
  // This is the standard dotenv way to include literal dollar signs.
  const escapedHash = hash.replace(/\$/g, '\\$');

  const lines = [
    'ADMIN_USERNAME=dvka',
    'ADMIN_PASSWORD_HASH=' + escapedHash,
    'JWT_SECRET=' + jwtSecret,
    'CLEANUP_INTERVAL_MS=3600000',
    'MAX_FILE_SIZE_MB=20',
    'MAX_FILES_PER_UPLOAD=50',
    'RATE_LIMIT_REQUESTS=100',
    'RATE_LIMIT_WINDOW_MS=60000',
    'NODE_ENV=development',
  ];

  fs.writeFileSync('.env.local', lines.join('\n'), 'utf8');
  console.log('Written .env.local:');
  console.log(fs.readFileSync('.env.local', 'utf8'));
  console.log('Hash length in file:', escapedHash.length, '(with escapes)');
  console.log('Verify will work:', verify);
}

main().catch(e => { console.error(e); process.exit(1); });
