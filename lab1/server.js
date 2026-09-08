const express = require('express');

const app = express();
const port = 3000;

let bookings = [
    {
        id: 1,
        resourceName: 'Meeting room 101',
        resourceType: 'room',
        date: '2026-09-20',
        startTime: '10:00',
        endTime: '11:00',
        bookedBy: 'Ivan Ivanov'
    },
    {
        id: 2,
        resourceName: 'Projector Epson',
        resourceType: 'equipment',
        date: '2026-09-21',
        startTime: '14:00',
        endTime: '16:00',
        bookedBy: 'Anna Petrova'
    }
];

app.use(express.json());

app.get('/bookings', (req, res) => {
    res.status(200).json(bookings);
});

app.get('/bookings/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
        error: 'Invalid booking id'
    });
}

    const booking = bookings.find(booking => booking.id === id);

    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json(booking);
}); 

app.post('/bookings', (req, res) => {
    const {
        resourceName,
        resourceType,
        date,
        startTime,
        endTime,
        bookedBy
    } = req.body;

    if (!resourceName || !resourceType || !date || !startTime || !endTime || !bookedBy) {
        return res.status(400).json({
            error: 'All fields are required'
        });
    }

    const newBooking = {
        id: bookings.length > 0
            ? Math.max(...bookings.map(booking => booking.id)) + 1
            : 1,
        resourceName,
        resourceType,
        date,
        startTime,
        endTime,
        bookedBy
    };

    bookings.push(newBooking);

    res.status(201).json(newBooking);
});

app.put('/bookings/:id', (req, res) => {
    const id = Number(req.params.id);

       if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'Invalid booking id'
        });
    }
    const bookingIndex = bookings.findIndex(booking => booking.id === id);

    if (bookingIndex === -1) {
        return res.status(404).json({
            error: 'Booking not found'
        });
    }

    const {
        resourceName,
        resourceType,
        date,
        startTime,
        endTime,
        bookedBy
    } = req.body;

    if (!resourceName || !resourceType || !date || !startTime || !endTime || !bookedBy) {
        return res.status(400).json({
            error: 'All fields are required'
        });
    }

    bookings[bookingIndex] = {
        id,
        resourceName,
        resourceType,
        date,
        startTime,
        endTime,
        bookedBy
    };

    res.status(200).json(bookings[bookingIndex]);
});

app.delete('/bookings/:id', (req, res) => {
    const id = Number(req.params.id);

       if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'Invalid booking id'
        });
    }

    const bookingIndex = bookings.findIndex(booking => booking.id === id);

    if (bookingIndex === -1) {
        return res.status(404).json({
            error: 'Booking not found'
        });
    }

    bookings.splice(bookingIndex, 1);

    res.status(204).send();
});

app.use((err, req, res, next) => {
    console.error(err);

    if (err instanceof SyntaxError) {
        return res.status(400).json({
            error: 'Invalid JSON'
        });
    }

    res.status(500).json({
        error: 'Internal server error'
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
