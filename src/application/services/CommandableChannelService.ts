import { ICommandableChannelRepository } from '../../domain/repositories/ICommandableChannelRepository.js';

export class CommandableChannelService {
  private channelCache: Map<string, boolean> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(private commandableChannelRepository: ICommandableChannelRepository) {}

  async isChannelCommandable(channelId: string): Promise<boolean> {
    // Check if cache is expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshCache();
    }

    // Check cache first
    const cached = this.channelCache.get(channelId);
    if (cached !== undefined) {
      return cached;
    }

    // If not in cache, fetch from database
    const isCommandable = await this.commandableChannelRepository.isChannelCommandable(channelId);
    this.channelCache.set(channelId, isCommandable);
    return isCommandable;
  }

  private async refreshCache(): Promise<void> {
    const activeChannels = await this.commandableChannelRepository.getAllActiveChannels();
    
    // Clear and rebuild cache
    this.channelCache.clear();
    for (const channelId of activeChannels) {
      this.channelCache.set(channelId, true);
    }
    
    // Set new expiry time
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }

  // Method to manually refresh cache if needed
  async invalidateCache(): Promise<void> {
    this.channelCache.clear();
    this.cacheExpiry = 0;
  }
}