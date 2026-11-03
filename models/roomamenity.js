'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RoomAmenity extends Model {}
  RoomAmenity.init({
    roomId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    amenityId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true }
  }, { sequelize, modelName: 'RoomAmenity', tableName: 'RoomAmenities', timestamps: false });
  return RoomAmenity;
};
