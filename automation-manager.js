const { sendLog } = require('./es-helper');
const { TaskAutomationContext } = require('./config/automation-context');

class AutomationManager {
    constructor(config) {
        this.config = config;
        this.automations = new Map();
        this.registerAutomations();
    }

    registerAutomations() {
        // Register all available automations
        const _config = Object.values(this.config)
        _config.forEach(config => {
            if (config.enabled) {
                const AutomationClass = require(`./automations/${config.automationFile}`);
                const automation = new AutomationClass(config);
                this.automations.set(config.automationFile, automation);
            }
        })
    }

    async runAutomations(context) {
        const results = [];
        const errors = [];
        const isTaskAutomation = context instanceof TaskAutomationContext;

        for (const automation of this.automations.values()) {
            try {
                const task = isTaskAutomation ? context.getTask() : null;
                const isValid = isTaskAutomation ? await automation.validate(task) : true;
                if (!isValid) {
                    console.warn(`Automation ${automation.name} is not valid`);
                    continue;
                } else {
                    console.log(`Automation ${automation.name} is valid`);
                    await automation.run(context);
                    sendLog({
                        automation: automation.config.id,
                        manualActionCount: automation.config.metadata.manualActionCount || 0,
                        taskId: isTaskAutomation ? task.id : 'general',
                        status: 'success'
                    });
                    results.push({ name: automation.name, status: 'success' });
                }
            } catch (error) {
                console.error(`Error running automation ${automation.name}:`, error);
                sendLog({
                    automation: automation.config.id,
                    manualActionCount: automation.config.metadata.manualActionCount || 0,
                    taskId: isTaskAutomation ? task.id : 'general',
                    status: 'error',
                    error: error.message
                });
                errors.push({ name: automation.name, error: error.message });
            }
        }

        return { results, errors };
    }
}

module.exports = AutomationManager; 