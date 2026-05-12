import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@wongsorn-labs/atlas-lineage-shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@wongsorn-labs/atlas-lineage-db$': '<rootDir>/../../../packages/db/src/index.ts',
  },
};

export default config;
