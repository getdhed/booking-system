'use strict';
const catalog = require('../data/amenities');
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('Amenities', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        label: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        icon: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'check' },
        sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
      }, { transaction });
      await queryInterface.createTable('RoomAmenities', {
        roomId: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, references: { model: 'Rooms', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        amenityId: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, references: { model: 'Amenities', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' }
      }, { transaction });
      await queryInterface.bulkInsert('Amenities', catalog.map((item, sortOrder) => ({ ...item, sortOrder })), { transaction });
      const rooms = await queryInterface.sequelize.query('SELECT id, amenities FROM "Rooms"', { type: Sequelize.QueryTypes.SELECT, transaction });
      const names = new Set(catalog.map(item => item.label));
      const extra = [];
      for (const room of rooms) {
        for (const label of Array.isArray(room.amenities) ? room.amenities : []) {
          if (typeof label === 'string' && label.trim() && !names.has(label.trim())) {
            names.add(label.trim());
            extra.push({ code: 'legacy-' + extra.length, label: label.trim(), icon: 'check', sortOrder: catalog.length + extra.length });
          }
        }
      }
      if (extra.length) await queryInterface.bulkInsert('Amenities', extra, { transaction });
      const items = await queryInterface.sequelize.query('SELECT id, label FROM "Amenities"', { type: Sequelize.QueryTypes.SELECT, transaction });
      const byLabel = new Map(items.map(item => [item.label, item.id]));
      const links = [];
      for (const room of rooms) {
        for (const label of new Set(Array.isArray(room.amenities) ? room.amenities : [])) {
          const amenityId = typeof label === 'string' ? byLabel.get(label.trim()) : null;
          if (amenityId) links.push({ roomId: room.id, amenityId });
        }
      }
      if (links.length) await queryInterface.bulkInsert('RoomAmenities', links, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('RoomAmenities', { transaction });
      await queryInterface.dropTable('Amenities', { transaction });
    });
  }
};
