import { prisma } from '../config/database';

export class CampaignService {
  /**
   * List campaigns for a user
   */
  public static async getCampaignsByUser(userId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emails: true }
        }
      }
    });

    return campaigns;
  }

  /**
   * Get single campaign details and progress
   */
  public static async getCampaignById(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        emails: {
          select: {
            id: true,
            recipient: true,
            subject: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            errorMessage: true,
            etherealPreviewUrl: true
          },
          take: 50,
          orderBy: { scheduledAt: 'asc' }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }

    return campaign;
  }
}

