'use strict';

const { QueryTypes, Op } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Пользователи
    await queryInterface.bulkInsert('Users', [
      {
        fullName: 'Ivan Ivanov',
        email: 'ivan.ivanov@example.com',
        passwordHash: null,
        role: 'user',
        createdAt: now,
        updatedAt: now
      },
      {
        fullName: 'Anna Petrova',
        email: 'anna.petrova@example.com',
        passwordHash: null,
        role: 'user',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Помещения
    await queryInterface.bulkInsert('Rooms', [
      {
        name: 'Conference Room Alpha',
        roomNumber: '101',
        location: 'Main Building',
        floor: 1,
        capacity: 12,
        description: 'Large conference room for meetings',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Meeting Room Beta',
        roomNumber: '204',
        location: 'Main Building',
        floor: 2,
        capacity: 6,
        description: 'Small room for team meetings',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Оборудование
    await queryInterface.bulkInsert('Equipment', [
      {
        name: 'Epson Projector',
        type: 'projector',
        totalQuantity: 3,
        description: 'Full HD portable projector',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Wireless Microphone',
        type: 'microphone',
        totalQuantity: 5,
        description: 'Wireless microphone for presentations',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Получаем созданные id, чтобы не предполагать, что они равны 1 и 2.
    const [ivan] = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE email = :email LIMIT 1',
      {
        replacements: {
          email: 'ivan.ivanov@example.com'
        },
        type: QueryTypes.SELECT
      }
    );

    const [anna] = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" WHERE email = :email LIMIT 1',
      {
        replacements: {
          email: 'anna.petrova@example.com'
        },
        type: QueryTypes.SELECT
      }
    );

    const [alpha] = await queryInterface.sequelize.query(
      'SELECT id FROM "Rooms" WHERE "roomNumber" = :roomNumber LIMIT 1',
      {
        replacements: {
          roomNumber: '101'
        },
        type: QueryTypes.SELECT
      }
    );

    const [beta] = await queryInterface.sequelize.query(
      'SELECT id FROM "Rooms" WHERE "roomNumber" = :roomNumber LIMIT 1',
      {
        replacements: {
          roomNumber: '204'
        },
        type: QueryTypes.SELECT
      }
    );

    // Бронирования
    await queryInterface.bulkInsert('Bookings', [
      {
        userId: ivan.id,
        roomId: alpha.id,
        startTime: new Date('2026-09-20T10:00:00+03:00'),
        endTime: new Date('2026-09-20T12:00:00+03:00'),
        purpose: 'Project team meeting',
        notes: 'Projector required',
        attendeeCount: 8,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now
      },
      {
        userId: anna.id,
        roomId: beta.id,
        startTime: new Date('2026-09-21T14:00:00+03:00'),
        endTime: new Date('2026-09-21T15:30:00+03:00'),
        purpose: 'Client presentation',
        notes: 'Prepare presentation materials',
        attendeeCount: 5,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      },
      {
        userId: ivan.id,
        roomId: beta.id,
        startTime: new Date('2026-09-22T09:00:00+03:00'),
        endTime: new Date('2026-09-22T10:00:00+03:00'),
        purpose: 'Weekly planning',
        notes: null,
        attendeeCount: 4,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Находим оборудование и созданные бронирования.
    const [projector] = await queryInterface.sequelize.query(
      'SELECT id FROM "Equipment" WHERE name = :name LIMIT 1',
      {
        replacements: {
          name: 'Epson Projector'
        },
        type: QueryTypes.SELECT
      }
    );

    const [microphone] = await queryInterface.sequelize.query(
      'SELECT id FROM "Equipment" WHERE name = :name LIMIT 1',
      {
        replacements: {
          name: 'Wireless Microphone'
        },
        type: QueryTypes.SELECT
      }
    );

    const [teamMeeting] = await queryInterface.sequelize.query(
      'SELECT id FROM "Bookings" WHERE purpose = :purpose LIMIT 1',
      {
        replacements: {
          purpose: 'Project team meeting'
        },
        type: QueryTypes.SELECT
      }
    );

    const [presentation] = await queryInterface.sequelize.query(
      'SELECT id FROM "Bookings" WHERE purpose = :purpose LIMIT 1',
      {
        replacements: {
          purpose: 'Client presentation'
        },
        type: QueryTypes.SELECT
      }
    );

    // Связываем оборудование с бронированиями.
    await queryInterface.bulkInsert('BookingEquipment', [
      {
        bookingId: teamMeeting.id,
        equipmentId: projector.id,
        quantity: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        bookingId: presentation.id,
        equipmentId: projector.id,
        quantity: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        bookingId: presentation.id,
        equipmentId: microphone.id,
        quantity: 2,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
  await queryInterface.bulkDelete('BookingEquipment', null, {});

  await queryInterface.bulkDelete('Bookings', {
    purpose: {
      [Op.in]: [
        'Project team meeting',
        'Client presentation',
        'Weekly planning'
      ]
    }
  });

  await queryInterface.bulkDelete('Equipment', {
    name: {
      [Op.in]: [
        'Epson Projector',
        'Wireless Microphone'
      ]
    }
  });

  await queryInterface.bulkDelete('Rooms', {
    roomNumber: {
      [Op.in]: ['101', '204']
    }
  });

  await queryInterface.bulkDelete('Users', {
    email: {
      [Op.in]: [
        'ivan.ivanov@example.com',
        'anna.petrova@example.com'
      ]
    }
  });
}
};