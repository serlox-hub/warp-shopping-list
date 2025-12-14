const Sequencer = require('@jest/test-sequencer').default;

/**
 * Custom test sequencer for integration tests
 * Ensures tests run in a predictable order to avoid state conflicts
 */
class IntegrationTestSequencer extends Sequencer {
  sort(tests) {
    // Define the order of test files
    const order = [
      'database-triggers.test.js',
      'database-rls.test.js',
      'database-sharing.test.js',
    ];

    return tests.sort((a, b) => {
      const aIndex = order.findIndex(name => a.path.includes(name));
      const bIndex = order.findIndex(name => b.path.includes(name));

      // If both files are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in the array, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // Otherwise, sort alphabetically
      return a.path.localeCompare(b.path);
    });
  }
}

module.exports = IntegrationTestSequencer;
