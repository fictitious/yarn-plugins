/*
do not run any scripts during `yarn install`

this is roughly equivalent to having `enableScripts: false` in `.yarnrc.yml` together with running `yarn install --mode=skip-build`

the latter disables pre/post/install scripts in packages that are part of the monorepo (a.k.a. workspaces) as well
*/

/* 
hook sequence:
    - validateWorkspace for each workspace
    - validateProject
    - run pre/post/install scripts with wrapScriptExecution
    - afterAllInstalled
*/

module.exports = {
    name: 'plugin-no-install-scripts',
    factory: require => {
        let installing = false;
        return {
            hooks: {
                validateProject: (project, report) => {
                    installing = true;
                },
                afterAllInstalled: (project, options) => {
                    installing = false;
                },
                wrapScriptExecution: (executor, project, locator, scriptName, {script, args, cwd, env, stdin, stdout, stderr}) => {
                    if (!installing) {
                        return executor;
                    } else {
                        return () => reportWarning({require, configuration: project.configuration, locator, scriptName, script})
                        .then(() => 0) // return 0 to suppress yarn error ➤ YN0009: │ package@workspace:packages/... couldn't be built successfully (exit code 1, logs can be found here: ...)
                    }
                }
            }
        };
    }
};

function reportWarning({require, configuration, locator, scriptName, script}) {
    const {StreamReport, MessageName} = require('@yarnpkg/core');
    return StreamReport.start(
        {configuration, includeFooter: false, stdout: process.stdout},
        report => report.reportWarning(MessageName.UNNAMED, composeWarningMessage({require, configuration, locator, scriptName, script}))
    );
}

function composeWarningMessage({require, configuration, locator, scriptName, script}) {
    const {formatUtils} = require('@yarnpkg/core');
    const formattedScriptName = formatUtils.applyColor(configuration, scriptName, formatUtils.Type.NAME);
    const commandLine = formatUtils.applyColor(configuration, script, formatUtils.Type.CODE);
    const formattedScope = locator.scope ? `${formatUtils.applyColor(configuration, locator.scope, formatUtils.Type.SCOPE)}/` : '';
    const formattedPackageName = `${formattedScope}${formatUtils.applyColor(configuration, locator.name, formatUtils.Type.NAME)}`;
    return  `attempt to run script during yarn install: [${formattedScriptName}] in package ${formattedPackageName}: ${commandLine}; not allowed by plugin-no-install-scripts`;
}
