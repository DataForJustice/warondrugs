CREATE OR REPLACE FUNCTION makegrid (geometry, integer) RETURNS geometry AS 
	'SELECT 
		ST_Collect(ST_SetSRID (ST_POINT(x,y), ST_SRID ($1))) 
	FROM 
		generate_series (
			floor (ST_Xmin ($1))::int,
			ceiling (ST_Xmax ($1) - ST_Xmin ($1))::int
		, $2) as x,
		generate_series (
			ceiling (ST_Ymax ($1) - ST_Ymin ($1))::int,
			floor (ST_Ymin ($1))::int
		, $2) as y 
	WHERE 
		ST_Intersects ($1, ST_SetSRID (ST_Point (x,y), ST_SRID ($1)))
	'
LANGUAGE SQL;
CREATE OR REPLACE FUNCTION makegrid (geometry, integer) RETURNS geometry AS
	'
	SELECT 
		ST_Collect(st_SetSRID(ST_POINT(x/1000000::float,y/1000000::float), ST_SRID($1))) 
	FROM 
		generate_series(floor(ST_Xmin($1)*1000000)::int, ceiling(ST_Xmax($1)*1000000)::int,$2) as x,
		generate_series(floor(ST_Ymin($1)*1000000)::int, ceiling(ST_Ymax($1)*1000000)::int,$2) as y 
	WHERE st_intersects($1,ST_SetSRID(ST_POINT(x/1000000::float,y/1000000::float),ST_SRID($1)))
	'
LANGUAGE SQL;
DROP TABLE IF EXISTS boston_grid;
CREATE TABLE boston_grid AS 
	SELECT 
		(a.geom).path [1] as id,
		(a.geom).geom,
		(SELECT gid FROM neighborhoods n WHERE ST_Contains (n.geom, (a.geom).geom)) as neighborhood,
		(SELECT gid FROM police_districts d WHERE ST_Contains (d.geom, (a.geom).geom)) as district 
	FROM 
		(SELECT ST_Dump (makegrid (geom, 4500)) as geom FROM boston_boundary) a
;
SELECT
	row_to_json (collection)
	
FROM
	(
	SELECT
		'FeatureCollection' as type,
		array_to_json (array_agg (feature)) as features
	FROM
		(
		SELECT
			'Feature' as type,
			ST_AsGeoJson (self.geom)::json as geometry,
			(WITH data (id,n,d) AS (VALUES (id,neighborhood,district)) SELECT row_to_json (data) FROM data) as properties
		FROM
			(
			SELECT 
				*
			FROM
				boston_grid
			) as self
		) as feature
	) as collection

