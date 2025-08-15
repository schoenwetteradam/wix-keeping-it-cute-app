module.exports = {
  testEnvironment: 'node',
  // Add support for different test environments per file
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/!(*.browser).test.js']
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/**/*.browser.test.js', '<rootDir>/tests/dashboard.test.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    }
  ],
  // Handle ESM modules
  extensionsToTreatAsEsm: ['.jsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  }
};
