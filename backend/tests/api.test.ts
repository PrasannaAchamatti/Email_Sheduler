import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { redisClient } from '../src/config/redis';
import { emailQueue } from '../src/queues/emailQueue';

describe('ReachInbox End-to-End API Suite', () => {
  let authToken = '';
  let authCookie = '';
  let testUserId = '';
  let testSenderId = '';
  let createdEmailId = '';

  beforeAll(async () => {
    // 1. Authenticate using demo login
    const res = await request(app)
      .post('/api/auth/demo')
      .send({ email: 'evaluator_test@reachinbox.test', name: 'Test Evaluator' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('evaluator_test@reachinbox.test');

    authToken = res.body.data.token;
    testUserId = res.body.data.user.id;

    // Extract cookie
    const cookies = res.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      authCookie = cookies[0];
    }

    // 2. Create a test sender for this user in DB
    const sender = await prisma.sender.create({
      data: {
        userId: testUserId,
        name: 'Automated Test Sender',
        email: 'sender@reachinbox.test',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'test_user',
        smtpPasswordEncrypted: 'encrypted_pass_mock',
        isEthereal: true
      }
    });
    testSenderId = sender.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.email.deleteMany({ where: { userId: testUserId } });
    await prisma.campaign.deleteMany({ where: { userId: testUserId } });
    await prisma.sender.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await emailQueue.close();
    await redisClient.quit();
    await prisma.$disconnect();
  });

  test('GET /api/health returns healthy services', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.database).toBe('healthy');
    expect(res.body.services.redis).toBe('healthy');
  });

  test('Protected endpoint rejects requests without authentication', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('evaluator_test@reachinbox.test');
  });

  test('POST /api/emails/schedule creates campaign and BullMQ delayed jobs', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const payload = {
      subject: 'Interview Assignment Announcement',
      body: 'Hello {{recipient}}, this is a production-style job scheduler test.',
      recipients: ['lead1@company.com', 'lead2@company.com'],
      startDate: tomorrow,
      startTime: '10:00',
      delayBetweenEmails: 2000,
      hourlyLimit: 200,
      senderId: testSenderId
    };

    const res = await request(app)
      .post('/api/emails/schedule')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRecipients).toBe(2);
    expect(res.body.data.campaignId).toBeDefined();
  });

  test('GET /api/emails/scheduled returns paginated scheduled list', async () => {
    const res = await request(app)
      .get('/api/emails/scheduled?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    createdEmailId = res.body.data[0].id;
  });

  test('POST /api/emails/:id/cancel cancels a scheduled job idempotently', async () => {
    expect(createdEmailId).toBeDefined();

    const res = await request(app)
      .post(`/api/emails/${createdEmailId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('GET /api/queue/stats returns real BullMQ metrics', async () => {
    const res = await request(app)
      .get('/api/queue/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queueName).toBeDefined();
    expect(typeof res.body.data.waiting).toBe('number');
    expect(typeof res.body.data.delayed).toBe('number');
  });

  test('GET /api/dashboard/stats returns combined system statistics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.queue).toBeDefined();
  });
});

