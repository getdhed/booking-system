'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingEquipment extends Model {
    static associate(models) {
      BookingEquipment.belongsTo(models.Booking, {
        foreignKey: 'bookingId'
      });

      BookingEquipment.belongsTo(models.Equipment, {
        foreignKey: 'equipmentId'
      });
    }
  }

  BookingEquipment.init(
    {
      bookingId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1
        }
      }
    },
    {
      sequelize,
      modelName: 'BookingEquipment',
      tableName: 'BookingEquipment'
    }
  );

  return BookingEquipment;
};