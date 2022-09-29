module.exports = {
    name: `plugin-clean-state`,
    factory: require => {
        const {Configuration, Project, StreamReport, MessageName, Cache} = require('@yarnpkg/core');
        const {BaseCommand} = require('@yarnpkg/cli');
        const {ppath, xfs, Filename} = require('@yarnpkg/fslib');
        const {Command} = require('clipanion');

        class CleanStateCommand extends BaseCommand {
            static paths = [['clean', 'state']];
  
            static usage = Command.Usage({
                description: 'Revert project to the initial state where nothing is installed and nothing is in the cache. You have to run \'yarn install\' after this.',
                details: `
                    This command cleans yarn cache, removes yarn install state, and removes node_modules in each workspace in the project
                    It works only if the project uses node-modules or pnpm linker, not pnp.
                `,
                examples: [[
                    'clean cache, remove yarn install state, and remove node_modules',
                    'yarn clean state',
                ]]
            });

            async execute() {
                const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
                const {project} = await Project.find(configuration, this.context.cwd);
                const cache = await Cache.find(configuration);

                const report = await StreamReport.start(
                    {configuration, stdout: this.context.stdout},
                     async (r) => {
                        if (configuration.get(`nodeLinker`) === 'pnp') {
                            r.reportWarning(MessageName.UNNAMED, '"clean state" command is not implemented for pnp nodeLinker');
                        } else {
                            await cleanCache({xfs, cache});
                            await removeStateFile({xfs, configuration});
                            await removeNodeModules({xfs, Filename, ppath, project});
                        }
                    }
                );
                return report.exitCode();
            }
        };
        
        return {commands: [CleanStateCommand]};
    }
};

async function cleanCache({xfs, cache}) {
    if (cache.mirrorCwd) {
        await xfs.removePromise(cache.mirrorCwd);
    }
    await xfs.removePromise(cache.cwd);
}

async function removeStateFile({xfs, configuration}) {
    const installStatePath = configuration.get(`installStatePath`);
    await xfs.removePromise(installStatePath);
}

async function removeNodeModules({xfs, Filename, ppath, project}) {
    for (const workspace of project.workspaces) {
        const p = ppath.join(workspace.cwd, Filename.nodeModules);
        await xfs.removePromise(p);
    }
}

