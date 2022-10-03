module.exports = {
    name: 'plugin-no-external-scripts',
    factory: require => ({
        hooks: {
            wrapScriptExecution: (executor, project, locator, scriptName, {script, args, cwd, env, stdin, stdout, stderr}) => {
                if (project.workspacesByIdent.has(locator.identHash)) {
                    return executor;
                } else {
                    return () => reportWarning({require, configuration: project.configuration, locator, scriptName, script})
                    .then(() => 0); // return 0 to suppress yarn error ➤ YN0009: │ ... couldn't be built successfully (exit code 1, logs can be found here: ...)
                }
            }
        }
    })
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
    return `attempt to run external script: [${formattedScriptName}] from package ${formattedPackageName}: ${commandLine}; not allowed by plugin-no-external-scripts`;
}
