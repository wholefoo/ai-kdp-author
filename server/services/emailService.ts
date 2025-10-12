import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export class EmailService {
  
  async sendWelcomeEmail(userEmail: string, userName: string) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: 'Welcome to AI KDP Author! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to AI KDP Author!</h1>
            <p>Hi ${userName},</p>
            <p>Thank you for joining AI KDP Author! We're excited to help you create amazing novels for Amazon KDP.</p>
            
            <h2 style="color: #2563eb;">What you can do:</h2>
            <ul>
              <li>Generate complete novels (50,000-80,000 words)</li>
              <li>Create professional audiobooks</li>
              <li>Analyze and improve your manuscripts</li>
              <li>Export in multiple formats (DOCX, PDF, TXT, Markdown)</li>
            </ul>
            
            <h2 style="color: #2563eb;">Getting Started:</h2>
            <p>Head over to the Create Hub to start generating your first novel. Our AI will guide you through the process!</p>
            
            <p>If you have any questions, we're here to help.</p>
            
            <p>Happy writing!<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  async sendSubscriptionConfirmation(
    userEmail: string, 
    userName: string, 
    tier: string, 
    amount: number,
    billingPeriod: string = 'monthly'
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      const tierNames: Record<string, string> = {
        'basic': 'Basic',
        'pro': 'Pro',
        'premium': 'Premium',
        'founders': 'Founders (Lifetime)'
      };
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: `Subscription Confirmed - ${tierNames[tier]} Plan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Subscription Confirmed! 🎊</h1>
            <p>Hi ${userName},</p>
            <p>Your subscription to AI KDP Author has been successfully activated!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #2563eb;">Subscription Details</h2>
              <p><strong>Plan:</strong> ${tierNames[tier]}</p>
              <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)} ${tier === 'founders' ? '(one-time)' : `/ ${billingPeriod}`}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            
            <h2 style="color: #2563eb;">What's Next?</h2>
            <p>You now have full access to all features. Start creating your novels right away!</p>
            
            <p>Thank you for choosing AI KDP Author!</p>
            
            <p>Best regards,<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Subscription confirmation sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send subscription confirmation:', error);
    }
  }

  async sendNovelCompletionEmail(
    userEmail: string, 
    userName: string, 
    novelTitle: string,
    novelId: string,
    wordCount: number
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: `Your Novel "${novelTitle}" is Ready! 📚`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Your Novel is Complete! 🎉</h1>
            <p>Hi ${userName},</p>
            <p>Great news! Your novel "<strong>${novelTitle}</strong>" has been successfully generated.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #2563eb;">Novel Details</h2>
              <p><strong>Title:</strong> ${novelTitle}</p>
              <p><strong>Word Count:</strong> ${wordCount.toLocaleString()} words</p>
              <p><strong>Status:</strong> Complete</p>
            </div>
            
            <h2 style="color: #2563eb;">What's Next?</h2>
            <p>You can now:</p>
            <ul>
              <li>Download your novel in multiple formats (DOCX, PDF, TXT, Markdown)</li>
              <li>Generate an audiobook version</li>
              <li>Analyze and improve the manuscript</li>
              <li>Publish to Amazon KDP</li>
            </ul>
            
            <p>Log in to your dashboard to access your completed novel.</p>
            
            <p>Happy publishing!<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Novel completion email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send novel completion email:', error);
    }
  }

  async sendAudiobookReadyEmail(
    userEmail: string, 
    userName: string, 
    novelTitle: string,
    audiobookId: string,
    duration: string
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: `Your Audiobook "${novelTitle}" is Ready! 🎧`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Your Audiobook is Ready! 🎧</h1>
            <p>Hi ${userName},</p>
            <p>Exciting news! The audiobook for "<strong>${novelTitle}</strong>" has been successfully generated.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #2563eb;">Audiobook Details</h2>
              <p><strong>Title:</strong> ${novelTitle}</p>
              <p><strong>Duration:</strong> ${duration}</p>
              <p><strong>Status:</strong> Ready for download</p>
            </div>
            
            <h2 style="color: #2563eb;">Download Your Audiobook</h2>
            <p>Log in to your dashboard to download the complete audiobook files. You can download:</p>
            <ul>
              <li>Individual chapter audio files</li>
              <li>Complete audiobook as ZIP archive</li>
              <li>Chunked downloads for large files</li>
            </ul>
            
            <p>Your audiobook is ready to publish!</p>
            
            <p>Best regards,<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Audiobook ready email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send audiobook ready email:', error);
    }
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string, resetUrl: string) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: 'Reset Your Password - AI KDP Author',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Password Reset Request</h1>
            <p>We received a request to reset your password for AI KDP Author.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; word-break: break-all;">${resetUrl}</p>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            
            <p>Best regards,<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  async sendUpgradePromptEmail(
    userEmail: string, 
    userName: string,
    currentUsage: number,
    limit: number
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: 'Unlock More Novels - Upgrade Your Plan',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">You're Almost Out of Novels! 📚</h1>
            <p>Hi ${userName},</p>
            <p>You've used <strong>${currentUsage}</strong> out of your <strong>${limit}</strong> monthly novels.</p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Don't let your creativity stop here!</strong></p>
              <p style="margin: 10px 0 0 0;">Upgrade to unlock more novels and premium features.</p>
            </div>
            
            <h2 style="color: #2563eb;">Upgrade Benefits:</h2>
            <ul>
              <li><strong>Pro Plan:</strong> 20 novels/month + all features</li>
              <li><strong>Premium Plan:</strong> 50 novels/month + priority support</li>
              <li><strong>Founders Plan:</strong> 100 novels/month + lifetime access</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.REPLIT_DEPLOYMENT ? 'https://' + process.env.REPLIT_DEPLOYMENT : 'http://localhost:5000'}/subscribe" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                View Plans & Upgrade
              </a>
            </div>
            
            <p>Keep creating amazing content!</p>
            
            <p>Best regards,<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Upgrade prompt email sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send upgrade prompt email:', error);
    }
  }

  async sendMonthlyUsageSummary(
    userEmail: string,
    userName: string,
    stats: {
      novelsGenerated: number;
      audiobooksCreated: number;
      wordsWritten: number;
      tier: string;
      monthlyLimit: number;
    }
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      const tierNames: Record<string, string> = {
        'trial': 'Trial',
        'basic': 'Basic',
        'pro': 'Pro',
        'premium': 'Premium',
        'founders': 'Founders'
      };
      
      await client.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: 'Your Monthly AI KDP Author Summary 📊',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Your Monthly Summary 📊</h1>
            <p>Hi ${userName},</p>
            <p>Here's what you accomplished this month with AI KDP Author:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #2563eb;">Monthly Stats</h2>
              <p><strong>Novels Generated:</strong> ${stats.novelsGenerated} / ${stats.monthlyLimit}</p>
              <p><strong>Audiobooks Created:</strong> ${stats.audiobooksCreated}</p>
              <p><strong>Total Words Written:</strong> ${stats.wordsWritten.toLocaleString()}</p>
              <p><strong>Current Plan:</strong> ${tierNames[stats.tier]}</p>
            </div>
            
            ${stats.novelsGenerated >= stats.monthlyLimit * 0.8 ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Heads up!</strong> You've used ${Math.round((stats.novelsGenerated / stats.monthlyLimit) * 100)}% of your monthly limit.</p>
                <p style="margin: 10px 0 0 0;">Consider upgrading to continue creating without limits.</p>
              </div>
            ` : ''}
            
            <h2 style="color: #2563eb;">Keep Going!</h2>
            <p>Your creative journey is just getting started. Log in to continue writing your next bestseller.</p>
            
            <p>Happy writing!<br>
            The AI KDP Author Team</p>
          </div>
        `
      });
      
      console.log(`✅ Monthly usage summary sent to ${userEmail}`);
    } catch (error) {
      console.error('Failed to send monthly usage summary:', error);
    }
  }
}

export const emailService = new EmailService();
