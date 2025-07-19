import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaCommandableChannelRepository } from '../../../src/infrastructure/persistence/PrismaCommandableChannelRepository.js';
import { PrismaClient } from '@prisma/client';

describe('PrismaCommandableChannelRepository', () => {
  let repository: PrismaCommandableChannelRepository;
  let mockPrisma: any;

  beforeEach(() => {
    // Arrange - Mock PrismaClient
    mockPrisma = {
      commandableChannel: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    
    repository = new PrismaCommandableChannelRepository(mockPrisma as PrismaClient);
  });

  describe('getAllActiveChannels', () => {
    it('활성화된 채널 ID 목록을 반환한다', async () => {
      // Arrange
      const mockChannels = [
        { channelId: 'channel-1' },
        { channelId: 'channel-2' },
        { channelId: 'channel-3' },
      ];
      mockPrisma.commandableChannel.findMany.mockResolvedValue(mockChannels);

      // Act
      const result = await repository.getAllActiveChannels();

      // Assert
      expect(result).toEqual(['channel-1', 'channel-2', 'channel-3']);
      expect(mockPrisma.commandableChannel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { channelId: true }
      });
    });

    it('활성화된 채널이 없으면 빈 배열을 반환한다', async () => {
      // Arrange
      mockPrisma.commandableChannel.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.getAllActiveChannels();

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.commandableChannel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { channelId: true }
      });
    });
  });

  describe('isChannelCommandable', () => {
    it('채널이 활성화되어 있으면 true를 반환한다', async () => {
      // Arrange
      const channelId = 'active-channel';
      mockPrisma.commandableChannel.findUnique.mockResolvedValue({ isActive: true });

      // Act
      const result = await repository.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.commandableChannel.findUnique).toHaveBeenCalledWith({
        where: { channelId },
        select: { isActive: true }
      });
    });

    it('채널이 비활성화되어 있으면 false를 반환한다', async () => {
      // Arrange
      const channelId = 'inactive-channel';
      mockPrisma.commandableChannel.findUnique.mockResolvedValue({ isActive: false });

      // Act
      const result = await repository.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(false);
      expect(mockPrisma.commandableChannel.findUnique).toHaveBeenCalledWith({
        where: { channelId },
        select: { isActive: true }
      });
    });

    it('채널이 존재하지 않으면 false를 반환한다', async () => {
      // Arrange
      const channelId = 'non-existent-channel';
      mockPrisma.commandableChannel.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(false);
      expect(mockPrisma.commandableChannel.findUnique).toHaveBeenCalledWith({
        where: { channelId },
        select: { isActive: true }
      });
    });
  });
});