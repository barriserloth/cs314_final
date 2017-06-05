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

# Citation

Code to zoom in on states/districts provided by the example found at https://bl.ocks.org/mbostock/9656675
