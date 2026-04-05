/**
 * queues/workers/email.worker.js
 * Processes all outbound emails asynchronously.
 * If Gmail SMTP is slow/down, requests are never blocked — the job is retried.
 */

const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { connection } = require('../index');
const logger = require('../../config/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

function startEmailWorker() {
  const worker = new Worker(
    'email',
    async (job) => {
      const { to, subject, text, html } = job.data;

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn(`Email skipped (no credentials): to=${to}, subject="${subject}"`);
        return; // Don't throw — treat as success so job is removed
      }

      await getTransporter().sendMail({
        from: `"CRM System" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || text,
      });

      logger.info(`Email sent → ${to} | "${subject}"`);
    },
    {
      connection,
      concurrency: 5, // send up to 5 emails in parallel
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      `Email job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`
    );
  });

  worker.on('error', (err) => {
    logger.error('Email worker error: ' + err.message);
  });

  logger.info('Email worker started');
  return worker;
}

module.exports = { startEmailWorker };
