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
 * 3. Set up the scaffolding for lined-up and full Marey diagrams
 * 4. On load and when the screen width changes:
 *   4a. Render the full Marey
 *   4b. Render annotations for the full Marey
 *   4c. Render the lined-up Marey
 *   4d. Set up listener to zoom in on a particular trip of the lined-up marey when user clicks on it
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
      text: 'At noon on Thursday, October 23rd 2014 the MBTA began publishing live output from a new system that provides train location data for the Green Line.'
    },
    {
      time: '2014/10/23 13:50',
      text: 'The new system uses GPS to locate each train. The signal disappears when trains go below ground on the main trunk and first several stops of each branch. <br> <br> They are adding GPS tracking to the final trains now and the next phase of their project will include location information for underground trains.',
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





  /* 3. Set up the scaffolding for lined-up and full Marey diagrams
   *************************************************************/
  var marey = d3.select(".marey").text('').style('text-align', 'left').append('svg');
  var mareyContainer = d3.select('.marey-container').classed('loading', false);
  d3.select(".lined-up-marey").text('');
  var timeDisplay = mareyContainer.selectAll('.marey-time');
  var dateDisplay = mareyContainer.selectAll('.marey-date');
  var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) { return d.name; });
  marey.call(tip);
  var linedUpMargin = {top: 50, right: 40, bottom: 60, left: 80};
  var linedUpOuterHeight = 430;
  var linedUpHeight = linedUpOuterHeight - linedUpMargin.top - linedUpMargin.bottom;
  var linedUpDayScale = d3.time.scale()
    .domain([0, 24 * 60 * 60 * 1000])
    .range([0, linedUpHeight])
    .clamp(true);
  var brush = d3.svg.brush()
      .y(linedUpDayScale)
      .extent([7 * 60 * 60 * 1000, 9 * 60 * 60 * 1000])
      .clamp(true)
      .on("brush", brushed);
  d3.select('body').on('click.highlightoff', function () { highlightedTrip = null; highlight(); });

  // lined-up Marey diagram costants used to position the starting points of each trip
  // as well as orient the labels that describe each line
  var linedUpMareyStartingStationLabels = {
    'place-bland': {text: "Blandford", anchor: "start"},
    'place-lake': {text: "Boston College", anchor: "end"},
    'place-smary': {text: "St. Mary", anchor: "start"},
    'place-clmnl': {text: "Cleveland Circle", anchor: "end"},
    'place-fenwy': {text: "Fenway", anchor: "start"},
    'place-river': {text: "Riverside", anchor: "end"},
    'place-nuniv': {text: "Northeastern", anchor: "start"},
    'place-hsmnl': {text: "Heath", anchor: "end"}
  };
  var linedUpMareyStartingStations = Object.keys(linedUpMareyStartingStationLabels);
  var linedUpXScale = d3.scale.ordinal()
      .domain(linedUpMareyStartingStations);
  var maxLinedUpMareyChartWidth = 970;
  var betweenStarts = 0.02;
  var betweenEnds = 0.07;
  var linedUpMareyXScaleRatioFromFullMarey = 0.82 * (1 - betweenEnds * 4 - betweenStarts * 3);
  var originalLinedUpMareyXScaleRatioFromFullMarey = linedUpMareyXScaleRatioFromFullMarey;
  var linedUpMareyLineEndPositions = (function calcPlacement() {
    var bStops = _.max(trips, function (d) { return d.stops[0].stop === 'place-bland' ? d.stops.length : 0; }).stops.length - 4;
    var cStops = _.max(trips, function (d) { return d.stops[0].stop === 'place-smary' ? d.stops.length : 0; }).stops.length - 4;
    var dStops = _.max(trips, function (d) { return d.stops[0].stop === 'place-fenwy' ? d.stops.length : 0; }).stops.length - 4;
    var eStops = _.max(trips, function (d) { return d.stops[0].stop === 'place-nuniv' ? d.stops.length : 0; }).stops.length - 4;
    var totalStops = bStops + cStops + dStops + eStops;
    var forLines = (1 - betweenEnds * 4 - betweenStarts * 3);
    var bAllocation = forLines * bStops / totalStops / 2;
    var cAllocation = forLines * cStops / totalStops / 2;
    var dAllocation = forLines * dStops / totalStops / 2;
    var eAllocation = forLines * eStops / totalStops / 2;
    var diffs = [
      0,
      bAllocation * 2 + betweenEnds,
      betweenStarts,
      cAllocation * 2 + betweenEnds,
      betweenStarts,
      dAllocation * 2 + betweenEnds,
      betweenStarts,
      eAllocation * 2 + betweenEnds
    ];
    diffs.forEach(function (d, i) {
      diffs[i] = (i === 0 ? 0 : diffs[i - 1]) + d;
    });
    return diffs;
  }());
  var linedUpMareyMidpointLabelPositions = [
    d3.mean([linedUpMareyLineEndPositions[0], linedUpMareyLineEndPositions[1]]),
    d3.mean([linedUpMareyLineEndPositions[0], linedUpMareyLineEndPositions[1]]),
    d3.mean([linedUpMareyLineEndPositions[2], linedUpMareyLineEndPositions[3]]),
    d3.mean([linedUpMareyLineEndPositions[2], linedUpMareyLineEndPositions[3]]),
    d3.mean([linedUpMareyLineEndPositions[4], linedUpMareyLineEndPositions[5]]),
    d3.mean([linedUpMareyLineEndPositions[4], linedUpMareyLineEndPositions[5]]),
    d3.mean([linedUpMareyLineEndPositions[6], linedUpMareyLineEndPositions[7]]),
    d3.mean([linedUpMareyLineEndPositions[6], linedUpMareyLineEndPositions[7]]),
  ];
  var linedUpTrips = trips.filter(function (trip) {
    return _.contains(linedUpMareyStartingStations, trip.stops[0].stop);
  });
  var linedUpYScale = d3.scale.linear()
    .domain([0, d3.max(linedUpTrips, function (trip) {
      return trip.stops[trip.stops.length - 1].time - trip.stops[0].time;
    })]);
  var linedUpTimeScale = d3.time.scale()
    .domain([0, d3.max(linedUpTrips, function (trip) {
      return 1000 * (trip.stops[trip.stops.length - 1].time - trip.stops[0].time);
    })]);




  /* 4. On load and when the screen width changes
   *
   * This section makes heavy use of a utility defined in
   * common.js 'appendOnce' that when called adds a new element
   * or returns the existing element if it already exists.
   *************************************************************/
   // first some state shared across re-renderings
  var frozen = false;
  var showingMap = false;
  var highlightedLinedUpMarey = null;
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
    // both the full Marey and the lined-up Marey
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





    /* 4c. Render the lined-up Marey
     *************************************************************/
    resetScale(linedUpYScale);
    resetScale(linedUpXScale);
    resetScale(linedUpTimeScale);
    linedUpMareyXScaleRatioFromFullMarey = originalLinedUpMareyXScaleRatioFromFullMarey;
    var linedUpOuterWidth = Math.min($('.lined-up-marey-container .container').width(), maxLinedUpMareyChartWidth);
    var linedUpWidth = linedUpOuterWidth - linedUpMargin.left - linedUpMargin.right;
    linedUpOuterHeight = linedUpOuterWidth * 300 / 780;
    linedUpHeight = linedUpOuterHeight - linedUpMargin.top - linedUpMargin.bottom;
    linedUpDayScale.range([0, linedUpHeight]);
    linedUpYScale.range([0, linedUpHeight]);
    var linedUpSvg = d3.select('.lined-up-marey').appendOnce('svg', 'lined-up')
        .attr('width', linedUpOuterWidth)
        .attr('height', linedUpOuterHeight);
    var linedUp = linedUpSvg.appendOnce('g', 'g');
    var linedUpOverlay = linedUpSvg.appendOnce('g', 'overlay');
    linedUp.firstTime.attr('transform', 'translate(' + linedUpMargin.left + ',' + linedUpMargin.top + ')');
    linedUpOverlay.firstTime.attr('transform', 'translate(' + linedUpMargin.left + ',' + linedUpMargin.top + ')');
    linedUpXScale.range(linedUpMareyLineEndPositions.map(function (d) { return d * linedUpWidth; }));
    var linedUpXPlacementScale = d3.scale.ordinal()
        .domain(linedUpMareyStartingStations)
        .range(linedUpMareyMidpointLabelPositions.map(function (d) { return d * linedUpWidth; }));
    linedUpYScale.range([0, linedUpHeight]);
    linedUpTimeScale.range([0, linedUpHeight]);

    var linedUpDayAxis = d3.svg.axis()
      .scale(linedUpDayScale)
      .tickFormat(d3.time.format.utc("%-I %p"))
      .orient('left')
      .ticks(d3.time.hour, 2);

    var brushAxis = linedUp.appendOnce('g', 'time axis')
      .attr('transform', 'translate(-40,0)')
      .call(linedUpDayAxis);

    brushAxis.on('mousemove.brush', function () {
      var y = d3.mouse(brushAxis.node())[1];
      var time = linedUpDayScale.invert(y);
      brush.extent([time.getTime() - 60 * 60 * 1000, time.getTime() + 60 * 60 * 1000]);
      d3.selectAll('g.brush').call(brush).on('mousedown.brush', null).on('touchstart.brush', null);
      brushed();
    });

    brushAxis.appendOnce("g", "brush").firstTime
        .call(brush)
        .call(brushed)
        .on('mousedown.brush', null).on('touchstart.brush', null)
      .selectAll("rect")
        .attr("x", -45)
        .attr("width", 50);


    var linedUpAxis = d3.svg.axis()
      .tickFormat(function (d) { return Math.round(d / 1000 / 60) + 'm'; })
      .innerTickSize(-linedUpWidth)
      .outerTickSize(0)
      .ticks(d3.time.minutes, 10)
      .scale(linedUpTimeScale)
      .orient("left");

    var axis = linedUp.appendOnce('g', 'y axis')
      .call(linedUpAxis);

    axis.appendOnce('text', 'label light-markup')
      .attr('transform', 'rotate(90)translate(' + (linedUpHeight/2) + ',-5)')
      .attr('text-anchor', 'middle')
      .text('minutes since start of trip');

    linedUp.appendOnce('text', 'top-label light-markup')
      .text('Starting Station')
      .attr('text-anchor', 'middle')
      .attr('x', linedUpWidth /2)
      .attr('y', -34);
    linedUp.appendOnce('text', 'bottom-label light-markup')
      .text('Ending Station')
      .attr('text-anchor', 'middle')
      .attr('x', linedUpWidth /2)
      .attr('y', linedUpHeight + 30);
    var stationHeaders = linedUp.selectAll('.station-header')
        .data(linedUpMareyStartingStations.filter(function (d) { return linedUpMareyStartingStationLabels[d].text; }));
    stationHeaders
        .enter()
      .append('g')
        .attr('class', 'station-header')
      .append('text')
        .attr('text-anchor', function (d) {
          return linedUpMareyStartingStationLabels[d].anchor;
        })
        .attr('dx', function (d) {
          return linedUpMareyStartingStationLabels[d].anchor === 'start' ? -4 : 4;
        })
        .attr('dy', -2)
        .text(function (d) {
          return linedUpMareyStartingStationLabels[d].text;
        });
    function placeStationHeader(selection) {
      selection
          .attr('transform', function (d) {
            return 'translate(' + linedUpXScale(d) + ',-10)';
          });
    }
    stationHeaders.call(placeStationHeader);

    var linedUpMareyContainer = linedUp.appendOnce('g', 'mareylinecontainer');
    linedUpMareyContainer.firstTime.attr('clip-path', 'url(#mareyClip)');
    linedUp
      .appendOnce('defs', 'defs')
      .appendOnce('clipPath', 'clip')
        .attr('id', 'mareyClip')
      .appendOnce('rect', 'clipRect')
        .attr('width', linedUpWidth)
        .attr('height', linedUpHeight);

    var linedUpMareyLines = linedUpMareyContainer.selectAll('.mareyline')
        .data(linedUpTrips, function (d) { return d.trip; });

    var t = null;
    if (!VIZ.ios) {
      linedUp
          .off('mouseover mouseout')
          .onOnce('mouseover', 'path', function (d) {
            clearTimeout(t);
            highlightLinedUpMarey(d);
            d3.select(this).moveToFront();
          })
          .onOnce('mouseout', 'path', function () {
            clearTimeout(t);
            t = setTimeout(unhighlightLinedUpMarey, 100);
          });
    }

    linedUpMareyLines
        .enter()
      .append('path')
        .attr('class', function (d) { return 'mareyline ' + d.line; });
    linedUpMareyLines.call(drawLinedUpLines);

    var linedUpBranchLabel = linedUp.appendOnce('g', 'lined-up-branch-label');

    function labelLinedUp(n, branch) {
      var x = linedUpMareyMidpointLabelPositions[n] * linedUpWidth - 20;
      var circle = linedUpBranchLabel.appendOnce('circle', 'green label ' + branch);
      var y = -2;

      circle.firstTime
        .attr('r', 7)
        .attr('cy', y);

      circle.attr('cx', x);
      
      var textElem = linedUpBranchLabel.appendOnce('text', 'lineduplabel ' + branch);

      textElem.firstTime
          .style('fill', 'white')
          .style('font-weight', 'bold')
          .style('stroke', 'none')
          .style('text-anchor', 'middle')
          .attr('y', y + 4)
          .text(branch);

      textElem.attr('x', x);

      var branchText = linedUpBranchLabel.appendOnce('text', 'branch-text ' + branch);

      branchText.firstTime
          .style('fill', 'black')
          .style('stroke', 'none')
          .attr('y', y + 4)
          .text('Branch');

      branchText.attr('x', x + 10);
    }
    labelLinedUp(0, 'B');
    labelLinedUp(2, 'C');
    labelLinedUp(4, 'D');
    labelLinedUp(6, 'E');


    function modifiedXScale(d) {
      return linedUpMareyXScaleRatioFromFullMarey * xScale(d) * linedUpWidth / fullMareyWidth;
    }

    // use the same utility that draws the marey lines in the full marey diagram to 
    // render them in the lined-up marey diagram
    function drawLinedUpLines(lines) {
      lines
          .attr('transform', function (d) {
            var firstX = linedUpXScale(d.stops[0].stop);
            return 'translate(' + firstX + ',0)';
          })
          .attr('d', draw(modifiedXScale, linedUpYScale, true));
    }
    // Draw additional details when user hovers over a lined-up Marey line
    function highlightLinedUpMarey(d) {
      if (frozen) { return; }
      unhighlightLinedUpMarey();
      highlightedLinedUpMarey = d;
      linedUp.appendOnce('text', 'mareyannotation');
      var last = d.stops[d.stops.length - 1];
      var first = d.stops[0];
      var xEnd = linedUpXPlacementScale(first.stop);
      var xBegin = linedUpXScale(first.stop);
      var y = linedUpYScale((last.time - first.time));
      linedUp.appendOnce('text', 'mareyannotation start')
        .attr('x', xBegin + (linedUpMareyStartingStationLabels[first.stop].anchor === 'start' ?  5 : -5))
        .attr('y', -2)
        .style('text-anchor', linedUpMareyStartingStationLabels[first.stop].anchor)
        .text(moment(first.time * 1000).zone(4).format('h:mma'));
      linedUp.appendOnce('text', 'mareyannotation clickme')
        .attr('x', xEnd)
        .attr('y', 16)
        .style('text-anchor', 'middle')
        .classed('light-markup', true)
        .text('Click for details');
      linedUp.appendOnce('text', 'mareyannotation end')
        .attr('x', xEnd)
        .attr('y', y + 15)
        .style('text-anchor', 'middle')
        .text(moment(last.time * 1000).zone(4).format('h:mma'));
      linedUp.appendOnce('text', 'mareyannotation time')
        .attr('x', xEnd)
        .attr('y', y + 30)
        .style('text-anchor', 'middle')
        .text(Math.round((last.time - first.time) / 60) + 'm');
      linedUpOverlay.selectAll('g.mareystops')
          .data([d])
          .enter()
        .append('g')
          .attr('class', 'mareystops')
          .call(drawStops, modifiedXScale, linedUpYScale);
      linedUpOverlay.selectAll('g.mareynames')
          .data([d])
          .enter()
        .append('g')
          .attr('class', 'mareynames');

      linedUp.selectAll('.mareyline').classed({
        highlight: function (other) { return other === d; },
        dimmed: function (other) { return other !== d; }
      });
    }
    function unhighlightLinedUpMarey() {
      if (!highlightedLinedUpMarey || frozen) { return; }
      highlightedLinedUpMarey = null;
      linedUp.selectAll('.mareyannotation').remove();
      linedUpOverlay.selectAll('*').remove();
      linedUp.selectAll('.mareyline').classed({
        highlight: false,
        dimmed: false
      });
    }





    /* 4d. Set up listener to zoom in on a particular trip of the lined-up marey when user clicks on it
     *************************************************************/
    var TRANSITION_DURATION = 1000;
    if (!VIZ.ios) {
      d3.selectAll('.lined-up-marey')
          .on('click.toggle', function () { freezeHighlightedMarey(null, !frozen); });
    }
    // initialize to not frozen
    freezeHighlightedMarey(highlightedLinedUpMarey, frozen, true);

    function freezeHighlightedMarey(d, freeze, now) {
      var duration = now ? 0 : TRANSITION_DURATION;
      highlightedLinedUpMarey = highlightedLinedUpMarey || d;
      resetScale(linedUpTimeScale);
      resetScale(linedUpYScale);
      resetScale(linedUpXScale);
      linedUpMareyXScaleRatioFromFullMarey = originalLinedUpMareyXScaleRatioFromFullMarey;
      frozen = freeze;
      if (highlightedLinedUpMarey && frozen) {
        // transition all of the pieces to zoom in on just the one trip
        // also add labels and times for each stop along the trip
        var max = 1.1*(highlightedLinedUpMarey.end - highlightedLinedUpMarey.begin);
        tempSetDomain(linedUpTimeScale, [0, max * 1000]);
        var ratio = max / linedUpYScale.domain()[1];
        tempSetDomain(linedUpYScale, [0, max]);
        var start = highlightedLinedUpMarey.stops[0];
        var end = highlightedLinedUpMarey.stops[highlightedLinedUpMarey.stops.length - 1];

        var startX = linedUpXScale(start.stop);
        var endX = startX + xScale(header[end.stop + '|' + highlightedLinedUpMarey.line][0]) - xScale(header[start.stop + '|' + highlightedLinedUpMarey.line][0]);

        var dir = linedUpMareyStartingStationLabels[start.stop].anchor;
        var conversionScale = d3.scale.linear()
            .domain([startX, endX])
            .range(dir === 'start' ? [50, linedUpWidth - 50] : [linedUpWidth - 50, 50]);
        tempSetRange(linedUpXScale, linedUpXScale.range().map(conversionScale));
        linedUpMareyXScaleRatioFromFullMarey = originalLinedUpMareyXScaleRatioFromFullMarey * 1.5 / ratio;
        linedUp.selectAll('.mareyannotation').remove();
        (now ? stationHeaders : stationHeaders.transition().duration(duration))
          .call(placeStationHeader)
          .style('opacity', 0);
        (now ? linedUpBranchLabel : linedUpBranchLabel.transition().duration(duration / 3))
          .style('opacity', 0);
      } else {
        (now ? stationHeaders : stationHeaders.transition().duration(duration))
          .call(placeStationHeader)
          .style('opacity', 1);
        (now ? linedUpBranchLabel : linedUpBranchLabel.transition().delay(2 * duration / 3).duration(duration / 3))
          .style('opacity', 1);
      }
      linedUpOverlay.selectAll('.mareynames').call(drawLabels, modifiedXScale, linedUpYScale);
      axis.transition().duration(duration).call(linedUpAxis);
      linedUpOverlay.selectAll('g.mareystops').call(drawStops, modifiedXScale, linedUpYScale, !now);
      (now ? linedUpMareyLines : linedUpMareyLines.transition().duration(duration)).call(drawLinedUpLines);
      unhighlightLinedUpMarey();
    }
    // draw the time and station name labels on a selected trip
    function drawLabels(selection, xScale, yScale) {
      var items = selection
          .selectAll('.text')
          .data(function (d) {
            var startX = xScale(header[d.stops[0].stop + '|' + d.line][0]);
            var result = d.stops.map(function (stop) {
              if (!stop) { return null; }
              var y = yScale(stop.time) - yScale(d.stops[0].time);
              var x = xScale(header[stop.stop + '|' + d.line][0]) - startX;
              return {stop: stop, x: x, y: y, dytop: -1, dybottom: 9};
            });

            // prevent labels from overlapping eachother, iteratively push up/down until no overlap
            var last = -10;
            _.sortBy(result, 'y').forEach(function (d) {
              last += 9;
              if (last > d.y + d.dybottom) {
                d.dybottom = last - d.y;
              }
              last = d.y + d.dybottom;
            });
            last = 1000;
            _.sortBy(result, 'y').reverse().forEach(function (d) {
              last -= 9;
              if (last < d.y + d.dytop) {
                d.dytop = last - d.y;
              }
              last = d.y + d.dytop;
            });
            return result;
          }, function (d, i) { return i; });
      var labels = items.enter().append('g')
          .attr('class', 'text');
      labels.append('text')
          .attr('dx', function () { return linedUpMareyStartingStationLabels[highlightedLinedUpMarey.stops[0].stop].anchor === 'start' ? 2 : -2; })
          .attr('dy', function (d) { return d.dytop; })
          .text(function (d) {
            return VIZ.fixStationName(idToNode[d.stop.stop].name);
          })
          .attr('text-anchor', function () { return linedUpMareyStartingStationLabels[highlightedLinedUpMarey.stops[0].stop].anchor; });
      labels.append('text')
          .attr('dx', function () { return linedUpMareyStartingStationLabels[highlightedLinedUpMarey.stops[0].stop].anchor === 'start' ? -2 : 2; })
          .attr('dy', function (d) { return d.dybottom; })
          .text(function (d) {
            return moment(d.stop.time * 1000).zone(4).format('h:mma');
          })
          .attr('text-anchor', function () { return linedUpMareyStartingStationLabels[highlightedLinedUpMarey.stops[0].stop].anchor === 'start' ? 'end' : 'start'; });

      items
          .attr('transform', function (d) {
            var stop0 = highlightedLinedUpMarey.stops[0].stop;
            var firstX = linedUpXScale(stop0);
            return 'translate(' + (d.x + firstX) + ',' + d.y + ')';
          })
          .style('opacity', 0);

      items.transition().delay(TRANSITION_DURATION - 300).duration(300)
        .style('opacity', 1);
    }
    // place a dot for each stop on the line
    function drawStops(selection, xScale, yScale, trans) {
      var items = selection
          .selectAll('.point')
          .data(function (d) {
            var result = getPointsFromStop(xScale, yScale, d, true).filter(function (stop) { return !!stop; });
            var offset = linedUpXScale(d.stops[0].stop);
            result.forEach(function (stop) { stop.offset = offset; });
            return result;
          }, function (d, i) { return i; });
      items.enter()
        .append('circle')
          .attr('r', 2)
          .attr('class', 'point');

      (trans ? items.transition().duration(TRANSITION_DURATION) : items)
          .attr('cx', function (d) { return d.offset + d[0]; })
          .attr('cy', function (d) { return d[1]; });
    }
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

  // Setup the links in text that highlight part of the Marey diagram
  // <a href="#" data-lo="start hour of day" data-hi="end hour of day" class="lined-up-highlight">...
  d3.selectAll('.lined-up-highlight')
    .on('click', function () {
      d3.event.preventDefault();
    })
    .on('mouseover', function () {
      var lo = +d3.select(this).attr('data-lo');
      var hi = +d3.select(this).attr('data-hi');
      brush.extent([lo * 60 * 60 * 1000, hi * 60 * 60 * 1000]);
      d3.selectAll('g.brush').call(brush).on('mousedown.brush', null).on('touchstart.brush', null);
      brushed();
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
  function brushed() {
    var lo = brush.extent()[0] / 1000;
    var hi = brush.extent()[1] / 1000;
    d3.selectAll('.lined-up .mareyline')
        .classed('brush-highlighted', function (d) {
          return lo < d.secs && hi > d.secs;
        })
        .classed('brush-dimmed', function (d) {
          return lo >= d.secs || hi <= d.secs;
        });
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
  function tempSetDomain(scale, domain) {
    scale.oldDomain = scale.oldDomain || scale.domain();
    scale.domain(domain);
  }
  function tempSetRange(scale, range) {
    scale.oldRange = scale.oldRange || scale.range();
    scale.range(range);
  }

  function resetScale(scale) {
    if (scale.oldDomain) { scale.domain(scale.oldDomain); }
    if (scale.oldRange) { scale.range(scale.oldRange); }
    scale.oldDomain = null;
    scale.oldRange = null;
  }
});