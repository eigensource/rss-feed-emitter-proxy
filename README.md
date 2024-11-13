<p align="center">
  <img src="https://raw.githubusercontent.com/filipedeschamps/rss-feed-emitter/master/content/logo.gif">
</p>

<h1 align="center">RSS Feed Emitter</h1>

<p align="center">
  <a href="https://travis-ci.com/filipedeschamps/rss-feed-emitter">
    <img src="https://travis-ci.com/filipedeschamps/rss-feed-emitter.svg?branch=master">
  </a>
  <a href='https://coveralls.io/github/filipedeschamps/rss-feed-emitter'>
    <img src='https://coveralls.io/repos/github/filipedeschamps/rss-feed-emitter/badge.svg' alt='Coverage Status' />
  </a>
  <a href="https://www.npmjs.com/package/rss-feed-emitter">
    <img src="https://badge.fury.io/js/rss-feed-emitter.svg">
  </a>
  <a href="https://snyk.io/test/github/filipedeschamps/rss-feed-emitter">
  <img src="https://snyk.io/test/github/filipedeschamps/rss-feed-emitter/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/filipedeschamps/rss-feed-emitter" style="max-width:100%;">
  </a>
  <a href="https://gitter.im/rss-feed-emitter/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
    <img src="https://badges.gitter.im/rss-feed-emitter/community.svg" alt="Gitter Community" />
  </a>
</p>

<p align="center">
  Track tons of feeds and receive events for every new item published with this super RSS News Feed aggregator.
</p>

## Features

- Supports Node.js `8.x` up through the current version of node.js
- Supported Node.js `4.x`, `5.x`, `6.x`, and `7.x` until rss-feed-emitter version `2.0.1`
- Supported Node.js `0.10.x` and `0.12.x` until rss-feed-emmiter version `1.0.7`
- 100% code coverage with unit and integration tests
- Simple interface
- Automatically manages feed history memory
- Written in ES6
- Special thanks to @TobiTenno for the complete rewrite!

## Usage

### Install

Download latest from releases in this repo and install with

```bash
pnpm add ./rss-feed-emitter-proxy-0.1.0.tgz # replace 0.1.0 with latest version
```

### Creating an instance

```js
const RssFeedEmitter = require("rss-feed-emitter-proxy");
const feeder = new RssFeedEmitter({});
```

#### Changing the user agent for requests

```js
const feeder = new RssFeedEmitter({ userAgent: "Your UA string" });
```

### Adding feeds

```js
feeder.add({
  url: "http://www.nintendolife.com/feeds/news",
  refresh: 2000,
});
```

> Default refresh value is 60 seconds

You can also add multiple at once by either providing an array of urls for the `url` field:

```js
feeder.add({
  url: [
    "http://www.nintendolife.com/feeds/news",
    "http://feeds.bbci.co.uk/news/rss.xml",
  ],
  refresh: 2000,
});
```

or by passing multiple configs:

```js
feeder.add(
  {
    url: "http://www.nintendolife.com/feeds/news",
    refresh: 2000,
  },
  {
    url: "http://feeds.bbci.co.uk/news/rss.xml",
    refresh: 5000,
  }
);
```

### Listening to new items

```js
feeder.on("new-item", function (item) {
  console.log(item);
});
```

you can also override the default `'new-item'` event name with a new value of your choice by providing the event name in the feed config.

```js
feeder.add({
  url: "http://www.nintendolife.com/feeds/news",
  refresh: 2000,
  eventName: "nintendo",
});

feeder.on("nintendo", function (item) {
  console.log(item);
});
```

### Ignoring the first load of items

```js
const feeder = new RssFeedEmitter({ skipFirstLoad: true });

feeder.add({
  url: "http://www.nintendolife.com/feeds/news",
  refresh: 2000,
  eventName: "nintendo",
});

// this item will only be from the new items, not from old items.
feeder.on("nintendo", function (item) {
  console.log(item);
});
```

You can also override the instance-level `skipFirstLoad` setting for individual feeds:

```js
const feeder = new RssFeedEmitter({ skipFirstLoad: true });

// This feed will load existing items on first load
feeder.add({
  url: "http://www.nintendolife.com/feeds/news",
  refresh: 2000,
  skipFirstLoad: false,
});

// This feed will inherit instance-level skipFirstLoad: true
feeder.add({
  url: "http://some-other-feed.com/rss",
  refresh: 2000,
});
```

### Adding an 'error' handler

Handle error events by printing to console. This handler is needed to prevent unhandled exceptions from crashing the processes.

```js
feeder.on("error", console.error);
```

### Listing all feeds in the instance

The list is now an ES6 getter to make the field a bit more plain to access.

```js
feeder.list;
```

### Removing a single feed

```js
feeder.remove("http://www.nintendolife.com/feeds/news");
```

### Destroying feed instance

```js
feeder.destroy();
```

> This will remove all feeds from the instance

#### Using Oxylabs proxies

You can configure Oxylabs proxies at both the feeder instance level and individual feed level using the `oxylabsProxyString` parameter.

```js
// Configure proxy at feeder instance level (applies to all feeds)
const feeder = new RssFeedEmitter({
  skipFirstLoad: false,
  oxylabsProxyString: "customer-USERNAME:PASSWORD@pr.oxylabs.io:7777",
});

// Or configure proxy for specific feed
feeder.add({
  url: "https://example.com/feed",
  refresh: 2000,
  oxylabsProxyString: "customer-USERNAME:PASSWORD@pr.oxylabs.io:7777",
});
```

> The proxy string format follows Oxylabs documentation at [developers.oxylabs.io/proxies/residential-proxies/making-requests](https://developers.oxylabs.io/proxies/residential-proxies/making-requests)

## Contributors

| [<img src="https://avatars3.githubusercontent.com/u/7128721?s=400&v=4" width="155"><br><sub>@TobiTenno</sub>](https://github.com/TobiTenno) |
| :-----------------------------------------------------------------------------------------------------------------------------------------: |

## Author

Fork by @eigensource

| [<img src="https://avatars0.githubusercontent.com/u/4248081?v=3&s=115" width="155"><br><sub>@filipedeschamps</sub>](https://github.com/filipedeschamps) |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------: |
