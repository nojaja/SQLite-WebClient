/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['src/js'],
  entryPointStrategy: 'expand',
  exclude: ['**/*.vue', '**/index.ts', '**/*.d.ts'],
  out: 'docs/typedoc-md',
  plugin: ['typedoc-plugin-markdown'],
  excludePrivate: true,
  excludeInternal: true,
  hideGenerator: true,
  readme: 'none',
};
