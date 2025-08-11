const mongoose = require('mongoose');
const Ambassador = require('../models/Ambassador');
const User = require('../models/User');
require('dotenv').config();

async function syncReferralCounts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devsync');
        console.log('Connected to MongoDB');

        // Get all ambassadors
        const ambassadors = await Ambassador.find({ status: 'approved' });
        console.log(`Found ${ambassadors.length} approved ambassadors`);

        const results = [];

        for (const ambassador of ambassadors) {
            const realReferralCount = await User.countDocuments({
                referredBy: ambassador._id
            });

            const oldCount = ambassador.membersReferred;

            // Update the stored count
            await Ambassador.findByIdAndUpdate(ambassador._id, {
                membersReferred: realReferralCount
            });

            results.push({
                name: ambassador.name,
                referralCode: ambassador.referralCode,
                oldCount,
                newCount: realReferralCount,
                difference: realReferralCount - oldCount
            });

            console.log(`${ambassador.name}: ${oldCount} -> ${realReferralCount} (${realReferralCount - oldCount > 0 ? '+' : ''}${realReferralCount - oldCount})`);
        }

        console.log('\nSync Summary:');
        console.log('=============');
        results.forEach(result => {
            if (result.difference !== 0) {
                console.log(`${result.name} (${result.referralCode}): ${result.oldCount} -> ${result.newCount} (${result.difference > 0 ? '+' : ''}${result.difference})`);
            }
        });

        const totalChanges = results.filter(r => r.difference !== 0).length;
        console.log(`\nTotal ambassadors with changes: ${totalChanges}`);
        console.log('Sync completed successfully!');

    } catch (error) {
        console.error('Error syncing referral counts:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the sync if this file is executed directly
if (require.main === module) {
    syncReferralCounts().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Sync failed:', error);
        process.exit(1);
    });
}

module.exports = syncReferralCounts;
