/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'perf',
        'revert',
        'docs',
        'style',
        'chore',
        'refactor',
        'ref',
        'test',
        'ci',
        'build',
      ],
    ],
    'scope-empty': [2, 'always'],
  },
};
