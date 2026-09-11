// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['serve-expo.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', Buffer: 'readonly' },
    },
  },
  {
    // Guard against the Zustand v5 footgun: a selector that returns a freshly
    // built reference on every call makes useSyncExternalStore loop forever
    // ("Maximum update depth exceeded"). Heuristic — select raw state and
    // derive with useMemo, or read imperatively via getState().
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.name=/Store$/] > ArrowFunctionExpression > ArrayExpression',
          message:
            'Zustand selector returns a NEW array every render -> infinite re-render. Select raw state and derive with useMemo.',
        },
        {
          selector:
            'CallExpression[callee.name=/Store$/] > ArrowFunctionExpression > ObjectExpression',
          message:
            'Zustand selector returns a NEW object every render -> infinite re-render. Select fields individually or wrap with useShallow.',
        },
        {
          selector:
            'CallExpression[callee.name=/Store$/] > ArrowFunctionExpression > CallExpression[callee.property.name=/^(get[A-Z].*|map|filter|slice|sort|concat|flatMap|reverse|splice)$/]',
          message:
            'Zustand selector calls a method that allocates a new value each render -> infinite re-render. Select raw state and derive with useMemo, or call it via useAppStore.getState().',
        },
      ],
    },
  },
  {
    // React Three Fiber has its own intrinsic elements. Keep DOM attribute
    // validation, and accept these renderer properties only on their elements.
    files: ['examples/with-react-three-fiber/App.js'],
    rules: {
      'react/no-unknown-property': ['error', { ignore: ['attach', 'args', 'position'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name=/^[a-z]/][name.name!=/^(boxBufferGeometry|meshStandardMaterial)$/] > JSXAttribute[name.name="attach"]',
          message: 'The attach property belongs to Three geometry and material elements.',
        },
        {
          selector: 'JSXOpeningElement[name.name=/^[a-z]/][name.name!="boxBufferGeometry"] > JSXAttribute[name.name="args"]',
          message: 'The args property belongs to the Three geometry constructor.',
        },
        {
          selector: 'JSXOpeningElement[name.name=/^[a-z]/][name.name!=/^(mesh|pointLight)$/] > JSXAttribute[name.name="position"]',
          message: 'The position property belongs to Three scene objects.',
        },
      ],
    },
  },
]);
