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
			(WITH data 
				(id,pl94171,neighborhood,district)
			AS (
				VALUES (
					geoid10,
					logpl94171, 
					(SELECT array_agg (gid) FROM neighborhoods n WHERE ST_Intersects (n.geom, self.geom)),
					(SELECT array_agg (gid) FROM police_districts d WHERE ST_Intersects (d.geom, self.geom))
				)
			) SELECT row_to_json (data) FROM data) as properties
		FROM
			(
			SELECT 
				geoid10, logpl94171, bg.geom
			FROM
				blockgroups bg, boston_boundary b
			WHERE
				--b.geom ~ bg.geom
				ST_Intersects (b.geom, bg.geom)
				--ST_Contains (b.geom, bg.geom)
			) as self
		) as feature
	) as collection
