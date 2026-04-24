const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.js <your-password>');
  console.error('Example: node scripts/generate-password-hash.js mysecretpassword');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Error: password must be at least 8 characters');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log('\nCopy this line to your .env.local file:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('');
});
