import sgMail from '@sendgrid/mail';
import type { Meeting } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work.');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface EmailOptions {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not set');
    return false;
  }

  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@agentda.com';
    await sgMail.send({
      to,
      from: fromEmail,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendMeetingCancellation(meeting: Meeting, participants: string[]): Promise<boolean> {
  const subject = `Meeting Cancelled: ${meeting.title}`;
  const meetingDate = meeting.date instanceof Timestamp ? meeting.date.toDate() : new Date(meeting.date);
  const formattedDate = formatDate(meetingDate);
  const formattedTime = formatTime(meetingDate);

  const text = `
    The following meeting has been cancelled:
    
    Title: ${meeting.title}
    Date: ${formattedDate}
    Time: ${formattedTime}
    Duration: ${meeting.duration} minutes
    ${meeting.description ? `\nDescription: ${meeting.description}` : ''}
    
    If you have any questions, please contact the meeting organizer.
  `;

  const html = `
    <h2>Meeting Cancelled</h2>
    <p>The following meeting has been cancelled:</p>
    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
      <p><strong>Title:</strong> ${meeting.title}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Duration:</strong> ${meeting.duration} minutes</p>
      ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
    </div>
    <p>If you have any questions, please contact the meeting organizer.</p>
  `;

  return sendEmail({ to: participants, subject, text, html });
}

export async function sendMeetingRescheduleRequest(
  meeting: Meeting,
  participants: string[],
  reschedulingLink: string
): Promise<boolean> {
  const subject = `Meeting Rescheduling Request: ${meeting.title}`;
  const meetingDate = meeting.date instanceof Timestamp ? meeting.date.toDate() : new Date(meeting.date);
  const formattedDate = formatDate(meetingDate);
  const formattedTime = formatTime(meetingDate);

  const text = `
    A meeting needs to be rescheduled:
    
    Title: ${meeting.title}
    Original Date: ${formattedDate}
    Original Time: ${formattedTime}
    
    Please use the following link to select a new time:
    ${reschedulingLink}
  `;

  const html = `
    <h2>Meeting Rescheduling Request</h2>
    <p>A meeting needs to be rescheduled:</p>
    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
      <p><strong>Title:</strong> ${meeting.title}</p>
      <p><strong>Original Date:</strong> ${formattedDate}</p>
      <p><strong>Original Time:</strong> ${formattedTime}</p>
    </div>
    <p>Please use the following link to select a new time:</p>
    <p><a href="${reschedulingLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Select New Time</a></p>
  `;

  return sendEmail({ to: participants, subject, text, html });
}

export async function sendMeetingConfirmation(
  meeting: Meeting,
  participants: string[]
): Promise<boolean> {
  const subject = `Meeting Scheduled: ${meeting.title}`;
  const meetingDate = meeting.date instanceof Timestamp ? meeting.date.toDate() : new Date(meeting.date);
  const formattedDate = formatDate(meetingDate);
  const formattedTime = formatTime(meetingDate);

  const text = `
    A new meeting has been scheduled:
    
    Title: ${meeting.title}
    Date: ${formattedDate}
    Time: ${formattedTime}
    Duration: ${meeting.duration} minutes
    ${meeting.description ? `\nDescription: ${meeting.description}` : ''}
  `;

  const html = `
    <h2>Meeting Scheduled</h2>
    <p>A new meeting has been scheduled:</p>
    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
      <p><strong>Title:</strong> ${meeting.title}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Duration:</strong> ${meeting.duration} minutes</p>
      ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
    </div>
    <p>The calendar invitation will be attached to this email.</p>
  `;

  return sendEmail({ to: participants, subject, text, html });
} 