module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^.+\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },
  globals: {
    __APP_VERSION__: '0.0.0-test',
    __GIT_HASH__: 'test',
  },
};
