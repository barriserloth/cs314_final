var width = 950,
    height = 550,
    active = d3.select(null),
    senateData,
    houseData,
    usData,
    congressData,
    senateComs,
    houseComs,
    chamber;

var chamberSelect = d3.selectAll('input[name="chamber"]')
    .on("change", switchChamber);

var attrSelect = d3.selectAll('input[name="attr"]')
    .on("change", switchAttr);

var committeeSelect = d3.select("#committeeControl").append("select")
    .attr("name", "committee")
    .on("change", showCommittee);

var color = d3.scale.linear()
    .domain([0, 25, 50, 75, 100])
    .range(colorbrewer.PuRd[5]);

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

var g = svg.append("g");

svg.call(zoom.event);

d3.json("data/congressional_districts.json", function(congress) {
  d3.json("data/us.json", function(us) {
    d3.json("data/senate-members.json", function(senate) {
      d3.json("data/house-members.json", function(house) {
        d3.json("data/senate-committees.json", function(senateComsData) {
          d3.json("data/house-committees.json", function(houseComsData) {
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
      .on("click", clicked);

    showPartyAffiliation();

  /*
      .on("mouseover", function(d){
        var descrip = svg.append('g')
          .attr('class', 'dummy_g');

        descrip.append('rect')
            .attr('class', 'sendescrip')
            .attr('width', width/5)
            .attr('height', height)
            .attr("transform", "translate(" + (width-width/5) +  ",0)");

        if (!zoom_c) d3.select("h1").text(statename(d));

        descrip.append("text")
            .attr('class', 'sendescriph1')
            .attr('x', width-width/5+10)
            .attr("y", 20)
            .attr("dy", ".35em")
            .text(sen_header(d, senate, 0));

        var sen_image_one = sen_header(d, senate, 0).replace(' ', '_');
        descrip.append("svg:image")
           .attr('x', width-width/5+20)
           .attr('y', 50)
           .attr('width', 100)
           .attr('height', 152)
           .attr("xlink:href","images/" + sen_image_one + ".jpg")

        descrip.append("text")
            .attr('class', 'sendescriph2')
            .attr('x', width-width/5+10)
            .attr("y", height / 2)
            .attr("dy", ".35em")
            .text(sen_header(d, senate, 1));

      var sen_image_two = sen_header(d, senate, 1).replace(' ', '_');
      descrip.append("svg:image")
         .attr('x', width-width/5+20)
         .attr('y', (height/2 + 30))
         .attr('width', 100)
         .attr('height', 152)
         .attr("xlink:href","images/" + sen_image_two + ".jpg")

      })
      .on("mouseout", function(d){
          d3.select("h1").text('');
          svg.selectAll('.dummy_g').remove();
          svg.selectAll('.sendescrip').remove();
          svg.selectAll('.sendescriph1').remove();
          svg.selectAll('.sendescriph2').remove();

      });
      */

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
      .on("click", clicked);

  showPartyAffiliation();

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
  if (attr == 'party') { showPartyAffiliation(); }
  else if (attr == 'missed_votes') { showMissedVotesPct(); }
  else { showVotesWithPartyPct(); }
}

function showPartyAffiliation() {
  g.selectAll(".feature")
    .attr("fill", function(d) {
      if(chamber == 'senate'){
        var state = d.id;
        var sen1 = senateData[state + 'a'];
        var sen2 = senateData[state + 'b'];
        if (sen1.party == 'R' && sen2.party == 'R') { return '#e41a1c'; }
        else if (sen1.party == 'D' && sen2.party == 'R') { return '#984ea3'; }
        else if (sen1.party == 'R' && sen2.party == 'D') { return '#984ea3'; }
        else if (sen1.party == 'D' && sen2.party == 'D') { return '#377eb8'; }
        else if (sen1.party == 'I' && sen2.party == 'R' ||
        sen1.party == 'R' && sen2.party == 'I') { return '#fff836'; }
        else if (sen1.party == 'D' && sen2.party == 'I' ||
        sen1.party == 'I' && sen2.party == 'D') { return '#00e7e7'; }
        else if (sen1.party == 'I' && sen2.party == 'I') { return '#4daf4a'; }
      }
      else {
        var district = d.id;
        var distString = district.toString();
        var rep = houseData[distString];
        if (rep.party === "R") { return 'red'; }
        else if (rep.party === "D") { return 'blue'; }
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
  color.domain([0, 2, 4, 6, 8]);
  showQuantitativeAttr('missed_votes_pct');
}

function showVotesWithPartyPct() {
  color.domain([72, 79, 86, 93, 100]);
  showQuantitativeAttr('votes_with_party_pct');
}

function showCommittee() {
  var committee = d3.event.target.value;
  if (committee === "") {
    g.selectAll(".feature").style("fill-opacity", "1");
    return;
  }
  g.selectAll(".feature")
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

function sen_header(d, senate, check){
  var state = d.id;
  var sen1, sen2;
  if(state != 'DC' && state != 'PR' && state != 'VI'){
    for (var j=0; j<101; j++){
      var sen_home = senate[j].state;
      if(state == sen_home && !sen1){
        sen1 = senate[j];
        for(var k=j+1; k<101; k++){
          var sen_home2 = senate[k].state;
          if(state == sen_home2 && !sen2){
            sen2 = senate[k];
          }
        }
      }
    }
  }
  if(check == 0) return sen1.first_name + ' ' + sen1.last_name;
  else return sen2.first_name + ' ' + sen2.last_name;
}

function statename(d){
  switch (d.id)
        {
            case 'AL':
                return "ALABAMA";

            case 'AK':
                return "ALASKA";

            case 'AZ':
                return "ARIZONA";

            case 'AR':
                return "ARKANSAS";

            case 'CA':
                return "CALIFORNIA";

            case 'CO':
                return "COLORADO";

            case 'CT':
                return "CONNECTICUT";

            case 'DE':
                return "DELAWARE";

            case 'DC':
                return "DISTRICT OF COLUMBIA";

            case 'FL':
                return "FLORIDA";

            case 'GA':
                return "GEORGIA";

            case 'HI':
                return "HAWAII";

            case 'ID':
                return "IDAHO";

            case 'IL':
                return "ILLINOIS";

            case 'IN':
                return "INDIANA";

            case 'IA':
                return "IOWA";

            case 'KS':
                return "KANSAS";

            case 'KY':
                return "KENTUCKY";

            case 'LA':
                return "LOUISIANA";

            case 'ME':
                return "MAINE";

            case 'MD':
                return "MARYLAND";

            case 'MA':
                return "MASSACHUSETTS";

            case 'MI':
                return "MICHIGAN";

            case 'MN':
                return "MINNESOTA";

            case 'MS':
                return "MISSISSIPPI";

            case 'MO':
                return "MISSOURI";

            case 'MT':
                return "MONTANA";

            case 'NE':
                return "NEBRASKA";

            case 'NV':
                return "NEVADA";

            case 'NH':
                return "NEW HAMPSHIRE";

            case 'NJ':
                return "NEW JERSEY";

            case 'NM':
                return "NEW MEXICO";

            case 'NY':
                return "NEW YORK";

            case 'NC':
                return "NORTH CAROLINA";

            case 'ND':
                return "NORTH DAKOTA";

            case 'OH':
                return "OHIO";

            case 'OK':
                return "OKLAHOMA";

            case 'OR':
                return "OREGON";

            case 'PA':
                return "PENNSYLVANIA";

            case 'RI':
                return "RHODE ISLAND";

            case 'SC':
                return "SOUTH CAROLINA";

            case 'SD':
                return "SOUTH DAKOTA";

            case 'TN':
                return "TENNESSEE";

            case 'TX':
                return "TEXAS";

            case 'UT':
                return "UTAH";

            case 'VT':
                return "VERMONT";

            case 'VA':
                return "VIRGINIA";

            case 'WA':
                return "WASHINGTON";

            case 'WV':
                return "WEST VIRGINIA";

            case 'WI':
                return "WISCONSIN";

            case 'WY':
                return "WYOMING";
        }
}
