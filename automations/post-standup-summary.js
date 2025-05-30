const AutomationBase = require("../automation-base");
const ClickUpService = require("../services/clickupService");
const SlackService = require("../services/slackService");
const slackData = require("../data/slack.json");

class PostStandupSummaryAutomation extends AutomationBase {
  constructor(config) {
    super(config);
    this.name = config.name;
    this.team = config.then.data.team;
    this.mode = config.then.data.mode;
    this.clickupService = new ClickUpService({ team: this.team });
    this.slackService = new SlackService({ team: this.team });
  }

  async run(context) {
    try {
      const isCorrectAutomation = this.config.automationFile === "post-standup-summary";

      if (!isCorrectAutomation) {
        throw new Error("Not configured to run post-standup-summary");
      }

      // Get task summary from ClickUp
      const currentSprintId = await this.clickupService.fetchCurrentSprint();
      console.log({ currentSprintId });
      const summary = await this.clickupService.summarizeTasksForStandup(currentSprintId);

      const parentMessage = this.slackService.getStandupSummaryParentMessage();
      const messages = this.slackService.formatStandupSummaryForSlack(summary);

      if (this.mode === 'publish') {
        console.log('Publishing standup summary')
        await this.publishStandupSummary({ parentMessage, messages });
      } else if (this.mode === 'review') {
        console.log('Sending standup summary for review')
        await this.sendStandupSummaryForReview({ parentMessage, messages });
      }

      console.log("Standup summary posted successfully!");
    } catch (error) {
      console.error("Error posting standup summary:", error);
      throw error;
    }
  }

  async sendStandupSummaryForReview({ parentMessage, messages }) {
    try {
      const userId = slackData[this.team].reviewer;
      if (!userId) {
        throw new Error("sendStandupSummaryForReview: User ID not found");
      }
      const channelId = await this.slackService.openDmChannel(userId);
      console.log({ userId, channelId });
      const response = await this.slackService.postMessage({ message: parentMessage, channelId });
      if (response.ok && response.ts) {
        for (const message of messages) {
          await this.slackService.postMessage({ message, channelId, threadId: response.ts });
        }
      }
    } catch (error) {
      console.error("Error sending standup summary for review:", error);
      throw error;
    }
  }

  async publishStandupSummary({ parentMessage, messages }) {
    try {
      const channelId = slackData[this.team].internalChannel;
      if (!channelId) {
        throw new Error("publishStandupSummary: Channel ID not found");
      }
      const response = await this.slackService.postMessage({ message: parentMessage, channelId });
      if (response.ok && response.ts) {
        for (const message of messages) {
          await this.slackService.postMessage({ message, channelId, threadId: response.ts });
        }
      }
    } catch (error) {
      console.error("Error publishing standup summary:", error);
      throw error;
    }
  }
}

module.exports = PostStandupSummaryAutomation;
