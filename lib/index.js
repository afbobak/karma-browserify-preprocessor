var browserify = require('browserify');
var fs         = require('fs');
var os         = require('os');
var path       = require('path');
var through    = require('through');

var pattern = function(file) {
  return {pattern: file, included: true, served: true, watched: false};
};

var framework = function(files, logger, config) {
  var log = logger.create('framework.browserify');
  if (config.debug === undefined) {
    config.debug = true;
  }
  var options = config.options || {};
  var optsExternal = options.external;
  delete options.external;

  // External dependency bundle
  if (config.external) {
    var bundlePath = path.join(os.tmpdir(), 'external-bundle.js');
    fs.writeFileSync(bundlePath, '');
    log.debug('External Bundle: %s', bundlePath);

    var i, b = browserify(optsExternal);

    // Add other externals
    var external;
    for (i = 0; i < config.external.length; i++) {
      external = config.external[i];
      if (typeof external === 'string') {
        log.debug('Processing external: %s', external);
        b.require(external);
      } else {
        log.debug('Processing external: %s -> %s', external[0], external[1]);
        b.require(external[0], { expose : external[1] });
      }
    }

    b.bundle({debug: config.debug}, function (err, bundleContent) {
      if (err) {
        return log.error('Error processing externals [%s]:\n%s',
          config.external, err.toString());
      }
      fs.writeFileSync(bundlePath, bundleContent);
    });

    files.unshift(pattern(bundlePath));
  }
};

var preprocessor = function(logger, basePath, config, reporters) {
  var log = logger.create('preprocessor.browserify');
  if (config.debug === undefined) {
    config.debug = true;
  }
  var options = config.options || {};
  options.bundleExternal = false;
  delete options.external;

  return function(content, file, done) {
    log.info('Processing "%s".', file.originalPath);
    var jsPath = file.originalPath.replace(basePath + '/', './');
    var modules = [];

    function resolveRequires(f) {
      var filepath = path.dirname(f);
      var data = '';

      // If we're processing the same file as
      if (path.resolve(f) === file.originalPath) {
        data = content;
      }

      return through(write, end);

      function replaceModuleName(match, moduleName) {
        try {
          if (moduleName.charAt(0) === ".") {
            moduleName = require.resolve(path.resolve(filepath, moduleName));
            modules.push(moduleName);
          }
        } catch (e) {
          log.error("Failed to resolve '%s' in %s", moduleName, file.originalPath);
        }
        return "require('" + moduleName + "')";
      }

      function write (buf) {
        if (path.resolve(f) !== file.originalPath) {
          data += buf;
        }
      }

      function end () {
        data = data.replace(/require\(["']([^\)]+)["']\)/mg, replaceModuleName);
        this.queue(data);
        this.queue(null);
      }
    }

    function createBrowserify() {
      var b = browserify(options);
      if (config.external) {
        var i;
        for (i = 0; i < config.external.length; i++) {
          if (typeof config.external[i] === 'string') {
            b.external(config.external[i]);
          } else {
            b.external(config.external[i][1]);
          }
        }
      }

      if (file.originalPath.indexOf("-test") >= 0) {
        b.add(file.originalPath);
      } else {
        b.require(file.originalPath);
      }

      b.transform(resolveRequires);

      return b;
    }

    var b = createBrowserify();
    b.bundle({}, function () {
      b = createBrowserify();
      var i, l = modules.length;
      for (i = 0; i < l; i++) {
        b.external(modules[i]);
      }
      b.bundle({debug: config.debug}, function (err, content) {
        if (err) {
          return log.error('Error processing "%s":\n%s', file.originalPath,
            err.toString());
        }
        done(content);
      });
    });
  };
};

framework.$inject = ['config.files', 'logger', 'config.browserify'];
preprocessor.$inject = ['logger', 'config.basePath', 'config.browserify'];

module.exports = {
  'framework:browserify': ['factory', framework],
  'preprocessor:browserify': ['factory', preprocessor]
};
