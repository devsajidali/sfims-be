// server.cjs
require('ts-node/register');
require('tsconfig-paths/register');

(async () => {
  await import('file://' + __dirname + '/src/server.ts'); 
})();
