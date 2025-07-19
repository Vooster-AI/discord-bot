import { PrismaClient } from '@prisma/client';
import { ICommandableChannelRepository } from '../../domain/repositories/ICommandableChannelRepository.js';

export class PrismaCommandableChannelRepository implements ICommandableChannelRepository {
  constructor(private prisma: PrismaClient) {}

  async getAllActiveChannels(): Promise<string[]> {
    const channels = await this.prisma.commandableChannel.findMany({
      where: { isActive: true },
      select: { channelId: true }
    });
    return channels.map(channel => channel.channelId);
  }

  async isChannelCommandable(channelId: string): Promise<boolean> {
    const channel = await this.prisma.commandableChannel.findUnique({
      where: { channelId },
      select: { isActive: true }
    });
    return channel?.isActive ?? false;
  }
}