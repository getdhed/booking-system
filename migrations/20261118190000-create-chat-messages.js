'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ChatMessages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      senderId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      senderName: { type: Sequelize.STRING, allowNull: false },
      senderRole: { type: Sequelize.STRING, allowNull: false },
      text: { type: Sequelize.STRING(2000), allowNull: false },
      clientMessageId: { type: Sequelize.UUID, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ChatMessages', ['userId', 'id']);
    await queryInterface.addIndex('ChatMessages', ['senderId', 'clientMessageId'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ChatMessages');
  },
};
