#How to process the data#
## blockgroups ##
** Data source: ** http://wsgw.mass.gov/data/gispub/shape/census2010/CENSUS2010_BLK_BG_TRCT_SHP.zip

A Census Block Group is a geographical unit used by the United States Census Bureau which is between the Census Tract and the Census Block. It is the smallest geographical unit for which the bureau publishes sample data, i.e. data which is only collected from a fraction of all households.

To get the census, along with the neighborhood (s) and the police district (s) it is in, run:  
```bash
psql -q -t -d warondrugs -f scripts/blockgroups.sql | topojson --bbox -q 1e4 -p -o blockgroups.json
```

## census demographic data ##
** Data source: ** http://wsgw.mass.gov/data/gispub/shape/census2010/PL_94-171_TABLES_MDB.zip

PL94-171 stands for Public Law 94-171 and it is the law that the census data is collected. It comes in access format so it needs conversion to PostgreSQL so we can use it.

To do so, we need to use the `access2pgsql.sh` script located in the scripts/ directory. This will output 3 files: schema, foreignkeys and data which we will put in PostgreSQL  
```bash
scripts/access2pgsql.sh raw/PL94-171_tables_blkgrps.mdb raw/pl94-171.process.blkgrps.schema.sql raw/pl94-171.process.blkgrps.foreignkeys.sql raw/pl94-171.process.blkgrps.data.sql
psql -q -t -d warondrugs -f raw/pl94-171.process.blkgrps.schema.sql
psql -q -t -d warondrugs -f raw/pl94-171.process.blkgrps.data.sql
psql -q -t -d warondrugs -f raw/pl94-171.process.blkgrps.foreignkeys.sql
```

This results in 4 tables: Blkgrps_P1, Blkgrps_P2, Blkgrps_P3, Blkgrps_P4_H1
- Table P1 - Race
- Table P2 - Hispanic or Latino, and not Hispanic or Latino by Race
- Table P3 - Race for the Population18 Years and Over
- Table P4 - Hispanic or Latino, and not Hispanic or Latino by Race for the Population 18 Years and Over
The relevant columns to us are:
- "P0020005" non-hispanic/latino white 
- "P0020006" non-hispanic/latino black
- "P0020007" + "P0020008" + "P0020009" + "P0020010" + "P0020011" non-hispanic/latino other
- "P0010003" - "P0020005" as hispanic/latino white
- "P0010004" - "P0020006" as hispanic/latino black
- ("P0010005" + "P0010006" + "P0010007" + "P0010008" + "P0010009") - ("P0020007" + "P0020008" + "P0020009" + "P0020010" + "P0020011") hispanic/latino other
So, if we wanted to get 3 variables: white, black and other people of color, we would use this formula: 
- non-hispanic/latino white are, for our purposes, white 
- non-hispanic/latino plus hispanic/latino blacks, black 
- hispanic/latino whites, non-hispanic/latino other and hispanic/latino other are other people of color

To get those numbers in a PostgreSQL table, run:

```bash
psql -q -t -d warondrugs -f scripts/population.sql
## Boston's neighborhoods ##
** Data source: ** https://data.cityofboston.gov/api/geospatial/mcme-sgsz?method=export&format=Shapefile

## BPD Crime Incidents Report ## 
https://data.cityofboston.gov/api/views/7cdf-6fgx/rows.csv?accessType=DOWNLOAD
## BPD FIO ##
https://data.cityofboston.gov/api/views/xmmk-i78r/rows.csv?accessType=DOWNLOAD
