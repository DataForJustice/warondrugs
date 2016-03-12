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
				(gid, w, b, p, n, d)
			AS (
				VALUES (
					self.gid,
					w, b, p,
					(SELECT array_agg (n.gid) FROM neighborhoods n WHERE ST_Intersects (n.geom, self.geom)),
					(SELECT array_agg (d.gid) FROM police_districts d WHERE ST_Intersects (d.geom, self.geom))
				)
			) SELECT row_to_json (data) FROM data) as properties
		FROM
			(
			SELECT 
				bg.gid, geoid10, logpl94171, bg.geom,
				nh_white as w, nh_black + h_black as b, h_white + nh_other + h_other as p
			FROM
				blockgroups bg, boston_boundary b, population p
			WHERE
				ST_Intersects (b.geom, bg.geom)
				AND bg.gid = p.gid 
				AND countyfp10 = '025'
			) as self
		) as feature
	) as collection
