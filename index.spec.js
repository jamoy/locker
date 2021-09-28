import locker from './index.js';

// import crypto from 'crypto';
// import * as shamir from 'shamir';
//
// import forge from 'node-forge';
// const PARTS = 5;
// const QUORUM = 2;
//
// forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, function(err, keypair) {
//   const parts = shamir.split(crypto.randomBytes, PARTS, QUORUM, forge.pki.privateKeyToPem(keypair.privateKey));
//
//   console.log(parts);
// });


locker.spawn();


locker.kv.write('/key/string', 'test', { ttl: 500 });
locker.kv.write('/key/string', 'test2', { ttl: 500 });
locker.kv.write('/key/string2', 'test', { ttl: 500 });
locker.kv.write('/key/string3', 'this is a really long string', { ttl: 500 });



locker.kv.delete('/key/string2');