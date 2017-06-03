var width = 950,
    height = 550,
    active = d3.select(null),
    senateData,
    houseData,
    usData,
    congressData,
    nomData,
    senateComs,
    houseComs,
    chamber,
    radioAttr = 'party',
    legendData,
    view = 'default';

var legend = d3.select('#legend').append('svg')
    .attr('width', 950)
    .attr('height', 44)
    .style('fill', 'none');

var chamberSelect = d3.selectAll('input[name="chamber"]')
    .on("change", switchChamber);

var attrSelect = d3.selectAll('input[name="attr"]')
    .on("change", switchAttr);

var committeeSelect = d3.select("#committeeControl").append("select")
    .attr("name", "committee")
    .on("change", showCommittee);

var nomineeSelect = d3.select("#nomineeControl").append("select")
    .attr("name", "nominee")
    .on("change", showNominee);

var sequentialColors = colorbrewer.PuRd[5];

var color = d3.scale.linear()
    .domain([0, 25, 50, 75, 100])
    .range(sequentialColors);

var zoom_c = false;

var projection = d3.geo.albersUsa();

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#content").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

var tooltip = d3.select("#tooltip").append("svg")
  .attr('width', width/2-90)
  .attr('height', height/2+25)

var g = svg.append("g");

svg.call(zoom.event);

d3.json("data/congressional_districts.json", function(congress) {
  d3.json("data/us.json", function(us) {
    d3.json("data/senate-members.json", function(senate) {
      d3.json("data/house-members.json", function(house) {
        d3.json("data/senate-committees.json", function(senateComsData) {
          d3.json("data/house-committees.json", function(houseComsData) {
            d3.json("data/nominees.json", function(nomineeData) {
                nomData = nomineeData;
                populateNomineeMenu();
            });
            senateComs = senateComsData;
            houseComs = houseComsData;
            populateCommitteeMenu();
          });
        });
        senateData = senate;
        houseData = house;
        congressData = congress;
        usData = us;
        draw_districts();
      });
    });
    svg.append("defs").append("path")
      .attr("id", "land")
      .datum(topojson.feature(us, us.objects.land))
      .attr("d", path);
    svg.append("clipPath")
      .attr("id", "clip-land")
    .append("use")
      .attr("xlink:href", "#land");
  });
});

