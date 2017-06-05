# CS314 Final Project: U.S. Congress

Designed by Barr Iserloth and Simon Bilsky-Rollins.

## Viewing


## Data Sources

We used data primarily from [ProPublica's Congress API](https://projects.propublica.org/api-docs/congress-api/), which is available under the Creative Commons Attribution-NonCommercial-NoDerivs 3.0 United States license.

We used additional data from a few other sources, outlined below:

* State FIPS code data, which we needed to correctly map information onto states and congressional districts, from the [U.S. Census Bureau](https://www.census.gov/geo/reference/ansi_statetables.html).

* TopoJSON files containing the boundaries of states and congressional districts.


## Files

`api.cfg` is a configuration file that stores the ProPublica API key used to download our data.

`api.py` is a Python 3 script that downloads data from the ProPublica API and turns it into nicely formatted CSVs. Run `python3 api.py -h` for usage options.

`statemap.html` is the main HTML file for our visualization, containing styles and the basic structure of the page.

`statemap.js` is the main logic of our visualization.

`data/congressional_districts.json` is a TopoJSON file containing the boundaries of congressional districs.

`data/fips_codes.csv` is a CSV that maps FIPS codes to human-readable state abbreviations.

`data/house-committees.json` is a list of House committees and their chairs and members.

`data/house-members.json` is a list of House representatives, the committees they sit on, and statistics such as missed vote percent and votes with party percent.

`data/nominations.json` is a list of nominees to federal offices that we downloaded straight from ProPublica and manually added some data to, most notably the `position` fields.

`data/nominees.json` is a reorganized version of the above file that we actually use in our visualization.

`data/senate-committees.json` is the same as `data/house-committees.json`, but for the Senate instead of the House.

`data/senate-members.json` is the same as `data/house-members.json`, but for senators instead of representatives.

`data/us.json` is a TopoJSON file containing the boundaries of U.S. states.

## Citation

Code to zoom in on states/districts provided by the example found at https://bl.ocks.org/mbostock/9656675
