// Используется только внутри одноразовой тестовой PostgreSQL в GitHub Actions.
if (process.env.LAB5_CI !== '1') throw new Error('This setup is only for an isolated CI database');
const bcrypt = require('bcrypt');
const { User, sequelize } = require('../models');
(async () => {
  for (const [email, password, role] of [
    [process.env.LAB5_EMAIL, process.env.LAB5_PASSWORD, 'admin'],
    [process.env.LAB5_USER_EMAIL, process.env.LAB5_USER_PASSWORD, 'user']
  ]) {
    if (!email || !password) throw new Error('Missing CI credentials');
    await User.create({ fullName: 'CI ' + role, email, passwordHash: await bcrypt.hash(password, 4), role });
  }
  await sequelize.close();
})().catch(error => { console.error(error); process.exit(1); });
