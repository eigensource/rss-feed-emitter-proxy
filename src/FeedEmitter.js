"use strict";

const { EventEmitter } = require("events");

const FeedError = require("./FeedError");
const FeedManager = require("./FeedManager");
const Feed = require("./Feed");

/**
 * Default UserAgent string
 * Since static stuff doesn't work in older versions, keep using global const
 * @type {String}
 */
const DEFAULT_UA =
  "Node/RssFeedEmitter (https://github.com/filipedeschamps/rss-feed-emitter)";

/**
 * Validate if the feed exists
 * @param  {Feed} feed feed configuration
 */
const checkFeed = (feed) => {
  if (!feed) {
    throw new FeedError(
      "You must call #add method with a feed configuration object.",
      "type_error"
    );
  }
};

/**
 * Validate feed url is a string or array of strings
 * @param  {Feed} feed feed to validate url(s) for
 */
const checkUrl = (feed) => {
  if (!feed.url || !(typeof feed.url === "string" || Array.isArray(feed.url))) {
    throw new FeedError(
      'Your configuration object should have an "url" key with a string or array value',
      "type_error"
    );
  }
};

/**
 * Validate that the feed refresh is valid
 * @param  {Feed} feed feed to validate refresh timeout for
 */
const checkRefresh = (feed) => {
  if (feed.refresh && typeof feed.refresh !== "number") {
    throw new FeedError(
      'Your configuration object should have a "refresh" key with a number value',
      "type_error"
    );
  }
};

/**
 * MAIN CLASS
 * This is where we extend from EventEmitter and absorb
 * the #emit and #on methods to emit 'new-item' events
 * when we have new feed items.
 * @extends EventEmitter
 * @class
 */
class FeedEmitter extends EventEmitter {
  /**
   * Checks that the feed object is valid
   * @param       {Object} feed to validate
   * @param       {string} ua User Agent string to pass to feeds
   */
  static validateFeedObject(feed, ua) {
    checkFeed(feed);
    checkUrl(feed);
    checkRefresh(feed);
    feed.userAgent = feed.userAgent || ua || DEFAULT_UA;
  }

  /**
   * The constructor special method is called every time
   * we create a new instance of this "Class".
   * @param {Object} [options={}]
   * @param {string} [options.userAgent] User Agent string to use for HTTP requests
   * @param {boolean} [options.skipFirstLoad] Whether to skip the first load
   * @param {string} [options.oxylabsProxyString] Oxylabs proxy string to use for all feeds
   */
  constructor(options = {}) {
    super();

    /**
     * Array of feeds that are tracked
     * @private
     * @type {Feed[]}
     */
    this.feedList = [];

    /**
     * User Agent string to use for HTTP requests
     * @private
     * @type {string}
     */
    this.userAgent = options.userAgent || DEFAULT_UA;

    /**
     * Whether or not to skip the normal emit event on first load
     * @private
     * @type {boolean}
     */
    this.skipFirstLoad = options.skipFirstLoad || false;

    /**
     * Oxylabs proxy string to use when fetching feeds
     * @private
     * @type {string|null}
     */
    this.oxylabsProxyString = options.oxylabsProxyString || null;
  }

  /**
   * UserFeedConfig typedef
   * @typedef {Object} UserFeedConfig
   * @property {(string|string[])} url URL string or array of strings. Cannot be null or empty
   * @property {number} [refresh] Refresh cycle duration for the feed in milliseconds
   * @property {string} [eventName] Event name for a new feed item. Default is "new-item"
   * @property {string} [userAgent] User Agent string for this feed
   * @property {string} [oxylabsProxyString] Oxylabs proxy string for this feed
   */

  /**
   * ADD
   * The #add method receives a feed configuration object and adds the feed to the emitter.
   * @public
   * @param {UserFeedConfig[]} userFeedConfig User feed configuration(s)
   * @returns {Feed[]}
   */
  add(...userFeedConfig) {
    if (userFeedConfig.length > 1) {
      userFeedConfig.forEach((f) => this.add(f));
      return this.feedList;
    }

    const config = userFeedConfig[0];

    FeedEmitter.validateFeedObject(config, this.userAgent);

    if (Array.isArray(config.url)) {
      config.url.forEach((url) => {
        this.add({
          ...config,
          url,
        });
      });
      return this.feedList;
    }

    // Add oxylabsProxyString to config if not already set
    config.oxylabsProxyString =
      config.oxylabsProxyString || this.oxylabsProxyString;

    const feed = new Feed(config);

    this.addOrUpdateFeedList(feed);

    return this.feedList;
  }

  /**
   * REMOVE
   * This method removes a feed from the feed list.
   * @public
   * @param  {string} url URL of the feed to remove
   * @returns {Feed} Feed that was removed
   */
  remove(url) {
    if (typeof url !== "string") {
      throw new FeedError(
        "You must call #remove with a string containing the feed URL",
        "type_error"
      );
    }

    const feed = this.findFeed({
      url,
    });

    return this.removeFromFeedList(feed);
  }

  /**
   * List of feeds this emitter is handling
   * @public
   * @returns {Feed[]} Array of feeds
   */
  get list() {
    return this.feedList;
  }

  /**
   * Remove all feeds from feed list
   * @public
   */
  destroy() {
    this.feedList.forEach((feed) => feed.destroy());
    this.feedList = [];
  }

  /**
   * Add or update a feed in the feed list
   * @private
   * @param {Feed} feed Feed to be added or updated
   */
  addOrUpdateFeedList(feed) {
    const feedInList = this.findFeed(feed);
    if (feedInList) {
      this.removeFromFeedList(feedInList);
    }

    this.addToFeedList(feed);
  }

  /**
   * Find and return a feed
   * @private
   * @param  {UserFeedConfig} feed Feed to look up
   * @returns {Feed | undefined}
   */
  findFeed(feed) {
    return this.feedList.find((feedEntry) => feedEntry.url === feed.url);
  }

  /**
   * Add a feed to the feed list
   * Side effects:
   *  - Clear feed items list
   *  - Create an interval for the feed
   * @private
   * @param {Feed} feed Feed to be added
   */
  addToFeedList(feed) {
    feed.items = [];
    feed.interval = this.createSetInterval(feed);

    this.feedList.push(feed);
  }

  /**
   * Set up a recurring task to check for new items
   * @private
   * @param  {Feed} feed Feed to set interval for
   * @returns {NodeJS.Timeout} Interval for updating the feed
   */
  createSetInterval(feed) {
    const feedManager = new FeedManager(this, feed);
    feedManager.getContent(true);
    return setInterval(feedManager.getContent.bind(feedManager), feed.refresh);
  }

  /**
   * Remove feed from the feed list
   * Side effects:
   * - Destroys the feed first
   * @private
   * @param  {Feed} feed Feed to be removed
   * @returns {Feed | undefined} Feed that was removed
   */
  removeFromFeedList(feed) {
    if (!feed) return;

    feed.destroy();
    const pos = this.feedList.findIndex((e) => e.url === feed.url);
    if (pos !== -1) {
      this.feedList.splice(pos, 1);
      return feed;
    }
  }
}

module.exports = FeedEmitter;
