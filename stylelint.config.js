export default {
  extends: ['stylelint-config-recommended'],
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
  ],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'use',
          'forward',
          'mixin',
          'include',
          'extend',
          'each',
          'for',
          'if',
          'else',
          'while',
        ],
      },
    ],
    'no-duplicate-selectors': null,
    'no-descending-specificity': null,
  },
}