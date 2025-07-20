/**
 * Example test file for Tundra project
 * This demonstrates the testing setup and provides a foundation for future tests
 */

describe('Tundra Project Tests', () => {
  test('should have a working test environment', () => {
    expect(true).toBe(true)
  })

  test('should be able to test basic JavaScript functionality', () => {
    const sum = (a, b) => a + b
    expect(sum(2, 3)).toBe(5)
  })

  test('should have access to testing utilities', () => {
    expect(typeof expect).toBe('function')
    expect(typeof describe).toBe('function')
    expect(typeof test).toBe('function')
  })
})

// Example of testing environment variables
describe('Environment Configuration', () => {
  test('should be in test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
