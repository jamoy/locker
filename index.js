import * as shamir from 'shamir';
import fs from 'fs';
import EventEmitter from "eventemitter3";
import pino from 'pino';
import crypto from 'crypto';
import forge from 'node-forge';
import path from 'path';

const events = new EventEmitter();
const logger = pino({
  autoLogging: process.env.NODE_ENV === "production",
  prettyPrint:
    process.env.NODE_ENV === "production"
      ? false
      : {
        colorize: true,
        translateTime: "SYS:standard",
      },
});

process.on('uncaughtException', (error) => {
  logger.error(error);
});

// create directory
const dir = path.resolve(process.cwd(), './.locker');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

let bufferInMemory = {}; // represents the database in RAM
let options = {
  mode: 'master', // master key or shared
  dir: './locker',
  flushAfter: 'write', // or seconds
  keyring: {
    ttl: '90d',
  }
};

const keyring = []; // keyring in ram

const masterKey = encryptWithSymettricKey(unsealKey, 'masterkey');

function encryptWithSymettricKey(symettricKey, value) {
  const keySize = 24;
  const ivSize = 8;
  const salt = forge.random.getBytesSync(8);
  const derivedBytes = forge.pbe.opensslDeriveBytes(symettricKey, salt, keySize + ivSize);
  const buffer = forge.util.createBuffer(derivedBytes);
  const key = buffer.getBytes(keySize);
  const iv = buffer.getBytes(ivSize);
  const cipher = forge.cipher.createCipher('3DES-CBC', key);
  cipher.start({iv: iv});
  cipher.update(forge.util.createBuffer(value, 'utf8'));
  cipher.finish();
  const output = forge.util.createBuffer();
  if (salt !== null) {
    output.putBytes('Salted__');
    output.putBytes(salt);
  }
  output.putBuffer(cipher.output);
  return output.data;
}

function decryptWithSymettricKey(symettricKey, value) {
  const input = forge.util.createBuffer(value, 'binary');
  input.getBytes('Salted__'.length);
  const salt = input.getBytes(8);
  const keySize = 24;
  const ivSize = 8;
  const derivedBytes = forge.pbe.opensslDeriveBytes(symettricKey, salt, keySize + ivSize);
  const buffer = forge.util.createBuffer(derivedBytes);
  const key = buffer.getBytes(keySize);
  const iv = buffer.getBytes(ivSize);
  const decipher = forge.cipher.createDecipher('3DES-CBC', key);
  decipher.start({iv: iv});
  decipher.update(input);
  decipher.finish();
  return decipher.output.data;
}


function createKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { privateKey, publicKey };
}

// get encrypted private key from storage
// const privateKey = forge.pki.privateKeyFromPem(fs.readFileSync('./private.key', 'utf8'));

function getPrivateKeyFromKeyring(index) {
  const privateKey = keyring[index || keyring.length - 1];
  return {
    id: index || keyring.length - 1,
    privateKey: forge.pki.privateKeyFromPem(decryptWithSymettricKey(masterKey, privateKey.encryptedKey)),
  };
}

function createKeyForKeyring() {
  const { privateKey } = createKeyPair();
  return { encryptedKey: encryptWithSymettricKey(masterKey, privateKey), notAfter: '' };
}

function getKeyring() {

}

function rotateKeyring() {

}

/**
 *
 * @param {SpawnOptions} opts
 */
export function spawn(opts) {
  options = {
    ...opts,
    ...options,
  };

  connect();

  // if we are run in a worker context, continue
  // running. else we spawn our own children

  // scan network of all available IPs and ports running locker
  // and acquire connection to it

  // create an http server that can be used for healthchecks
  // and expose stats (sealed, buffer size, storage size)

  if (!fs.existsSync('./.locker/store')) {
    fs.writeFileSync('./.locker/store', JSON.stringify({kv: {}, secrets: {}, keyring: {}}));
  }
  const decrypted = fs.readFileSync('./.locker/store', 'utf8');
  bufferInMemory = JSON.parse(decrypted);

  const { privateKey } = createKeyPair();
  keyring.push({ encryptedKey: encryptWithSymettricKey(masterKey, privateKey), notAfter: '' });
  bufferInMemory.keyring = keyring;
  fs.writeFileSync('./.locker/store', JSON.stringify(bufferInMemory, null, 2));

  // Object.keys(bufferInMemory.kv).map(key => {
  //   // check if notAfter is above then delete from bufferInMemory
  //   bufferInMemory.kv[key] = {
  //     ...bufferInMemory.kv[key],
  //     value: decrypt(bufferInMemory.kv[key].value),
  //   }
  // });
}

