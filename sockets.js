const socketIO = require('socket.io');

let io;

module.exports = {
    init: function (httpServer) {
        io = socketIO(httpServer, {
            cors: {
                origin: 'http://localhost:3000',
            },
        });

        return io;
    },
    getIO: function () {
        if (!io) {
            throw new Error('No webSocket connection established');
        }

        return io;
    },
};
