import shamir from 'shamir';
import fs from 'fs/promises';
import EventEmitter from "eventemitter3";
import pino from 'pino';

const events = new EventEmitter();
const logger = pino({});

export function spawn() {
  // if we are run in a worker context, continue
  // running. else we spawn our own children
  logger.info(1);

  // scan network of all available IPs and ports running locker
  // and acquire connection to it

  // create an http server that can be used for healthchecks
  // and expose stats (sealed, buffer size, storage size)
}

export function connect() {}


const bufferInMemory = []; // represents the database in RAM
const writeBuffer = [];
const locks = {}; // per-key lock
export const kv = function() {};
kv.write = function() {};
kv.read = function() {};
kv.touch = function() {};
kv.delete = function() {};
function acquireLock() {
  // acquire network lock
}
function lock() {
  // this is a network lock
}
function read() {}
function write() {}
function flush() {
  // write to file after N seconds if there are any in the write buffer
  // if locks are 0, then start writing and persisting to other instances
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

spawn();