export function connect(string) {
  // if its a directory descriptor, use that directory
  // if its a ip:port, connect to it via websocket
  // if its a unix socket, connect to it via unix socket
  // if its cluster, connect to it via cluster communication
}

function encrypt(value) {
  const selectedKey = getPrivateKeyFromKeyring();
  const publicKey = forge.pki.setRsaPublicKey(selectedKey.privateKey.n, selectedKey.privateKey.e);
  const key = forge.random.getBytesSync(16);
  const encryptedSymmetricKey = publicKey.encrypt(Buffer.from(key).toString('base64'));
  const iv = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(value));
  cipher.finish();
  return {
    keyId: selectedKey.id,
    key: encryptedSymmetricKey,
    encrypted: cipher.output.data,
  };
}

function decrypt(value, keyId) {
  const selectedKey = getPrivateKeyFromKeyring(keyId);
  const key = Buffer.from(selectedKey.privateKey.decrypt(value.key), 'base64');
  const iv = forge.random.getBytesSync(16);
  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({ iv: iv });
  decipher.update(value.encrypted);
  decipher.finish();
  return decipher.output.toString();
}

const writeBuffer = [];
const locks = {}; // per-key lock
export const kv = function() {};

kv.write = function(namespace, value, opts = {}) {
  opts = {
    ...opts,
    insecure: true,
  };
  write(namespace, value, opts).catch(logger.error);
};

kv.read = function() {};

kv.touch = function() {};

kv.delete = function(namespace) {
  del(namespace).catch(logger.error);
};

let pendingWrite = false;

async function acquireLock(namespace) {
  // acquire network lock
  // it should be in flush????
  await Promise.resolve();
  locks[namespace] = true;
  return 1;
}

async function releaseLock(namespace) {
  // this is a network lock
  delete locks[namespace];
}

function read() {}

async function write(namespace, value, opts) {
  await acquireLock(namespace);
  opts.created = +new Date();
  writeBuffer.push([namespace, encrypt(value), opts]);
  await releaseLock(namespace);
  events.emit('kv.write', namespace);
}

async function del(namespace) {
  await acquireLock(namespace);
  writeBuffer.push([namespace, undefined, undefined, true]);
  await releaseLock(namespace);
  events.emit('kv.delete', namespace);
}

events.on('kv.write', async (namespace) => {
  logger.info(`writing ${namespace}`);
  if (options.flushAfter === 'write') {
    await flush();
  }
});

events.on('kv.delete', async (namespace) => {
  logger.info(`deleting ${namespace}`);
  if (options.flushAfter === 'write') {
    await flush();
  }
});

async function flush() {
  // write to file after N seconds if there are any in the write buffer
  // if locks are 0, then start writing and persisting to other instances
  if (Object.keys(locks).length > 0) {
    return; // and wait for the next flush
  }

  const bufferToWrite = { ...bufferInMemory };

  writeBuffer.map(([key, value, opts, remove]) => {
    opts = {
      ...opts,
      notAfter: '', // based on ttl
    }
    bufferToWrite.kv[key] = { value, opts };
    if (remove === true) {
      delete bufferToWrite.kv[key];
    }
  });

  fs.writeFileSync('./.locker/store', JSON.stringify(bufferToWrite, null, 2));

  Object.keys(bufferToWrite.kv).map(key => {
    // fs.writeFileSync(`./.locker/${key}`, JSON.stringify(bufferToWrite.kv[key], null, 2));
    if (!fs.existsSync(path.join(`./.locker`, path.dirname(key)))) {
      fs.mkdirSync(path.join(`./.locker`, path.dirname(key)), { recursive: true })
    }
    const pathToWrite = path.join(`./.locker`, key);
    fs.writeFileSync(pathToWrite, encryptWithSymettricKey(masterKey, JSON.stringify(bufferToWrite.kv[key])));
  });
}

function sync() {
  // sync to other network connected locker instances
  // resolveConflict when there are writes on the same key
}

function resolveConflict() {

}



export const secure = {};
secure.write = function() {};
secure.read = function() {};
secure.touch = function() {};
secure.delete = function() {};
secure.unseal = function() {};
secure.seal = function() {};
secure.setAppKey = function() {};
secure.generateAccessToken = function() {};

export const on = events.on;

export default {
  kv,
  secure,
  spawn,
  connect,
  on,
}