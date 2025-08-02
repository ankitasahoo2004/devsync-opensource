const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// Add ticket cleanup job
const cleanupExpiredTickets = async () => {
    try {
        const now = new Date();
        const expiredTickets = await Ticket.find({
            scheduledForDeletion: { $lte: now },
            status: 'closed'
        });

        if (expiredTickets.length > 0) {
            await Ticket.deleteMany({
                scheduledForDeletion: { $lte: now },
                status: 'closed'
            });

            // console.log(`Cleaned up ${expiredTickets.length} expired tickets`);
        }
    } catch (error) {
        console.error('Error cleaning up expired tickets:', error);
    }
};

// Run cleanup every hour
setInterval(cleanupExpiredTickets, 60 * 60 * 1000);

// Run cleanup on startup
cleanupExpiredTickets();

const startTicketCleanupJob = () => {
    setInterval(cleanupExpiredTickets, 60 * 60 * 1000); // Every hour
    cleanupExpiredTickets(); // Run on startup
    // console.log('Ticket cleanup job started.');
};

module.exports = { startTicketCleanupJob };