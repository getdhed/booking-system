const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { User } = require('../models');


function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h'
    }
  );
}


function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}


async function register(req, res, next) {
  try {
    const {
      fullName,
      email,
      password
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        error: 'fullName, email and password are required'
      });
    }

    const existingUser = await User.findOne({
      where: {
        email
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: 'user'
    });

    return res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    });

  } catch (error) {
    next(error);
  }
}


async function login(req, res, next) {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'email and password are required'
      });
    }

    const user = await User.findOne({
      where: {
        email
      }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save();

    return res.status(200).json({
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
}


async function refresh(req, res, next) {
  try {
    const {
      refreshToken
    } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    const user = await User.findOne({
      where: {
        refreshToken
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    user.refreshToken = newRefreshToken;

    await user.save();

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    next(error);
  }
}


async function logout(req, res, next) {
  try {
    const {
      refreshToken
    } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    const user = await User.findOne({
      where: {
        refreshToken
      }
    });

    if (user) {
      user.refreshToken = null;

      await user.save();
    }

    return res.status(204).send();

  } catch (error) {
    next(error);
  }
}


async function getProfile(req, res, next) {
  try {
    const user = await User.findByPk(
      req.user.id,
      {
        attributes: {
          exclude: [
            'passwordHash',
            'refreshToken'
          ]
        }
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    return res.status(200).json(user);

  } catch (error) {
    next(error);
  }
}


module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile
};