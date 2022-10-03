
## yarn-plugin-clean-state

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

## yarn-plugin-no-external-scripts

Disables scripts from external packages, that is, packages which are not workspaces in the project. Instead of running an external script, yarn will print a warning.

Could be useful as an additional protection against some part of your monorepo or some submodule overriding `enableScripts` to `true` in the local `.yarnrc.yml`, and someone running `yarn` from there.

Installation

```sh
yarn plugin import https://github.com/fictitious/yarn-plugins/raw/main/yarn-plugin-no-external-scripts.cjs 
```

## yarn-plugin-no-install-scripts

Disables scripts during `yarn install`. Instead of running a script, yarn will print a warning.

Could be useful if you have `enableScripts: false` in `.yarnrc.yml`, but that's not enough because you also have some packages or submodules which are part of your monorepo, and they have post-install scripts with undesirable effects. In other words, this spares you from adding `--mode=skip-build` each time when you run `yarn install`.

Installation

```sh
yarn plugin import https://github.com/fictitious/yarn-plugins/raw/main/yarn-plugin-no-install-scripts.cjs 
```
