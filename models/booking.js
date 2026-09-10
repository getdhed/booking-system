'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Booking.belongsTo(models.Room, {
        foreignKey: 'roomId',
        as: 'room'
      });

      Booking.belongsToMany(models.Equipment, {
        through: models.BookingEquipment,
        foreignKey: 'bookingId',
        otherKey: 'equipmentId',
        as: 'equipment'
      });
    }
  }

  Booking.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      startTime: {
        type: DataTypes.DATE,
        allowNull: false
      },

      endTime: {
        type: DataTypes.DATE,
        allowNull: false
      },

      purpose: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      attendeeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'confirmed', 'cancelled', 'completed']]
        }
      }
    },
    {
      sequelize,
      modelName: 'Booking',
      tableName: 'Bookings',

      validate: {
        endTimeMustBeAfterStartTime() {
          if (
            this.startTime &&
            this.endTime &&
            new Date(this.endTime) <= new Date(this.startTime)
          ) {
            throw new Error('endTime must be later than startTime');
          }
        }
      }
    }
  );

  return Booking;
};