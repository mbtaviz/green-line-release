MBTA Releases Green Line Data
=============================

[![mbtaviz.github.io/green-line-release](http://mbtaviz.github.io/green-line-release/media/wide-preview-collage.png)](http://mbtaviz.github.io/green-line-release)

When we built [Visualizing MBTA Data](http://mbtaviz.github.io/) to help explain Boston's Subway System, there was no
data available for the Green Line.  The MBTA began publishing that data in October, 2014. This project is a web-based
interactive look inside the first data that began to flow for the Green Line.

Check it out: <http://mbtaviz.github.io/green-line-release>.

This code is largely based on <https://github.com/mbtaviz/mbtaviz.github.io>.

## Quick Start

1. Install [node.js](http://nodejs.org/)
2. Install `bower` to grab dependencies, `less` to compile style sheets and 
`http-server` to run the website

     `npm install -g bower less http-server`
 
3. Install dependencies

     `bower install`

4. Compile less css files into a single stylesheet

    `lessc --clean-css styles/main.less > styles/main.css`

5. Serve up the website

    `http-server`

6. Browse to [http://localhost:8080/](http://localhost:8080/) to see the 
visualization

## Source Code Layout

    data\                post-processed visualization data
    scripts\             JavaScript files for the visualization and the website
    styles\              less CSS stylesheets and main.css that they are compiled into
    media\               Opengraph/Twitter Card images
    bower.json           bower dependencies
    ie.png               website rendered to an image for browsers without svg support
    index.html           landing page
    README.md            README file that appears on the website's github page

## Regenerating Stylesheets

The visualization loads `main.css` which is generated from all of the less 
files in the `styles/` directory. If you change any of the less stylesheets 
use the less compile to regenerate `main.css` as described above:

    lessc --clean-css styles/main.less > styles/main.css

For more information see <http://lesscss.org>.

## Creators

**Mike Barry**

- <https://github.com/msbarry>
- <https://twitter.com/msb5014>

**Brian Card**

- <https://github.com/bcard>
- <https://twitter.com/bmcard>

## License

Copyright 2014 Michael Barry and Brian Card.

JavaScript source files and less stylesheets released under the MIT License.

All other files including this README, the main web page, and images made available under
[Github's terms of service](https://help.github.com/articles/open-source-licensing)