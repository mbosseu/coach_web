'use strict';
function createStore(cfg){return cfg.provider==='supabase'?new(require('./postgres.cjs').PostgresStore)(cfg):new(require('./store.cjs').Store)(cfg.dbPath)}
module.exports={createStore};
