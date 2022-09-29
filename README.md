
### yarn-plugin-clean-state

Removes `node_modules` in each workspace, removes yarn state file and cleans yarn cache. Works only if the `nodeLinker` is set to `node-modules` or `pnpm`, not `pnp`. Could be useful when testing other plugins which use install hook, for example.

Installation

```sh
yarn plugin import https://github.com/fictitious/yarn-plugins/raw/main/yarn-plugin-clean-state.cjs 
```

Use

```
yarn clean state
yarn install
```

