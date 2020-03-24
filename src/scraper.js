const url = require('url');

const request = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('bluebird');

class Scraper {
  static processUrl (link, visited) {
    return link.includes('/') && !visited.includes(link);
  };

  static isExternalLink (payload) {
    const { link, baseUrl } = payload;

    return !link.includes(baseUrl) && !link.startsWith('/');
  }

  static getBaseUrl (uri) {
    const data = url.parse(uri);

    return `${data.protocol}//${data.host}`;
  }

  static parseHtml (response) {
    const results = [];
    const html = cheerio.load(response);
    const links = html('a');

    html(links).each(function (i, link) {
      const array = html(link).attr('href');
      results.push(array);
    });

    return results;
  }

  static async makeRequest (uri) {
    const options = {
      uri,
      method: 'GET',
      resolveWithFullResponse: true
    };

    return request(options);
  }

  static appendResult (payload) {
    const { statusCode, link, results } = payload;

    if (typeof results[statusCode] === 'undefined') {
      results[statusCode] = 1;
    } else {
      results[statusCode]++;
    }

    console.log(` ${statusCode} - URL: ${link}`);
  }

  static async start (uri, results, visited) {
    try {
      const response = await Scraper.makeRequest(uri);
      visited.push(uri);
      Scraper.appendResult({ statusCode: response.statusCode, link: uri, results });

      const baseUrl = Scraper.getBaseUrl(uri);
      const pageLinks = Scraper.parseHtml(response.body);

      await Promise.map(pageLinks, async (link) => {
        if (Scraper.processUrl(link, visited)) {
          const isExternal = Scraper.isExternalLink({ link, baseUrl });
          visited.push(link);

          if (isExternal) {
            try {
              const { statusCode } = await Scraper.makeRequest(link);

              Scraper.appendResult({ statusCode, link, results });
            } catch (error) {
              const { statusCode = 503 } = error;

              Scraper.appendResult({ statusCode, link, results });
            }
          } else {
            const internalUrl = link.includes(baseUrl) ? link : `${baseUrl}${link}`;

            await Scraper.start(internalUrl, results, visited);
          }
        }
      }, { concurrency: 4 });

      return results;
    } catch (error) {
      const { statusCode = 503 } = error;

      Scraper.appendResult({ statusCode, link: uri, results });

      return results;
    }
  }
}

module.exports = Scraper;
