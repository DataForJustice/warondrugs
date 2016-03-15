DROP TABLE IF EXISTS population;
CREATE TABLE population AS 
SELECT distinct 
	blockgroups.gid,
	("P0020005") as nh_white, 
	("P0020006") as nh_black, 
	(("P0020007" + "P0020008" + "P0020009" + "P0020010" + "P0020011")) as nh_other, 
	(("P0010003" - "P0020005")) as h_white, 
	(("P0010004" - "P0020006")) as h_black, 
	((("P0010005" + "P0010006" + "P0010007" + "P0010008" + "P0010009") - ("P0020007" + "P0020008" + "P0020009" + "P0020010" + "P0020011"))) as h_other,
	blockgroups.geom as geom
FROM  
	blockgroups blockgroups 
	JOIN "Blkgrps_P1" p1
		ON blockgroups.logpl94171 = p1."LOGRECNO"
	JOIN "Blkgrps_P2" p2
		ON blockgroups.logpl94171 = p2."LOGRECNO"
;
