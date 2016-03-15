COPY (SELECT
	grid,
	--d_year as year, 
	sum (CASE WHEN ncode  = 'ARREST' THEN 1 ELSE 0 END) as arr,
	sum (CASE WHEN ncode != 'ARREST' THEN 1 ELSE 0 END) as inv
FROM
	(
	SELECT
		*,
		to_char (fromdate::timestamp, 'YYYY') as d_year,
		(SELECT id FROM boston_grid grid ORDER BY grid.geom <-> point LIMIT 1) as grid
	FROM
		(
		SELECT 
			*, 
			trim (both ' ' from naturecode) as ncode,
			ST_FlipCoordinates (ST_SetSRID (ST_GeomFromText ('POINT' || replace(inc.location, ',', '')), 4326)) as point
		FROM 
			incidents inc
		WHERE
			x <> y
			AND incident_type_description = 'DRUG CHARGES'
		) c
	WHERE
		c.ncode IN ('ARREST', 'IVDRUG', 'IVPREM', 'IVPER', 'INVEST', 'IVMV')
	) a
GROUP BY
	grid
ORDER BY
	grid
) TO STDOUT CSV HEADER;
