/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock bpmn-js to avoid ES module issues in tests
    '^bpmn-js$': '<rootDir>/tests/mocks/bpmn-js.cjs',
    '^bpmn-js/lib/Modeler\\.js$': '<rootDir>/tests/mocks/bpmn-js.cjs',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          target: 'es2022',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(bpmn-js|diagram-js|bpmn-moddle|moddle|moddle-xml|min-dash|min-dom|tiny-svg)/)',
  ],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test-example.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};