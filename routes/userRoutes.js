const express = require('express');
const authorization = require('../middlewares/authorization');
const requireAdmin = require('../middlewares/requireAdmin');
const { getAllUsers, getUserById, createUser } = require('../controllers/userController');

const router = express.Router();
router.use(authorization, requireAdmin);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
// Создание аккаунтов выполняется только через /auth/register (role = user).
// При необходимости роль назначается администратором БД, не публичным API.
module.exports = router;
