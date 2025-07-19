import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandableChannelService } from '../../../src/application/services/CommandableChannelService.js';
import { ICommandableChannelRepository } from '../../../src/domain/repositories/ICommandableChannelRepository.js';

describe('CommandableChannelService', () => {
  let service: CommandableChannelService;
  let mockRepository: ICommandableChannelRepository;

  beforeEach(() => {
    // Arrange - Mock repository 생성
    mockRepository = {
      getAllActiveChannels: vi.fn(),
      isChannelCommandable: vi.fn(),
    };
    
    service = new CommandableChannelService(mockRepository);
  });

  describe('isChannelCommandable', () => {
    it('캐시가 비어있을 때 DB에서 조회하여 결과를 반환한다', async () => {
      // Arrange
      const channelId = 'test-channel-123';
      const expectedResult = true;
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([]);
      vi.mocked(mockRepository.isChannelCommandable).mockResolvedValue(expectedResult);

      // Act
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(expectedResult);
      expect(mockRepository.isChannelCommandable).toHaveBeenCalledWith(channelId);
      expect(mockRepository.isChannelCommandable).toHaveBeenCalledTimes(1);
    });

    it('캐시에 있을 때 캐시에서 반환하고 DB를 호출하지 않는다', async () => {
      // Arrange
      const channelId = 'cached-channel-123';
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([channelId]);
      
      // 첫 번째 호출로 캐시 채우기
      await service.isChannelCommandable(channelId);
      
      // repository 호출 횟수 초기화
      vi.clearAllMocks();

      // Act - 두 번째 호출
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.isChannelCommandable).not.toHaveBeenCalled();
      expect(mockRepository.getAllActiveChannels).not.toHaveBeenCalled();
    });

    it('캐시 TTL이 만료되면 DB에서 다시 조회한다', async () => {
      // Arrange
      const channelId = 'ttl-test-channel';
      vi.useFakeTimers();
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([channelId]);

      // 첫 번째 호출로 캐시 채우기
      await service.isChannelCommandable(channelId);
      
      // 1시간 + 1분 후로 시간 이동 (TTL 초과)
      vi.advanceTimersByTime(61 * 60 * 1000);
      
      // repository 호출 횟수 초기화
      vi.clearAllMocks();
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([channelId]);

      // Act
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.getAllActiveChannels).toHaveBeenCalledTimes(1);
      
      // Cleanup
      vi.useRealTimers();
    });

    it('invalidateCache 호출 시 캐시가 초기화되고 다시 DB에서 조회한다', async () => {
      // Arrange
      const channelId = 'invalidate-test-channel';
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([channelId]);

      // 첫 번째 호출로 캐시 채우기
      await service.isChannelCommandable(channelId);
      
      // 캐시 무효화
      await service.invalidateCache();
      
      // repository 호출 횟수 초기화
      vi.clearAllMocks();
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([channelId]);

      // Act
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.getAllActiveChannels).toHaveBeenCalledTimes(1);
    });

    it('채널이 활성화 목록에 없으면 false를 반환한다', async () => {
      // Arrange
      const channelId = 'inactive-channel';
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue(['other-channel']);
      vi.mocked(mockRepository.isChannelCommandable).mockResolvedValue(false);

      // Act
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(false);
      expect(mockRepository.isChannelCommandable).toHaveBeenCalledWith(channelId);
    });

    it('getAllActiveChannels가 빈 배열을 반환해도 정상 동작한다', async () => {
      // Arrange
      const channelId = 'test-channel';
      vi.mocked(mockRepository.getAllActiveChannels).mockResolvedValue([]);
      vi.mocked(mockRepository.isChannelCommandable).mockResolvedValue(false);

      // Act
      const result = await service.isChannelCommandable(channelId);

      // Assert
      expect(result).toBe(false);
      expect(mockRepository.isChannelCommandable).toHaveBeenCalledWith(channelId);
    });
  });
});