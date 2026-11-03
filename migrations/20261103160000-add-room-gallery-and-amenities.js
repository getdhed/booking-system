'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Rooms', 'galleryUrls', {
      type: Sequelize.JSONB, allowNull: false, defaultValue: []
    });
    await queryInterface.addColumn('Rooms', 'amenities', {
      type: Sequelize.JSONB, allowNull: false, defaultValue: []
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Rooms', 'amenities');
    await queryInterface.removeColumn('Rooms', 'galleryUrls');
  }
};
