'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Booking, {
        foreignKey: 'userId',
        as: 'bookings'
      });
    }
  }

  User.init(
    {
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },

      passwordHash: {
        type: DataTypes.STRING,
        allowNull: true
      },

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        validate: {
          isIn: [['user', 'admin']]
        }
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users'
    }
  );

  return User;
};