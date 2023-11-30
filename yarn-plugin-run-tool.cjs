module.exports = {
    name: 'yarn-plugin-run-tool',
    factory: require => {
        const {Option, UsageError} = require('clipanion');
        const {BaseCommand} = require('@yarnpkg/cli');
        const {ppath, npath} = require('@yarnpkg/fslib');
        const {Configuration, Project, scriptUtils, structUtils} = require('@yarnpkg/core');

        const yarnBin = process.env.COREPACK_ROOT
            ? npath.join(process.env.COREPACK_ROOT, `dist/yarn.js`)
            : process.argv[1];
        
        let projectTools;

        const initProjectTools = async project => {
            if (!projectTools) {
                const top = project.topLevelWorkspace;
                const toolDir = top.manifest.raw['toolDir'];
                if (!toolDir) {
                    throw new UsageError(`runtool needs "toolDir" defined in toplevel package.json`);
                } else if (typeof toolDir !== 'string') {
                    throw new UsageError(`runtool expects "toolDir" in toplevel package.json to be a string, got ${typeof toolDir}`);
                }
                const absoluteToolDirPath = ppath.resolve(top.cwd, npath.toPortablePath(toolDir));
                let toolsWorkspaceByPath, toolsWorkspaceByName;
                for (const w of project.workspaces) {
                    if (w.cwd === absoluteToolDirPath) {
                        toolsWorkspaceByPath = w;
                    }
                    if (w.manifest.raw.name === toolDir) {
                        toolsWorkspaceByName = w;
                    }
                }
                const toolsWorkspace = toolsWorkspaceByName ?? toolsWorkspaceByPath;
                if (!toolsWorkspace) {
                    throw new UsageError(`runtool: unable to find workspace specified by "toolDir:" "${toolDir}"`);
                }
                projectTools = {toolsWorkspace};
            }
            return projectTools;
        };

        class RunToolBaseCommand extends BaseCommand {
            async init() {
                const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
                const {project} = await Project.find(configuration, this.context.cwd);
                await project.restoreInstallState();
                const {toolsWorkspace} = await initProjectTools(project);
                const {locator: toolsLocator} = await Project.find(configuration, toolsWorkspace.cwd);
                const toolScripts = toolsWorkspace.manifest.scripts;
                const toolBinaries = await scriptUtils.getPackageAccessibleBinaries(toolsLocator, {project});

                return {configuration, project, toolsLocator, toolScripts, toolBinaries};
            }
        }

        class RunToolCommand extends RunToolBaseCommand {
            static paths = [
                [`runtool`],
            ];

            scriptName = Option.String();
            args = Option.Proxy();

            async execute() {
                const {configuration, project, toolsLocator, toolScripts, toolBinaries} = await this.init();
                if (toolScripts.has(this.scriptName)) {
                    return await scriptUtils.executePackageScript(toolsLocator, this.scriptName, this.args, {
                        cwd: this.context.cwd,
                        project,
                        stdin: this.context.stdin, 
                        stdout: this.context.stdout, 
                        stderr: this.context.stderr
                    });

                } else if (toolBinaries.has(this.scriptName)) {
                    return await scriptUtils.executePackageAccessibleBinary(toolsLocator, this.scriptName, this.args, {
                        cwd: this.context.cwd,
                        project,
                        stdin: this.context.stdin,
                        stdout: this.context.stdout,
                        stderr: this.context.stderr,
                        nodeArgs: [],
                        packageAccessibleBinaries: toolBinaries
                    });

                } else {
                    throw new UsageError(`runtool: couldn't find script or binary: ${this.scriptName} in ${structUtils.prettyLocator(configuration, toolsLocator)})`);
                }
            }
        }

        class RunToolIndexCommand extends RunToolBaseCommand {
            static paths = [
                [`runtool`],
            ];

            async execute() {
                const {toolScripts, toolBinaries} = await this.init();
                const scriptNames = [...toolScripts.keys()];
                for (const binaryName of toolBinaries.keys()) {
                    if (!toolScripts.has(binaryName)) {
                        scriptNames.push(binaryName);
                    }
                }
                for (const s of scriptNames) {
                    this.context.stdout.write(`${s}\n`);
                }
            }
        }

        return {commands: [RunToolCommand, RunToolIndexCommand], hooks: {setupScriptEnvironment}};

        async function setupScriptEnvironment(project, env, makePathWrapper) {
            const {toolsWorkspace} = await initProjectTools(project);
            env.toolDir = toolsWorkspace.cwd;
            makePathWrapper('runtool', process.execPath, [yarnBin, 'runtool']);
        }
    }
};
