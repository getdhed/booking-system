'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },

      endTime: {
        type: Sequelize.DATE,
        allowNull: false
      },

      purpose: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      attendeeCount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex(
      'Bookings',
      ['roomId', 'startTime', 'endTime'],
      {
        name: 'bookings_room_time_idx'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Bookings');
  }
};