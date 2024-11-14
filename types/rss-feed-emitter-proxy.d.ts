declare module "rss-feed-emitter-proxy" {
  interface FeedConfig {
    url: string;
    refresh?: number;
    userAgent?: string;
  }

  interface EmitterOptions {
    skipFirstLoad?: boolean;
    userAgent?: string;
  }

  class RssFeedEmitter {
    constructor(options?: EmitterOptions);
    add(feed: FeedConfig): void;
    remove(url: string): void;
    destroy(): void;
    on(event: "new-item" | "error", callback: (item: any) => void): void;
  }

  export default RssFeedEmitter;
}
