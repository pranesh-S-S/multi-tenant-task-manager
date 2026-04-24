import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/types/jwt-payload.type';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the current user's organization details.
   */
  async findCurrent(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.orgId },
      include: {
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Update the current organization (admin only).
   */
  async update(user: JwtPayload, data: { name?: string }) {
    return this.prisma.organization.update({
      where: { id: user.orgId },
      data,
    });
  }
}
