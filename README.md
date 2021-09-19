# Locker

Locker is a side-car, distributed, embedded secrets-management and 
key-value store specifically made for binaries that are bundled as 
single-executable CLI apps.

Locker is heavily inspired by Hashicorp Vault but is built to not
be run or installed separately from the CLI app it is already bundled
with.

## Usage

```js
const locker = require('locker');

// will manage the conenction through clusters or through a network and coordinate syncs
locker.spawn();

// storing plain strings
locker.kv.write('/test/string', 'plain-text', { ttl: 40 });
// `plain-text`
locker.kv.read('/test/string');

// get an access token from an admin side (your app should store another key)
locker.secure.setAppKey(yourAppsShamirKey);
const accessToken = locker.secure.generateAccessToken(yourSharedShamirKey);

// storing private keys will always need a shamir key authentication above
locker.secure.unseal(accessToken);
locker.secure.write('/private/key', { private: '', public: '', passphrase: '' });
locker.secure.read('/private/key');
// every read will seal the locker automatically or you can seal it manually
locker.secure.seal();
```

> You may need to know your data storage usage in advance to safely
use this library as this library is intentionally not designed for
large data sets.
>
> You may need to increase your node's memory usage according to
> your data usage like below
>
> ```shell
> node --max-old-space-size=8192 ./your-cli.js
> ```
>
> Your bundler usage may vary.

## API Reference

### `locker.spawn()`

### `locker.connect()`

### `locker.kv`

#### `locker.kv.write(namespace: String, value: any, opts: Options)`

#### `locker.kv.read(namespace: String)`

#### `locker.kv.delete(namespace: String)`

#### `locker.kv.touch(namespace: String, opts: Options)`

### `locker.secure`

#### `locker.secure.setAppKey(key: String)`

#### `locker.secure.generateAccessToken(key: String)`

#### `locker.secure.unseal()`

#### `locker.secure.write(namespace: String, value: SecureValue, opts: Options)`

#### `locker.secure.read(namespace: String)`

#### `locker.secure.readMeta(namespace: String)`

#### `locker.secure.delete(namespace: String)`

#### `locker.secure.touch(namespace: String, opts: Options)`

#### `locker.secure.seal()`

### `locker.on(event: String, callback: Function)`

## TODO

- [ ] Compression Support

## License

Locker is licensed as Open-source under the MIT License. See [License](./LICENSE).
