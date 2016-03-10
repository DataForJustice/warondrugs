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
			(WITH data (gid,name) AS (VALUES (gid,name)) SELECT row_to_json (data) FROM data) as properties
		FROM
			(
			SELECT 
				gid, name, geom
			FROM
				neighborhoods
			) as self
		) as feature
	) as collection
