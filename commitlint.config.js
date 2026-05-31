module.exports = {
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'test', 'refactor', 'docs', 'perf', 'chore', 'ci', 'style']
    ],
    'scope-enum': [
      2,
      'always',
      ['api', 'web', 'db', 'e2e', 'shared']
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
  ignores: [
    (commit) => commit === '',
    (commit) => /^Merge /.test(commit),
    (commit) => /^Revert /.test(commit),
  ],
};
