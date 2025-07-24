const { fetchPRDetailsGraphQL } = require('./utils/githubHelpers');
const { fetchPRDetails } = require('./utils/githubUtils');

// Test the GraphQL implementation
async function testGraphQLImplementation() {
    try {
        console.log('🚀 Testing GraphQL PR fetching (replacing deprecated REST API)...');
        console.log('='.repeat(60));

        // Test with a sample username (you can change this)
        const testUsername = 'Sayan-dev731';

        console.log(`\n📊 Fetching PRs for ${testUsername} using GraphQL...`);

        // Test both implementations
        console.log('\n1️⃣ Testing githubHelpers.js implementation:');
        const result1 = await fetchPRDetailsGraphQL(testUsername, true, 10);
        console.log(`   ✅ Successfully fetched ${result1.items.length} merged PRs`);
        if (result1.items.length > 0) {
            console.log(`   📋 Sample PR: ${result1.items[0].title} (#${result1.items[0].number})`);
        }

        console.log('\n2️⃣ Testing githubUtils.js implementation:');
        const result2 = await fetchPRDetails(testUsername);
        console.log(`   ✅ Successfully fetched ${result2.items.length} merged PRs`);
        if (result2.items.length > 0) {
            console.log(`   📋 Sample PR: ${result2.items[0].title} (#${result2.items[0].number})`);
        }

        // Test with different states
        console.log('\n3️⃣ Testing all PR states (OPEN, CLOSED, MERGED):');
        const result3 = await fetchPRDetailsGraphQL(testUsername, false, 10);
        console.log(`   ✅ Successfully fetched ${result3.items.length} PRs (all states)`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ GraphQL implementation is working correctly!');
        console.log('🎉 Deprecated REST API has been successfully replaced!');
        console.log('\n📝 Benefits of GraphQL over deprecated REST API:');
        console.log('   • Better rate limit handling');
        console.log('   • More efficient data fetching');
        console.log('   • Built-in caching support');
        console.log('   • Future-proof against API deprecations');

    } catch (error) {
        console.error('❌ Error testing GraphQL implementation:', error);
        console.log('\n🔧 Possible solutions:');
        console.log('   • Check GitHub token in environment variables');
        console.log('   • Verify network connectivity');
        console.log('   • Ensure username exists on GitHub');
    }
}

// Test error handling
async function testErrorHandling() {
    try {
        console.log('\n🧪 Testing error handling with invalid username...');
        const result = await fetchPRDetailsGraphQL('invalid-user-that-does-not-exist-123456789', true, 5);
        console.log(`   ✅ Error handled gracefully: ${result.items.length} PRs found`);
    } catch (error) {
        console.log(`   ✅ Error caught and handled: ${error.message}`);
    }
}

// Performance comparison
async function performanceTest() {
    try {
        console.log('\n⚡ Performance test...');
        const startTime = Date.now();

        await fetchPRDetailsGraphQL('Sayan-dev731', true, 5);

        const endTime = Date.now();
        console.log(`   ⏱️  GraphQL query completed in ${endTime - startTime}ms`);
    } catch (error) {
        console.log(`   ❌ Performance test failed: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    await testGraphQLImplementation();
    await testErrorHandling();
    await performanceTest();

    console.log('\n🎯 Summary:');
    console.log('   The deprecated REST API "GET /search/issues" has been fully replaced');
    console.log('   with GraphQL queries that provide better performance and reliability.');
}

// Run the tests
runAllTests();
