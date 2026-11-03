'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Amenity extends Model {
    static associate(models) {
      Amenity.belongsToMany(models.Room, { through: models.RoomAmenity, foreignKey: 'amenityId', otherKey: 'roomId', as: 'rooms' });
    }
  }
  Amenity.init({
    code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'check' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, { sequelize, modelName: 'Amenity', tableName: 'Amenities', timestamps: false });
  return Amenity;
};
