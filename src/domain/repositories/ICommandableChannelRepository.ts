export interface ICommandableChannelRepository {
  getAllActiveChannels(): Promise<string[]>;
  isChannelCommandable(channelId: string): Promise<boolean>;
}