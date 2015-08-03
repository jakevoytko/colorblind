var assert = require('assert');
var oauth = require('../oauth.js');
var requests = require('../../net/requests.js');

describe('oauth', function() {
  describe('HeaderBuilder', function() {
    it('a sample with a token+secret from the Twitter api docs', function() {
      var method = 'POST';
      var baseUrl = 'https://api.twitter.com/1/statuses/update.json';
      var parameters = {
        'include_entities': 'true',
        'status': 'Hello Ladies + Gentlemen, a signed OAuth request!'
      };
      var nonce = 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg';
      var timestamp = 1318622958;

      var keyData = new oauth.KeyData(
        'xvz1evFS4wEEPTGEFPHBog' /* consumerKey */,
        'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw' /* consumerSecret */,
        '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb' /* token */,
        'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE' /* tokenSecret */);

      var result = new oauth.HeaderBuilder(method, baseUrl, keyData)
            .setRequestParams(parameters)
            .build(timestamp, nonce);
    
      var expected = 'OAuth oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog", ' +
            'oauth_nonce="kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", ' +
            'oauth_signature="tnnArxj06cWHq44gCs1OSKk%2FjLY%3D", ' +
            'oauth_signature_method="HMAC-SHA1", ' +
            'oauth_timestamp="1318622958", ' +
            'oauth_token="370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", ' +
            'oauth_version="1.0"';

      assert.equal(expected, result);
    });

    it('a sample without a token+secret from the Twitter API docs', function() {
      var method = 'POST';
      var baseUrl = 'https://api.twitter.com/oauth/request_token';
      var nonce = 'ea9ec8429b68d6b77cd5600adbbb0456';
      var timestamp = 1318467427;

      var keyData = new oauth.KeyData(
        'cChZNFj6T5R0TigYB9yd1w' /* consumerKey */,
        'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg' /* consumerSecret */,
        null /* token */,
        null /* tokenSecret */);

      var result = new oauth.HeaderBuilder(method, baseUrl, keyData)
            .setCallback('http://localhost/sign-in-with-twitter/')
            .build(timestamp, nonce);

      var expected = 'OAuth '
            + 'oauth_callback="http%3A%2F%2Flocalhost%2Fsign-in-with-twitter%2F", '
            + 'oauth_consumer_key="cChZNFj6T5R0TigYB9yd1w", '
            + 'oauth_nonce="ea9ec8429b68d6b77cd5600adbbb0456", '
            + 'oauth_signature="F1Li3tvehgcraF8DMJ7OyxO4w9Y%3D", '
            + 'oauth_signature_method="HMAC-SHA1", '
            + 'oauth_timestamp="1318467427", '
            + 'oauth_version="1.0"';

      assert.equal(expected, result);
    });

    it('a sample with a request body, generated manually', function() {
      var method = 'POST';
      var server = 'api.twitter.com';
      var path = '/oauth/request_token';
      var baseUrl = 'https' + server + path;
      var nonce = 'ea9ec8429b68d6b77cd5600adbbb0456';
      var timestamp = 1318467427;

      var keyData = new oauth.KeyData(
        'cChZNFj6T5R0TigYB9yd1w' /* consumerKey */,
        'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg' /* consumerSecret */,
        null /* token */,
        null /* tokenSecret */);

      var somethingImportantEnoughToSign = 
            new Buffer('Never gonna give you up, \n'
                       + 'never gonna let you down, \n'
                       + 'never gonna run around and desert you. \n'
                       + 'Never gonna make you cry, \n'
                       + 'never gonna say goodbye, \n'
                       + 'never gonna tell a lie and hurt you.');
      var boundary = "your heart's been aching, but you're too shy to say it.";
      var requestBody = requests.makeRequestBody(
        server, 
        path, 
        boundary, 
        'file', 
        'rickroll.txt', 
        somethingImportantEnoughToSign);

      var result = new oauth.HeaderBuilder(method, baseUrl, keyData)
            .setRequestBody(requestBody)
            .build(timestamp, nonce);

      var expected = 'OAuth '
            + 'oauth_body_hash="4db448d9c9e37a0de47fb6a2fb053d383aa97346", '
            + 'oauth_consumer_key="cChZNFj6T5R0TigYB9yd1w", '
            + 'oauth_nonce="ea9ec8429b68d6b77cd5600adbbb0456", '
            + 'oauth_signature="Y6EvIUkjH95I%2B4QTOmUTQXlI9HQ%3D", '
            + 'oauth_signature_method="HMAC-SHA1", '
            + 'oauth_timestamp="1318467427", '
            + 'oauth_version="1.0"';

      assert.equal(expected, result);
    });
  });
});
