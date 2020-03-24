const Scraper = require('./scraper');

const url = process.env.URL || 'https://hexometer.com';

Scraper.start(url, {}, []).then((results) => {
  Object.keys(results).forEach((statusCode) => {
    console.log(`\n\nTotal URLs for status code ${statusCode} - ${results[statusCode]}`);
  });
}).catch(console.error);
