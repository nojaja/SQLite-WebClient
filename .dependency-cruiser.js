/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: '循環依存を禁止する',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-db-layer-to-ui',
      severity: 'error',
      comment: 'DBレイヤー（SQLiteManager, datasetDb）はUIモジュールに依存してはならない',
      from: {
        path: '^src/js/(SQLiteManager|datasetDb)\\.ts$',
      },
      to: {
        path: '^src/js/ui/',
      },
    },
    {
      name: 'no-ui-to-db-layer',
      severity: 'error',
      comment: 'UIユーティリティはSQLiteManagerに直接依存してはならない',
      from: {
        path: '^src/js/ui/',
      },
      to: {
        path: '^src/js/SQLiteManager\\.ts$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
