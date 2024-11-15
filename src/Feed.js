"use strict";

const FeedParser = require("feedparser");
const fetch = require("node-fetch");
const createHttpsProxyAgent = require("https-proxy-agent");
const FeedError = require("./FeedError");
const FeedItem = require("./FeedItem"); // eslint-disable-line no-unused-vars

/**
 * Map of specially handled error codes
 * @type {Object}
 */
const RESPONSE_CODES = {
  OK: 200,
  NOT_FOUND: 404,
  ISE: 500,
};

/**
 * This module manages automatically how many feed items
 * it will keep in memory, and basically it will have a
 * maximum history which is how many items the feed has
 * multiplied by this number below. So, if the feed have
 * 10 items, we will keep 30 items max in the history.
 * @type {Number}
 */
const historyLengthMultiplier = 3;

/**
 * Default UserAgent string
 * Since static stuff doesn't work in older versions, keep using global const
 * @type {String}
 */
const DEFAULT_UA =
  "Node/RssFeedEmitter (https://github.com/filipedeschamps/rss-feed-emitter)";

/**
 * Allowed mime types to allow fetching
 * @type {Array<string>}
 */
const ALLOWED_MIMES = [
  "text/html",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
];

/**
 * Storage object for properties of a feed
 * @class
 * @property {string} url Feed url
 * @property {FeedItem[]} items items currently retrieved from the feed
 * @property {number} refresh timeout between refreshes
 * @property {string} userAgent User Agent string to fetch the feed with
 * @property {string} eventName event name to use when emitting this feed
 * @property {string|null} oxylabsProxyString Oxylabs proxy string to use when fetching the feed
 */
class Feed {
  /**
   * Create a feed
   * @param {Object} data object with feed data
   */
  constructor(data) {
    /**
     * Array of items
     * @type {FeedItem[]}
     */
    this.items; // eslint-disable-line no-unused-expressions

    /**
     * Feed url for retrieving feed items
     * @type {string}
     */
    this.url; // eslint-disable-line no-unused-expressions

    /**
     * Duration between feed refreshes
     * @type {number}
     */
    this.refresh; // eslint-disable-line no-unused-expressions

    /**
     * If the user has specified a User Agent
     * we will use that as the 'user-agent' header when
     * making requests, otherwise we use the default option.
     * @type {string}
     */
    this.userAgent; // eslint-disable-line no-unused-expressions

    /**
     * Event name for this feed to emit when a new item becomes available
     * @type {String}
     */
    this.eventName; // eslint-disable-line no-unused-expressions

    /**
     * Oxylabs proxy string to use when fetching the feed
     * @type {string|null}
     */
    this.oxylabsProxyString; // eslint-disable-line no-unused-expressions

    /**
     * Maximum history length
     * @type {number}
     */
    this.maxHistoryLength; // eslint-disable-line no-unused-expressions

    /**
     * Whether to skip the first load for this specific feed
     * @type {boolean|null}
     */
    this.skipFirstLoad; // eslint-disable-line no-unused-expressions

    ({
      items: this.items,
      url: this.url,
      refresh: this.refresh,
      userAgent: this.userAgent,
      eventName: this.eventName,
      oxylabsProxyString: this.oxylabsProxyString,
      skipFirstLoad: this.skipFirstLoad,
    } = data);

    if (!this.items) this.items = [];
    if (!this.url) throw new TypeError("missing required field `url`");
    if (!this.refresh) this.refresh = 60000;
    if (!this.userAgent) this.userAgent = DEFAULT_UA;
    if (!this.eventName) this.eventName = "new-item";
    if (!this.oxylabsProxyString) this.oxylabsProxyString = null;
    if (this.skipFirstLoad === undefined) this.skipFirstLoad = null;
  }

  /**
   * Given a feed and item, try to find
   * it inside the feed item list. We will use
   * this to see if there's already an item inside
   * the feed item list. If there is, we know it's
   * not a new item.
   * @public
   * @param {FeedItem} item item specifics
   * @returns {FeedItem} the matched element
   */
  findItem(item) {
    return this.items.find((entry) => {
      // if feed is RSS 2.x, check existence of 'guid'
      if (item.guid) return entry.guid === item.guid;
      // if feed is Atom 1.x, check existence of 'id'
      if (item.id) return entry.id === item.id;
      // default object with 'link' and 'title'
      return entry.link === item.link && entry.title === item.title;
    });
  }

  /**
   * Update the maximum history length based on the length of a feed retrieval
   * @public
   * @param  {FeedItem[]} newItems new list of items to base the history length on
   */
  updateHxLength(newItems) {
    this.maxHistoryLength = newItems.length * historyLengthMultiplier;
  }

  /**
   * Add an item to the feed
   * @public
   * @param {FeedItem} item Feed item. Indeterminate structure.
   */
  addItem(item) {
    this.items.push(item);
    this.items = this.items.slice(
      this.items.length - this.maxHistoryLength,
      this.items.length
    );
  }

  /**
   * Fetch the data for this feed
   * @public
   * @returns {Promise<FeedItem[]>} array of new feed items
   */
  fetchData() {
    return new Promise((resolve) => {
      const items = [];
      const feedparser = new FeedParser();

      feedparser.on("readable", () => {
        let item;
        while ((item = feedparser.read())) {
          item.meta.link = this.url;
          items.push(item);
        }
      });

      feedparser.on("error", () => {
        this.handleError(
          new FeedError(
            `Cannot parse ${this.url} XML`,
            "invalid_feed",
            this.url
          )
        );
      });

      feedparser.on("end", () => {
        resolve(items);
      });

      this.get(feedparser);
    });
  }

  /**
   * Perform the feed parsing
   * @private
   * @param  {FeedParser} feedparser feedparser instance to use for parsing a retrieved feed
   */
  get(feedparser) {
    let agent = null;

    if (this.oxylabsProxyString) {
      // Use the provided Oxylabs proxy string to create the proxy agent
      agent = createHttpsProxyAgent(`http://${this.oxylabsProxyString}`);
    }

    fetch(this.url, {
      method: "GET",
      agent: agent,
      headers: {
        "User-Agent": this.userAgent,
        Accept: ALLOWED_MIMES.join(","),
      },
    })
      .then((res) => {
        if (res.status !== RESPONSE_CODES.OK) {
          this.handleError(
            new FeedError(
              `This URL returned a ${res.status} status code`,
              "fetch_url_error",
              this.url
            )
          );
        } else {
          res.body.pipe(feedparser);
        }
      })
      .catch((error) => {
        this.handleError(
          new FeedError(
            `Cannot connect to ${this.url}: ${error.message}`,
            "fetch_url_error",
            this.url
          )
        );
      });
  }

  /**
   * Handle errors inside the feed retrieval process
   * @param  {Error} error error to be handled
   * @private
   */
  handleError(error) {
    if (this.handler) {
      this.handler.handle(error);
    } else {
      throw error;
    }
  }

  /**
   * Destroy feed
   * @public
   */
  destroy() {
    clearInterval(this.interval);
    delete this.interval;
  }
}

module.exports = Feed;
