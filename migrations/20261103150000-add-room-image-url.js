'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Rooms', 'imageUrl', {
      type: Sequelize.STRING(2048),
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Rooms', 'imageUrl');
  }
};
