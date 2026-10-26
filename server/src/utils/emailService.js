const nodemailer = require('nodemailer');
const logger = require('./logger');
const Notification = require('../models/Notification');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured. Email notifications will be disabled.');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, notificationId = null }) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn(`Email not sent (no SMTP config): ${subject} to ${to}`);
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        emailError: 'SMTP not configured',
        emailAttempts: 1,
      });
    }
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'InternFlow AI <noreply@internflow.com>',
      to,
      subject,
      html,
    });

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        emailSent: true,
        emailSentAt: new Date(),
        emailAttempts: 1,
      });
    }

    logger.info(`Email sent: "${subject}" to ${to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Email failed: "${subject}" to ${to}: ${error.message}`);
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        emailError: error.message,
        $inc: { emailAttempts: 1 },
      });
    }
    return { success: false, error: error.message };
  }
};

// ==== EMAIL TEMPLATES ====

const taskAssignmentTemplate = (data) => {
  const {
    internName, taskTitle, projectName, moduleName, description,
    technologies, deadline, deliverables, mentorName, reviewDate,
    meetingLink, aiExplanation, dashboardUrl,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Task Assigned</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #4a90d9 100%); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
    .content { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 600; color: #1e3a5f; margin-bottom: 8px; }
    .intro { color: #666; margin-bottom: 24px; line-height: 1.6; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4a90d9; margin-bottom: 10px; border-bottom: 2px solid #e8f0fa; padding-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { background: #f8fafd; padding: 12px; border-radius: 8px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .info-value { font-weight: 600; color: #333; }
    .deadline { color: #e74c3c !important; }
    .explanation { background: #f8fafd; border-left: 4px solid #4a90d9; padding: 20px; border-radius: 0 8px 8px 0; white-space: pre-wrap; line-height: 1.7; font-size: 14px; }
    .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #1e3a5f, #4a90d9); color: #fff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 24px 0; }
    .footer { background: #f4f6f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #999; }
    .tech-tag { display: inline-block; background: #e8f0fa; color: #1e3a5f; padding: 3px 10px; border-radius: 12px; font-size: 12px; margin: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 New Task Assigned</h1>
      <p>InternFlow AI — Intelligent Internship Management Platform</p>
      <span class="badge">Task Assignment Notification</span>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${internName}!</div>
      <p class="intro">A new task has been assigned to you. Please review the details below carefully and begin working on it before the deadline.</p>
      
      <div class="section">
        <div class="section-title">📋 Task Information</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Task Title</div><div class="info-value">${taskTitle}</div></div>
          <div class="info-item"><div class="info-label">Project</div><div class="info-value">${projectName}</div></div>
          ${moduleName ? `<div class="info-item"><div class="info-label">Module</div><div class="info-value">${moduleName}</div></div>` : ''}
          <div class="info-item"><div class="info-label">Deadline</div><div class="info-value deadline">⏰ ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
          <div class="info-item"><div class="info-label">Assigned Mentor</div><div class="info-value">👨‍💼 ${mentorName}</div></div>
          ${reviewDate ? `<div class="info-item"><div class="info-label">Review Date</div><div class="info-value">📅 ${new Date(reviewDate).toLocaleString()}</div></div>` : ''}
        </div>
      </div>

      ${technologies && technologies.length > 0 ? `
      <div class="section">
        <div class="section-title">🛠️ Technologies to Use</div>
        <div>${technologies.map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>
      </div>` : ''}

      ${deliverables ? `
      <div class="section">
        <div class="section-title">📦 Expected Deliverables</div>
        <p style="color:#555;line-height:1.6;">${deliverables}</p>
      </div>` : ''}

      ${aiExplanation ? `
      <div class="section">
        <div class="section-title">💡 Detailed Task Explanation</div>
        <div class="explanation">${aiExplanation}</div>
      </div>` : ''}

      ${meetingLink ? `
      <div class="section">
        <div class="section-title">🎯 Review Meeting</div>
        <p>Your review meeting link: <a href="${meetingLink}" style="color:#4a90d9;">${meetingLink}</a></p>
      </div>` : ''}

      <a href="${dashboardUrl || '#'}" class="cta-btn">📊 View Your Dashboard</a>
    </div>
    <div class="footer">
      <p>This email was sent by <strong>InternFlow AI</strong>. Do not reply to this email.</p>
      <p>If you have questions, contact your mentor: <strong>${mentorName}</strong></p>
    </div>
  </div>
</body>
</html>`;
};

const feedbackTemplate = (data) => {
  const { internName, taskTitle, mentorName, reviewStage, aiStructuredFeedback, rating, dashboardUrl } = data;
  const f = aiStructuredFeedback || {};

  const renderList = (items, icon = '•') =>
    items && items.length > 0
      ? `<ul style="padding-left:20px;line-height:1.8;">${items.map(i => `<li>${icon} ${i}</li>`).join('')}</ul>`
      : '<p style="color:#999;">None noted.</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Review Feedback</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .container { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2d6a4f 0%, #52b788 100%); padding: 32px; text-align: center; color: #fff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 32px; }
    .section { margin-bottom: 24px; background: #f8fafd; border-radius: 8px; padding: 16px; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
    .green { color: #2d6a4f; border-left: 4px solid #52b788; }
    .red { color: #c0392b; border-left: 4px solid #e74c3c; }
    .blue { color: #1e3a5f; border-left: 4px solid #4a90d9; }
    .orange { color: #e67e22; border-left: 4px solid #f39c12; }
    .section.green, .section.red, .section.blue, .section.orange { padding-left: 16px; }
    .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #2d6a4f, #52b788); color: #fff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 24px 0; }
    .footer { background: #f4f6f9; padding: 20px; text-align: center; font-size: 12px; color: #999; }
    .rating { font-size: 24px; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Review Feedback Ready</h1>
      <p>Task: ${taskTitle} | Stage: ${reviewStage || 'Review'}</p>
    </div>
    <div class="content">
      <p>Hello <strong>${internName}</strong>,</p>
      <p>Your mentor <strong>${mentorName}</strong> has reviewed your work and provided detailed feedback. Please review the following and make the necessary improvements.</p>
      
      ${rating ? `<div style="text-align:center;"><div class="rating">${'⭐'.repeat(rating)}${'☆'.repeat(5-rating)}</div><p style="color:#666;">Overall Rating: ${rating}/5</p></div>` : ''}

      <div class="section green">
        <div class="section-title">✅ What You Completed</div>
        ${renderList(f.completedRequirements, '✅')}
      </div>
      
      <div class="section red">
        <div class="section-title">⚠️ Issues Found</div>
        ${renderList(f.identifiedProblems, '❌')}
      </div>
      
      <div class="section orange">
        <div class="section-title">📋 Missing Requirements</div>
        ${renderList(f.missingRequirements, '🔴')}
      </div>
      
      <div class="section blue">
        <div class="section-title">🔧 Recommended Corrections</div>
        ${renderList(f.recommendedCorrections, '🔧')}
      </div>
      
      <div class="section">
        <div class="section-title">📚 Step-by-Step Improvement Guide</div>
        ${renderList(f.improvementInstructions, '→')}
      </div>
      
      ${f.learningResources && f.learningResources.length > 0 ? `
      <div class="section">
        <div class="section-title">📖 Learning Resources</div>
        ${renderList(f.learningResources, '📌')}
      </div>` : ''}
      
      ${f.tasksBeforeNextReview && f.tasksBeforeNextReview.length > 0 ? `
      <div class="section" style="background:#fff8e1;">
        <div class="section-title">🎯 Tasks Before Next Review</div>
        ${renderList(f.tasksBeforeNextReview, '✏️')}
      </div>` : ''}

      <a href="${dashboardUrl || '#'}" class="cta-btn">📊 View Full Feedback on Dashboard</a>
    </div>
    <div class="footer">
      <p>This feedback was sent by <strong>InternFlow AI</strong> on behalf of <strong>${mentorName}</strong>.</p>
    </div>
  </div>
</body>
</html>`;
};

const meetingTemplate = (data) => {
  const { recipientName, internName, mentorName, taskTitle, stage, scheduledAt, duration, meetingLink, timezone, type, cancelReason } = data;

  const isCancel = type === 'cancelled';
  const isReschedule = type === 'rescheduled';
  const headerColor = isCancel ? '#c0392b' : isReschedule ? '#e67e22' : '#1e3a5f';
  const headerGrad = isCancel
    ? 'linear-gradient(135deg, #c0392b, #e74c3c)'
    : isReschedule
    ? 'linear-gradient(135deg, #e67e22, #f39c12)'
    : 'linear-gradient(135deg, #1e3a5f, #4a90d9)';

  const emoji = isCancel ? '❌' : isReschedule ? '🔄' : '📅';
  const title = isCancel ? 'Meeting Cancelled' : isReschedule ? 'Meeting Rescheduled' : 'Meeting Scheduled';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: ${headerGrad}; padding: 28px; text-align: center; color: #fff; }
    .content { padding: 28px; }
    .info-box { background: #f8fafd; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .info-label { color: #999; font-size: 13px; }
    .info-value { font-weight: 600; color: #333; }
    .btn { display: block; text-align: center; background: ${headerGrad}; color: #fff !important; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f4f6f9; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} ${title}</h1>
      <p>${isCancel ? 'Your scheduled meeting has been cancelled' : isReschedule ? 'Your meeting has been rescheduled' : 'A new review meeting has been scheduled'}</p>
    </div>
    <div class="content">
      <p>Hello <strong>${recipientName}</strong>,</p>
      ${isCancel
        ? `<p>The following review meeting has been <strong>cancelled</strong>.</p>${cancelReason ? `<p><strong>Reason:</strong> ${cancelReason}</p>` : ''}`
        : `<p>A review meeting has been ${isReschedule ? 'rescheduled' : 'scheduled'} for you.</p>`
      }
      
      <div class="info-box">
        <div class="info-row"><span class="info-label">Task</span><span class="info-value">${taskTitle}</span></div>
        <div class="info-row"><span class="info-label">Review Stage</span><span class="info-value">${stage}</span></div>
        <div class="info-row"><span class="info-label">Intern</span><span class="info-value">${internName}</span></div>
        <div class="info-row"><span class="info-label">Mentor</span><span class="info-value">${mentorName}</span></div>
        ${!isCancel ? `
        <div class="info-row"><span class="info-label">Date & Time</span><span class="info-value">${new Date(scheduledAt).toLocaleString()}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${duration} minutes</span></div>
        <div class="info-row"><span class="info-label">Timezone</span><span class="info-value">${timezone}</span></div>
        ${meetingLink ? `<div class="info-row"><span class="info-label">Meeting Link</span><a href="${meetingLink}" style="color:#4a90d9;">${meetingLink}</a></div>` : ''}
        ` : ''}
      </div>

      ${meetingLink && !isCancel ? `<a href="${meetingLink}" class="btn">🚀 Join Meeting</a>` : ''}
    </div>
    <div class="footer"><p>InternFlow AI — Intelligent Internship Management Platform</p></div>
  </div>
</body>
</html>`;
};

const deadlineReminderTemplate = (data) => {
  const { internName, taskTitle, deadline, hoursLeft, dashboardUrl } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Deadline Reminder</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #e67e22, #f39c12); padding: 28px; text-align: center; color: #fff; }
    .content { padding: 28px; }
    .deadline-box { background: #fff8e1; border: 2px solid #f39c12; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .hours { font-size: 48px; font-weight: 700; color: #e67e22; }
    .cta { display: block; text-align: center; background: linear-gradient(135deg, #e67e22, #f39c12); color: #fff !important; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f4f6f9; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Deadline Reminder</h1>
      <p>Your task deadline is approaching!</p>
    </div>
    <div class="content">
      <p>Hello <strong>${internName}</strong>,</p>
      <p>This is a reminder that your task deadline is approaching soon.</p>
      <p><strong>Task:</strong> ${taskTitle}</p>
      <div class="deadline-box">
        <div class="hours">${hoursLeft}h</div>
        <p>hours remaining until deadline</p>
        <p><strong>Due: ${new Date(deadline).toLocaleString()}</strong></p>
      </div>
      <p>Please make sure to submit your work before the deadline. If you need more time, contact your mentor immediately.</p>
      <a href="${dashboardUrl || '#'}" class="cta">📊 Submit Your Work</a>
    </div>
    <div class="footer"><p>InternFlow AI — Intelligent Internship Management Platform</p></div>
  </div>
</body>
</html>`;
};

module.exports = {
  sendEmail,
  templates: {
    taskAssignment: taskAssignmentTemplate,
    feedback: feedbackTemplate,
    meeting: meetingTemplate,
    deadlineReminder: deadlineReminderTemplate,
  },
};
