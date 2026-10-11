'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
// SQLite has one connection. Keep async request/worker transactions isolated.
function serial(){const context=new AsyncLocalStorage();let tail=Promise.resolve();return function run(fn){
  if(context.getStore())return fn();
  const next=tail.then(()=>context.run(true,fn));tail=next.catch(()=>{});return next;
}}
module.exports={serial};
