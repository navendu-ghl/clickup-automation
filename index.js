const ClickUpService = require('./services/clickupService');
const AutomationManager = require('./automation-manager');
const ConfigManager = require('./config/config-manager');
const { TaskAutomationContext, GeneralAutomationContext } = require('./config/automation-context');
const generalAutomationConfig = require('./config/general-automation-config');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.all('/run', handleTaskAutomation);

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});

async function handleTaskAutomation(req, res) {
    const { taskId, action } = req.query;
    // const taskId = '86cygabpu';
    // const action = 'create-sub-tasks';
    if (!taskId || !action) {
        console.error("Task ID and action are required for task automation");
        res.status(400).send('Task ID and action are required for task automation');
        return;
    }

    try {
        const clickupService = new ClickUpService();
        const task = await clickupService.getTaskDetailsV2(taskId);
        const context = new TaskAutomationContext(task);
        const results = await runAutomation(context, action);
        console.log(results);
        res.send(`Automation run successfully`);
        return;
    } catch (error) {
        console.error('Error running task automation:', error.message);
        res.status(500).send('Error running task automation');
        return;
    }
}

async function handleGeneralAutomation(action, config = generalAutomationConfig) {
    if (!action) {
        console.error("Action is required for general automation");
        return;
    }

    try {
        const context = new GeneralAutomationContext(config);
        return runAutomation(context, action);
    } catch (error) {
        console.error('Error running general automation:', error.message);
        throw error;
    }
}

async function runAutomation(context, action) {
    console.log("Running automation", action);
    const configManager = new ConfigManager(context);
    configManager.enableAutomation(action);
    const automationManager = new AutomationManager(configManager.getConfig());
    return automationManager.runAutomations(context);
}

// handleTaskAutomation()