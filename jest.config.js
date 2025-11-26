const baseConfig = {
  // Handle ESM modules and absolute imports
  extensionsToTreatAsEsm: ['.jsx'],
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

module.exports = {
  // Add support for different test environments per file
  projects: [
    {
      ...baseConfig,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/!(*.browser).test.js']
    },
    {
      ...baseConfig,
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/**/*.browser.test.js', '<rootDir>/tests/dashboard.test.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    }
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
