'use strict';

var
  request = require('request'),
  url = require('url'),
  httpProxy = require('http-proxy'),
  jsdom = require('jsdom'),

  server;


server = httpProxy.createServer(

  // Proxy or Foxy ;)
  function (req, res, proxy) {
    var
      shouldProxy = false,
      buffer,
      parsedReqUrl,
      reqUrl,
      reqHost,
      reqPath,
      extension;

    if (req.url <= 1) {
      return res.end('No request defined');
    }

    if(req.method !== 'GET') {
      shouldProxy = true;
    }

    reqUrl = req.url.substr(1);
    extension = reqUrl.split('.').pop();

    if (extension === 'jpg') {
      shouldProxy = true;
    } else if (extension === 'png') {
      shouldProxy = true;
    } else if (extension === 'gif') {
      shouldProxy = true;
    }

    if (req.method !== 'GET') {
      shouldProxy = true;
    }

    if(shouldProxy === true) {
      parsedReqUrl = url.parse(reqUrl);
      reqHost = parsedReqUrl.hostname;
      reqPath = parsedReqUrl.path;

      if(!reqHost || !reqPath) {
        return res.end('Invalid url:' + reqUrl);
      }

      buffer = httpProxy.buffer(req);

      // config proxy
      req.headers.origin = reqUrl;
      req.url = reqPath;

      proxy.proxyRequest(req, res, {
        host: reqHost,
        port: 80,
        changeOrigin: true,
        buffer: buffer
      });
    } else {
      proxy();
    }
  },

  // init foxy
  function (req, res, next) {
    var reqUrl = req.url.substr(1);

    res.foxy = {
      url: reqUrl,
      result: ''
    };

    next();
  },

  // request
  function (req, res, next) {
    var reqUrl = res.foxy.url;

    request(reqUrl, function (err, response, body) {

      if (!response) {
        return res.end('No response from the source');
      }

      res.foxy.contentType = (response.headers['content-type']);
      res.foxy.result = body;

      next();
    });
  },

  function (req, res, next) {

    jsdom.env(
      res.foxy.result,
      ["http://code.jquery.com/jquery.js"],
      function (errors, window) {
        var $ = window.$;

        if(!$) {
          return next();
        }

        $('img').each(function() {
          var src = $(this).attr('src');
          if(src.indexOf('http') < 0) {
            src = 'http://' + url.parse(res.foxy.url).hostname + '/' + src;
          }
          $(this).attr('src', 'http://mustachify.me/?src=' + src);          
        });

        res.foxy.result = window.document.innerHTML;
        
        window.close();
        return next();
      }
    );        
  },


  // end
  function (req, res) {
    res.end(res.foxy.result);
  }
);

server.listen(process.env.PORT || 3000);