function draw_states() {
  chamber = 'senate';
  g.selectAll("path")
      .data(topojson.feature(usData, usData.objects.states).features.filter(function(d) {
        var state = d.id;
        return state != 'DC' && state != 'PR' && state != 'VI';
      }))
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .attr('id', function(d) { return d.id; })
      .on("click", clicked)
      .on("mouseover", function(d){
        makeTooltip(d, 'a');
        makeTooltip(d, 'b');
      })
      .on("mouseout", function(d){
        tooltip.selectAll("rect")
          .remove();
        tooltip.selectAll("text")
          .remove();
      });

    if(radioAttr == 'party'){ showPartyAffiliation(); }
    else if(radioAttr == 'missed_votes'){ showMissedVotesPct(); }
    else { showVotesWithPartyPct(); }

    g.append("path")
        .datum(topojson.mesh(usData, usData.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "state-boundaries")
        .attr("d", path);
}

function draw_districts() {
  chamber = 'house';
  g.selectAll("path")
      .data(topojson.feature(congressData, congressData.objects.districts).features
        .filter(function(d) { return d.id < 6000; }))
    .enter().append("path")
      .attr("class", "districts feature")
      .attr("clip-path", "url(#clip-land)")
      .attr("d", path)
      .on("click", clicked)
      .on("mouseover", function(d){
        makeTooltip(d);
      })
      .on("mouseout", function(d){
        tooltip.selectAll("rect")
          .remove();
        tooltip.selectAll("text")
          .remove();
      });

  if(radioAttr == 'party'){ showPartyAffiliation(); }
  else if(radioAttr == 'missed_votes'){ showMissedVotesPct(); }
  else { showVotesWithPartyPct(); }

  g.append("path")
      .attr("class", "district-boundaries")
      .datum(topojson.mesh(congressData, congressData.objects.districts, function(a, b) {
        return a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0);
      }))
      .attr("d", path);

  g.append("path")
      .datum(topojson.mesh(usData, usData.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "state-boundaries")
      .attr("d", path);
}

function switchViews() {
  var hidden;
  var nomHidden;
  if (view === 'default') {
    view = 'nominees';
    hidden = true;
    nomHidden = null;
    showNominees();
  }
  else {
    view = 'default';
    hidden = null;
    nomHidden = true;
    g.selectAll('path').remove();
    if (chamber == 'senate') { draw_states(); }
    else { draw_districts(); }
    if (radioAttr == 'party') { showPartyAffiliation(); }
    else if (radioAttr == 'missed_votes') { showMissedVotesPct(); }
    else { showVotesWithPartyPct(); }
  }

  d3.select('#chamberControl').attr('hidden', hidden);
  d3.select('#attributeControl').attr('hidden', hidden);
  d3.select('#committeeControl').attr('hidden', hidden);
  d3.select('#nomineeControl').attr('hidden', nomHidden);
}

function showNominees() {
  g.selectAll("path").remove();
  legend.selectAll('rect').remove();
  legend.selectAll('text').remove();
  g.selectAll("path")
      .data(topojson.feature(usData, usData.objects.states).features.filter(function(d) {
        var state = d.id;
        return state != 'DC' && state != 'PR' && state != 'VI';
      }))
      .enter().append("path")
        .attr("d", path)
        .attr("class", "feature");

  drawNominees();

  g.append("path")
      .datum(topojson.mesh(usData, usData.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "state-boundaries")
      .attr("d", path);
}

function drawNominees() {
  g.selectAll(".feature")
    .attr('fill', function (d) {
      var state = d.id;
      var nom;
      if (nomData[state] != null) {
        noms = nomData[state].length;
        d3.select(this).attr('fill-opacity', function() {
          if (noms === 1) { return "0.6"; }
          else if (noms === 2) { return "0.8"; }
        });
        return 'green';
      } else {
        return 'gray';
      }
    });
}

function switchChamber() {
  chamber = d3.event.target.value;
  populateCommitteeMenu();
  if (chamber == 'senate') {
    g.selectAll("path").remove();
    draw_states();
  } else {
    g.selectAll("path").remove();
    draw_districts();
  }
}

function switchAttr() {
  var attr = d3.event.target.value;
  radioAttr = attr;
  if (attr == 'party') { showPartyAffiliation(); }
  else if (attr == 'missed_votes') { showMissedVotesPct(); }
  else { showVotesWithPartyPct(); }
}

function showPartyAffiliation() {
  makeLegend(['R', 'D', 'Split'], ['#e41a1c', '#377eb8', '#984ea3']);
  g.selectAll(".feature")
    .attr("fill", function(d) {
      if(chamber == 'senate'){
        var state = d.id;
        var sen1 = senateData[state + 'a'];
        var sen2 = senateData[state + 'b'];
        if (sen1.party == 'R' && sen2.party == 'R') { return '#e41a1c'; }
        else if (sen1.party == 'D' && sen2.party == 'D') { return '#377eb8'; }
        else{ return '#984ea3'; }
      }
      else {
        var district = d.id;
        var distString = district.toString();
        var rep = houseData[distString];
        if (rep.party === "R") { return '#e41a1c'; }
        else if (rep.party === "D") { return '#377eb8'; }
        else if (rep.party === "I") { return 'green'; }
      }
    });
}

function showQuantitativeAttr(attr) {
  g.selectAll(".feature")
      .attr("fill", function(d) {
        if (chamber == 'senate') {
          var sen1 = senateData[d.id + 'a'];
          var sen2 = senateData[d.id + 'b'];
          var stateStat = (sen1[attr] + sen2[attr]) / 2.0;
          return color(stateStat);
        } else if (chamber == 'house') {
          var rep = houseData[d.id];
          return color(rep[attr]);
        }
      });
}

function showMissedVotesPct() {
  makeLegend([0, 2, 4, 6, 8], sequentialColors);
  showQuantitativeAttr('missed_votes_pct');
}

function showVotesWithPartyPct() {
  makeLegend([72, 79, 86, 93, 100], sequentialColors);
  showQuantitativeAttr('votes_with_party_pct');
}

function showCommittee() {
  var committee = d3.event.target.value;
  if (committee === "") {
    g.selectAll(".feature")
    .style('fill', function(d){
      if (radioAttr == 'party') { showPartyAffiliation(); }
      else if (radioAttr == 'missed_votes') { showMissedVotesPct(); }
      else { showVotesWithPartyPct(); }
    })
    .style("fill-opacity", "1");
    return;
  }
  g.selectAll(".feature")
      .style('fill', function(d){
        if (chamber == 'senate') {
          var sen1 = senateData[d.id + 'a'];
          var sen2 = senateData[d.id + 'b'];
          var sen1Com = sen1.committees.indexOf(committee) !== -1;
          var sen2Com = sen2.committees.indexOf(committee) !== -1;
          if (!sen1Com && !sen2Com) {
            return "grey";
          }
        } else if (chamber == 'house') {
          var rep = houseData[d.id];
          if (rep.committees.indexOf(committee) == -1) {
            return "grey";
          }
        }
      })
      .style("fill-opacity", function(d) {
        if (chamber == 'senate') {
          var sen1 = senateData[d.id + 'a'];
          var sen2 = senateData[d.id + 'b'];
          var sen1Com = sen1.committees.indexOf(committee) !== -1;
          var sen2Com = sen2.committees.indexOf(committee) !== -1;
          if (sen1Com && sen2Com) {
            return "1";
          } else if (sen1Com || sen2Com) {
            return "0.6";
          } else {
            return "0.2";
          }
        } else if (chamber == 'house') {
          var rep = houseData[d.id];
          if (rep.committees.indexOf(committee) !== -1) {
            return "1";
          } else {
            return "0.2";
          }
        }
      });
}

function populateCommitteeMenu() {
  var data;
  if (chamber == 'house') {
    data = houseComs;
  } else {
    data = senateComs;
  }
  committeeSelect.selectAll("option").remove();
  var committeeOptions = committeeSelect.selectAll("option")
      .data(data)
    .enter()
      .append("option");
  committeeOptions.text(function(d) { return d.name; })
      .attr("value", function(d) { return d.id; });
}

function showNominee() {
  tooltip.selectAll("rect").remove();
  tooltip.selectAll("text").remove();
  tooltip.selectAll(".pie").remove();
  var nomId = d3.event.target.value.split("-");
  var state = nomId[0];
  var roll = nomId[1];
  var stateNoms = nomData[state];
  var nom;
  for (var i=0; i<stateNoms.length; i++) {
    var thisNom = stateNoms[i];
    if (thisNom.roll_call === roll) { nom = thisNom; break; }
  }
  if (roll === "") { drawNominees(); }
  else {
    g.selectAll(".feature")
        .attr('fill', function(d) {
          if (state === d.id) { return 'green'; }
          else { return 'gray'; }
        })
        .attr('fill-opacity', '1');
    tooltip.append("rect")
        .attr('x', 5)
        .attr('y', 5)
        .attr("width", width/2-100)
        .attr("height", height/2)
        .attr("fill", 'green')
        .attr("stroke", "gray")
        .attr("stroke-width", 5)
        .attr("fill-opacity", 0.1);
    appendTextToTooltip(nom.name + ' (' + nom.state + ')', height / 8 - 40, '');

    var pie = d3.layout.pie()
        .value(function(d) { return d.count; })
        .sort(function(a,b) { return a.type < b.type; });

    var piePath = d3.svg.arc()
        .outerRadius(80)
        .innerRadius(0);

    var pieLabel = d3.svg.arc()
        .outerRadius(40)
        .innerRadius(40);

    var pieChart = tooltip.selectAll(".pie")
      .data(pie(nom.vote_count))
      .enter().append("g")
        .attr("class", "pie")
        .attr("transform", "translate(" + 110 + "," + 130 + ")");

    pieChart.append("path")
        .attr("d", piePath)
        .attr("fill", function(d) { return 'blue'; });

    pieChart.append("text")
        .attr("transform", function(d) { return "translate(" + pieLabel.centroid(d) + ")"; })
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { if (d.data.count > 5) { return d.data.type; } });
  }
}

function populateNomineeMenu() {
  var nomList = [];
  for (var state in nomData) {
    var noms = nomData[state];
    for (var i=0; i<noms.length; i++) {
      nomList.push(noms[i]);
    }
  }
  // Sort nominees by position name
  nomList.sort(function(a,b) { return (a.position > b.position) ? 1 : ((b.position > a.position) ? -1 : 0); });
  nomList.unshift({ position: "", roll_call: -1 });
  var nomOptions = nomineeSelect.selectAll("option")
      .data(nomList)
    .enter()
      .append("option")
      .text(function(d) { return d.position; })
      .attr('value', function(d) { return d.state + '-' + d.roll_call; });
}

function appendTextToTooltip(text, y, dy) {
  tooltip.append("text")
    .attr('x', '50%')
    .attr('y', y)
    .attr("text-anchor", "middle")
    .attr('dy', dy)
    .attr('font-weight', function() {
      if (dy === '') { return 'bolder'; }
    })
    .text(text);
}

function makeTooltip(d, senator) {
  var rep,
      y = 0,
      topY;
  if (chamber == 'house') { rep = houseData[d.id]; }
  else { rep = senateData[d.id+senator]; }
  if (senator === 'b') {
    y = 150;
    topY = 175;
  } else {
    y = 0;
    topY = height / 8 - 40;
  }

  tooltip.append("rect")
      .attr('x', 5)
      .attr('y', function() {
        if (senator === 'b') { return height/2-height/4+15; }
        else { return 5; }
      })
      .attr("width", width/2-100)
      .attr("height", height/4)
      .attr("fill", function() {
        var party = rep.party;
        if (party == 'R') { return 'red'; }
        else if (party == 'D') { return 'blue'; }
        else { return 'green'; }
      })
      .attr("stroke", "gray")
      .attr("stroke-width", 5)
      .attr("fill-opacity", 0.1);

  appendTextToTooltip(rep.name + ' (' + rep.party + ' - ' + rep.state + ')', topY, '');
  appendTextToTooltip("Bills Sponsored: " + rep.bills_sponsored, y, '50px');
  appendTextToTooltip("Votes With Party: " + rep.votes_with_party_pct + '%', y, '70px');
  appendTextToTooltip("Missed Votes: " + rep.missed_votes_pct + '%', y, '90px');
  appendTextToTooltip("Seniority: " + rep.seniority, y, '110px');
  appendTextToTooltip("Age: " + rep.age, y, '130px');
}

function makeLegend(domain, range) {
  color.domain(domain);
  color.range(range);
  legendData = domain.map(function(d, i) {
  	return {value: d, color: range[i]};
  });
  legend.selectAll('rect').remove();
  legend.selectAll('text').remove();
  legend.selectAll('rect')
    .data(legendData)
  .enter().append('rect')
    .attr('x', function(d, i) { return 375 + i * 30; })
    .attr('y', 6)
    .attr('width', 30)
    .attr('height', 18)
    .style('fill', function(d) { return d.color; });
  legend.selectAll('text')
    .data(legendData)
  .enter().append('text')
    .attr('x', function(d, i) { return 390 + i * 30; })
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .style('fill', 'black')
    .text(function(d) { return d.value; });
}

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this)
      .classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);

  zoom_c = true;
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);

  zoom_c = false;
}

function zoomed() {
  g.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
  g.selectAll("path").attr("d", path);
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}
