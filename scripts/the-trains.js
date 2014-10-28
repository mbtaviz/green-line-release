/**
 * the-trains.js
 *
 * Copyright 2014 Michael Barry & Brian Card.  MIT open-source lincense.
 *
 * Display marey diagrams and map glyph for "The Trains" section of the
 * visualization in the following stages:
 *
 * 1. Load the required data and do some pre-processing
 * 2. Render the side map glyph that shows locations of trains at a point in time
 * 3. Set up the scaffolding for Marey diagram
 * 4. On load and when the screen width changes:
 *   4a. Render the full Marey
 *   4b. Render annotations for the full Marey
 * 5. Add interaction behavior with surrounding text
 *
 * Interaction is added to all elements throughout as they are rendered.
 */




/* 1. Load and pre-process the data
 *************************************************************/
VIZ.requiresData([
  'json!data/station-network.json',
  'json!data/spider.json',
  'json!data/marey-trips.json',
  'json!data/marey-header.json'
], true).progress(function (percent) {
  "use strict";
  d3.select(".loading-indicator").text('Loading train data... ' + percent + '%').style('text-align', 'center');
}).onerror(function () {
  "use strict";
  d3.select(".loading-indicator").text('Error loading train data').style('text-align', 'center');
}).done(function (network, spider, trips, header) {
  "use strict";
  d3.select(".loading-indicator").remove();

  // The annotations displayed along the right side of the Marey diagram
  var sideAnnotationData = [
    {
      time: '2014/10/23 11:00',
      text: 'Time continues downward, so steeper lines indicate slower trains. <br> \u25BE',
      id: 'marey-start'
    },
    {
      time: '2014/10/23 12:00',
      text: 'At noon on Thursday, October 23rd 2014 the MBTA began publishing live output from a new system that provides train locations for the Green Line.'
    },
    {
      time: '2014/10/23 13:50',
      text: 'The new system uses GPS to locate each train. The signal disappears when trains go below ground on the main trunk and first several stops of each branch. <br> <br> The next phase of their project will include location information for underground trains.',
      connections: [{
        time: '2014/10/23 14:00',
        station: 'kenmore',
        line: 'green'
      }, {
        time: '2014/10/23 14:08',
        station: 'blandford street',
        line: 'green-b'
      }, {
        time: '2014/10/23 14:13',
        station: 'saint mary street',
        line: 'green-c'
      }, {
        time: '2014/10/23 14:14',
        station: 'fenway',
        line: 'green-d'
      }, {
        time: '2014/10/23 14:07',
        station: 'northeastern university',
        line: 'green-e'
      }]
    },
    {
      time: '2014/10/23 16:00',
      text: 'Clumps of outbound trains show up on each branch, but seem to originate on the main trunk, while trains are still underground and we can\'t see them.',
      connections: [{
        time: '2014/10/23 15:59',
        station: 'riverside',
        line: 'green-d'
      }, {
        time: '2014/10/23 16:18',
        station: 'griggs street',
        line: 'green-b'
      }, {
        time: '2014/10/23 17:04',
        station: 'fairbanks street',
        line: 'green-c'
      }]
    },
    {
      time: '2014/10/23 18:45',
      text: 'Gaps between outbound trains cause long waits for inbound passengers. This 30 minute gap occurred when there were no available trains at Boston College to take passengers inbound.',
      connections: [{
        start: '2014/10/23 18:44',
        stop: '2014/10/23 19:17',
        station: 'boston college',
        line: 'green-b'
      }]
    },
    {
      time: '2014/10/23 20:30',
      text: 'Train #3709 appears to bounce back and forth as the data shows it to be in two places at the same time.',
      connections: [{
        start: '2014/10/23 20:37',
        stop: '2014/10/23 20:47',
        station: 'waban station',
        line: 'green-d'
      }],
      link: {
        text: 'Train #3709',
        trip: '3709_1|20141023|851_#0'
      }
    },
    {
      time: '2014/10/23 22:00',
      text: 'When more than 5 minutes elapses between GPS data points, we show a split in the line to indicate the train is out of contact.',
      connections: [{
        time: '2014/10/23 22:01',
        station: 'brigham circle station',
        line: 'green-e'
      }]
    },
    {
      time: '2014/10/24 03:10',
      text: 'Operators move train #3815 to Riverside in the middle of the night.',
      connections: [{
        time: '2014/10/24 03:15',
        station: 'riverside',
        line: 'green-d'
      }]
    },
    {
      time: '2014/10/24 04:40',
      text: 'The first inbound trains begin running at 5 am on Friday, with outbound trains following shortly afterwards.',
      id: 'marey-friday'
    },
    {
      time: '2014/10/24 10:30',
      text: 'Outbound clumps continue regardless of the time of day.'
    },
    {
      time: '2014/10/24 12:15',
      text: 'The outbound B branch experiences several 30-45 minute waits between consecutive trains on Friday afternoon, while the other branches continue to run consistently.',
      connections: [{
        start: '2014/10/24 11:31',
        stop: '2014/10/24 12:15',
        station: 'boston college',
        line: 'green-b'
      }, {
        start: '2014/10/24 13:25',
        stop: '2014/10/24 14:00',
        station: 'boston college',
        line: 'green-b'
      }]
    },
    {
      time: '2014/10/25 01:00',
      text: 'On Friday night, late-night T service takes passengers out of the city until 3 am.',
      id: 'marey-latenight'
    },
    {
      time: '2014/10/25 05:30',
      text: 'On Saturday, buses replaced Green Line service on the B Branch from Blandford Street to Boston College.',
      connections: [{
        time: '2014/10/25 05:45',
        station: 'boston college',
        line: 'green-b'
      }]
    },
  ];
  var idToNode = {};
  network.nodes.forEach(function (data) {
    data.x = spider[data.id][0];
    data.y = spider[data.id][1];
    idToNode[data.id] = data;
  });
  network.links.forEach(function (link) {
    link.source = network.nodes[link.source];
    link.target = network.nodes[link.target];
    link.source.links = link.source.links || [];
    link.target.links = link.target.links || [];
    link.target.links.splice(0, 0, link);
    link.source.links.splice(0, 0, link);
  });
  trips.forEach(function (d) {
    d.stops = d.stops || [];
    var m = moment(d.begin*1000).zone(4);
    d.secs = m.diff(m.clone().startOf('day')) / 1000;
  });
  var stationToName = {};
  var end = {};
  var nodesPerLine = network.nodes.map(function (d) {
    return d.links.map(function (link) {
      var key = d.id + '|' + link.line;
      if (_.where(d.links, {line: link.line}).length === 1) { end[key] = true; }
      stationToName[key] = d.name;
      return key;
    });
  });
  var mapGlyphTrainCircleRadius = 2.5;
  nodesPerLine = _.unique(_.flatten(nodesPerLine));
  var xExtent = d3.extent(d3.values(header), function (d) { return d[0]; });
  var leadTime = 60 * 60; // add some space to the beginning
  var minUnixSeconds = d3.min(d3.values(trips), function (d) { return d.begin; }) - leadTime;
  var maxUnixSeconds = d3.max(d3.values(trips), function (d) { return d.end; });





  /* 2. Render the side map glyph that shows locations of trains
   *    at a point in time
   *************************************************************/
  var fixedLeft = d3.select(".fixed-left");
  var mapGlyphSvg = fixedLeft.select('.side-map').append('svg');

  function renderSideMap(mapGlyphContainer, outerWidth) {
    var mapGlyphMargin = {top: 15, right: 15, bottom: 20, left: 25};
    var xRange = d3.extent(network.nodes, function (d) { return d.x; });
    var yRange = d3.extent(network.nodes, function (d) { return d.y; });
    var width = outerWidth - mapGlyphMargin.left - mapGlyphMargin.right,
        height = width * 1.5;
    var xScale = width / (xRange[1] - xRange[0]);
    var yScale = height / (yRange[1] - yRange[0]);
    var scale = Math.min(xScale, yScale);
    network.nodes.forEach(function (data) {
      data.pos = [data.x * scale, data.y * scale];
    });
    var mapGlyph = mapGlyphContainer
        .attr('width', scale * (xRange[1] - xRange[0]) + mapGlyphMargin.left + mapGlyphMargin.right)
        .attr('height', scale * (yRange[1] - yRange[0]) + mapGlyphMargin.top + mapGlyphMargin.bottom)
      .appendOnce('g', 'map-container')
        .attr('transform', 'translate(' + mapGlyphMargin.left + ',' + mapGlyphMargin.top + ')');

    var stations = mapGlyph.selectAll('.station')
        .data(network.nodes, function (d) { return d.id; });

    var connections = mapGlyph.selectAll('.connect')
        .data(network.links, function (d) { return (d.source && d.source.id) + '-' + (d.target && d.target.id); });

    connections
        .enter()
      .append('line')
        .attr('class', function (d) { return 'connect ' + d.line + '-dimmable'; })
        .attr('x1', function (d) { return d.source.pos[0]; })
        .attr('y1', function (d) { return d.source.pos[1]; })
        .attr('x2', function (d) { return d.target.pos[0]; })
        .attr('y2', function (d) { return d.target.pos[1]; });

    connections
        .attr('x1', function (d) { return d.source.pos[0]; })
        .attr('y1', function (d) { return d.source.pos[1]; })
        .attr('x2', function (d) { return d.target.pos[0]; })
        .attr('y2', function (d) { return d.target.pos[1]; });

    stations
        .enter()
      .append('circle')
        .attr('class', function (d) { return 'station middle station-label ' + d.id; })
        .on('mouseover', function (d) {
          if (d.pos[1] < 30) {
            tip.direction('e')
              .offset([0, 10]);
          } else {
            tip.direction('n')
              .offset([-10, 0]);
          }
          tip.show(d);
          highlightMareyTitle(d.id, _.unique(d.links.map(function (link) { return link.line; })));
        })
        .on('mouseout', function (d) {
          tip.hide(d);
          highlightMareyTitle(null);
        })
        .attr('cx', function (d) { return d.pos[0]; })
        .attr('cy', function (d) { return d.pos[1]; })
        .attr('r', 3);

    stations
        .attr('cx', function (d) { return d.pos[0]; })
        .attr('cy', function (d) { return d.pos[1]; })
        .attr('r', 3);

    // line color circles
    function dot(id, clazz, text, angle) {
      var node = idToNode[id];
      var x = node.pos[0] + 14 * Math.cos(angle * Math.PI / 180);
      var y = node.pos[1] - 14 * Math.sin(angle * Math.PI / 180);
      mapGlyph.append('circle')
          .attr('class', clazz + ' branch-label')
          .attr('r', 7)
          .attr('cx', x)
          .attr('cy', y);
      mapGlyph.append('text')
          .style('fill', 'white')
          .style('font-weight', 'bold')
          .style('text-anchor', 'middle')
          .attr('x', x)
          .attr('y', y + 4)
          .text(text);
    }
    dot('place-lake', 'green-b', 'B', 180);
    dot('place-clmnl', 'green-c', 'C', 180);
    dot('place-river', 'green-d', 'D', 180);
    dot('place-hsmnl', 'green-e', 'E', -135);
  }

  // Render train dots onto the map glyph at a particular point in time
  var lastTime = minUnixSeconds;
  function renderTrainsAtTime(unixSeconds) {
    if (!unixSeconds) { unixSeconds = lastTime; }
    lastTime = unixSeconds;
    if (!showingMap) { return; }
    var active = trips.filter(function (d) {
      return d.begin < unixSeconds && d.end > unixSeconds;
    });
    var positions = active.map(function (d) {
      // get prev, next stop and mix
      for (var i = 0; i < d.stops.length - 1; i++) {
        if (d.stops[i + 1].time > unixSeconds) {
          break;
        }
      }

      // find the datapoint before and after this time and interpolate
      var from = d.stops[i];
      var to = d.stops[i + 1];
      var ratio = (unixSeconds - from.time) / (to.time - from.time);
      return {trip: d.trip, pos: placeWithOffset(from, to, ratio), line: d.line};
    });

    var trains = mapGlyphSvg.select('.map-container').selectAll('.train').data(positions, function (d) { return d.trip; });
    trains.enter().append('circle')
        .attr('class', function (d) { return 'train highlightable hoverable dimmable ' + d.line; })
        .classed('active', function (d) { return d.trip === highlightedTrip; })
        .classed('hover', function (d) { return d.trip === hoveredTrip; })
        .attr('r', mapGlyphTrainCircleRadius )
        .on('click', function (d) { highlightTrain(d); })
        .on('mouseover', hoverTrain)
        .on('mouseout', unHoverTrain);
    trains
        .attr('cx', function (d) { return d.pos[0]; })
        .attr('cy', function (d) { return d.pos[1]; });
    trains.exit().remove();
    timeDisplay.text(moment(unixSeconds * 1000).zone(4).format('h:mm a'));
    dateDisplay.text(moment(unixSeconds * 1000).zone(4).format('dddd, MMMM Do'));
  }





  /* 3. Set up the scaffolding for the Marey diagram
   *************************************************************/
  var marey = d3.select(".marey").text('').style('text-align', 'left').append('svg');
  var mareyContainer = d3.select('.marey-container').classed('loading', false);
  var timeDisplay = mareyContainer.selectAll('.marey-time');
  var dateDisplay = mareyContainer.selectAll('.marey-date');
  var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) { return d.name; });
  marey.call(tip);
  d3.select('body').on('click.highlightoff', function () { highlightedTrip = null; highlight(); });




  /* 4. On load and when the screen width changes
   *
   * This section makes heavy use of a utility defined in
   * common.js 'appendOnce' that when called adds a new element
   * or returns the existing element if it already exists.
   *************************************************************/
   // first some state shared across re-renderings
  var showingMap = false;
  var highlightedTrip = null;
  var hoveredTrip = null;
  var lastWidth = null;

  // the method that actually gets called on screen size chages
  function renderMarey(outerSvg, fullMareyOuterWidth) {
    fullMareyOuterWidth = Math.round(fullMareyOuterWidth);
    if (fullMareyOuterWidth === lastWidth) { return; }
    lastWidth = fullMareyOuterWidth;



    /* 4a. Render the full Marey
     *************************************************************/
    var fullMareyMargin = {top: 140, right: 200, bottom: 0, left: 60};
    var fullMareyOuterHeight = Math.round((maxUnixSeconds - minUnixSeconds) * 3500 / 25 / 60 / 60);
    var fullMareyWidth = fullMareyOuterWidth - fullMareyMargin.left - fullMareyMargin.right,
        fullMareyHeight = fullMareyOuterHeight - fullMareyMargin.top - fullMareyMargin.bottom;
    outerSvg.attr('width', fullMareyOuterWidth)
        .attr('height', fullMareyOuterHeight);

    var fullMareyHeader = outerSvg.appendOnce('g', 'header')
        .attr('transform', 'translate(' + fullMareyMargin.left + ',0)');
    var fullMareyBodyContainer = outerSvg.appendOnce('g', 'main')
        .attr('transform', 'translate(' + fullMareyMargin.left + ', ' + fullMareyMargin.top + ')');
    var fullMareyBackground = fullMareyBodyContainer.appendOnce('g', 'background');
    var fullMareyForeground = fullMareyBodyContainer.appendOnce('g', 'foreground');

    var xScale = d3.scale.linear()
        .domain(xExtent)
        .range([0, fullMareyWidth]);
    var yScale = d3.scale.linear()
      .domain([
        minUnixSeconds,
        maxUnixSeconds
      ]).range([15, fullMareyHeight]).clamp(true);

    var timeScale = d3.time.scale()
      .domain([new Date(minUnixSeconds * 1000), new Date(maxUnixSeconds * 1000)])
      .range([15, fullMareyHeight]);

    // draw the station label header aross the top
    var keys = d3.keys(header);
    var stationXScale = d3.scale.ordinal()
        .domain(keys)
        .range(keys.map(function (d) { return xScale(header[d][0]); }));
    var stationXScaleInvert = {};
    keys.forEach(function (key) {
      stationXScaleInvert[header[key][0]] = key;
    });

    var stationLabels = fullMareyHeader.selectAll('.station-label')
        .data(nodesPerLine);

    stationLabels
        .enter()
      .append('text')
        .attr('class', 'station-label')
        .style('display', function (d) { return end[d] ? null : 'none'; })
        .style('text-anchor', 'start')
        .text(function (d) { return VIZ.fixStationName(stationToName[d]); });

    stationLabels
        .attr('transform', function (d) { return 'translate(' + (stationXScale(d) - 2) + ',' + (fullMareyMargin.top - 3) + ')rotate(-70)'; });

    var stations = fullMareyForeground.selectAll('.station')
        .data(nodesPerLine, function (d) { return d; });

    stations
        .enter()
      .append('line')
        .attr('class', function (d) { return 'station ' + d.replace('|', '-'); });

    stations
        .attr('x1', function (d) { return xScale(header[d][0]); })
        .attr('x2', function (d) { return xScale(header[d][0]); })
        .attr('y1', 0)
        .attr('y2', fullMareyHeight);

    // draw the branch labels below station headers
    function label(id, clazz, text) {
      var x = xScale(header[id + '|' + clazz][0]) + 10;
      var circle = fullMareyForeground.appendOnce('circle', id + ' ' + clazz);
      var y = 24;

      circle.firstTime
        .attr('r', 7)
        .attr('cy', y);

      circle.attr('cx', x);
      
      var textElem = fullMareyForeground.appendOnce('text', id + ' text ' + clazz);

      textElem.firstTime
          .style('fill', 'white')
          .style('font-weight', 'bold')
          .style('stroke', 'none')
          .style('text-anchor', 'middle')
          .attr('y', y + 4)
          .text(text);

      textElem.attr('x', x);

      var branchText = fullMareyForeground.appendOnce('text', id + ' branch-text ' + clazz);

      branchText.firstTime
          .style('fill', 'black')
          // .style('font-weight', 'bold')
          .style('stroke', 'none')
          // .style('text-anchor', 'beginning')
          .attr('y', y + 4)
          .text('Branch');

      branchText.attr('x', x + 10);
    }
    label('place-kencl', 'green-b', 'B');
    label('place-kencl', 'green-c', 'C');
    label('place-kencl', 'green-d', 'D');
    label('place-coecl', 'green-e', 'E');

    // draw the tall time axis down the side
    var yAxis = d3.svg.axis()
      .tickFormat(function (d) { return moment(d).zone(4).format("h:mm A"); })
      .ticks(d3.time.minute, 15)
      .scale(timeScale)
      .orient("left");
    fullMareyForeground.appendOnce('g', 'y axis').call(yAxis);
    var lineMapping = d3.svg.line()
      .x(function(d) { return d[0]; })
      .y(function(d) { return d[1]; })
      .defined(function (d) { return d !== null; })
      .interpolate("linear");
    var mareyLines = fullMareyForeground.selectAll('.mareyline')
        .data(trips, function (d) { return d.trip; });

    if (!VIZ.ios) {
      fullMareyForeground.firstTime
          .onOnce('mouseover', 'path.mareyline', hoverTrain)
          .onOnce('mouseout', 'path.mareyline', unHoverTrain)
          .onOnce('click', 'path.mareyline', highlightTrain);
    }
    mareyLines
        .enter()
      .append('path')
        .attr('class', function (d) { return 'mareyline hoverable highlightable dimmable ' + d.line; });
    mareyLines
        .attr('transform', function (d) {
          if (!d.origY) { d.origY = yScale(d.stops[0].time); }
          return 'translate(0,' + d.origY + ')';
        })
        .attr('d', draw(xScale, yScale));
    mareyContainer.select('.fixed-right').on('mousemove', selectTime);
    mareyContainer.select('.fixed-right').on('mousemove.titles', updateTitle);
    var barBackground = fullMareyBackground.appendOnce('g', 'g-bar hide-on-ios');
    var barForeground = fullMareyForeground.appendOnce('g', 'g-bar hide-on-ios');
    barBackground.appendOnce('line', 'bar')
        .attr('x1', 1)
        .attr('x2', fullMareyWidth)
        .attr('y1', 0)
        .attr('y2', 0);
    barForeground.appendOnce('rect', 'text-background').firstTime
      .attr('x', 3)
      .attr('y', -14)
      .attr('width', 45)
      .attr('height', 12);
    barForeground.appendOnce('text', 'marey-time').firstTime
      .attr('dx', 2)
      .attr('dy', -4);
    timeDisplay = mareyContainer.selectAll('.marey-time');
    dateDisplay = mareyContainer.selectAll('.marey-date');
    var bar = mareyContainer.selectAll("g.g-bar");

    // If a previous time was selected, then select that time again now
    if (!lastTime) {
      select(minUnixSeconds);
    }

    // on hover, show the station you are hovered on
    function updateTitle() {
      var pos = d3.mouse(fullMareyForeground.node());
      var x = pos[0];
      var station = stationXScaleInvert[Math.round(xScale.invert(x))];
      if (station) {
        highlightMareyTitle(station, null, pos[1]);
      }
    }

    // on hover, set the time that is displayed in the map glyph on the side
    function selectTime() {
      var pos = d3.mouse(fullMareyForeground.node());
      var y = pos[1];
      var x = pos[0];
      if (x > 0 && x < fullMareyWidth) {
        var time = yScale.invert(y);
        select(time);
      }
    }

    // actually set the time for the map glyph once the time is determined
    function select(time) {
      var y = yScale(time);
      bar.attr('transform', 'translate(0,' + y + ')');
      timeDisplay.text(moment(time * 1000).zone(4).format('h:mm a'));
      dateDisplay.text(moment(time * 1000).zone(4).format('dddd MMMM Do'));
      renderTrainsAtTime(time);
    }

    // Get a list of [x, y] coordinates for all train trips for
    // both the Marey Diagram
    function getPointsFromStop(xScale, yScale, d, relative) {
      var flattenedStops = d.stops;
      var startX = xScale(header[d.stops[0].stop + '|' + d.line][0]);
      var points = flattenedStops.map(function (stop) {
        if (!stop) { return null; }
        var y = yScale(stop.time) - yScale(flattenedStops[0].time);
        var x = xScale(header[stop.stop + '|' + d.line][0]);
        if (relative) {
          x -= startX;
        }
        return [x, y];
      });
      return points;
    }
    function draw(xScale, yScale, relative) {
      return function (d) {
        var points = getPointsFromStop(xScale, yScale, d, relative);
        return lineMapping(points);
      };
    }


    // Add day labels directly on the Marey Diagram
    var dayLabels = fullMareyForeground.selectAll('.daylabel')
        .data(['2014/10/23 11:45', '2014/10/24 04:45', '2014/10/25 04:30'], function (d) { return d; });
    dayLabels.enter().append('text')
      .attr('class', 'daylabel')
      .style('text-anchor', 'middle')
      .attr('y', function (d) {
        return yScale(moment(d + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000);
      })
      .text(function (d) {
        return moment(d + ' -0400', 'YYYY/MM/DD HH:m ZZ').format('dddd MMMM Do');
      });

    dayLabels.attr('x', fullMareyWidth / 2);


    /* 4b. Render annotations for the full Marey
     *************************************************************/
    var annotationContainer = outerSvg.appendOnce('g', 'annotations')
        .attr('transform', 'translate(' + fullMareyMargin.left + ', ' + fullMareyMargin.top + ')');
    var annotations = annotationContainer.selectAll('.annotation').data(sideAnnotationData);
    annotations
        .enter()
      .append('g')
        .attr('class', 'annotation')
      .append('text');

    annotations.selectAll('text')
        .attr('id', function (d) { return d.id; })
        .text(function (d) { return d.text; })
        .call(VIZ.wrap, fullMareyMargin.right - 20);

    var connections = annotations.selectAll('.annotation-connection')
        .data(function (d) { return (d.connections || []).map(function (c) { c.parent = d; return c; }); });

    connections.enter()
      .append('path')
        .attr('class', 'annotation-connection');

    // Draw annotation lines
    connections
        .attr('d', function (connection) {
          var station = network.nodes.find(function (station) { return new RegExp(connection.station, 'i').test(station.name); });
          var annotationY = yScale(moment(connection.parent.time + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000) - 4;
          var connectionStartY = yScale(moment(connection.start + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000);
          var connectionEndY = yScale(moment(connection.stop + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000);
          var connectionSingleY = yScale(moment(connection.time + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000);
          var connectionX = xScale(header[station.id + '|' + connection.line][0]);
          return 'M' + [
            [
              [fullMareyWidth + 10, annotationY],
              [
                connection.time ? connectionX : connectionX + 3,
                connection.time ? connectionSingleY : (connectionStartY + connectionEndY) / 2
              ]
            ],
            !connection.time ? [
              [connectionX, connectionStartY],
              [connectionX + 3, connectionStartY],
              [connectionX + 3, connectionEndY],
              [connectionX, connectionEndY]
            ] : null
          ].filter(function (d) { return !!d; }).map(function (segment) { return segment.map(function (point) { return point.map(Math.round).join(','); }).join('L'); }).join('M');
        });

    annotationContainer.selectAll('text, text tspan')
        .attr('x', fullMareyWidth + 15)
        .attr('y', function (d) { return yScale(moment(d.time + ' -0400', 'YYYY/MM/DD HH:m ZZ').valueOf() / 1000); });


    // add links to annotations if they are set
    // find the text elements that need links
    var annotationsWithLinks = annotationContainer.selectAll('text tspan')
      .filter(function (d) {
        if (d.link && d3.select(this).text().indexOf(d.link.text) > -1) {
          return this;
        }
        return null;
      });

    // clear previous underlines
    annotationContainer.selectAll('polyline').remove();

    annotationsWithLinks.each(function (d) {
      // split into three parts, start text, link, end text
      var thisSelection = d3.select(this);
      var text = thisSelection.text();
      thisSelection.text(text.substring(0, text.indexOf(d.link.text)));
      var endText = text.substring(text.indexOf(d.link.text) + d.link.text.length, text.length);

      var parentNode = d3.select(this);
      var offset = parentNode.node().getComputedTextLength();
      var clicked = false;
      var linkNode = parentNode.append('tspan')
        .text(d.link.text)
        .attr('class', 'click-link')
        .on('click', function (d) {
          clicked = !clicked;
          if (clicked) {
            highlightTrain({'trip': d.link.trip });
          } else {
            highlightTrain(null);
          }
        })
        .on('mouseover', function (d) {
          if (d.link.trip !== highlightedTrip && clicked) {
            clicked = false;
          }
          highlightTrain({'trip': d.link.trip });
          underline.style('stroke-dasharray', '3,0');
        })
        .on('mouseout', function () {
          if (!clicked) {
            highlightTrain(null);
          }
          underline.style('stroke-dasharray', '3,3');
        });

      parentNode.append('tspan')
        .text(endText);

      // add the underline
      var annoationGElement = this.parentNode.parentNode;
      var underline = d3.select(annoationGElement).append('polyline')
         .attr('class', 'click-link')
         .attr('points', function() {
          var textStart = offset + parseInt(parentNode.attr('x'), 10);
          var textEnd = textStart + linkNode.node().getComputedTextLength();
          var yPos = parseInt(parentNode.attr('y'), 10) + 4;
          var path = textStart +','+yPos;
          path = path+ ' '+textEnd + ',' +yPos;
          return path;
        });
    });
  }




  /* 5. Add interaction behavior with surrounding text
   *************************************************************/
  // Setup the links in text that scroll to a position in the marey diagram
  // <a href="#" data-dest="id of dist dom element to scroll to" class="scrollto">...
  fixedLeft.selectAll('.scrollto')
    .on('click', function () {
      var id = d3.select(this).attr('data-dest');
      var $element = $("#" + id);
      $('body, html').animate({scrollTop:$element.position().top}, '300', 'swing');
      d3.event.preventDefault();
    });

  // Setup the links in text that highlight a particular line
  // <a href="#" data-line="color of line to highlight" class="highlight">...
  fixedLeft.selectAll('.highlight')
    .on('click', function () {
      d3.event.preventDefault();
    })
    .on('mouseover', function () {
      var line = d3.select(this).attr('data-line');
      var others = _.without(['green', 'green-b', 'green-c', 'green-d', 'green-e'], line);
      others.forEach(function (other) {
        mareyContainer.selectAll('.' + other + ', .' + other + '-dimmable, circle.middle').classed('line-dimmed', true);
      });
    })
    .on('mouseout', function () {
      mareyContainer.selectAll('.line-dimmed').classed('line-dimmed', false);
    });



  /* Bootstrap the Visualization - and re-render on width changes
   *************************************************************/
  VIZ.watchFixedRight(function (width) {
    showingMap = true;
    renderMarey(marey, width);
    renderTrainsAtTime();
  });
  renderSideMap(mapGlyphSvg, 300, 800);





  /* Miscellaneous Utilities
   *************************************************************/
  function highlight() {
    mareyContainer.classed('highlight-active', !!highlightedTrip);
    mareyContainer.selectAll('.highlightable')
      .classed('active', function (d) { return d.trip === highlightedTrip; });
  }
  function highlightTrain(d) {
    if (d === null) {
      highlightedTrip = null;
    } else {
      highlightedTrip = d.trip;
    }
    highlight();
    d3.event.stopPropagation();
  }
  function unHoverTrain() {
    hoveredTrip = null;
    hover();
  }
  function hoverTrain(d) {
    hoveredTrip = d.trip;
    hover();
  }
  function hover() {
    d3.selectAll('.hoverable')
      .classed('hover', function (d) { return d.trip === hoveredTrip; });
  }
  function highlightMareyTitle(title, lines, y) {
    var titles = {};
    titles[title] = true;
    if (lines) {
      lines.forEach(function (line) { titles[title + "|" + line] = true; });
    } else if (title) {
      titles[title] = true;
      titles[title.replace(/\|.*/, '')] = true;
    }
    var stationLabels = marey.selectAll('text.station-label');
    stationLabels.style('display', function (d) {
      var display = end[d] || titles[d];
      return display ? null : 'none';
    });
    stationLabels.classed('active', function (d) {
      return titles[d.id ? d.id : d];
    });
    var id = title ? title.split("|")[0] : null;
    mapGlyphSvg.selectAll('.station').classed('active', function (d) {
      return id && y && (y < 0) && d.id === id;
    });
  }

  function placeWithOffset(from, to, ratio) {
    var fromPos = idToNode[from.stop].pos;
    var toPos = idToNode[to.stop].pos;
    var midpoint = d3.interpolate(fromPos, toPos)(ratio);
    var angle = Math.atan2(toPos[1] - fromPos[1], toPos[0] - fromPos[0]) + Math.PI / 2;
    return [midpoint[0] + Math.cos(angle) * mapGlyphTrainCircleRadius, midpoint[1] + Math.sin(angle) * mapGlyphTrainCircleRadius ];
  }
});