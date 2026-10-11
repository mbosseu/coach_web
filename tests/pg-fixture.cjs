'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {PostgresStore,initialState}=require('../server/postgres.cjs');
// Genuine embedded PostgreSQL engine; no cloud connection or provider secret.
// PGlite is single-connection: serialize its physical connection just as a
// PostgreSQL connection pool does when configured with one connection.
async function pgFixture(){
  const database=new PGlite();await database.waitReady;
  await database.exec(fs.readFileSync(path.join(__dirname,'..','supabase','migrations','001_coach_platform.sql'),'utf8'));
  await database.query('INSERT INTO boxing_center.state(id,payload) VALUES(1,$1)',[initialState()]);
  let tail=Promise.resolve();
  async function acquire(){let release;const prior=tail;tail=new Promise(resolve=>{release=resolve});await prior;return release}
  const pool={on(){},end:async()=>{},query:async(text,values=[])=>{const release=await acquire();try{return await database.query(text,values)}finally{release()}},connect:async()=>{const release=await acquire();return{query:(text,values=[])=>database.query(text,values),release}}};
  const makeStore=()=>new PostgresStore({},{pool}),store=makeStore();
  return{store,makeStore,database,close:()=>database.close()};
}
module.exports={pgFixture};
