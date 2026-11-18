'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('ChatMessage', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  senderName: { type: DataTypes.STRING, allowNull: false },
  senderRole: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.STRING(2000), allowNull: false },
  clientMessageId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'ChatMessages',
  indexes: [{ fields: ['userId', 'id'] }, { unique: true, fields: ['senderId', 'clientMessageId'] }],
});
