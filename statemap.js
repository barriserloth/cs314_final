var width = 1400,
    height = 800,
    active = d3.select(null);

var zoom_c = false;

var projection = d3.geo.albersUsa();

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
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
    d3.csv("data/senate-members.csv", function(senate) {
      d3.csv("data/house-members.csv", function(house) {
        svg.append("defs").append("path")
          .attr("id", "land")
          .datum(topojson.feature(us, us.objects.land))
          .attr("d", path);
        svg.append("clipPath")
          .attr("id", "clip-land")
        .append("use")
          .attr("xlink:href", "#land");

        // Reorganize house data into a dictionary with district IDs as keys
        house2 = {}
        for (i=0; i<house.length; i++) {
          house2[house[i].district_id] = house[i];
        }

        draw_districts(us, congress, house2);
        //draw_states(us, congress, senate);
      })
    })
  })
});

function draw_states(us, congress, senate){
  g.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .attr('id', function(d, i) { return us.objects.states.geometries[i].id;})
      .attr("fill", function(d, i) {
        var state = us.objects.states.geometries[i].id;
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

        if(sen1.party == 'R' && sen2.party == 'R') {return '#e41a1c';}
        else if(sen1.party == 'D' && sen2.party == 'R') {return '#984ea3';}
        else if(sen1.party == 'R' && sen2.party == 'D') {return '#984ea3';}
        else if(sen1.party == 'D' && sen2.party == 'D') {return '#377eb8';}
        else if(sen1.party == 'I' && sen2.party == 'R' ||
        sen1.party == 'R' && sen2.party == 'I') {return '#fff836';}
        else if(sen1.party == 'D' && sen2.party == 'I' ||
        sen1.party == 'I' && sen2.party == 'D') {return '#00e7e7';}
        else if(sen1.party == 'I' && sen2.party == 'I') {return '#4daf4a';}
      }
    })

    .on("click", clicked)

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
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "state-boundaries")
        .attr("d", path);
}

function draw_districts(us, congress, house, committee){
  g.selectAll("path")
      .data(topojson.feature(congress, congress.objects.districts).features)
    .enter().append("path")
      .attr("class", "districts")
      .attr("clip-path", "url(#clip-land)")
      .attr("d", path)
      .attr('fill', function(d, i){
        var district = congress.objects.districts.geometries[i].id;
        var distString = district.toString();
        if (district < 6000) {
          var rep = house[distString];
          if (rep.party === "R") { return 'red'; }
          else if (rep.party === "D") { return 'blue'; }
          else if (rep.party === "I") { return 'green'; }
        }
      })
      .on("click", clicked);

  g.append("path")
      .attr("class", "district-boundaries")
      .datum(topojson.mesh(congress, congress.objects.districts, function(a, b) {
        return a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0);
      }))
      .attr("d", path);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "state-boundaries")
      .attr("d", path);
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
