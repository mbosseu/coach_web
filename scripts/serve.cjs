'use strict';
// Compatibility with the previous preview command; the connected frontend needs its API.
if(process.argv[2]){process.env.PORT=process.argv[2];process.env.APP_ORIGIN=`http://127.0.0.1:${process.argv[2]}`}
require('./start.cjs');
