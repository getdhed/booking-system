const { User } = require('../models');

async function getAllUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ['passwordHash']
      },
      order: [['id', 'ASC']]
    });

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid user id'
      });
    }

    const user = await User.findByPk(id, {
      attributes: {
        exclude: ['passwordHash']
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const {
      fullName,
      email,
      role
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        error: 'fullName and email are required'
      });
    }

    const user = await User.create({
      fullName,
      email,
      passwordHash: null,
      role: role || 'user'
    });

    const result = user.toJSON();

    delete result.passwordHash;

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser
};