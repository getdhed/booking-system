'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.belongsToMany(models.Amenity, { through: models.RoomAmenity, foreignKey: "roomId", otherKey: "amenityId", as: "amenityOptions" });
      Room.hasMany(models.Booking, {
        foreignKey: 'roomId',
        as: 'bookings'
      });
    }
  }

  Room.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      roomNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      location: {
        type: DataTypes.STRING,
        allowNull: false
      },

      floor: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      galleryUrls: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },

      amenities: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },

      imageUrl: {
        type: DataTypes.STRING(2048),
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
      modelName: 'Room',
      tableName: 'Rooms'
    }
  );

  return Room;
};