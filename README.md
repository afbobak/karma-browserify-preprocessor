karma-browserify-preprocessor
=============================

Yes, I know, yet another [Browserify](http://browserify.org) preprocessor for
[Karma](http://karma-runner.github.io).

This one adds the ability to pass on additional options to the browserify call
and works as expected with externals and interestingly also with
[karma-coverage](https://github.com/karma-runner/karma-coverage).

Installation
------------

The easiest way is to keep `karma-browserify-preprocessor` as a devDependency
in your `package.json`:

```json
{
  "devDependencies": {
    "karma": "^0.12.14",
    "karma-browserify-preprocessor": "^0.1.0"
  }
}
```

You can simply do it by:

```bash
npm install karma-browserify-preprocessor --save-dev
```

Configuration
-------------

Add `browserify` to the `frameworks` and `preprocessor` keys in your
Karma configuration:

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    // Frameworks to use
    frameworks: ['mocha', 'browserify'],

    // List of files / patterns to load in the browser
    files: [
      {pattern: 'node_modules/sinon/pkg/sinon.js', watched: false},
      {pattern: 'node_modules/sinon/pkg/sinon-ie.js', watched: false},
      'browser/lib/**/*.js',
      'browser/test/**/*-test.js'
    ],

    // Preprocess matching files before serving them to the browser
    preprocessors: {
      'browser/**/*.js' : ['browserify']
    },

    browserify: {
      // Options passed to browserify(), see browserify for available options
      options: {
        // Options passed to browserify() for separate bundle
        external: {}
      },
      // Enable/disable source maps, defaults to true
      debug: true,
      // External packages to browserify into a separate bundle
      external: [
        // A straight module from our package
        'chai',
        // Include and rename some deep dependencies
        ['./node_modules/bundle_server/node_modules/knockout', 'knockout'],
        ['./node_modules/bundle_server/node_modules/licy', 'licy']
      ]
    },
  });
};
```

You can rename a module. This is useful if you have a package that normally
serves the bundle. In this case you use an array of [path, expose] instead of
a string in the external array. The 'expose' item in the array is passed to
browserify like this:
[`b.require(arr[0], {expose: arr[1]})`](https://github.com/substack/node-browserify#brequirefile-opts);

License
-------

The BSD License (BSD)
