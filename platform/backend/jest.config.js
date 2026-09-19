// Jest config for the NestJS backend.
//
// Specs are co-located with the code they cover (`src/**/*.spec.ts`), matching the convention in
// AGENTS.md. `test:ci` is what CI runs: it never leaves a watcher behind and always exits.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/**/*.dto.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  testTimeout: 20000,
};