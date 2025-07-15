const nodemailer = require('nodemailer');
const { monitoringService } = require('./monitoringService');

/**
 * Alert Service
 * Handles error tracking, notifications, and alerting
 */

class AlertService {
  constructor() {
    this.emailTransporter = null;
    this.webhookUrls = {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL,
      teams: process.env.TEAMS_WEBHOOK_URL
    };
    
    this.alertRules = {
      critical: {
        enabled: true,
        channels: ['email', 'slack', 'discord'],
        conditions: [
          'error_rate > 0.1',
          'response_time > 10000',
          'memory_usage > 0.95',
          'database_connection_lost'
        ]
      },
      warning: {
        enabled: true,
        channels: ['slack'],
        conditions: [
          'error_rate > 0.05',
          'response_time > 5000',
          'memory_usage > 0.8',
          'cpu_usage > 0.9'
        ]
      },
      info: {
        enabled: true,
        channels: ['slack'],
        conditions: [
          'deployment_started',
          'deployment_completed',
          'backup_completed'
        ]
      }
    };

    this.initializeEmailTransporter();
    this.setupAlertHandlers();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // Setup alert handlers
  setupAlertHandlers() {
    // Listen to monitoring service events
    monitoringService.on('error', (error) => {
      this.handleError(error);
    });

    monitoringService.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    monitoringService.on('system_metrics', (metrics) => {
      this.checkSystemAlerts(metrics);
    });
  }

  // Handle error events
  async handleError(error) {
    const alertData = {
      type: 'error',
      severity: this.getErrorSeverity(error),
      title: `Application Error: ${error.type || 'Unknown'}`,
      message: error.message,
      details: {
        stack: error.stack,
        context: error.context,
        timestamp: error.timestamp
      },
      metadata: {
        environment: process.env.NODE_ENV,
        application: 'couple-chat-app',
        service: 'backend'
      }
    };

    await this.sendAlert(alertData);
  }

  // Handle alert events
  async handleAlert(alert) {
    const alertData = {
      type: 'performance',
      severity: alert.severity,
      title: `Performance Alert: ${alert.type}`,
      message: alert.message,
      details: {
        threshold: alert.threshold,
        currentValue: alert.value,
        timestamp: alert.timestamp
      },
      metadata: {
        environment: process.env.NODE_ENV,
        application: 'couple-chat-app',
        service: 'backend'
      }
    };

    await this.sendAlert(alertData);
  }

  // Check system metrics for alerts
  checkSystemAlerts(metrics) {
    const alerts = [];

    // Check memory usage
    if (metrics.memory.heapUsed && metrics.memory.heapTotal) {
      const memoryUsage = metrics.memory.heapUsed / metrics.memory.heapTotal;
      if (memoryUsage > 0.9) {
        alerts.push({
          type: 'system',
          severity: 'critical',
          title: 'Critical Memory Usage',
          message: `Memory usage at ${(memoryUsage * 100).toFixed(2)}%`,
          details: { memoryUsage, metrics: metrics.memory }
        });
      }
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));
  }

  // Send alert to configured channels
  async sendAlert(alertData) {
    const rule = this.alertRules[alertData.severity];
    
    if (!rule || !rule.enabled) {
      return;
    }

    const promises = [];

    if (rule.channels.includes('email') && this.emailTransporter) {
      promises.push(this.sendEmailAlert(alertData));
    }

    if (rule.channels.includes('slack') && this.webhookUrls.slack) {
      promises.push(this.sendSlackAlert(alertData));
    }

    if (rule.channels.includes('discord') && this.webhookUrls.discord) {
      promises.push(this.sendDiscordAlert(alertData));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // Send email alert
  async sendEmailAlert(alertData) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${this.getSeverityColor(alertData.severity)}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">${alertData.title}</h2>
          <p style="margin: 5px 0 0 0;">Severity: ${alertData.severity.toUpperCase()}</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
          <h3>Details</h3>
          <p><strong>Message:</strong> ${alertData.message}</p>
          <p><strong>Time:</strong> ${alertData.details.timestamp}</p>
          <p><strong>Environment:</strong> ${alertData.metadata.environment}</p>
          
          ${alertData.details.stack ? `
            <h4>Stack Trace</h4>
            <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto;">${alertData.details.stack}</pre>
          ` : ''}
          
          ${alertData.details.context ? `
            <h4>Context</h4>
            <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(alertData.details.context, null, 2)}</pre>
          ` : ''}
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: process.env.ALERT_EMAIL || process.env.SMTP_USER,
      subject: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
      html: emailHtml
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Send Slack alert
  async sendSlackAlert(alertData) {
    const slackPayload = {
      text: alertData.title,
      attachments: [
        {
          color: this.getSeverityColor(alertData.severity),
          fields: [
            {
              title: 'Message',
              value: alertData.message,
              short: false
            },
            {
              title: 'Severity',
              value: alertData.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Environment',
              value: alertData.metadata.environment,
              short: true
            },
            {
              title: 'Time',
              value: alertData.details.timestamp,
              short: true
            }
          ]
        }
      ]
    };

    const response = await fetch(this.webhookUrls.slack, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  // Send Discord alert
  async sendDiscordAlert(alertData) {
    const discordPayload = {
      embeds: [
        {
          title: alertData.title,
          description: alertData.message,
          color: parseInt(this.getSeverityColor(alertData.severity).replace('#', ''), 16),
          fields: [
            {
              name: 'Severity',
              value: alertData.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Environment',
              value: alertData.metadata.environment,
              inline: true
            },
            {
              name: 'Time',
              value: alertData.details.timestamp,
              inline: false
            }
          ],
          timestamp: alertData.details.timestamp
        }
      ]
    };

    const response = await fetch(this.webhookUrls.discord, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discordPayload)
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.statusText}`);
    }
  }

  // Get error severity based on error type
  getErrorSeverity(error) {
    if (error.type === 'DatabaseError' || error.type === 'SecurityError') {
      return 'critical';
    }
    if (error.type === 'ValidationError' || error.type === 'AuthenticationError') {
      return 'warning';
    }
    return 'info';
  }

  // Get severity color for notifications
  getSeverityColor(severity) {
    const colors = {
      critical: '#ff0000',
      warning: '#ffa500',
      info: '#0066cc'
    };
    return colors[severity] || '#333333';
  }

  // Manual alert trigger for testing
  async triggerTestAlert() {
    const testAlert = {
      type: 'test',
      severity: 'info',
      title: 'Test Alert',
      message: 'This is a test alert to verify the alerting system is working correctly.',
      details: {
        timestamp: new Date().toISOString(),
        test: true
      },
      metadata: {
        environment: process.env.NODE_ENV,
        application: 'couple-chat-app',
        service: 'backend'
      }
    };

    await this.sendAlert(testAlert);
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = {
  alertService
};