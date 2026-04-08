import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: { type: string; text: string }[];
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack || err.message;
  }
  return String(err);
}

async function sendToSlack(level: LogLevel, context: string, detail: string) {
  const { webhookUrl } = env.slack;
  if (!webhookUrl) return;

  const emoji = level === 'error' ? ':rotating_light:' : level === 'warn' ? ':warning:' : ':information_source:';

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *[${level.toUpperCase()}] ${context}*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${detail.slice(0, 2900)}\`\`\``,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*Env:* ${env.nodeEnv} | *Time:* ${new Date().toISOString()}` },
      ],
    },
  ];

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch {
    // Avoid infinite loop — just log to console if Slack fails
    console.error('[Logger] Failed to send to Slack');
  }
}

export const logger = {
  info(context: string, message: string) {
    console.log(`[${context}]`, message);
  },

  warn(context: string, message: string) {
    console.warn(`[${context}]`, message);
    if (env.isProd) {
      sendToSlack('warn', context, message);
    }
  },

  error(context: string, err: unknown) {
    const detail = formatError(err);
    console.error(`[${context}]`, detail);
    if (env.isProd) {
      sendToSlack('error', context, detail);
    }
  },
};
