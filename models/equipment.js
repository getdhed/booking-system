'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Equipment extends Model {
    static associate(models) {
      Equipment.belongsToMany(models.Booking, {
        through: models.BookingEquipment,
        foreignKey: 'equipmentId',
        otherKey: 'bookingId',
        as: 'bookings'
      });
    }
  }

  Equipment.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      type: {
        type: DataTypes.STRING,
        allowNull: false
      },

      totalQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 0
        }
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Equipment',
      tableName: 'Equipment'
    }
  );

  return Equipment;
};